import { NextRequest, NextResponse } from 'next/server';
import { PrinterService } from '@/lib/robust-printer-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    
    const stats = await PrinterService.getPrinterStats(tenantId);
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching printer stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch printer stats' },
      { status: 500 }
    );
  }
}
