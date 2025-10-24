import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const status = searchParams.get('status') || 'all';
    const range = searchParams.get('range') || '3months';

    // Build date filter based on range
    let dateFilter = '';
    switch (range) {
      case '1month':
        dateFilter = 'AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case '3months':
        dateFilter = 'AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
      case '6months':
        dateFilter = 'AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
        break;
      case '1year':
        dateFilter = 'AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateFilter = 'AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
    }

    // Build status filter
    let statusFilter = '';
    if (status !== 'all') {
      statusFilter = 'AND o.status = ?';
    }

    // Get orders
    const params: any[] = [customerId, tenantId];
    if (status !== 'all') {
      params.push(status);
    }
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await db.execute(`
      SELECT 
        o.id,
        o.total,
        o.status,
        o.createdAt as created_at,
        o.address as delivery_address,
        o.specialInstructions as special_instructions,
        o.orderType as order_type,
        o.paymentMethod as payment_method,
        o.orderNumber as order_number,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.orderId
      WHERE o.customerId = ? 
      AND o.tenant_id = ? 
      ${statusFilter}
      ${dateFilter}
      GROUP BY o.id
      ORDER BY o.createdAt DESC
      LIMIT ? OFFSET ?
    `, params);

    console.log('🔍 Database query executed, found', (orders as any[]).length, 'orders');
    console.log('📊 Query params:', params);

    // Get total count for pagination
    const countParams = [customerId, tenantId];
    if (status !== 'all') {
      countParams.push(status);
    }

    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM orders o
      WHERE o.customerId = ? 
      AND o.tenant_id = ? 
      ${statusFilter}
      ${dateFilter}
    `, countParams);

    const totalOrders = (countResult as any[])[0]?.total || 0;

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders as any[]).map(async (order) => {
        const [items] = await db.execute(`
          SELECT 
            oi.id,
            oi.quantity,
            mi.price,
            oi.specialInstructions as customizations,
            mi.name
          FROM order_items oi
          LEFT JOIN menu_items mi ON oi.menuItemId = mi.id
          WHERE oi.orderId = ?
          ORDER BY oi.id
        `, [order.id]);

        return {
          id: order.id,
          orderNumber: order.order_number || `ORD-${order.id.toString().slice(-6)}`,
          date: new Date(order.created_at).toLocaleDateString('en-GB'),
          time: new Date(order.created_at).toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          createdAt: order.created_at, // Add original timestamp
          status: order.status,
          total: parseFloat(order.total),
          items: (items as any[]).map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: parseFloat(item.price),
            customizations: item.customizations ? (typeof item.customizations === 'string' ? [item.customizations] : item.customizations) : []
          })),
          deliveryAddress: order.delivery_address,
          orderType: order.order_type || 'delivery',
          paymentMethod: order.payment_method || 'cash',
          loyaltyPointsEarned: Math.floor(parseFloat(order.total)),
          items_count: order.items_count
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      pagination: {
        total: totalOrders,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalOrders
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
