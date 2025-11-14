import { NextRequest, NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function GET() {
  try {
    const licenses = await LicenseService.getAllLicenses();
    const response = NextResponse.json(licenses);
    
    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, expirationDate, notes, durationDays, createWithActivation } = body;

    // Check if this is for creating with activation key
    if (createWithActivation && durationDays) {
      const result = await LicenseService.createLicenseWithActivation(
        parseInt(durationDays),
        notes
      );
      return NextResponse.json(result, { status: 201 });
    }

    // Regular license creation (direct assignment)
    if (!tenantId || !expirationDate) {
      return NextResponse.json(
        { error: 'Tenant ID and expiration date are required' },
        { status: 400 }
      );
    }

    const license = await LicenseService.createLicense(
      tenantId,
      expirationDate,
      notes
    );

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    console.error('Error creating license:', error);
    return NextResponse.json(
      { error: 'Failed to create license' },
      { status: 500 }
    );
  }
}
