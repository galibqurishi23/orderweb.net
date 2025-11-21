import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Order History with Advanced Filtering
 * For detailed order lookup and investigation
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Filters
    const tenantSlug = searchParams.get('tenant');
    const printStatus = searchParams.get('print_status'); // pending, sent_to_pos, printed, failed
    const orderStatus = searchParams.get('order_status'); // confirmed, cancelled
    const deviceId = searchParams.get('device_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const orderNumber = searchParams.get('order_number');
    const customerPhone = searchParams.get('customer_phone');
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (tenantSlug) {
      conditions.push('t.slug = ?');
      params.push(tenantSlug);
    }

    if (printStatus) {
      conditions.push('o.print_status = ?');
      params.push(printStatus);
    }

    if (orderStatus) {
      conditions.push('o.status = ?');
      params.push(orderStatus);
    }

    if (deviceId) {
      conditions.push('o.last_pos_device_id = ?');
      params.push(deviceId);
    }

    if (dateFrom) {
      conditions.push('o.createdAt >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('o.createdAt <= ?');
      params.push(dateTo);
    }

    if (orderNumber) {
      conditions.push('o.orderNumber LIKE ?');
      params.push(`%${orderNumber}%`);
    }

    if (customerPhone) {
      conditions.push('o.customerPhone LIKE ?');
      params.push(`%${customerPhone}%`);
    }

    // Default to last 7 days if no date filter
    if (!dateFrom && !dateTo) {
      conditions.push('o.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total
       FROM orders o
       JOIN tenants t ON o.tenant_id = t.id
       ${whereClause}`,
      params
    );

    const totalOrders = (countRows[0] as any).total;
    const totalPages = Math.ceil(totalOrders / limit);

    // Get orders
    const [orderRows] = await db.execute(
      `SELECT 
        o.id,
        o.orderNumber,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.total,
        o.status as order_status,
        o.orderType,
        o.paymentMethod,
        o.createdAt,
        o.scheduledTime,
        o.specialInstructions,
        o.print_status,
        o.print_status_updated_at,
        o.last_pos_device_id,
        o.last_print_error,
        o.websocket_sent,
        o.websocket_sent_at,
        t.name as tenant_name,
        t.slug as tenant_slug,
        d.device_name,
        TIMESTAMPDIFF(SECOND, o.websocket_sent_at, o.print_status_updated_at) as print_time_seconds
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      LEFT JOIN pos_devices d ON o.last_pos_device_id = d.device_id
      ${whereClause}
      ORDER BY o.createdAt DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Transform to include timeline
    const orders = (orderRows as any[]).map(order => {
      const timeline: any[] = [];

      // Order created
      timeline.push({
        event: 'order_created',
        timestamp: order.createdAt,
        status: 'pending',
        message: `Order ${order.orderNumber} created`
      });

      // WebSocket sent
      if (order.websocket_sent && order.websocket_sent_at) {
        timeline.push({
          event: 'websocket_sent',
          timestamp: order.websocket_sent_at,
          status: 'sent_to_pos',
          message: 'Order sent to POS via WebSocket'
        });
      }

      // Print status updated
      if (order.print_status_updated_at) {
        const event = order.print_status === 'printed' ? 'print_success' : 
                      order.print_status === 'failed' ? 'print_failed' : 'print_status_updated';
        
        timeline.push({
          event,
          timestamp: order.print_status_updated_at,
          status: order.print_status,
          message: order.print_status === 'printed' 
            ? `Printed by ${order.device_name || order.last_pos_device_id || 'Unknown device'}` 
            : order.print_status === 'failed'
            ? `Print failed: ${order.last_print_error || 'Unknown error'}`
            : 'Print status updated',
          device: order.last_pos_device_id,
          device_name: order.device_name,
          error: order.last_print_error
        });
      }

      return {
        id: order.id,
        order_number: order.orderNumber,
        tenant: {
          name: order.tenant_name,
          slug: order.tenant_slug
        },
        customer: {
          name: order.customerName,
          phone: order.customerPhone,
          email: order.customerEmail
        },
        order_details: {
          total: parseFloat(order.total),
          order_type: order.orderType,
          payment_method: order.paymentMethod,
          created_at: order.createdAt,
          scheduled_time: order.scheduledTime,
          special_instructions: order.specialInstructions
        },
        status: {
          order_status: order.order_status,
          print_status: order.print_status
        },
        print_info: {
          websocket_sent: order.websocket_sent,
          websocket_sent_at: order.websocket_sent_at,
          device_id: order.last_pos_device_id,
          device_name: order.device_name,
          print_time_seconds: order.print_time_seconds,
          print_error: order.last_print_error,
          print_status_updated_at: order.print_status_updated_at
        },
        timeline
      };
    });

    // Get filter summary
    const [summaryRows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN o.print_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN o.print_status = 'sent_to_pos' THEN 1 ELSE 0 END) as sent_to_pos,
        SUM(CASE WHEN o.print_status = 'printed' THEN 1 ELSE 0 END) as printed,
        SUM(CASE WHEN o.print_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      ${whereClause}`,
      params
    );

    const summary = summaryRows[0] as any;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      
      pagination: {
        page,
        limit,
        total_orders: totalOrders,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      
      filters: {
        tenant: tenantSlug,
        print_status: printStatus,
        order_status: orderStatus,
        device_id: deviceId,
        date_from: dateFrom,
        date_to: dateTo,
        order_number: orderNumber,
        customer_phone: customerPhone
      },
      
      summary: {
        total_in_filter: summary.total,
        pending: summary.pending,
        sent_to_pos: summary.sent_to_pos,
        printed: summary.printed,
        failed: summary.failed
      },
      
      orders
    });

  } catch (error) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch order history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
