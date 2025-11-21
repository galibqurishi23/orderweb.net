import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Print Acknowledgment API - POS devices call this after printing
 * POST /api/pos/orders/ack
 * 
 * Purpose: Track whether orders were successfully printed or failed
 * Called by POS immediately after print attempt
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate - Extract API key from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);

    // 2. Parse request body
    const body = await req.json();
    const { tenant, order_id, status, printed_at, device_id, reason } = body;

    // 3. Validate required fields
    if (!tenant || !order_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant, order_id, status' },
        { status: 400 }
      );
    }

    // 4. Validate status value
    if (!['printed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "printed" or "failed"' },
        { status: 400 }
      );
    }

    console.log(`📥 ACK received: Order ${order_id}, Status: ${status}, Device: ${device_id || 'unknown'}`);

    // 5. Try device-level authentication first (new system), fall back to tenant-level
    let tenantData: any = null;
    let authenticatedDeviceId: string | null = null;

    // Try device-level authentication
    const [deviceRows] = await db.execute(
      `SELECT d.*, t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug 
       FROM pos_devices d
       JOIN tenants t ON d.tenant_id = t.id
       WHERE d.api_key = ? AND d.is_active = TRUE AND t.slug = ?`,
      [apiKey, tenant]
    );

    if (Array.isArray(deviceRows) && deviceRows.length > 0) {
      // Device-level authentication successful
      const device = deviceRows[0] as any;
      tenantData = {
        id: device.tenant_id,
        name: device.tenant_name,
        slug: device.tenant_slug
      };
      authenticatedDeviceId = device.device_id;
      
      // Update device heartbeat
      await db.execute(
        'UPDATE pos_devices SET last_seen_at = NOW(), last_heartbeat_at = NOW() WHERE device_id = ?',
        [authenticatedDeviceId]
      );
      
      console.log(`✅ Device authenticated: ${authenticatedDeviceId}`);
    } else {
      // Fall back to tenant-level authentication (backward compatibility)
      const [tenantRows] = await db.execute(
        'SELECT id, name, slug FROM tenants WHERE slug = ? AND pos_api_key = ?',
        [tenant, apiKey]
      );

      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid tenant or API key' },
          { status: 401 }
        );
      }

      tenantData = tenantRows[0] as any;
      console.log(`✅ Tenant authenticated (legacy): ${tenantData.name}`);
    }

    // 6. Find order
    const [orderRows] = await db.execute(
      'SELECT id, orderNumber, status FROM orders WHERE id = ? AND tenant_id = ?',
      [order_id, tenantData.id]
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json(
        { error: `Order ${order_id} not found` },
        { status: 404 }
      );
    }

    const order = orderRows[0] as any;

    // 7. Prepare update data
    const printedAtValue = printed_at ? new Date(printed_at) : new Date();
    // Use authenticated device ID if available, otherwise use device_id from request
    const deviceIdValue = authenticatedDeviceId || device_id || 'unknown';
    const errorValue = status === 'failed' && reason ? reason : null;

    // 8. Update order print status
    await db.execute(
      `UPDATE orders 
       SET print_status = ?,
           print_status_updated_at = ?,
           last_pos_device_id = ?,
           last_print_error = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [status, printedAtValue, deviceIdValue, errorValue, order_id]
    );

    // 9. Log the event
    const logMessage = status === 'printed' 
      ? `✅ Order ${order.orderNumber} printed successfully by ${deviceIdValue}`
      : `❌ Order ${order.orderNumber} print failed by ${deviceIdValue}: ${reason || 'Unknown error'}`;
    
    console.log(logMessage);

    // 10. Log to pos_sync_logs if table exists
    try {
      await db.execute(
        `INSERT INTO pos_sync_logs (event_type, event_data, status, created_at) 
         VALUES (?, ?, ?, NOW())`,
        [
          'print_acknowledgment',
          JSON.stringify({
            order_id,
            order_number: order.orderNumber,
            print_status: status,
            device_id: deviceIdValue,
            reason: errorValue,
            printed_at: printedAtValue
          }),
          status === 'printed' ? 'success' : 'failed'
        ]
      );
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('⚠️ Failed to log to pos_sync_logs:', logError);
    }

    // 11. Optional: Trigger alerts if print failed
    if (status === 'failed') {
      console.error(`🚨 ALERT: Print failed for order ${order.orderNumber} on device ${deviceIdValue}`);
      // TODO: Send email/SMS alert to restaurant owner
      // TODO: Create notification in admin dashboard
    }

    // 12. Return success response
    return NextResponse.json({
      success: true,
      message: `Order ${order.orderNumber} marked as ${status}`,
      order: {
        order_number: order.orderNumber,
        print_status: status,
        updated_at: printedAtValue.toISOString(),
        device_id: deviceIdValue
      }
    });

  } catch (error) {
    console.error('❌ ACK endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check ACK status of an order
 * Optional - for debugging
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing order_id parameter' },
        { status: 400 }
      );
    }

    const [rows] = await db.execute(
      `SELECT 
        id,
        orderNumber,
        print_status,
        print_status_updated_at,
        last_pos_device_id,
        last_print_error,
        websocket_sent,
        websocket_sent_at
       FROM orders 
       WHERE id = ?`,
      [orderId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: rows[0]
    });

  } catch (error) {
    console.error('Error fetching order status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
