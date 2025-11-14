// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

async function testAppDB() {
  try {
    // Use same config as the app
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'dinedesk_db',
    });
    
    console.log('Using config:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('Database:', process.env.DB_NAME || 'dinedesk_db');
    
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
    
    console.log('App config DB records:', rows.length);
    console.log('Records:', rows);
    
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
  }
}

testAppDB();
