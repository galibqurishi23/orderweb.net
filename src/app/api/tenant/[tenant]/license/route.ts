import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenantSlug = params.tenant;

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Tenant slug is required' },
        { status: 400 }
      );
    }

    // Get current active license
    const currentLicense = await LicenseService.getTenantLicenseBySlug(tenantSlug);
    
    // Get all licenses for history
    const allLicenses = await LicenseService.getAllLicenses();
    const tenantLicenses = allLicenses.filter(license => license.tenant_slug === tenantSlug);
    
    // Separate current from history
    const history = tenantLicenses.filter(license => 
      !currentLicense || license.id !== currentLicense.id
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      current: currentLicense,
      history: history,
      tenant: tenantSlug
    });

  } catch (error) {
    console.error('Error fetching tenant license:', error);
    return NextResponse.json(
      { error: 'Failed to fetch license information' },
      { status: 500 }
    );
  }
}
