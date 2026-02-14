
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.JWT_SECRET || 'gnm_super_secret_key_change_in_production'; 
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'; 

// Middleware de Seguridad
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limitado a 10mb para evitar DoS por payload
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- RATE LIMITER (Protección Fuerza Bruta en Memoria) ---
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 10;

const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (loginAttempts.has(ip)) {
        const data = loginAttempts.get(ip);
        if (now - data.firstAttempt > RATE_LIMIT_WINDOW) {
            loginAttempts.set(ip, { count: 1, firstAttempt: now });
        } else {
            data.count++;
            if (data.count > MAX_ATTEMPTS) {
                return res.status(429).json({ error: "Demasiados intentos. Intente más tarde." });
            }
        }
    } else {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    }
    next();
};

// --- BASE DE DATOS SQLITE ---
const db = new sqlite3.Database('./gnm_database.sqlite', (err) => {
  if (err) console.error('Error al conectar con BD:', err.message);
  else console.log('Conectado a la base de datos SQLite segura.');
});

// Inicializar Tablas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'ACTIVE', credits INTEGER DEFAULT 0, tripsCount INTEGER DEFAULT 0,
    membership_tier TEXT DEFAULT 'NONE', membership_validUntil TEXT, membership_usedThisMonth INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tours (
    id TEXT PRIMARY KEY, destination TEXT, price INTEGER, km INTEGER, description TEXT,
    dates_start TEXT, capacity INTEGER, data_json TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY, name TEXT, type TEXT, price INTEGER, capacity INTEGER, description TEXT, data_json TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY, mp_payment_id TEXT, user_id TEXT, item_type TEXT, item_id TEXT,
    amount INTEGER, status TEXT, date_created TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY, owner TEXT, cuit TEXT, bank TEXT, cbu TEXT, alias TEXT, mp_access_token TEXT
  )`);

  db.get("SELECT id FROM settings WHERE id = 'config_v1'", (err, row) => {
    if (!row) {
        db.run(`INSERT INTO settings (id, owner, cuit, bank, cbu, alias, mp_access_token)
                VALUES ('config_v1', 'GERARDO RAMON LAFUENTE', '20-37327496-7', 'Banco de Corrientes', '0940001000123456789012', 'GNM.TOUR.ARG', '')`);
    }
  });
  
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

const getAccessToken = () => {
    return new Promise((resolve) => {
        if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim() !== '') {
            return resolve(process.env.MP_ACCESS_TOKEN);
        }
        db.get("SELECT mp_access_token FROM settings WHERE id = 'config_v1'", (err, row) => {
            if (err || !row) resolve(null);
            else resolve(row.mp_access_token);
        });
    });
};

// --- VALIDACIONES HELPERS ---
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPrice = (price) => typeof price === 'number' && price >= 0;

// --- RUTAS MERCADO PAGO ---
app.post('/api/mercadopago/create_preference', async (req, res) => {
    const { title, price, payer_email, userId, type, itemId } = req.body;
    
    // Validación Backend MP
    if (!title || !isValidPrice(price) || !payer_email) {
        return res.status(400).json({ error: "Datos de pago inválidos" });
    }

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) return res.status(400).json({ error: "Mercado Pago no configurado" });

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);
        const metadata = { user_id: userId, type: type, item_id: itemId };

        const result = await preference.create({
            body: {
                items: [{ title, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
                payer: { email: payer_email },
                notification_url: `${BASE_URL}/api/mercadopago/webhook`, 
                external_reference: JSON.stringify(metadata), 
                back_urls: { success: `${BASE_URL}/`, failure: `${BASE_URL}/`, pending: `${BASE_URL}/` },
                auto_return: "approved",
            }
        });
        res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
        console.error("Error MP:", error);
        res.status(500).json({ error: error.message });
    }
});

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

            if (paymentData.status === 'approved') {
                const metadata = JSON.parse(paymentData.external_reference || '{}');
                const { user_id, type, item_id } = metadata;

                // Verificar duplicados para no procesar el mismo pago dos veces
                db.get("SELECT id FROM payments WHERE mp_payment_id = ?", [id], (err, row) => {
                    if (!row) {
                        db.run(`INSERT OR IGNORE INTO payments (id, mp_payment_id, user_id, item_type, item_id, amount, status, date_created) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [`pay-${Date.now()}`, id, user_id, type, item_id, paymentData.transaction_amount, 'approved', new Date().toISOString()]
                        );

                        if (type === 'MEMBERSHIP') {
                            const validUntil = new Date();
                            validUntil.setFullYear(validUntil.getFullYear() + 1); // Lógica base, idealmente vendría de metadata
                            db.run(`UPDATE users SET membership_tier = ?, membership_validUntil = ? WHERE id = ?`,
                                [item_id, validUntil.toISOString(), user_id]);
                        } else if (type === 'TOUR') {
                            db.run(`UPDATE users SET tripsCount = tripsCount + 1, credits = credits + ? WHERE id = ?`,
                                    [Math.floor(paymentData.transaction_amount / 100), user_id]);
                        }
                    }
                });
            }
        } catch (error) { console.error("Error procesando webhook:", error); }
    }
    res.sendStatus(200);
});

