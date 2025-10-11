import { NextRequest, NextResponse } from 'next/server';
import { 
  getTenantDeliveryZones, 
  saveTenantDeliveryZone, 
  deleteTenantDeliveryZone 
} from '@/lib/tenant-zone-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const zones = await getTenantDeliveryZones(tenantId);
    
    return NextResponse.json(zones);
  } catch (error) {
    console.error('Error fetching tenant delivery zones:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch delivery zones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    console.log('=== ZONE API REQUEST ===');
    console.log('Tenant ID:', tenantId);
    
    if (!tenantId) {
      console.error('Missing tenant ID');
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const zoneData = await request.json();
    console.log('Received zone data:', zoneData);
    
    // Basic validation
    if (!zoneData.name || zoneData.name.trim().length === 0) {
      console.error('Missing or empty zone name');
      return NextResponse.json(
        { success: false, error: 'Zone name is required' },
        { status: 400 }
      );
    }

    // Save the zone
    await saveTenantDeliveryZone(tenantId, zoneData);
    
    console.log('Zone saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Delivery zone saved successfully'
    });
    
  } catch (error) {
    console.error('=== ZONE API ERROR ===');
    console.error('Full error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Zone ID is required' },
        { status: 400 }
      );
    }

    await deleteTenantDeliveryZone(tenantId, id);
    
    return NextResponse.json({
      success: true,
      message: 'Delivery zone deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant delivery zone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete delivery zone' },
      { status: 500 }
    );
  }
}
