import { NextRequest, NextResponse } from 'next/server';
import { getTenantSettings } from '@/lib/tenant-service';
import { getAvailableTimeSlots } from '@/lib/order-capacity-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Time slots request received');
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const dateStr = searchParams.get('date');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!dateStr) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }

    const targetDate = new Date(dateStr);
    
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get tenant settings
    const tenantSettings = await getTenantSettings(tenantId);
    let restaurantSettings = tenantSettings;
    
    if (typeof tenantSettings === 'string') {
      restaurantSettings = JSON.parse(tenantSettings);
    }

    if (!restaurantSettings || !restaurantSettings.orderThrottling) {
      return NextResponse.json({
        success: true,
        data: {
          slots: [],
          throttlingEnabled: false,
          message: 'No capacity limits configured - all times available'
        }
      });
    }

    // Get available time slots
    const slots = await getAvailableTimeSlots(tenantId, restaurantSettings.orderThrottling, targetDate);
    
    console.log('📅 Generated time slots:', slots.length);
    
    return NextResponse.json({
      success: true,
      data: {
        slots,
        throttlingEnabled: true,
        date: targetDate.toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching time slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}
