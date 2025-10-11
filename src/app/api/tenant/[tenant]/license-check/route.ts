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

    const validation = await LicenseService.validateTenantLicense(tenantSlug);
    
    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating license:', error);
    return NextResponse.json(
      { 
        isValid: false,
        status: 'error',
        message: 'License validation failed. Please contact OrderWeb Ltd.'
      },
      { status: 500 }
    );
  }
}
