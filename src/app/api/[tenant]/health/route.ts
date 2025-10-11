import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenant: string } }
) {
  try {
    const tenant = params.tenant;

    // Return health status
    return NextResponse.json({
      success: true,
      status: 'ok',
      tenant: tenant,
      timestamp: new Date().toISOString(),
      service: 'POS Integration API',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      success: false,
      status: 'error',
      error: 'Health check failed'
    }, { status: 500 });
  }
}
