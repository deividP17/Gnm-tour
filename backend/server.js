require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'gnm_super_secret_key_change_in_production'; 
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'; 

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- BASE DE DATOS SQLITE ---
const db = new sqlite3.Database('./gnm_database.sqlite', (err) => {
  if (err) console.error('Error al conectar con BD:', err.message);
  else console.log('Conectado a la base de datos SQLite segura.');
});

// Inicializar Tablas
db.serialize(() => {
  // Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'ACTIVE',
    credits INTEGER DEFAULT 0,
    tripsCount INTEGER DEFAULT 0,
    membership_tier TEXT DEFAULT 'NONE',
    membership_validUntil TEXT,
    membership_usedThisMonth INTEGER DEFAULT 0
  )`);

  // Tours
  db.run(`CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY,
    destination TEXT,
    price INTEGER,
    km INTEGER,
    description TEXT,
    dates_start TEXT,
    capacity INTEGER,
    data_json TEXT
  )`);

  // Pagos (Nuevo historial de transacciones)
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    mp_payment_id TEXT,
    user_id TEXT,
    item_type TEXT, -- 'MEMBERSHIP' o 'TOUR'
    item_id TEXT,
    amount INTEGER,
    status TEXT, -- 'approved', 'pending', 'rejected'
    date_created TEXT
  )`);

  // Configuración (Datos Bancarios y Tokens)
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    owner TEXT,
    cuit TEXT,
    bank TEXT,
    cbu TEXT,
    alias TEXT,
    mp_access_token TEXT
  )`);

  // Insertar configuración por defecto si no existe
  db.get("SELECT id FROM settings WHERE id = 'config_v1'", (err, row) => {
    if (!row) {
        db.run(`INSERT INTO settings (id, owner, cuit, bank, cbu, alias, mp_access_token)
                VALUES ('config_v1', 'GERARDO RAMON LAFUENTE', '20-37327496-7', 'Banco de Corrientes', '0940001000123456789012', 'GNM.TOUR.ARG', '')`);
    }
  });
  
  // Admin por defecto
  const adminId = 'u-admin-master';
  db.get("SELECT id FROM users WHERE email = ?", ['gerardolaf71@gmail.com'], async (err, row) => {
      if (!row) {
          const hash = await bcrypt.hash('admin123', 10);
          db.run(`INSERT INTO users (id, name, email, password_hash, role, membership_tier) 
                  VALUES (?, ?, ?, ?, ?, ?)`, 
                  [adminId, 'Gerardo Admin', 'gerardolaf71@gmail.com', hash, 'ADMIN', 'ELITE']);
          console.log('Usuario Admin creado: gerardolaf71@gmail.com / admin123');
      }
  });
});

// --- MIDDLEWARE AUTH ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- HELPER: OBTENER TOKEN MP (Prioridad: .env > Base de Datos) ---
const getAccessToken = () => {
    return new Promise((resolve) => {
        // 1. Si existe en .env, usarlo directamente
        if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim() !== '') {
            return resolve(process.env.MP_ACCESS_TOKEN);
        }
        // 2. Si no, buscar en la base de datos
        db.get("SELECT mp_access_token FROM settings WHERE id = 'config_v1'", (err, row) => {
            if (err || !row) resolve(null);
            else resolve(row.mp_access_token);
        });
    });
};

// --- RUTAS MERCADO PAGO ---

// 1. Crear Preferencia de Pago
app.post('/api/mercadopago/create_preference', async (req, res) => {
    const { title, price, payer_email, userId, type, itemId } = req.body;

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            console.error("Falta MP Access Token. Configúralo en .env o Panel Admin.");
            return res.status(400).json({ error: "Mercado Pago no configurado" });
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        // Datos ocultos para identificar el pago cuando vuelva el Webhook
        const metadata = {
            user_id: userId,
            type: type, // 'MEMBERSHIP' o 'TOUR'
            item_id: itemId
        };

        const result = await preference.create({
            body: {
                items: [{ title, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
                payer: { email: payer_email },
                // URL DINÁMICA: Toma la URL real del .env
                notification_url: `${BASE_URL}/api/mercadopago/webhook`, 
                external_reference: JSON.stringify(metadata), 
                back_urls: {
                    success: `${BASE_URL}/`, 
                    failure: `${BASE_URL}/`,
                    pending: `${BASE_URL}/`
                },
                auto_return: "approved",
            }
        });

        res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
        console.error("Error MP:", error);
        res.status(500).json({ error: error.message });
    }
});

// 2. WEBHOOK: Recibir notificación de pago
app.post('/api/mercadopago/webhook', async (req, res) => {
    const topic = req.query.topic || req.query.type;
    const id = req.query.id || req.query['data.id'];

    if (topic === 'payment' && id) {
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) return res.sendStatus(200);

            const client = new MercadoPagoConfig({ accessToken });
            const payment = new Payment(client);
            const paymentData = await payment.get({ id });

            // Verificar si está aprobado
            if (paymentData.status === 'approved') {
                const metadata = JSON.parse(paymentData.external_reference || '{}');
                const { user_id, type, item_id } = metadata;

                // 1. Guardar en tabla payments
                db.run(`INSERT OR IGNORE INTO payments (id, mp_payment_id, user_id, item_type, item_id, amount, status, date_created) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [`pay-${Date.now()}`, id, user_id, type, item_id, paymentData.transaction_amount, 'approved', new Date().toISOString()]
                );

                // 2. Ejecutar lógica de negocio
                if (type === 'MEMBERSHIP') {
                    // Actualizar usuario a nueva membresía
                    const validUntil = new Date();
                    validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 año de validez
                    
                    db.run(`UPDATE users SET membership_tier = ?, membership_validUntil = ? WHERE id = ?`,
                        [item_id, validUntil.toISOString(), user_id],
                        (err) => { if(!err) console.log(`Membresía ${item_id} activada para usuario ${user_id}`); }
                    );
                } else if (type === 'TOUR') {
                    db.run(`UPDATE users SET tripsCount = tripsCount + 1, credits = credits + ? WHERE id = ?`,
                            [Math.floor(paymentData.transaction_amount / 100), user_id]
                    );
                    console.log(`Tour pagado por usuario ${user_id}`);
                }
            }
        } catch (error) {
            console.error("Error procesando webhook:", error);
        }
    }

    res.sendStatus(200); // Responder OK a Mercado Pago rápido
});