// --- RUTAS API ESTÁNDAR ---
app.get('/api/settings', authenticateToken, (req, res) => {
    db.get("SELECT * FROM settings WHERE id = 'config_v1'", (err, row) => {
        if (err || !row) return res.status(500).json({});
        const { mp_access_token, ...publicData } = row;
        res.json(publicData);
    });
});

app.put('/api/settings', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const { owner, cuit, bank, cbu, alias, mpAccessToken } = req.body;
    db.run(`UPDATE settings SET owner = ?, cuit = ?, bank = ?, cbu = ?, alias = ?, mp_access_token = ? WHERE id = 'config_v1'`,
        [owner, cuit, bank, cbu, alias, mpAccessToken],
        (err) => { if (err) return res.status(500).json({ error: err.message }); res.json({ message: "Configuración actualizada" }); }
    );
});

app.post('/api/auth/login', rateLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Datos incompletos" });

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: "Credenciales inválidas" });
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    const userData = { ...user, password_hash: undefined, membership: { tier: user.membership_tier, validUntil: user.membership_validUntil, usedThisMonth: user.membership_usedThisMonth }};
    res.json({ user: userData, token });
  });
});

app.post('/api/auth/register', rateLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  
  // Validaciones
  if (!name || name.length < 3) return res.status(400).json({ error: "Nombre muy corto" });
  if (!isValidEmail(email)) return res.status(400).json({ error: "Email inválido" });
  if (!password || password.length < 6) return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

  const id = `u-${Date.now()}`;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`, 
      [id, name, email, hashedPassword], 
      (err) => {
        if (err) return res.status(400).json({ error: "El email ya está registrado" });
        res.status(201).json({ message: "Usuario creado", userId: id });
    });
  } catch (e) { res.status(500).json({ error: "Error servidor" }); }
});

app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    db.all("SELECT * FROM users", [], (err, rows) => res.json(rows.map(u => ({ ...u, password_hash: undefined }))));
});

app.get('/api/tours', (req, res) => {
    db.all("SELECT * FROM tours", [], (err, rows) => res.json(rows.map(t => ({ ...t, ...JSON.parse(t.data_json || '{}') }))));
});

app.post('/api/tours', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const t = req.body;
    
    // Validación de Tour
    if (!t.destination || !t.price || t.price < 0 || !t.dates?.start) {
        return res.status(400).json({ error: "Datos del tour inválidos o incompletos" });
    }

    db.run(`INSERT OR REPLACE INTO tours (id, destination, price, km, description, dates_start, capacity, data_json) VALUES (?,?,?,?,?,?,?,?)`,
            [t.id, t.destination, t.price, t.km, t.description, t.dates.start, t.capacity, JSON.stringify({ images: t.images, dates: t.dates, itinerary: t.itinerary, status: t.status })],
            (err) => { if (err) return res.status(500).json({error: err.message}); res.json({message: "OK"}); });
});

app.delete('/api/tours/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    db.run("DELETE FROM tours WHERE id = ?", [req.params.id], (err) => res.json({message: "Eliminado"}));
});

app.get('/api/spaces', (req, res) => {
    db.all("SELECT * FROM spaces", [], (err, rows) => res.json(rows.map(s => ({ ...s, ...JSON.parse(s.data_json || '{}') }))));
});

app.post('/api/spaces', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const s = req.body;

    // Validación de Espacio
    if (!s.name || !s.price || s.price < 0 || s.capacity < 1) {
        return res.status(400).json({ error: "Datos del espacio inválidos" });
    }

    db.run(`INSERT OR REPLACE INTO spaces (id, name, type, price, capacity, description, data_json) VALUES (?,?,?,?,?,?,?)`,
            [s.id, s.name, s.type, s.price, s.capacity, s.description, JSON.stringify({ images: s.images, rules: s.rules, availability: s.availability, damageDeposit: s.damageDeposit, cleaningFee: s.cleaningFee })],
            (err) => { if (err) return res.status(500).json({error: err.message}); res.json({message: "OK"}); });
});

app.delete('/api/spaces/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    db.run("DELETE FROM spaces WHERE id = ?", [req.params.id], (err) => res.json({message: "Eliminado"}));
});

// --- SERVIR FRONTEND ---
app.use(express.static(path.join(__dirname, '../dist')));
app.use(express.static(path.join(__dirname, '../build')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.sendStatus(404);
  const distIndex = path.join(__dirname, '../dist/index.html');
  const buildIndex = path.join(__dirname, '../build/index.html');
  
  if (require('fs').existsSync(distIndex)) {
    res.sendFile(distIndex);
  } else if (require('fs').existsSync(buildIndex)) {
    res.sendFile(buildIndex);
  } else {
    res.status(200).send(`GNM Backend Activo. Construye el frontend para ver la app.`);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor GNM seguro corriendo en http://localhost:${PORT}`);
});
