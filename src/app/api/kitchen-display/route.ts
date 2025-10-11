import { NextRequest, NextResponse } from 'next/server';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';

/**
 * Kitchen Display Management API
 * GET: Get all displays for tenant
 * POST: Create new kitchen display
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantId } = await params;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const displays = await KitchenDisplayService.getTenantDisplays(tenantId);
    
    return NextResponse.json({
      success: true,
      displays
    });

  } catch (error) {
    console.error('Error fetching kitchen displays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen displays' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantId } = await params;
    const body = await request.json();
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.printerId || !body.displayName) {
      return NextResponse.json(
        { error: 'Printer ID and display name are required' },
        { status: 400 }
      );
    }

    const display = await KitchenDisplayService.createDisplay(tenantId, {
      printerId: body.printerId,
      displayName: body.displayName,
      layoutConfig: body.layoutConfig,
      autoAcknowledge: body.autoAcknowledge,
      orderTimeoutMinutes: body.orderTimeoutMinutes,
      fontSize: body.fontSize,
      theme: body.theme,
      soundAlerts: body.soundAlerts,
      maxOrdersDisplay: body.maxOrdersDisplay,
      refreshIntervalSeconds: body.refreshIntervalSeconds
    });
    
    return NextResponse.json({
      success: true,
      display
    });

  } catch (error) {
    console.error('Error creating kitchen display:', error);
    return NextResponse.json(
      { error: 'Failed to create kitchen display' },
      { status: 500 }
    );
  }
}
