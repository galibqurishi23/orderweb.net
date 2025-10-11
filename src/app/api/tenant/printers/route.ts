import { NextRequest, NextResponse } from 'next/server';
import { PrinterService } from '@/lib/robust-printer-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    
    const printers = await PrinterService.getTenantPrinters(tenantId);
    
    return NextResponse.json({
      success: true,
      data: printers
    });
  } catch (error) {
    console.error('Error fetching printers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch printers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    const printerData = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    
    const printerId = await PrinterService.savePrinter(tenantId, printerData);
    
    return NextResponse.json({
      success: true,
      data: { id: printerId }
    });
  } catch (error: any) {
    console.error('Error saving printer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save printer' },
      { status: 500 }
    );
  }
}
