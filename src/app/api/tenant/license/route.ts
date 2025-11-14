import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';
import db from '@/lib/db';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Assign/Activate a license key for a tenant
 * Used by super admin to assign licenses to restaurants
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, tenantId } = body;

    // Validate input
    if (!licenseKey || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'License key and tenant ID are required' },
        { status: 400 }
      );
    }

    // Get tenant slug
    const [tenantRows] = await db.execute(
      'SELECT slug, name FROM tenants WHERE id = ?',
      [tenantId]
    ) as any[];

    if (tenantRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0];

    // Try to activate the license with the provided key and tenant slug
    const result = await LicenseService.activateLicense(
      licenseKey.trim().toUpperCase(),
      tenant.slug
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `License activated successfully for ${tenant.name}`,
        license: result.license
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Error assigning license:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to assign license key' 
      },
      { status: 500 }
    );
  }
}
