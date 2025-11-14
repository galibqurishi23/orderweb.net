const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'dinedesk_db'
    });
    
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM pending_license_activations'
    );
    
    console.log('Direct DB count:', rows[0].count);
    
    const [allRows] = await connection.execute(
      'SELECT * FROM pending_license_activations ORDER BY created_at DESC'
    );
    
    console.log('Direct DB records:', allRows);
    
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
  }
}

testDatabase();
