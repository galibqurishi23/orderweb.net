import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * Kitchen Customer Orders API
 * GET: Get customer order history for kitchen staff (3 months retention)
 */

interface OrderItem {
  order_item_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
  selected_addons?: any[];
}

interface CustomerOrder {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  order_type: string;
  order_status: string;
  fulfillment_date?: string;
  fulfillment_time?: string;
  special_instructions?: string;
  address?: string;
  created_at: string;
  items: OrderItem[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerPhone = searchParams.get('phone');
    const customerName = searchParams.get('name');
    const orderNumber = searchParams.get('orderNumber');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get tenant from headers
    const authHeader = request.headers.get('authorization');
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Optional: Verify kitchen staff authorization
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        
        // Check if user has kitchen access permissions
        const [staffRows] = await pool.execute(
          'SELECT role FROM tenant_staff WHERE id = ? AND tenant_id = ?',
          [decoded.userId, tenantId]
        );

        const staff = (staffRows as any[])[0];
        if (!staff || !['admin', 'kitchen', 'manager'].includes(staff.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions for kitchen access' },
            { status: 403 }
          );
        }
      } catch (error) {
        // Continue without auth if token is invalid (for now)
        console.log('Token verification failed, continuing without auth');
      }
    }

    // Build search conditions
    let whereConditions = ['o.tenant_id = ?'];
    let queryParams: any[] = [tenantId];

    // Filter orders to last 3 months only
    whereConditions.push('o.createdAt >= DATE_SUB(NOW(), INTERVAL 3 MONTH)');

    if (customerPhone) {
      whereConditions.push('o.customerPhone LIKE ?');
      queryParams.push(`%${customerPhone}%`);
    }

    if (customerName) {
      whereConditions.push('o.customerName LIKE ?');
      queryParams.push(`%${customerName}%`);
    }

    if (orderNumber) {
      whereConditions.push('o.orderNumber LIKE ?');
      queryParams.push(`%${orderNumber}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count for pagination
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `, queryParams);

    const totalCount = (countResult as any[])[0].total;

    // Get orders with pagination
    const [orderRows] = await pool.execute(`
      SELECT 
        o.id as order_id,
        o.orderNumber as order_number,
        o.customerId as customer_id,
        o.customerName as customer_name,
        o.customerPhone as customer_phone,
        o.total as total_amount,
        o.orderType as order_type,
        o.status as order_status,
        o.scheduledTime as fulfillment_date,
        NULL as fulfillment_time,
        o.specialInstructions as special_instructions,
        o.address,
        o.createdAt as created_at
      FROM orders o
      ${whereClause}
      ORDER BY o.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const orders = orderRows as any[];

    // Get order items for each order
    const ordersWithItems: CustomerOrder[] = [];
    
    for (const order of orders) {
      const [itemRows] = await pool.execute(`
        SELECT 
          oi.id as order_item_id,
          oi.menuItemId as menu_item_id,
          mi.name as menu_item_name,
          oi.quantity,
          mi.price as unit_price,
          oi.specialInstructions as special_instructions,
          oi.selectedAddons as selected_addons
        FROM order_items oi
        LEFT JOIN menu_items mi ON oi.menuItemId = mi.id
        WHERE oi.orderId = ?
        ORDER BY oi.id
      `, [order.order_id]);

      const items = (itemRows as any[]).map(item => ({
        order_item_id: item.order_item_id,
        menu_item_id: item.menu_item_id,
        menu_item_name: item.menu_item_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        special_instructions: item.special_instructions,
        selected_addons: item.selected_addons ? JSON.parse(item.selected_addons) : []
      }));

      ordersWithItems.push({
        order_id: order.order_id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        total_amount: parseFloat(order.total_amount),
        order_type: order.order_type,
        order_status: order.order_status,
        fulfillment_date: order.fulfillment_date,
        fulfillment_time: order.fulfillment_time,
        special_instructions: order.special_instructions,
        address: order.address,
        created_at: order.created_at,
        items
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersWithItems,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        },
        summary: {
          totalOrdersLast3Months: totalCount,
          dataRetentionNote: "Orders older than 3 months are automatically archived"
        }
      }
    });

  } catch (error) {
    console.error('Error fetching kitchen customer orders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch customer orders for kitchen',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
