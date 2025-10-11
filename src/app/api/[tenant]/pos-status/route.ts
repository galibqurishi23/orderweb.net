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

// Get WebSocket connection stats
function getConnectionStats(tenant: string) {
  try {
    // Import websocket-broadcaster to get connection stats
    const { getConnectionStats } = require('../../../../../lib/websocket-broadcaster');
    return getConnectionStats(tenant);
  } catch (error) {
    console.error('Error getting connection stats:', error);
    return { connected: 0, active: 0 };
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

    // Get connection statistics
    const connectionStats = getConnectionStats(tenant);

    // Get recent sync logs
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: `dinedesk_${tenant}`
    });

    const [recentLogs] = await connection.execute(`
      SELECT event_type, status, created_at
      FROM pos_sync_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const [eventCounts] = await connection.execute(`
      SELECT 
        event_type,
        COUNT(*) as count,
        MAX(created_at) as last_event
      FROM pos_sync_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY event_type
    `);

    await connection.end();

    return NextResponse.json({
      success: true,
      tenant: tenant,
      websocket: {
        connected: connectionStats.connected,
        active: connectionStats.active,
        url: `wss://orderweb.net/ws/pos/${tenant}`
      },
      events24h: eventCounts,
      recentEvents: recentLogs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('POS status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get POS status'
    }, { status: 500 });
  }
}
