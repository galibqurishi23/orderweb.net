import { NextRequest, NextResponse } from 'next/server';
import { KitchenDisplayService } from '@/lib/kitchen-display-service';

/**
 * Individual Kitchen Display Management API
 * GET: Get specific display details
 * PUT: Update display settings
 * DELETE: Delete display
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; displayId: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantId, displayId } = params;
    
    if (!tenantId || !displayId) {
      return NextResponse.json(
        { error: 'Tenant ID and Display ID are required' },
        { status: 400 }
      );
    }

    const displays = await KitchenDisplayService.getTenantDisplays(tenantId);
    const display = displays.find(d => d.id === displayId);
    
    if (!display) {
      return NextResponse.json(
        { error: 'Display not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      display
    });

  } catch (error) {
    console.error('Error fetching kitchen display:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen display' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; displayId: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantId, displayId } = params;
    const body = await request.json();
    
    if (!tenantId || !displayId) {
      return NextResponse.json(
        { error: 'Tenant ID and Display ID are required' },
        { status: 400 }
      );
    }

    await KitchenDisplayService.updateDisplay(displayId, tenantId, {
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
      message: 'Display updated successfully'
    });

  } catch (error) {
    console.error('Error updating kitchen display:', error);
    return NextResponse.json(
      { error: 'Failed to update kitchen display' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenant: string; displayId: string }> }
) {
  try {
    const params = await context.params;
    const { tenant: tenantId, displayId } = params;
    
    if (!tenantId || !displayId) {
      return NextResponse.json(
        { error: 'Tenant ID and Display ID are required' },
        { status: 400 }
      );
    }

    await KitchenDisplayService.deleteDisplay(displayId, tenantId);
    
    return NextResponse.json({
      success: true,
      message: 'Display deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting kitchen display:', error);
    return NextResponse.json(
      { error: 'Failed to delete kitchen display' },
      { status: 500 }
    );
  }
}
