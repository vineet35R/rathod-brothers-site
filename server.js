const express = require('express');
const { Pool } = require('pg');
if (process.env.NODE_ENV!=="production"){
require('dotenv').config(); // Load environment variables from .env file
}
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies from POST requests
app.use(express.json());

// Serve static files with caching
app.use(express.static('public', {
    maxAge: '1d', // Cache enabled for production performance
    etag: false
}));

// Database Connection Configuration (Cloud & Local Support)
const dbConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for most cloud databases (Render, Neon, etc.)
        }
    }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'postgres',
        password: '203035',
        port: 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };

const pool = new Pool(dbConfig);

// Create Tables if Not Exists
async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                email VARCHAR(100),
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                phone VARCHAR(50),
                email VARCHAR(100),
                time VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Database Tables Verified/Created");
    } catch (err) {
        console.error("❌ Error creating tables:", err);
    }
}
createTables();
// API Endpoint to Save Appointment
app.post('/api/appointments', async (req, res) => {
    const { name, phone, email, time } = req.body;
    console.log(`📅 NEW APPOINTMENT: ${name}, ${time}`);

    try {
        const query = 'INSERT INTO appointments (name, phone, email, time) VALUES ($1, $2, $3, $4) RETURNING *';
        await pool.query(query, [name, phone, email, time]); // Corrected values array
        res.json({ success: true });
    } catch (err) {
        console.error('❌ DB Error (Appointment):', err);
        res.status(500).json({ success: false });
    }
});

// API Endpoint to handle contact form submissions
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    console.log('----------------------------------------');
    console.log('NEW CONTACT FORM SUBMISSION:');
    console.log(`Name: ${name}`);
    console.log(`Email: ${email}`);
    console.log(`Message: ${message}`);
    console.log('----------------------------------------');

    try {
        const query = 'INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING *';
        const values = [name, email, message];

        await pool.query(query, values);

        console.log('✅ Saved to Database');

        res.json({
            status: 'success',
            message: 'Your message has been received and saved!'
        });
    } catch (err) {
        console.error('❌ Database Error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to save message to database.'
        });
    }
});

// API Endpoint to get all messages (for Admin Dashboard)
app.get('/api/messages', async (req, res) => {
    try {
        // Fetch all messages, ordered by ID descending (newest first)
        const result = await pool.query('SELECT * FROM contact_messages ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Database Fetch Error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// API Endpoint for Admin Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;

    // Use process.env.ADMIN_PASSWORD for security
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Password' });
    }
});

// API Endpoint to Delete a Message
app.delete('/api/messages/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ success: false, message: 'Database Error' });
    }
});

// --- APPOINTMENT ENDPOINTS ---

// API Endpoint to Get All Appointments
app.get('/api/appointments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        // If table doesn't exist yet, return empty
        if (err.code === '42P01') return res.json([]);
        console.error('Error fetching appointments:', err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// API Endpoint to Delete Appointment
app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({ success: false, message: 'Database Error' });
    }
});
app.get("/",(req,res) =>{
    res.send("Rathod Brohters Backend is live")
});
// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running!`);
    console.log(`Local Access:  http://localhost:${port}`);
    console.log(`Mobile Access: http://192.168.1.12:${port}`);
});
