// Check tenant slug for customer
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'dinedesk_db',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function checkTenant() {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    
    // Get tenant info
    const [tenants] = await connection.execute(
      'SELECT id, name, slug FROM tenants WHERE id = ?',
      ['2b82acee-450a-4f35-a76f-c388d709545e']
    );
    
    if (tenants.length > 0) {
      const tenant = tenants[0];
      console.log('✅ Tenant found:', {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      });
      console.log(`🔗 Dashboard URL should be: /${tenant.slug}/customer/dashboard`);
    } else {
      console.log('❌ Tenant not found');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

checkTenant();