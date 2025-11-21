import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POS Health Monitoring API
 * Shows device status, unprinted orders, and alerts
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Add admin authentication
    
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let whereClause = '';
    let whereParams: any[] = [];

    // Filter by tenant if specified
    if (tenantSlug) {
      const [tenantRows] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenantSlug]
      );

      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      whereClause = 'WHERE d.tenant_id = ?';
      whereParams = [(tenantRows[0] as any).id];
    }

    // Get all active devices with tenant info
    const [deviceRows] = await db.execute(
      `SELECT 
        d.id,
        d.device_id,
        d.device_name,
        d.is_active,
        d.last_seen_at,
        d.last_heartbeat_at,
        d.created_at,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM pos_devices d
      JOIN tenants t ON d.tenant_id = t.id
      ${whereClause}
      ORDER BY d.tenant_id, d.created_at DESC`,
      whereParams
    );

    // Calculate device status
    const deviceStatus = (deviceRows as any[]).map(device => {
      const isOnline = device.last_seen_at && new Date(device.last_seen_at) > tenMinutesAgo;
      const offlineDuration = device.last_seen_at 
        ? Math.floor((now.getTime() - new Date(device.last_seen_at).getTime()) / 60000)
        : null;

      return {
        device_id: device.device_id,
        device_name: device.device_name,
        tenant_name: device.tenant_name,
        tenant_slug: device.tenant_slug,
        is_active: device.is_active,
        status: !device.is_active ? 'disabled' : (isOnline ? 'online' : 'offline'),
        last_seen: device.last_seen_at ? new Date(device.last_seen_at).toISOString() : null,
        last_heartbeat: device.last_heartbeat_at ? new Date(device.last_heartbeat_at).toISOString() : null,
        offline_duration_minutes: offlineDuration,
        created_at: device.created_at
      };
    });

    // Get unprinted orders (last 24 hours)
    const unprintedQuery = tenantSlug 
      ? `SELECT o.id, o.orderNumber, o.createdAt, o.print_status, t.name as tenant_name, t.slug as tenant_slug
         FROM orders o
         JOIN tenants t ON o.tenant_id = t.id
         WHERE o.createdAt >= ? 
         AND o.print_status IN ('pending', 'sent_to_pos')
         AND t.slug = ?
         ORDER BY o.createdAt DESC`
      : `SELECT o.id, o.orderNumber, o.createdAt, o.print_status, t.name as tenant_name, t.slug as tenant_slug
         FROM orders o
         JOIN tenants t ON o.tenant_id = t.id
         WHERE o.createdAt >= ? 
         AND o.print_status IN ('pending', 'sent_to_pos')
         ORDER BY o.createdAt DESC`;

    const unprintedParams = tenantSlug 
      ? [twentyFourHoursAgo, tenantSlug]
      : [twentyFourHoursAgo];

    const [unprintedRows] = await db.execute(unprintedQuery, unprintedParams);

    // Get failed prints (today)
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    
    const failedQuery = tenantSlug
      ? `SELECT o.id, o.orderNumber, o.createdAt, o.last_print_error, o.last_pos_device_id, t.name as tenant_name, t.slug as tenant_slug
         FROM orders o
         JOIN tenants t ON o.tenant_id = t.id
         WHERE DATE(o.createdAt) = CURDATE()
         AND o.print_status = 'failed'
         AND t.slug = ?
         ORDER BY o.print_status_updated_at DESC`
      : `SELECT o.id, o.orderNumber, o.createdAt, o.last_print_error, o.last_pos_device_id, t.name as tenant_name, t.slug as tenant_slug
         FROM orders o
         JOIN tenants t ON o.tenant_id = t.id
         WHERE DATE(o.createdAt) = CURDATE()
         AND o.print_status = 'failed'
         ORDER BY o.print_status_updated_at DESC`;

    const failedParams = tenantSlug ? [tenantSlug] : [];
    const [failedRows] = await db.execute(failedQuery, failedParams);

    // Generate alerts
    const alerts: any[] = [];

    // Alert for offline devices
    deviceStatus.forEach(device => {
      if (device.is_active && device.status === 'offline') {
        alerts.push({
          type: 'device_offline',
          severity: 'high',
          message: `${device.device_name} (${device.tenant_name}) has been offline for ${device.offline_duration_minutes} minutes`,
          device_id: device.device_id,
          tenant: device.tenant_slug,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Alert for old unprinted orders
    (unprintedRows as any[]).forEach(order => {
      const ageMinutes = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 60000);
      if (ageMinutes > 15) {
        alerts.push({
          type: 'unprinted_order',
          severity: 'critical',
          message: `Order ${order.orderNumber} (${order.tenant_name}) has not been printed for ${ageMinutes} minutes`,
          order_id: order.id,
          order_number: order.orderNumber,
          tenant: order.tenant_slug,
          age_minutes: ageMinutes,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Alert for failed prints
    (failedRows as any[]).forEach(order => {
      alerts.push({
        type: 'print_failed',
        severity: 'high',
        message: `Order ${order.orderNumber} (${order.tenant_name}) failed to print: ${order.last_print_error || 'Unknown error'}`,
        order_id: order.id,
        order_number: order.orderNumber,
        device_id: order.last_pos_device_id,
        tenant: order.tenant_slug,
        error: order.last_print_error,
        timestamp: new Date().toISOString()
      });
    });

    // Calculate statistics
    const stats = {
      total_devices: deviceStatus.length,
      online_devices: deviceStatus.filter(d => d.status === 'online').length,
      offline_devices: deviceStatus.filter(d => d.status === 'offline').length,
      disabled_devices: deviceStatus.filter(d => d.status === 'disabled').length,
      unprinted_orders: (unprintedRows as any[]).length,
      failed_prints_today: (failedRows as any[]).length,
      critical_alerts: alerts.filter(a => a.severity === 'critical').length,
      high_alerts: alerts.filter(a => a.severity === 'high').length
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant: tenantSlug || 'all',
      stats,
      devices: deviceStatus,
      alerts,
      unprinted_orders: unprintedRows,
      failed_prints: failedRows
    });

  } catch (error) {
    console.error('Error fetching POS health:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch POS health data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
