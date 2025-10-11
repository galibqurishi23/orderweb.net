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
  { params }: { params: { tenant: string } }
) {
  try {
    const tenant = params.tenant;
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

    // Fetch pending orders (online orders only, not from POS)
    const [orders] = await connection.execute(`
      SELECT 
        id,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        address,
        delivery_address,
        total,
        subtotal,
        deliveryFee,
        discount,
        tax,
        status,
        orderType,
        paymentMethod,
        specialInstructions,
        isAdvanceOrder,
        scheduledTime,
        printed,
        createdAt,
        updated_at as updatedAt
      FROM orders
      WHERE status IN ('confirmed', 'preparing')
      ORDER BY createdAt DESC
      LIMIT 50
    `);

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      (orders as any[]).map(async (order) => {
        const [items] = await connection.execute(`
          SELECT 
            oi.id,
            oi.menuItemId,
            oi.quantity,
            oi.selectedAddons,
            oi.specialInstructions,
            mi.name,
            mi.price
          FROM order_items oi
          LEFT JOIN menu_items mi ON oi.menuItemId = mi.id
          WHERE oi.orderId = ?
        `, [order.id]);

        return {
          ...order,
          items: items
        };
      })
    );

    await connection.end();

    return NextResponse.json({
      success: true,
      data: {
        count: ordersWithItems.length,
        orders: ordersWithItems
      }
    });

  } catch (error) {
    console.error('Orders pending error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch pending orders'
    }, { status: 500 });
  }
}
