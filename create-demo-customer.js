const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createDemoCustomer() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'dinedesk_db'
  });

  try {
    console.log('Creating demo customer...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('demo123456', 12);
    
    // Insert demo customer
    const [result] = await connection.execute(`
      INSERT INTO customers (name, email, phone, password, tenant_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
      password = VALUES(password),
      phone = VALUES(phone),
      updated_at = NOW()
    `, [
      'Demo Customer',
      'demo.customer@orderweb.com',
      '+44 7890 123456',
      hashedPassword,
      1
    ]);

    console.log('Demo customer created with ID:', result.insertId || 'existing customer updated');
    
    // Verify the customer exists
    const [customers] = await connection.execute(
      'SELECT id, name, email, phone FROM customers WHERE email = ? AND tenant_id = ?',
      ['demo.customer@orderweb.com', 1]
    );
    
    if (customers.length > 0) {
      console.log('✅ Demo customer verified:', customers[0]);
      
      // Check for loyalty data
      const customerId = customers[0].id;
      const [loyalty] = await connection.execute(
        'SELECT * FROM loyalty_phone_lookup WHERE phone = ? AND tenant_id = ?',
        ['+44 7890 123456', 1]
      );
      
      if (loyalty.length === 0) {
        console.log('Creating loyalty record...');
        
        // Create loyalty record
        await connection.execute(`
          INSERT INTO loyalty_phone_lookup (
            phone, display_phone, loyalty_card_number, tenant_id, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, NOW(), NOW())
        `, [
          '+44 7890 123456',
          '+44 7890 123456',
          'DEMO-GOLD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          1
        ]);
        
        // Create loyalty points
        await connection.execute(`
          INSERT INTO customer_loyalty_points (
            phone, tenant_id, points_balance, total_points_earned,
            total_points_redeemed, tier_level, next_tier_points,
            total_orders, total_spent, joined_date, last_order_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          '+44 7890 123456',
          1,
          2550, // Gold tier with 2550+ points as mentioned in demo
          3000,
          450,
          'GOLD',
          0,
          15,
          275.50
        ]);
        
        console.log('✅ Loyalty data created with 2550 points');
      } else {
        console.log('✅ Loyalty data already exists:', loyalty[0]);
      }
    } else {
      console.error('❌ Failed to create demo customer');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

createDemoCustomer();