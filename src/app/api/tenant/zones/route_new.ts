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
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const zoneData = await request.json();
    
    // Validate required fields
    if (!zoneData.name || !zoneData.deliveryFee || !zoneData.minOrder) {
      return NextResponse.json(
        { success: false, error: 'Missing required delivery zone fields' },
        { status: 400 }
      );
    }

    await saveTenantDeliveryZone(tenantId, zoneData);
    
    return NextResponse.json({
      success: true,
      message: 'Delivery zone saved successfully'
    });
  } catch (error) {
    console.error('Error saving tenant delivery zone:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save delivery zone' },
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
