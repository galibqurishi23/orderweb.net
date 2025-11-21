import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Print Analytics API
 * Provides detailed analytics on printing performance
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');
    const period = searchParams.get('period') || '7d'; // 24h, 7d, 30d
    const groupBy = searchParams.get('groupBy') || 'day'; // hour, day, week

    // Calculate time ranges
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

    // Determine grouping SQL
    let dateGroup: string;
    let dateFormat: string;
    
    switch (groupBy) {
      case 'hour':
        dateGroup = 'DATE_FORMAT(createdAt, "%Y-%m-%d %H:00:00")';
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'week':
        dateGroup = 'DATE_FORMAT(createdAt, "%Y-%U")';
        dateFormat = '%Y-Week %U';
        break;
      case 'day':
      default:
        dateGroup = 'DATE(createdAt)';
        dateFormat = '%Y-%m-%d';
    }

    // Get time-series data
    const [timeSeriesRows] = await db.execute(
      `SELECT 
        ${dateGroup} as period,
        COUNT(*) as total_orders,
        SUM(CASE WHEN print_status = 'printed' THEN 1 ELSE 0 END) as printed,
        SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN print_status IN ('pending', 'sent_to_pos') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN websocket_sent = TRUE THEN 1 ELSE 0 END) as ws_success,
        SUM(CASE WHEN websocket_sent = FALSE THEN 1 ELSE 0 END) as ws_failed,
        AVG(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as avg_print_time
      FROM orders o
      WHERE o.createdAt >= ? ${tenantFilter}
      GROUP BY ${dateGroup}
      ORDER BY period`,
      [startTime, ...tenantParams]
    );

    // Calculate success rates per period
    const timeSeries = (timeSeriesRows as any[]).map(row => ({
      period: row.period,
      total_orders: row.total_orders,
      printed: row.printed,
      failed: row.failed,
      pending: row.pending,
      print_success_rate: row.total_orders > 0 
        ? ((row.printed / row.total_orders) * 100).toFixed(2) 
        : 0,
      websocket_success_rate: row.total_orders > 0 
        ? ((row.ws_success / row.total_orders) * 100).toFixed(2) 
        : 0,
      avg_print_time_seconds: row.avg_print_time ? Math.round(row.avg_print_time) : null
    }));

    // Get failure reasons breakdown
    const [failureReasonsRows] = await db.execute(
      `SELECT 
        last_print_error as error,
        COUNT(*) as count
      FROM orders o
      WHERE o.print_status = 'failed'
        AND o.createdAt >= ? ${tenantFilter}
        AND last_print_error IS NOT NULL
      GROUP BY last_print_error
      ORDER BY count DESC
      LIMIT 10`,
      [startTime, ...tenantParams]
    );

    // Get print time distribution
    const [printTimeDistRows] = await db.execute(
      `SELECT 
        CASE 
          WHEN print_time <= 5 THEN '0-5s'
          WHEN print_time <= 10 THEN '6-10s'
          WHEN print_time <= 30 THEN '11-30s'
          WHEN print_time <= 60 THEN '31-60s'
          ELSE '60s+'
        END as time_range,
        COUNT(*) as count
      FROM (
        SELECT TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) as print_time
        FROM orders o
        WHERE o.print_status = 'printed'
          AND o.websocket_sent_at IS NOT NULL
          AND o.print_status_updated_at IS NOT NULL
          AND o.createdAt >= ? ${tenantFilter}
      ) as times
      GROUP BY time_range
      ORDER BY FIELD(time_range, '0-5s', '6-10s', '11-30s', '31-60s', '60s+')`,
      [startTime, ...tenantParams]
    );

    // Get peak hours analysis
    const [peakHoursRows] = await db.execute(
      `SELECT 
        HOUR(createdAt) as hour,
        COUNT(*) as order_count,
        AVG(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as avg_print_time,
        SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM orders o
      WHERE o.createdAt >= ? ${tenantFilter}
      GROUP BY HOUR(createdAt)
      ORDER BY order_count DESC
      LIMIT 10`,
      [startTime, ...tenantParams]
    );

    // Get overall statistics
    const [overallStatsRows] = await db.execute(
      `SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN print_status = 'printed' THEN 1 ELSE 0 END) as total_printed,
        SUM(CASE WHEN print_status = 'failed' THEN 1 ELSE 0 END) as total_failed,
        SUM(CASE WHEN websocket_sent = TRUE THEN 1 ELSE 0 END) as ws_success,
        MIN(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as min_print_time,
        MAX(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as max_print_time,
        AVG(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as avg_print_time,
        STDDEV(CASE 
          WHEN print_status = 'printed' AND websocket_sent_at IS NOT NULL AND print_status_updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(SECOND, websocket_sent_at, print_status_updated_at) 
        END) as stddev_print_time
      FROM orders o
      WHERE o.createdAt >= ? ${tenantFilter}`,
      [startTime, ...tenantParams]
    );

    const overallStats = overallStatsRows[0] as any;

    const printSuccessRate = overallStats.total_orders > 0
      ? ((overallStats.total_printed / overallStats.total_orders) * 100).toFixed(2)
      : 0;

    const websocketSuccessRate = overallStats.total_orders > 0
      ? ((overallStats.ws_success / overallStats.total_orders) * 100).toFixed(2)
      : 0;

    // Performance insights
    const insights: string[] = [];
    
    if (parseFloat(String(printSuccessRate)) < 95) {
      insights.push(`⚠️ Print success rate is ${printSuccessRate}% - investigate failures`);
    } else {
      insights.push(`✅ Excellent print success rate: ${printSuccessRate}%`);
    }

    if (parseFloat(String(websocketSuccessRate)) < 90) {
      insights.push(`⚠️ WebSocket reliability concerns: ${websocketSuccessRate}% success`);
    }

    if (overallStats.avg_print_time && overallStats.avg_print_time > 30) {
      insights.push(`⚠️ Average print time is high: ${Math.round(overallStats.avg_print_time)}s`);
    } else if (overallStats.avg_print_time) {
      insights.push(`✅ Fast printing: ${Math.round(overallStats.avg_print_time)}s average`);
    }

    const failureRate = overallStats.total_orders > 0
      ? ((overallStats.total_failed / overallStats.total_orders) * 100).toFixed(2)
      : 0;

    if (parseFloat(String(failureRate)) > 2) {
      insights.push(`⚠️ High failure rate: ${failureRate}% - check common errors`);
    }

    return NextResponse.json({
      success: true,
      period,
      group_by: groupBy,
      timestamp: new Date().toISOString(),
      tenant: tenantSlug || 'all',
      
      summary: {
        total_orders: overallStats.total_orders,
        printed: overallStats.total_printed,
        failed: overallStats.total_failed,
        print_success_rate: `${printSuccessRate}%`,
        websocket_success_rate: `${websocketSuccessRate}%`,
        failure_rate: `${failureRate}%`,
        min_print_time: overallStats.min_print_time ? `${overallStats.min_print_time}s` : 'N/A',
        max_print_time: overallStats.max_print_time ? `${overallStats.max_print_time}s` : 'N/A',
        avg_print_time: overallStats.avg_print_time ? `${Math.round(overallStats.avg_print_time)}s` : 'N/A',
        stddev_print_time: overallStats.stddev_print_time ? `${Math.round(overallStats.stddev_print_time)}s` : 'N/A'
      },

      time_series: timeSeries,
      failure_reasons: failureReasonsRows,
      print_time_distribution: printTimeDistRows,
      peak_hours: peakHoursRows,
      insights
    });

  } catch (error) {
    console.error('Error fetching print analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch print analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
