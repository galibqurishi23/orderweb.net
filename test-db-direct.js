const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'dinedesk_db'
    });
    
    console.log('Database connection successful');
    
    const [rows] = await connection.execute(
      'SELECT * FROM pending_license_activations ORDER BY created_at DESC'
    );
    
    console.log('Pending activations from direct DB query:');
    console.log(JSON.stringify(rows, null, 2));
    
    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
  }
}

testDatabase();
