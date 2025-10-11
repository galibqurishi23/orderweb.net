import { NextRequest, NextResponse } from 'next/server';
import { createTenantOrder } from '@/lib/tenant-order-service';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const orderData = await request.json();
    console.log('🔍 Creating order via tenant-order-service:', JSON.stringify(orderData, null, 2));
    
    // Use the proper tenant order service which includes POS integration
    const result = await createTenantOrder(tenantId, orderData);

    console.log('🎉 Order creation successful via service:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
