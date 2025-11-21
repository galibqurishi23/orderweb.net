import { NextRequest, NextResponse } from 'next/server';

/**
 * Get POS WebSocket connection status
 * Checks if any POS devices are currently connected via WebSocket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;

    // Query the WebSocket server health endpoint with cache disabled
    const wsHealthUrl = process.env.WS_SERVER_URL || 'http://localhost:9011';
    const response = await fetch(`${wsHealthUrl}/health`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'WebSocket server unreachable',
        status: 'error',
        connected: false
      }, { status: 503 });
    }

    const healthData = await response.json();
    
    // Check if this tenant has any active connections
    const tenantConnections = healthData.connections?.find(
      (conn: any) => conn.tenant === tenant
    );

    const isConnected = tenantConnections && tenantConnections.count > 0;
    const connectionCount = tenantConnections?.count || 0;

    return NextResponse.json({
      success: true,
      status: isConnected ? 'connected' : 'disconnected',
      connected: isConnected,
      connectionCount: connectionCount,
      serverStatus: healthData.status,
      timestamp: new Date().toISOString(),
      details: {
        tenant: tenant,
        activeDevices: connectionCount,
        lastChecked: healthData.timestamp
      }
    });

  } catch (error) {
    console.error('Error checking POS connection status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check connection status',
      status: 'error',
      connected: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
