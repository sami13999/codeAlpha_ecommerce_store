const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00',
  decimalNumbers: true
});

/**
 * Execute a transaction block with automatic commit and rollback
 * @param {Function} callback - async function(connection)
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Test database connectivity
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (Thread ID: ${conn.threadId})`);
    conn.release();
    return true;
  } catch (err) {
    console.error(`[Database] Connection Error: ${err.message}`);
    throw err;
  }
}

pool.withTransaction = withTransaction;
pool.testConnection = testConnection;

module.exports = pool;
