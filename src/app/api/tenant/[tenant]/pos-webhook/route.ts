import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POS Webhook Configuration API
 * Allows configuring webhook URL where orders should be pushed
 */

// GET - Get current webhook configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    
    // Get tenant info
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key, pos_webhook_url FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

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
          `${tenant.pos_api_key.substring(0, 10)}...` : null,
        webhook_url: tenant.pos_webhook_url,
        webhook_configured: !!tenant.pos_webhook_url,
        push_api_url: `https://orderweb.net/api/pos/push-order`,
        pull_api_url: `https://orderweb.net/api/pos/pull-orders?tenant=${tenant.slug}`,
        integration_status: tenant.pos_api_key ? 'configured' : 'not_configured'
      }
    });

  } catch (error) {
    console.error('Error fetching POS webhook config:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch webhook configuration',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Set webhook URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const body = await request.json();
    const { webhook_url, description } = body;

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(webhook_url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

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

    // Update tenant with webhook URL
    await db.execute(
      'UPDATE tenants SET pos_webhook_url = ?, updated_at = NOW() WHERE id = ?',
      [webhook_url, tenant.id]
    );

    return NextResponse.json({
      success: true,
      message: 'POS webhook URL configured successfully',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        webhook_url: webhook_url,
        configured_at: new Date().toISOString(),
        description: description || 'POS webhook endpoint',
        test_payload: {
          order: {
            id: "example-order-id",
            orderNumber: "ORD-123456-ABCD",
            customerName: "Test Customer",
            total: 25.99,
            status: "confirmed",
            items: []
          },
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug
          },
          timestamp: new Date().toISOString(),
          event: "order_created"
        }
      }
    });

  } catch (error) {
    console.error('Error configuring POS webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to configure webhook URL',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove webhook URL
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    
    // Get tenant by slug
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug FROM tenants WHERE slug = ?',
      [tenantSlug]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Remove webhook URL
    await db.execute(
      'UPDATE tenants SET pos_webhook_url = NULL, updated_at = NOW() WHERE id = ?',
      [tenant.id]
    );

    return NextResponse.json({
      success: true,
      message: 'POS webhook URL removed successfully',
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        webhook_removed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error removing POS webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove webhook URL',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}