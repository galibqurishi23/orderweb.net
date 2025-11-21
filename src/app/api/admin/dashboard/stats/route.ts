import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Dashboard Statistics API
 * Provides comprehensive stats for admin dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d

    // Calculate time ranges
    const now = new Date();
    let startTime: Date;
    
    switch (period) {
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    let tenantFilter = '';
    let tenantParams: any[] = [];

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

      tenantFilter = 'AND o.tenant_id = ?';
      tenantParams = [(tenantRows[0] as any).id];
    }

    // Get order statistics
    const [orderStatsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN print_status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN print_status = 'sent_to_pos' THEN 1 ELSE 0 END) as sent_to_pos_orders,
        SUM(CASE WHEN print_status = 'printed' THEN 1 ELSE 0 END) as printed_orders,
        SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END) as failed_orders,
        SUM(CASE WHEN websocket_sent = TRUE THEN 1 ELSE 0 END) as websocket_success,
        SUM(CASE WHEN websocket_sent = FALSE THEN 1 ELSE 0 END) as websocket_failed,
        AVG(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as avg_print_time_seconds
      FROM orders o
      WHERE o.createdAt >= ? ${tenantFilter}`,
      [startTime, ...tenantParams]
    );

    const orderStats = orderStatsRows[0] as any;

    // WebSocket success rate
    const websocketSuccessRate = orderStats.total_orders > 0
      ? ((orderStats.websocket_success / orderStats.total_orders) * 100).toFixed(2)
      : 0;

    // Print success rate
    const printSuccessRate = orderStats.total_orders > 0
      ? ((orderStats.printed_orders / orderStats.total_orders) * 100).toFixed(2)
      : 0;

    // Get device statistics
    const deviceFilter = tenantSlug 
      ? `WHERE d.tenant_id = (SELECT id FROM tenants WHERE slug = ?)`
      : '';
    const deviceParams = tenantSlug ? [tenantSlug] : [];

    const [deviceStatsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total_devices,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_devices,
        SUM(CASE 
          WHEN is_active = TRUE AND last_seen_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE) 
          THEN 1 ELSE 0 
        END) as online_devices,
        SUM(CASE 
          WHEN is_active = TRUE AND (last_seen_at IS NULL OR last_seen_at <= DATE_SUB(NOW(), INTERVAL 10 MINUTE))
          THEN 1 ELSE 0 
        END) as offline_devices
      FROM pos_devices d
      ${deviceFilter}`,
      deviceParams
    );

    const deviceStats = deviceStatsRows[0] as any;

    // Get recent failed prints
    const [failedPrintsRows] = await db.execute(
      `SELECT 
        o.id,
        o.orderNumber,
        o.last_print_error,
        o.last_pos_device_id,
        o.print_status_updated_at,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.print_status = 'failed'
        AND o.createdAt >= ? ${tenantFilter}
      ORDER BY o.print_status_updated_at DESC
      LIMIT 10`,
      [startTime, ...tenantParams]
    );

    // Get hourly order distribution (last 24 hours)
    const [hourlyDistRows] = await db.execute(
      `SELECT 
        HOUR(createdAt) as hour,
        COUNT(*) as order_count,
        SUM(CASE WHEN print_status = 'printed' THEN 1 ELSE 0 END) as printed_count,
        SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM orders o
      WHERE o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ${tenantFilter}
      GROUP BY HOUR(createdAt)
      ORDER BY hour`,
      tenantParams
    );

    // Get top performing devices
    const [topDevicesRows] = await db.execute(
      `SELECT 
        o.last_pos_device_id as device_id,
        d.device_name,
        COUNT(*) as orders_printed,
        SUM(CASE WHEN o.print_status = 'printed' THEN 1 ELSE 0 END) as successful_prints,
        SUM(CASE WHEN o.print_status = 'failed' THEN 1 ELSE 0 END) as failed_prints,
        AVG(CASE 
          WHEN o.print_status = 'printed' AND o.websocket_sent_at IS NOT NULL AND o.print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, o.websocket_sent_at, o.print_status_updated_at) 
        END) as avg_print_time
      FROM orders o
      LEFT JOIN pos_devices d ON o.last_pos_device_id = d.device_id
      WHERE o.last_pos_device_id IS NOT NULL
        AND o.createdAt >= ? ${tenantFilter}
      GROUP BY o.last_pos_device_id, d.device_name
      ORDER BY orders_printed DESC
      LIMIT 10`,
      [startTime, ...tenantParams]
    );

    // Calculate critical metrics
    const criticalAlerts = {
      unprinted_old: orderStats.pending_orders + orderStats.sent_to_pos_orders,
      devices_offline: deviceStats.offline_devices,
      failed_prints: orderStats.failed_orders,
      low_websocket_rate: parseFloat(String(websocketSuccessRate)) < 90
    };

    const alertCount = Object.values(criticalAlerts).filter(v => v > 0 || v === true).length;

    return NextResponse.json({
      success: true,
      period,
      timestamp: now.toISOString(),
      tenant: tenantSlug || 'all',
      
      summary: {
        total_orders: orderStats.total_orders,
        printed_orders: orderStats.printed_orders,
        failed_orders: orderStats.failed_orders,
        pending_orders: orderStats.pending_orders + orderStats.sent_to_pos_orders,
        print_success_rate: `${printSuccessRate}%`,
        websocket_success_rate: `${websocketSuccessRate}%`,
        avg_print_time: orderStats.avg_print_time_seconds 
          ? `${Math.round(orderStats.avg_print_time_seconds)}s` 
          : 'N/A',
        alert_count: alertCount
      },

      devices: {
        total: deviceStats.total_devices,
        active: deviceStats.active_devices,
        online: deviceStats.online_devices,
        offline: deviceStats.offline_devices
      },

      print_status_breakdown: {
        pending: orderStats.pending_orders,
        sent_to_pos: orderStats.sent_to_pos_orders,
        printed: orderStats.printed_orders,
        failed: orderStats.failed_orders
      },

      websocket_performance: {
        successful_broadcasts: orderStats.websocket_success,
        failed_broadcasts: orderStats.websocket_failed,
        success_rate: `${websocketSuccessRate}%`
      },

      recent_failures: failedPrintsRows,
      hourly_distribution: hourlyDistRows,
      top_devices: topDevicesRows,
      
      critical_alerts: criticalAlerts
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