// --- RUTAS SETTINGS (Bancos & Tokens) ---
app.get('/api/settings', (req, res) => {
    db.get("SELECT * FROM settings WHERE id = 'config_v1'", (err, row) => {
        if (err || !row) return res.status(500).json({});
        const safeData = { ...row }; 
        res.json(safeData);
    });
});

app.put('/api/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const { owner, cuit, bank, cbu, alias, mpAccessToken } = req.body;
    db.run(`UPDATE settings SET owner = ?, cuit = ?, bank = ?, cbu = ?, alias = ?, mp_access_token = ? WHERE id = 'config_v1'`,
        [owner, cuit, bank, cbu, alias, mpAccessToken],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Configuración actualizada" });
        }
    );
});


// --- RUTAS USUARIOS & TOURS ---
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    const userData = { ...user, password_hash: undefined, membership: { tier: user.membership_tier, validUntil: user.membership_validUntil, usedThisMonth: user.membership_usedThisMonth }};
    res.json({ user: userData, token });
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const id = `u-${Date.now()}`;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`, 
      [id, name, email, hashedPassword], 
      function(err) {
        if (err) return res.status(500).json({ error: "Error o Email duplicado" });
        res.status(201).json({ message: "Usuario creado", userId: id });
    });
  } catch (e) { res.status(500).json({ error: "Error servidor" }); }
});

app.get('/api/users/me', authenticateToken, (req, res) => {
    db.get("SELECT * FROM users WHERE id = ?", [req.user.id], (err, user) => {
        if (!user) return res.sendStatus(404);
        res.json({ ...user, password_hash: undefined, membership: { tier: user.membership_tier, validUntil: user.membership_validUntil, usedThisMonth: user.membership_usedThisMonth }});
    });
});

app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    db.all("SELECT * FROM users", [], (err, rows) => {
        const users = rows.map(u => ({
             ...u, password_hash: undefined, membership: { tier: u.membership_tier, validUntil: u.membership_validUntil, usedThisMonth: u.membership_usedThisMonth }
        }));
        res.json(users);
    });
});

app.get('/api/tours', (req, res) => {
    db.all("SELECT * FROM tours", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const tours = rows.map(t => ({ ...t, ...JSON.parse(t.data_json || '{}') }));
        res.json(tours);
    });
});

app.post('/api/tours', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const t = req.body;
    const json = JSON.stringify({ images: t.images, dates: t.dates, itinerary: t.itinerary, status: t.status });
    db.run(`INSERT INTO tours (id, destination, price, km, description, dates_start, capacity, data_json) VALUES (?,?,?,?,?,?,?,?)`,
            [t.id, t.destination, t.price, t.km, t.description, t.dates.start, t.capacity, json],
            (err) => { if (err) return res.status(500).json({error: err.message}); res.json({message: "OK"}); });
});

app.listen(PORT, () => {
  console.log(`Servidor GNM seguro corriendo en http://localhost:${PORT}`);
});