import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Helper function to validate API key
async function validateApiKey(tenant: string, apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'dinedesk_db'
    });

    const [rows] = await connection.execute(
      'SELECT id FROM tenants WHERE slug = ? AND pos_api_key = ?',
      [tenant, apiKey]
    );

    await connection.end();
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string; phone: string } }
) {
  try {
    const tenant = params.tenant;
    const phone = params.phone;
    const apiKey = request.headers.get('x-api-key');
    const tenantHeader = request.headers.get('x-tenant-id');

    // Validate headers
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing X-API-Key header'
      }, { status: 401 });
    }

    if (tenantHeader !== tenant) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID mismatch'
      }, { status: 403 });
    }

    // Validate API key
    const isValid = await validateApiKey(tenant, apiKey);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key'
      }, { status: 401 });
    }

    // Connect to tenant database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `dinedesk_${tenant}`
    });

    // Fetch customer by phone
    const [customers] = await connection.execute(`
      SELECT 
        id,
        name,
        email,
        phone,
        loyaltyPoints,
        totalSpent,
        createdAt
      FROM customers
      WHERE phone = ?
      LIMIT 1
    `, [phone]);

    const customerArray = customers as any[];
    
    if (customerArray.length === 0) {
      await connection.end();
      return NextResponse.json({
        success: false,
        error: 'Customer not found',
        data: {
          phone: phone,
          points: 0,
          isNewCustomer: true
        }
      }, { status: 404 });
    }

    const customer = customerArray[0];

    // Get recent transactions
    const [transactions] = await connection.execute(`
      SELECT 
        points_earned,
        points_redeemed,
        order_id,
        created_at
      FROM pos_loyalty_transactions
      WHERE customer_phone = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [phone]);

    await connection.end();

    return NextResponse.json({
      success: true,
      data: {
        phone: customer.phone,
        customerName: customer.name,
        email: customer.email,
        points: parseInt(customer.loyaltyPoints) || 0,
        totalSpent: parseFloat(customer.totalSpent) || 0,
        memberSince: customer.createdAt,
        recentTransactions: transactions
      }
    });

  } catch (error) {
    console.error('Loyalty points error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch loyalty points'
    }, { status: 500 });
  }
}
