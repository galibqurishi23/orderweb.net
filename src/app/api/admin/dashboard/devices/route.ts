import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Device Performance Metrics API
 * Detailed performance analysis per POS device
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');
    const deviceId = searchParams.get('device_id');
    const period = searchParams.get('period') || '7d';

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (period) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
      default:
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    let deviceFilter = '';
    let deviceParams: any[] = [startTime];

    // Build filters
    if (deviceId) {
      deviceFilter = 'AND o.last_pos_device_id = ?';
      deviceParams.push(deviceId);
    }

    if (tenantSlug) {
      deviceFilter += ' AND t.slug = ?';
      deviceParams.push(tenantSlug);
    }

    // Get device performance metrics
    const [deviceMetricsRows] = await db.execute(
      `SELECT 
        o.last_pos_device_id as device_id,
        d.device_name,
        t.name as tenant_name,
        t.slug as tenant_slug,
        COUNT(*) as total_orders_handled,
        SUM(CASE WHEN o.print_status = 'printed' THEN 1 ELSE 0 END) as successful_prints,
        SUM(CASE WHEN o.print_status = 'failed' THEN 1 ELSE 0 END) as failed_prints,
        AVG(CASE 
          WHEN o.print_status = 'printed' AND o.websocket_sent_at IS NOT NULL AND o.print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, o.websocket_sent_at, o.print_status_updated_at) 
        END) as avg_print_time,
        MIN(CASE 
          WHEN o.print_status = 'printed' AND o.websocket_sent_at IS NOT NULL AND o.print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, o.websocket_sent_at, o.print_status_updated_at) 
        END) as min_print_time,
        MAX(CASE 
          WHEN o.print_status = 'printed' AND o.websocket_sent_at IS NOT NULL AND o.print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, o.websocket_sent_at, o.print_status_updated_at) 
        END) as max_print_time,
        MAX(o.print_status_updated_at) as last_print_at,
        d.last_seen_at,
        d.last_heartbeat_at,
        d.is_active,
        TIMESTAMPDIFF(MINUTE, d.last_seen_at, NOW()) as minutes_since_last_seen
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      LEFT JOIN pos_devices d ON o.last_pos_device_id = d.device_id
      WHERE o.last_pos_device_id IS NOT NULL
        AND o.createdAt >= ? ${deviceFilter}
      GROUP BY o.last_pos_device_id, d.device_name, t.name, t.slug, d.last_seen_at, d.last_heartbeat_at, d.is_active
      ORDER BY total_orders_handled DESC`,
      deviceParams
    );

    // Calculate reliability scores and add status
    const devices = (deviceMetricsRows as any[]).map(device => {
      const successRate = device.total_orders_handled > 0
        ? ((device.successful_prints / device.total_orders_handled) * 100).toFixed(2)
        : 0;

      const failureRate = device.total_orders_handled > 0
        ? ((device.failed_prints / device.total_orders_handled) * 100).toFixed(2)
        : 0;

      // Calculate reliability score (0-100)
      const reliabilityScore = device.total_orders_handled > 0
        ? Math.round(
            (parseFloat(successRate) * 0.7) + // 70% weight on success rate
            (Math.min(device.avg_print_time ? 100 - device.avg_print_time : 100, 100) * 0.2) + // 20% on speed
            (device.minutes_since_last_seen <= 10 ? 10 : 0) // 10% on current status
          )
        : 0;

      // Determine device status
      let status = 'unknown';
      let statusColor = 'gray';
      
      if (!device.is_active) {
        status = 'disabled';
        statusColor = 'gray';
      } else if (device.minutes_since_last_seen === null || device.minutes_since_last_seen > 60) {
        status = 'offline';
        statusColor = 'red';
      } else if (device.minutes_since_last_seen > 10) {
        status = 'disconnected';
        statusColor = 'orange';
      } else {
        status = 'online';
        statusColor = 'green';
      }

      // Performance rating
      let performanceRating = 'Unknown';
      if (reliabilityScore >= 90) performanceRating = 'Excellent';
      else if (reliabilityScore >= 75) performanceRating = 'Good';
      else if (reliabilityScore >= 60) performanceRating = 'Fair';
      else if (reliabilityScore >= 40) performanceRating = 'Poor';
      else performanceRating = 'Critical';

      return {
        device_id: device.device_id,
        device_name: device.device_name || 'Unknown Device',
        tenant_name: device.tenant_name,
        tenant_slug: device.tenant_slug,
        status,
        status_color: statusColor,
        is_active: device.is_active,
        
        performance: {
          total_orders: device.total_orders_handled,
          successful_prints: device.successful_prints,
          failed_prints: device.failed_prints,
          success_rate: `${successRate}%`,
          failure_rate: `${failureRate}%`,
          reliability_score: reliabilityScore,
          performance_rating: performanceRating
        },
        
        speed: {
          avg_print_time: device.avg_print_time ? `${Math.round(device.avg_print_time)}s` : 'N/A',
          min_print_time: device.min_print_time ? `${device.min_print_time}s` : 'N/A',
          max_print_time: device.max_print_time ? `${device.max_print_time}s` : 'N/A'
        },
        
        activity: {
          last_print_at: device.last_print_at,
          last_seen_at: device.last_seen_at,
          last_heartbeat_at: device.last_heartbeat_at,
          minutes_since_last_seen: device.minutes_since_last_seen
        }
      };
    });

    // Get failure breakdown by device
    const [failureBreakdownRows] = await db.execute(
      `SELECT 
        o.last_pos_device_id as device_id,
        o.last_print_error as error,
        COUNT(*) as error_count
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.print_status = 'failed'
        AND o.last_pos_device_id IS NOT NULL
        AND o.createdAt >= ? ${deviceFilter}
      GROUP BY o.last_pos_device_id, o.last_print_error
      ORDER BY error_count DESC`,
      deviceParams
    );

    // Group failures by device
    const failuresByDevice = {};
    (failureBreakdownRows as any[]).forEach(row => {
      if (!failuresByDevice[row.device_id]) {
        failuresByDevice[row.device_id] = [];
      }
      failuresByDevice[row.device_id].push({
        error: row.error || 'Unknown error',
        count: row.error_count
      });
    });

    // Get hourly activity pattern for each device
    const [hourlyPatternRows] = await db.execute(
      `SELECT 
        o.last_pos_device_id as device_id,
        HOUR(o.print_status_updated_at) as hour,
        COUNT(*) as print_count
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.print_status = 'printed'
        AND o.last_pos_device_id IS NOT NULL
        AND o.createdAt >= ? ${deviceFilter}
      GROUP BY o.last_pos_device_id, HOUR(o.print_status_updated_at)
      ORDER BY device_id, hour`,
      deviceParams
    );

    // Group hourly patterns by device
    const hourlyPatternsByDevice = {};
    (hourlyPatternRows as any[]).forEach(row => {
      if (!hourlyPatternsByDevice[row.device_id]) {
        hourlyPatternsByDevice[row.device_id] = [];
      }
      hourlyPatternsByDevice[row.device_id].push({
        hour: row.hour,
        print_count: row.print_count
      });
    });

    // Add failure breakdown and hourly patterns to device data
    const enrichedDevices = devices.map(device => ({
      ...device,
      failures: failuresByDevice[device.device_id] || [],
      hourly_pattern: hourlyPatternsByDevice[device.device_id] || []
    }));

    // Overall summary
    const totalDevices = enrichedDevices.length;
    const onlineDevices = enrichedDevices.filter(d => d.status === 'online').length;
    const offlineDevices = enrichedDevices.filter(d => d.status === 'offline' || d.status === 'disconnected').length;
    const avgReliability = enrichedDevices.length > 0
      ? enrichedDevices.reduce((sum, d) => sum + d.performance.reliability_score, 0) / enrichedDevices.length
      : 0;

    return NextResponse.json({
      success: true,
      period,
      timestamp: now.toISOString(),
      tenant: tenantSlug || 'all',
      device_id: deviceId || 'all',
      
      summary: {
        total_devices: totalDevices,
        online_devices: onlineDevices,
        offline_devices: offlineDevices,
        avg_reliability_score: Math.round(avgReliability),
        total_orders_handled: enrichedDevices.reduce((sum, d) => sum + d.performance.total_orders, 0),
        total_successful_prints: enrichedDevices.reduce((sum, d) => sum + d.performance.successful_prints, 0),
        total_failed_prints: enrichedDevices.reduce((sum, d) => sum + d.performance.failed_prints, 0)
      },
      
      devices: enrichedDevices,
      
      top_performers: enrichedDevices
        .sort((a, b) => b.performance.reliability_score - a.performance.reliability_score)
        .slice(0, 5),
      
      needs_attention: enrichedDevices
        .filter(d => d.performance.reliability_score < 70 || d.status === 'offline')
        .sort((a, b) => a.performance.reliability_score - b.performance.reliability_score)
    });

  } catch (error) {
    console.error('Error fetching device metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch device metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
