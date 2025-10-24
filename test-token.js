// dotenv is already loaded by ecosystem
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXN0b21lcklkIjoiNjY0MzEwNjctMzZiYi00NDBkLWI4ZmUtMTllMGM5NmM4YTMwIiwidGVuYW50SWQiOiIyYjgyYWNlZS00NTBhLTRmMzUtYTc2Zi1jMzg4ZDcwOTU0NWUiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiY3VzdG9tZXIiLCJpYXQiOjE3NjA4Njk3NDUsImV4cCI6MTc2MTQ3NDU0NX0.7KMTQp4clE-7HHdNVbmuWnMZOifBKEDWUTTW12KSeZI';

console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');

// Try different secrets
const secrets = [
  process.env.JWT_SECRET,
  process.env.NEXTAUTH_SECRET,
  'customer-secret-key'
].filter(Boolean);

console.log('\nTrying', secrets.length, 'secrets...\n');

secrets.forEach((secret, i) => {
  try {
    const decoded = jwt.verify(token, secret);
    console.log(`✅ SUCCESS with secret #${i+1}:`, secret.substring(0, 30) + '...');
    console.log('Decoded:', JSON.stringify(decoded, null, 2));
  } catch (err) {
    console.log(`❌ FAILED with secret #${i+1}:`, secret.substring(0, 30) + '...', '-', err.message);
  }
});

// Test the CustomerAuthService logic
(async () => {
  const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'customer-secret-key';
  console.log('\nUsing JWT_SECRET:', JWT_SECRET.substring(0, 30) + '...');
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified!', decoded);
    
    // Check customer in DB
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'dinedesk_db'
    });
    
    const [customers] = await connection.execute(
      'SELECT * FROM customers WHERE id = ? AND tenant_id = ?',
      [decoded.customerId, decoded.tenantId]
    );
    
    console.log('Customer found:', customers.length > 0 ? 'YES' : 'NO');
    if (customers.length > 0) {
      console.log('Customer:', customers[0].email, customers[0].name);
    }
    
    await connection.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
