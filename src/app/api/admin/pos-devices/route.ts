import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

/**
 * POS Device Management API
 * Admin endpoint to generate and manage POS device API keys
 */

/**
 * Generate a secure API key for POS device
 */
function generateApiKey(): string {
  return `pos_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Generate a unique device ID
 */
function generateDeviceId(deviceName: string): string {
  const sanitized = deviceName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const timestamp = Date.now().toString(36);
  return `POS_${sanitized}_${timestamp}`;
}

/**
 * POST - Generate new API key for a POS device
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // For now, checking for a basic auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { tenant_slug, device_name } = body;

    // Validate required fields
    if (!tenant_slug || !device_name) {
      return NextResponse.json(
        { error: 'Missing required fields: tenant_slug, device_name' },
        { status: 400 }
      );
    }

    // Get tenant ID
    const [tenantRows] = await db.execute(
      'SELECT id, name FROM tenants WHERE slug = ?',
      [tenant_slug]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Generate unique identifiers
    const apiKey = generateApiKey();
    const deviceId = generateDeviceId(device_name);

    // Insert new device
    const [result] = await db.execute(
      `INSERT INTO pos_devices (
        tenant_id,
        device_id,
        device_name,
        api_key,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [tenant.id, deviceId, device_name, apiKey]
    );

    console.log(`✅ POS device created: ${deviceId} for tenant ${tenant.name}`);

    // Return the API key (this is the ONLY time it's shown)
    return NextResponse.json({
      success: true,
      message: '⚠️ IMPORTANT: Save this API key - it cannot be retrieved later!',
      device: {
        id: (result as any).insertId,
        device_id: deviceId,
        device_name: device_name,
        tenant_name: tenant.name,
        tenant_slug: tenant_slug,
        api_key: apiKey,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating POS device API key:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate API key',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List all POS devices for a tenant
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenant');

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    // Get tenant ID
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

    // Get all devices for this tenant
    const [deviceRows] = await db.execute(
      `SELECT 
        id,
        device_id,
        device_name,
        is_active,
        last_seen_at,
        last_heartbeat_at,
        created_at,
        SUBSTRING(api_key, 1, 10) as api_key_preview
      FROM pos_devices 
      WHERE tenant_id = ?
      ORDER BY created_at DESC`,
      [tenant.id]
    );

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenantSlug
      },
      devices: deviceRows,
      count: (deviceRows as any[]).length
    });

  } catch (error) {
    console.error('Error fetching POS devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update device status (activate/deactivate)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { device_id, is_active } = body;

    if (!device_id || is_active === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, is_active' },
        { status: 400 }
      );
    }

    // Update device status
    const [result] = await db.execute(
      'UPDATE pos_devices SET is_active = ?, updated_at = NOW() WHERE device_id = ?',
      [is_active, device_id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Device ${device_id} ${is_active ? 'activated' : 'deactivated'}`);

    return NextResponse.json({
      success: true,
      message: `Device ${device_id} ${is_active ? 'activated' : 'deactivated'}`,
      device_id,
      is_active
    });

  } catch (error) {
    console.error('Error updating device status:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a device (soft delete by deactivating)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('device_id');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing device_id parameter' },
        { status: 400 }
      );
    }

    // Soft delete - deactivate instead of removing
    const [result] = await db.execute(
      'UPDATE pos_devices SET is_active = FALSE, updated_at = NOW() WHERE device_id = ?',
      [deviceId]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Device ${deviceId} deleted (deactivated)`);

    return NextResponse.json({
      success: true,
      message: `Device ${deviceId} deleted`,
      device_id: deviceId
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
