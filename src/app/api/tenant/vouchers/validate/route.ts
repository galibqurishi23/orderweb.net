import { NextRequest, NextResponse } from 'next/server';
import { validateTenantVoucher } from '@/lib/tenant-voucher-service';

export async function POST(request: NextRequest) {
  try {
    const { tenantId, code, orderTotal } = await request.json();
    
    if (!tenantId || !code || orderTotal === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (orderTotal < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order total' },
        { status: 400 }
      );
    }

    const result = await validateTenantVoucher(tenantId, code, orderTotal);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating voucher:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate voucher' },
      { status: 500 }
    );
  }
}
