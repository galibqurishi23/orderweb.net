import { NextResponse } from 'next/server';
import { LicenseService } from '@/lib/license-service';

export async function GET() {
  try {
    const stats = await LicenseService.getLicenseStatistics();
    
    const response = NextResponse.json({
      success: true,
      data: stats
    });
    
    // Add cache-busting headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Error fetching license statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch license statistics' 
      },
      { status: 500 }
    );
  }
}