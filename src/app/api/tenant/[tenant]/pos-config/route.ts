import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    
    // Parse request body for any additional options
    const body = await request.json();
    const { regenerate = false, description } = body;

    // Get tenant by slug
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Check if API key already exists and regenerate is false
    if (tenant.pos_api_key && !regenerate) {
      return NextResponse.json(
        { 
          error: 'POS API key already exists',
          message: 'Use regenerate=true to create a new key',
          current_key_exists: true
        },
        { status: 409 }
      );
    }

    // Generate a new secure API key
    const apiKey = `pos_${crypto.randomBytes(32).toString('hex')}`;

    // Update tenant with new API key
    await db.execute(
      'UPDATE tenants SET pos_api_key = ?, updated_at = NOW() WHERE id = ?',
      [apiKey, tenant.id]
    );

    return NextResponse.json({
      success: true,
      message: regenerate ? 'POS API key regenerated successfully' : 'POS API key generated successfully',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        api_key: apiKey,
        generated_at: new Date().toISOString(),
        action: regenerate ? 'regenerated' : 'created',
        integration_urls: {
          pending_orders: `https://orderweb.net/api/pos/${tenant.slug}/pending-orders`,
          confirm_order: `https://orderweb.net/api/pos/${tenant.slug}/orders/{order-id}/confirm`,
          daily_report: `https://orderweb.net/api/pos/${tenant.slug}/daily-report`
        }
      },
      warning: 'Store this API key securely. It will not be shown again in full.'
    });

  } catch (error) {
    console.error('Error generating tenant POS API key:', error);
    
    // Check if it's a duplicate key error
    if ((error as any).code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate unique API key. Please try again.',
          code: 'DUPLICATE_KEY'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate POS API key',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current API key status (masked)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;

    // Get tenant by slug and API key status
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Get pending orders count
    const [pendingRows] = await db.execute(
      'SELECT COUNT(*) as count FROM pos_sync_queue WHERE tenant_id = ? AND sync_status = "pending"',
      [tenant.id]
    );

    const pendingCount = (pendingRows as any[])[0].count || 0;

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        has_api_key: !!tenant.pos_api_key,
        api_key_preview: tenant.pos_api_key ? 
          `${tenant.pos_api_key.substring(0, 8)}...${tenant.pos_api_key.substring(-8)}` : 
          null,
        pending_orders_count: pendingCount,
        integration_status: tenant.pos_api_key ? 'configured' : 'not_configured',
        integration_urls: tenant.pos_api_key ? {
          pending_orders: `https://orderweb.net/api/pos/${tenant.slug}/pending-orders`,
          confirm_order: `https://orderweb.net/api/pos/${tenant.slug}/orders/{order-id}/confirm`,
          daily_report: `https://orderweb.net/api/pos/${tenant.slug}/daily-report`
        } : null
      }
    });

  } catch (error) {
    console.error('Error checking tenant POS API key status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check API key status',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}