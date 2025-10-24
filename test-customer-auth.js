// Test customer authentication debug script
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-here-1753033833777';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'dinedesk_db',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function testCustomerAuth() {
  try {
    console.log('🔍 Testing customer authentication...');
    console.log('JWT_SECRET:', JWT_SECRET ? 'SET' : 'NOT SET');
    
    // Connect to database
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Database connected');
    
    // Check if customer exists
    const [customers] = await connection.execute(
      'SELECT id, name, email, phone, tenant_id FROM customers WHERE email = ?',
      ['gqurishi@live.com']
    );
    
    if (customers.length > 0) {
      const customer = customers[0];
      console.log('✅ Customer found:', {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        tenant_id: customer.tenant_id
      });
      
      // Test JWT token generation
      const testToken = jwt.sign(
        { 
          customerId: customer.id,
          tenantId: customer.tenant_id,
          email: customer.email,
          type: 'customer'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('✅ Test token generated');
      
      // Test JWT token verification
      const decoded = jwt.verify(testToken, JWT_SECRET);
      console.log('✅ Token verification successful:', {
        customerId: decoded.customerId,
        tenantId: decoded.tenantId,
        type: decoded.type
      });
      
    } else {
      console.log('❌ Customer not found with email: gqurishi@live.com');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCustomerAuth();