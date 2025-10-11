import { NextRequest, NextResponse } from 'next/server';
import { POSIntegrationService } from '@/lib/pos-integration-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const { tenant } = params;
    const posConfig = await request.json();
    
    // Test connection to POS system
    const testResponse = await fetch(posConfig.endpointUrl + '/api/health', {
      method: 'GET',
      headers: {
        ...(posConfig.apiKey && { 'Authorization': `Bearer ${posConfig.apiKey}` })
      },
      signal: AbortSignal.timeout(posConfig.timeout * 1000)
    });
    
    if (!testResponse.ok) {
      return NextResponse.json({
        success: false,
        message: `POS system responded with status ${testResponse.status}`
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to POS system'
    });
    
  } catch (error) {
    console.error('POS test error:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }, { status: 500 });
  }
}
