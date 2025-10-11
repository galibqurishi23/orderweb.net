import { NextRequest, NextResponse } from 'next/server';
import { PrinterService } from '@/lib/robust-printer-service';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ printerId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('X-Tenant-ID');
    const params = await context.params;
    const printerId = params.printerId;
    const printerData = await request.json();
    
    if (!tenantId || !printerId) {
      return NextResponse.json({ error: 'Tenant ID and Printer ID are required' }, { status: 400 });
    }
    
    await PrinterService.savePrinter(tenantId, printerData, printerId);
    
    return NextResponse.json({
      success: true,
      message: 'Printer updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating printer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update printer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    
    await PrinterService.deletePrinter(tenantId, printerId);
    
    return NextResponse.json({
      success: true,
      message: 'Printer deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting printer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete printer' },
      { status: 500 }
    );
  }
}
