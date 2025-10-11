import { NextRequest, NextResponse } from 'next/server';
import { PrinterService } from '@/lib/robust-printer-service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ printerId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    const params = await context.params;
    const printerId = params.printerId;
    
    if (!tenantId || !printerId) {
      return NextResponse.json({ error: 'Tenant ID and Printer ID are required' }, { status: 400 });
    }
    
    // Get printer details
    const printers = await PrinterService.getTenantPrinters(tenantId);
    const printer = printers.find(p => p.id === printerId);
    
    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 });
    }
    
    // Test connection
    const testResult = await PrinterService.testPrinterConnection(printer);
    
    return NextResponse.json({
      success: true,
      data: testResult
    });
  } catch (error: any) {
    console.error('Error testing printer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test printer' },
      { status: 500 }
    );
  }
}
