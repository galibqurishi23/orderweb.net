// Test with fresh connection - bypassing the app's connection pool
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testFreshConnection() {
  let connection = null;
  try {
    // Create brand new connection (not from pool)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'dinedesk_db',
    });
    
    console.log('=== FRESH CONNECTION TEST ===');
    
    // Get data with fresh connection
    const [rows] = await connection.execute(
      `SELECT 
        id,
        activation_key,
        license_key,
        duration_days,
        expiration_date,
        created_at,
        notes
       FROM pending_license_activations 
       ORDER BY created_at DESC`
    );
    
    console.log('Fresh connection result:', rows.length, 'records');
    console.log('Records:', rows);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testFreshConnection();