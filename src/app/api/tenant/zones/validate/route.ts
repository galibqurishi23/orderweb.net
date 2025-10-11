import { NextRequest, NextResponse } from 'next/server';
import { validateDeliveryPostcode, calculateDeliveryFee } from '@/lib/tenant-zone-service';

export async function POST(request: NextRequest) {
  try {
    const { tenantId, postcode, orderValue } = await request.json();
    
    if (!tenantId || !postcode) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID and postcode are required' },
        { status: 400 }
      );
    }

    const validation = await validateDeliveryPostcode(tenantId, postcode);
    
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: validation.error
      });
    }

    // Calculate delivery fee if order value is provided
    let deliveryInfo: any = { valid: true, zone: validation.zone };
    
    if (orderValue !== undefined && orderValue >= 0) {
      const feeResult = await calculateDeliveryFee(tenantId, postcode, orderValue);
      deliveryInfo = {
        ...deliveryInfo,
        fee: feeResult.fee,
        error: feeResult.error
      };
    }
    
    return NextResponse.json({
      success: true,
      data: deliveryInfo
    });
  } catch (error) {
    console.error('Error validating postcode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate postcode' },
      { status: 500 }
    );
  }
}
