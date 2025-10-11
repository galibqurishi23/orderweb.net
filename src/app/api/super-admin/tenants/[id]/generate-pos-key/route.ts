import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    
    // Parse request body for any additional options
    const body = await request.json();
    const { regenerate = false, description } = body;

    // Verify tenant exists
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;

    // Check if API key already exists and regenerate is false
    if (tenant.pos_api_key && !regenerate) {
      return NextResponse.json(
        { 
          error: 'POS API key already exists for this tenant',
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
      [apiKey, tenantId]
    );

    // Log the API key generation (optional audit trail)
    await db.execute(
      `INSERT INTO admin_logs (
        action,
        details,
        created_at
      ) VALUES (?, ?, NOW())`,
      [
        'pos_api_key_generated',
        JSON.stringify({
          tenant_id: tenantId,
          tenant_slug: tenant.slug,
          regenerated: regenerate,
          description: description || null,
          generated_at: new Date().toISOString()
        })
      ]
    ).catch(err => {
      // If admin_logs table doesn't exist, that's ok - just log to console
      console.log('POS API key generated for tenant:', tenant.slug);
    });

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
        action: regenerate ? 'regenerated' : 'created'
      },
      warning: 'Store this API key securely. It will not be shown again in full.'
    });

  } catch (error) {
    console.error('Error generating POS API key:', error);
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;

    // Verify tenant exists and get API key status
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
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
          `${tenant.pos_api_key.substring(0, 8)}...${tenant.pos_api_key.substring(-4)}` : 
          null
      }
    });

  } catch (error) {
    console.error('Error checking POS API key status:', error);
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