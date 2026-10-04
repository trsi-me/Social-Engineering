require('dotenv').config();
const mysql = require('mysql2/promise');

const rawHost = process.env.DB_HOST || '127.0.0.1';
const dbHost = rawHost === 'localhost' ? '127.0.0.1' : rawHost;

const pool = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'social_engineering',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  connectTimeout: 10000
});

module.exports = pool;
