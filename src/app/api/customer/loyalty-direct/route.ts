import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'orderweb_db',
  charset: 'utf8mb4'
};

export async function POST(request: NextRequest) {
  let connection;
  
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('🎯 [LOYALTY-DIRECT] Looking up loyalty data for phone:', phone);

    connection = await mysql.createConnection(dbConfig);

    // First, check if this phone exists in loyalty_phone_lookup
    const [lookupRows] = await connection.execute(
      'SELECT customer_id FROM loyalty_phone_lookup WHERE phone = ?',
      [phone]
    );

    if (!Array.isArray(lookupRows) || lookupRows.length === 0) {
      console.log('❌ [LOYALTY-DIRECT] No customer found for phone:', phone);
      return NextResponse.json({
        success: false,
        error: 'No customer found for this phone number'
      });
    }

    const customerId = (lookupRows[0] as any).customer_id;
    console.log('🔍 [LOYALTY-DIRECT] Found customer ID:', customerId);

    // Get loyalty data for this customer
    const [loyaltyRows] = await connection.execute(
      `SELECT 
        clp.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM customer_loyalty_points clp
      LEFT JOIN customers c ON c.id = clp.customer_id
      WHERE clp.customer_id = ?`,
      [customerId]
    );

    if (!Array.isArray(loyaltyRows) || loyaltyRows.length === 0) {
      console.log('❌ [LOYALTY-DIRECT] No loyalty data found for customer ID:', customerId);
      return NextResponse.json({
        success: false,
        error: 'No loyalty data found for this customer'
      });
    }

    const loyaltyData = loyaltyRows[0] as any;
    console.log('✅ [LOYALTY-DIRECT] Found loyalty data:', {
      pointsBalance: loyaltyData.points_balance,
      tier: loyaltyData.tier,
      customerName: loyaltyData.customer_name
    });

    const response = {
      success: true,
      loyalty: {
        pointsBalance: parseInt(loyaltyData.points_balance) || 0,
        pointsEarned: parseInt(loyaltyData.points_earned) || 0,
        pointsRedeemed: parseInt(loyaltyData.points_redeemed) || 0,
        tier: loyaltyData.tier || 'Bronze',
        customerName: loyaltyData.customer_name,
        customerEmail: loyaltyData.customer_email,
        customerPhone: loyaltyData.customer_phone
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [LOYALTY-DIRECT] Database error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}