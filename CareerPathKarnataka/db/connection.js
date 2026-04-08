// db/connection.js
const mysql = require('mysql2/promise');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'careerpath_karnataka',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30'
}); 

async function testConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL Connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL Connection failed:', err.message);
        console.error('   Check your .env DB credentials and ensure MySQL is running');
    }
}

module.exports = { pool, testConnection };
