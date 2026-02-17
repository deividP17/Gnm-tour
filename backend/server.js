
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); 
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
  crossOriginResourcePolicy: false,
}));
app.use(cors());

// AUMENTO DE LÍMITE PARA IMÁGENES
// Nota: MySQL también necesita 'max_allowed_packet' alto en my.ini/my.cnf si usas base64 largos.
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- RATE LIMITER SIMPLE ---
const loginAttempts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (loginAttempts.has(ip)) {
        const data = loginAttempts.get(ip);
        if (now - data.firstAttempt > 15 * 60 * 1000) {
            loginAttempts.set(ip, { count: 1, firstAttempt: now });
        } else {
            data.count++;
            if (data.count > 20) return res.status(429).json({ error: "Demasiados intentos." });
        }
    } else {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
    }
    next();
};

// --- CONEXIÓN MYSQL (POOL) ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'gnm_tour_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Importante para mantener la conexión viva en Hostinger
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// --- INICIALIZACIÓN DE TABLAS ---
const initDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL exitosamente.');

        // Users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password_hash VARCHAR(255),
                role VARCHAR(20) DEFAULT 'USER',
                status VARCHAR(20) DEFAULT 'ACTIVE',
                credits INT DEFAULT 0,
                tripsCount INT DEFAULT 0,
                membership_tier VARCHAR(50) DEFAULT 'NONE',
                membership_validUntil VARCHAR(50),
                membership_usedThisMonth INT DEFAULT 0
            )
        `);

        // Tours
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tours (
                id VARCHAR(50) PRIMARY KEY,
                destination VARCHAR(255),
                price INT,
                km INT,
                description TEXT,
                dates_start VARCHAR(50),
                capacity INT,
                data_json LONGTEXT
            )
        `);

        // Spaces
        await connection.query(`
            CREATE TABLE IF NOT EXISTS spaces (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255),
                type VARCHAR(50),
                price INT,
                capacity INT,
                description TEXT,
                data_json LONGTEXT
            )
        `);

        // Payments
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id VARCHAR(50) PRIMARY KEY,
                mp_payment_id VARCHAR(50),
                user_id VARCHAR(50),
                item_type VARCHAR(50),
                item_id VARCHAR(50),
                amount INT,
                status VARCHAR(50),
                date_created VARCHAR(50)
            )
        `);

        // Settings
        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id VARCHAR(50) PRIMARY KEY,
                owner VARCHAR(100),
                cuit VARCHAR(50),
                bank VARCHAR(100),
                cbu VARCHAR(100),
                alias VARCHAR(100),
                mp_access_token VARCHAR(255),
                cancellation_hours INT DEFAULT 72,
                subscription_links_json TEXT
            )
        `);

        // Assets
        // CAMBIO IMPORTANTE: 'key' es reservada en MySQL, usamos 'asset_key'
        await connection.query(`
            CREATE TABLE IF NOT EXISTS assets (
                id VARCHAR(50) PRIMARY KEY,
                asset_key VARCHAR(100) UNIQUE, 
                label VARCHAR(100),
                url LONGTEXT,
                category VARCHAR(50)
            )
        `);

        // --- SEEDING ---

        // Configuración Inicial
        const [settingsRows] = await connection.query("SELECT id FROM settings WHERE id = 'config_v1'");
        if (settingsRows.length === 0) {
            await connection.query(`
                INSERT INTO settings (id, owner, cuit, bank, cbu, alias, mp_access_token, cancellation_hours, subscription_links_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, ['config_v1', 'GERARDO RAMON LAFUENTE', '20-37327496-7', 'Banco de Corrientes', '0940001000123456789012', 'GNM.TOUR.ARG', '', 72, '{}']);
            console.log('⚙️ Settings iniciales creados.');
        }

        // Usuario Admin
        const [userRows] = await connection.query("SELECT id FROM users WHERE email = ?", ['gerardolaf71@gmail.com']);
        if (userRows.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await connection.query(`
                INSERT INTO users (id, name, email, password_hash, role, membership_tier) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, ['u-admin-master', 'Gerardo Admin', 'gerardolaf71@gmail.com', hash, 'ADMIN', 'ELITE']);
            console.log('👤 Usuario Admin creado.');
        }

        // Assets Iniciales
        const [assetRows] = await connection.query("SELECT COUNT(*) as count FROM assets");
        if (assetRows[0].count === 0) {
            console.log("🖼️ Inicializando imágenes por defecto...");
            const insertAsset = "INSERT INTO assets (id, asset_key, label, url, category) VALUES (?, ?, ?, ?, ?)";
            await connection.query(insertAsset, ['a1', 'home_hero', 'Imagen Principal (Hero)', 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000', 'HERO']);
            await connection.query(insertAsset, ['a2', 'salon_main', 'Salón Niño Jesús Principal', 'https://images.unsplash.com/photo-1530103862676-de3c9a59af57?auto=format&fit=crop&q=80&w=1200', 'GALLERY']);
            await connection.query(insertAsset, ['a3', 'quincho_ext', 'Exterior Quincho', 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200', 'GALLERY']);
        }

        connection.release();
    } catch (error) {
        console.error('❌ Error fatal al inicializar MySQL:', error);
    }
};

initDB();

// --- HELPERS Y MIDDLEWARES ---
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

const getAccessToken = async () => {
    if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN.trim() !== '') {
        return process.env.MP_ACCESS_TOKEN;
    }
    const [rows] = await pool.query("SELECT mp_access_token FROM settings WHERE id = 'config_v1'");
    return rows.length > 0 ? rows[0].mp_access_token : null;
};

// --- ENDPOINT HEALTH CHECK (Hostinger) ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// --- RUTAS MERCADO PAGO ---
app.post('/api/mercadopago/create_preference', async (req, res) => {
    const { title, price, payer_email, userId, type, itemId } = req.body;
    if (!title || price <= 0 || !payer_email) return res.status(400).json({ error: "Datos inválidos" });

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) return res.status(400).json({ error: "Falta Access Token MP" });

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);
        
        const result = await preference.create({
            body: {
                items: [{ title, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
                payer: { email: payer_email },
                notification_url: `${BASE_URL}/api/mercadopago/webhook`, 
                external_reference: JSON.stringify({ user_id: userId, type, item_id: itemId }), 
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

                // Insert Ignore para idempotencia
                await pool.query(`
                    INSERT IGNORE INTO payments (id, mp_payment_id, user_id, item_type, item_id, amount, status, date_created) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [`pay-${Date.now()}`, id, user_id, type, item_id, paymentData.transaction_amount, 'approved', new Date().toISOString()]);

                if (type === 'MEMBERSHIP') {
                    const validUntil = new Date();
                    validUntil.setFullYear(validUntil.getFullYear() + 1); 
                    await pool.query(`UPDATE users SET membership_tier = ?, membership_validUntil = ? WHERE id = ?`,
                        [item_id, validUntil.toISOString(), user_id]);
                } else if (type === 'TOUR') {
                    await pool.query(`UPDATE users SET tripsCount = tripsCount + 1 WHERE id = ?`, [user_id]);
                }
            }
        } catch (error) { console.error("Webhook Error:", error); }
    }
    res.sendStatus(200);
});

// --- API ROUTES ---

// Settings
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM settings WHERE id = 'config_v1'");
        if (rows.length === 0) return res.json({});
        const row = rows[0];
        // Parsear JSON almacenado
        const subscriptionLinks = row.subscription_links_json ? JSON.parse(row.subscription_links_json) : {};
        // Ocultar token
        const { mp_access_token, subscription_links_json, ...publicData } = row;
        res.json({ 
            ...publicData, 
            cancellationHours: row.cancellation_hours || 72,
            subscriptionLinks 
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const { owner, cuit, bank, cbu, alias, mpAccessToken, cancellationHours, subscriptionLinks } = req.body;
    try {
        await pool.query(`
            UPDATE settings SET owner=?, cuit=?, bank=?, cbu=?, alias=?, mp_access_token=?, cancellation_hours=?, subscription_links_json=? WHERE id='config_v1'
        `, [owner, cuit, bank, cbu, alias, mpAccessToken, cancellationHours, JSON.stringify(subscriptionLinks || {})]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Assets (Imágenes)
app.get('/api/assets', async (req, res) => {
    try {
        // Mapeamos 'asset_key' a 'key' para que el frontend no se rompa
        const [rows] = await pool.query("SELECT id, asset_key as `key`, label, url, category FROM assets");
        res.json(rows);
    } catch (e) { res.status(500).json([]); }
});

app.put('/api/assets/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL" });

    try {
        const [result] = await pool.query("UPDATE assets SET url = ? WHERE id = ?", [url, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "No encontrado" });
        res.json({ message: "Actualizado" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Auth
app.post('/api/auth/login', rateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Datos incompletos" });

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = rows[0];
        if (!user) return res.status(400).json({ error: "Credenciales inválidas" });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Credenciales inválidas" });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        // Construir objeto user seguro
        const userSafe = { ...user, password_hash: undefined, membership: { tier: user.membership_tier, validUntil: user.membership_validUntil, usedThisMonth: user.membership_usedThisMonth }};
        res.json({ user: userSafe, token });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/auth/register', rateLimiter, async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || password.length < 6) return res.status(400).json({ error: "Datos inválidos" });

    const id = `u-${Date.now()}`;
    try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(`INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`, [id, name, email, hash]);
        res.status(201).json({ message: "Creado", userId: id });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Email ya registrado" });
        res.status(500).json({ error: "Error interno" });
    }
});

// Users (Admin Only)
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    try {
        const [rows] = await pool.query("SELECT * FROM users");
        // Convertir campos planos a objetos para el frontend
        const users = rows.map(u => ({
            ...u,
            password_hash: undefined,
            membership: {
                tier: u.membership_tier,
                validUntil: u.membership_validUntil,
                usedThisMonth: u.membership_usedThisMonth
            }
        }));
        res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Tours
app.get('/api/tours', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM tours");
        res.json(rows.map(t => ({ ...t, ...JSON.parse(t.data_json || '{}') })));
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/tours', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const t = req.body;
    const dataJson = JSON.stringify({ images: t.images, dates: t.dates, itinerary: t.itinerary, status: t.status });
    
    try {
        await pool.query(`
            INSERT INTO tours (id, destination, price, km, description, dates_start, capacity, data_json) 
            VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE 
            destination=VALUES(destination), price=VALUES(price), km=VALUES(km), description=VALUES(description),
            dates_start=VALUES(dates_start), capacity=VALUES(capacity), data_json=VALUES(data_json)
        `, [t.id, t.destination, t.price, t.km, t.description, t.dates.start, t.capacity, dataJson]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tours/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    try {
        await pool.query("DELETE FROM tours WHERE id = ?", [req.params.id]);
        res.json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Spaces
app.get('/api/spaces', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM spaces");
        res.json(rows.map(s => ({ ...s, ...JSON.parse(s.data_json || '{}') })));
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/spaces', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    const s = req.body;
    const dataJson = JSON.stringify({ images: s.images, rules: s.rules, availability: s.availability, damageDeposit: s.damageDeposit, cleaningFee: s.cleaningFee });

    try {
        await pool.query(`
            INSERT INTO spaces (id, name, type, price, capacity, description, data_json) 
            VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
            name=VALUES(name), type=VALUES(type), price=VALUES(price), capacity=VALUES(capacity),
            description=VALUES(description), data_json=VALUES(data_json)
        `, [s.id, s.name, s.type, s.price, s.capacity, s.description, dataJson]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/spaces/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'ADMIN') return res.sendStatus(403);
    try {
        await pool.query("DELETE FROM spaces WHERE id = ?", [req.params.id]);
        res.json({ message: "Deleted" });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
    res.status(200).send(`GNM Backend Activo. Verifique ./dist o ./build`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
