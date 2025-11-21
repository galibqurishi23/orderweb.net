import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Real-Time Alerts API
 * Provides actionable alerts for immediate attention
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');
    const severity = searchParams.get('severity'); // critical, high, medium, low

    const now = new Date();
    const alerts: any[] = [];

    let tenantFilter = '';
    let tenantParams: any[] = [];

    if (tenantSlug) {
      const [tenantRows] = await db.execute(
        'SELECT id, name FROM tenants WHERE slug = ?',
        [tenantSlug]
      );

      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      const tenant = tenantRows[0] as any;
      tenantFilter = 'WHERE tenant_id = ?';
      tenantParams = [tenant.id];
    }

    // ALERT 1: Old unprinted orders (CRITICAL)
    const [oldUnprintedRows] = await db.execute(
      `SELECT 
        o.id,
        o.orderNumber,
        o.print_status,
        o.createdAt,
        TIMESTAMPDIFF(MINUTE, o.createdAt, NOW()) as age_minutes,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.print_status IN ('pending', 'sent_to_pos')
        AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ${tenantSlug ? 'AND t.slug = ?' : ''}
      ORDER BY o.createdAt ASC`,
      tenantSlug ? [tenantSlug] : []
    );

    (oldUnprintedRows as any[]).forEach(order => {
      if (order.age_minutes > 30) {
        alerts.push({
          id: `unprinted_${order.id}`,
          type: 'unprinted_order',
          severity: 'critical',
          title: 'Order Not Printed',
          message: `Order ${order.orderNumber} has been waiting ${order.age_minutes} minutes`,
          tenant: order.tenant_slug,
          tenant_name: order.tenant_name,
          details: {
            order_id: order.id,
            order_number: order.orderNumber,
            age_minutes: order.age_minutes,
            print_status: order.print_status,
            created_at: order.createdAt
          },
          action: 'Check POS devices or manually print',
          timestamp: new Date().toISOString()
        });
      } else if (order.age_minutes > 15) {
        alerts.push({
          id: `unprinted_${order.id}`,
          type: 'unprinted_order',
          severity: 'high',
          title: 'Order Delayed',
          message: `Order ${order.orderNumber} waiting ${order.age_minutes} minutes`,
          tenant: order.tenant_slug,
          tenant_name: order.tenant_name,
          details: {
            order_id: order.id,
            order_number: order.orderNumber,
            age_minutes: order.age_minutes,
            print_status: order.print_status
          },
          action: 'Monitor - may need attention soon',
          timestamp: new Date().toISOString()
        });
      }
    });

    // ALERT 2: Offline devices (HIGH)
    const [offlineDevicesRows] = await db.execute(
      `SELECT 
        d.device_id,
        d.device_name,
        d.last_seen_at,
        TIMESTAMPDIFF(MINUTE, d.last_seen_at, NOW()) as offline_minutes,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM pos_devices d
      JOIN tenants t ON d.tenant_id = t.id
      WHERE d.is_active = TRUE
        AND (d.last_seen_at IS NULL OR d.last_seen_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
        ${tenantSlug ? 'AND t.slug = ?' : ''}
      ORDER BY offline_minutes DESC`,
      tenantSlug ? [tenantSlug] : []
    );

    (offlineDevicesRows as any[]).forEach(device => {
      alerts.push({
        id: `offline_${device.device_id}`,
        type: 'device_offline',
        severity: device.offline_minutes > 60 ? 'critical' : 'high',
        title: 'POS Device Offline',
        message: `${device.device_name} has been offline for ${device.offline_minutes || 'unknown'} minutes`,
        tenant: device.tenant_slug,
        tenant_name: device.tenant_name,
        details: {
          device_id: device.device_id,
          device_name: device.device_name,
          last_seen: device.last_seen_at,
          offline_minutes: device.offline_minutes
        },
        action: 'Check device connectivity and power',
        timestamp: new Date().toISOString()
      });
    });

    // ALERT 3: Recent failed prints (HIGH)
    const [failedPrintsRows] = await db.execute(
      `SELECT 
        o.id,
        o.orderNumber,
        o.last_print_error,
        o.last_pos_device_id,
        o.print_status_updated_at,
        t.name as tenant_name,
        t.slug as tenant_slug,
        d.device_name
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      LEFT JOIN pos_devices d ON o.last_pos_device_id = d.device_id
      WHERE o.print_status = 'failed'
        AND o.print_status_updated_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        ${tenantSlug ? 'AND t.slug = ?' : ''}
      ORDER BY o.print_status_updated_at DESC`,
      tenantSlug ? [tenantSlug] : []
    );

    (failedPrintsRows as any[]).forEach(order => {
      alerts.push({
        id: `failed_print_${order.id}`,
        type: 'print_failed',
        severity: 'high',
        title: 'Print Failure',
        message: `Order ${order.orderNumber} failed to print: ${order.last_print_error || 'Unknown error'}`,
        tenant: order.tenant_slug,
        tenant_name: order.tenant_name,
        details: {
          order_id: order.id,
          order_number: order.orderNumber,
          device_id: order.last_pos_device_id,
          device_name: order.device_name,
          error: order.last_print_error,
          failed_at: order.print_status_updated_at
        },
        action: 'Check printer status and manually print if needed',
        timestamp: new Date().toISOString()
      });
    });

    // ALERT 4: Low WebSocket success rate (MEDIUM)
    const [wsStatsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN websocket_sent = TRUE THEN 1 ELSE 0 END) as success_count,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ${tenantSlug ? 'AND t.slug = ?' : ''}
      GROUP BY t.id, t.name, t.slug
      HAVING total >= 5`,
      tenantSlug ? [tenantSlug] : []
    );

    (wsStatsRows as any[]).forEach(stat => {
      const successRate = (stat.success_count / stat.total) * 100;
      if (successRate < 80) {
        alerts.push({
          id: `low_ws_${stat.tenant_slug}`,
          type: 'low_websocket_rate',
          severity: successRate < 50 ? 'high' : 'medium',
          title: 'Low WebSocket Success Rate',
          message: `WebSocket broadcasts only ${successRate.toFixed(1)}% successful for ${stat.tenant_name}`,
          tenant: stat.tenant_slug,
          tenant_name: stat.tenant_name,
          details: {
            total_orders: stat.total,
            successful_broadcasts: stat.success_count,
            success_rate: `${successRate.toFixed(1)}%`,
            time_period: 'last hour'
          },
          action: 'Check WebSocket server and network connectivity',
          timestamp: new Date().toISOString()
        });
      }
    });

    // ALERT 5: Multiple devices offline for same tenant (CRITICAL)
    const [multiOfflineRows] = await db.execute(
      `SELECT 
        t.name as tenant_name,
        t.slug as tenant_slug,
        COUNT(*) as offline_count,
        GROUP_CONCAT(d.device_name SEPARATOR ', ') as device_names
      FROM pos_devices d
      JOIN tenants t ON d.tenant_id = t.id
      WHERE d.is_active = TRUE
        AND (d.last_seen_at IS NULL OR d.last_seen_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE))
        ${tenantSlug ? 'AND t.slug = ?' : ''}
      GROUP BY t.id, t.name, t.slug
      HAVING offline_count >= 2`,
      tenantSlug ? [tenantSlug] : []
    );

    (multiOfflineRows as any[]).forEach(tenant => {
      alerts.push({
        id: `multi_offline_${tenant.tenant_slug}`,
        type: 'multiple_devices_offline',
        severity: 'critical',
        title: 'Multiple Devices Offline',
        message: `${tenant.offline_count} devices offline for ${tenant.tenant_name}`,
        tenant: tenant.tenant_slug,
        tenant_name: tenant.tenant_name,
        details: {
          offline_count: tenant.offline_count,
          devices: tenant.device_names
        },
        action: 'URGENT: Check network/power at location',
        timestamp: new Date().toISOString()
      });
    });

    // Filter by severity if requested
    let filteredAlerts = alerts;
    if (severity) {
      filteredAlerts = alerts.filter(alert => alert.severity === severity);
    }

    // Sort by severity (critical > high > medium > low)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    filteredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Count by severity
    const counts = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      total: alerts.length
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tenant: tenantSlug || 'all',
      filter: severity || 'all',
      counts,
      alerts: filteredAlerts,
      has_critical: counts.critical > 0,
      requires_immediate_action: counts.critical > 0 || counts.high > 3
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
