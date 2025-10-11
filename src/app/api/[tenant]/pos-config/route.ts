import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

interface POSConfig {
  endpointUrl: string;
  apiKey?: string;
  timeout: number;
  enabled: boolean;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    
    // Get POS configuration from database
    const [rows] = await pool.execute(
      'SELECT * FROM pos_configurations WHERE tenant_id = ?',
      [tenant]
    );
    
    const config = (rows as any[])[0];
    
    if (!config) {
      // Return default configuration
      return NextResponse.json({
        endpointUrl: '',
        apiKey: '',
        timeout: 30,
        enabled: false
      });
    }
    
    return NextResponse.json({
      endpointUrl: config.endpoint_url || '',
      apiKey: config.api_key || '',
      timeout: config.timeout || 30,
      enabled: config.enabled || false
    });
    
  } catch (error) {
    console.error('Error getting POS config:', error);
    return NextResponse.json({ error: 'Failed to load configuration' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    const config: POSConfig = await request.json();
    
    // Save POS configuration to database
    await pool.execute(`
      INSERT INTO pos_configurations (tenant_id, endpoint_url, api_key, timeout, enabled, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        endpoint_url = VALUES(endpoint_url),
        api_key = VALUES(api_key),
        timeout = VALUES(timeout),
        enabled = VALUES(enabled),
        updated_at = NOW()
    `, [
      tenant,
      config.endpointUrl,
      config.apiKey || null,
      config.timeout,
      config.enabled
    ]);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error saving POS config:', error);
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
