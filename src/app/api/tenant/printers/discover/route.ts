import { NextRequest, NextResponse } from 'next/server';
import { PrinterService } from '@/lib/robust-printer-service';

export async function POST(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    const { networkRange } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    
    const discoveredPrinters = await PrinterService.discoverPrinters(networkRange);
    
    return NextResponse.json({
      success: true,
      data: discoveredPrinters
    });
  } catch (error: any) {
    console.error('Error discovering printers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to discover printers' },
      { status: 500 }
    );
  }
}
