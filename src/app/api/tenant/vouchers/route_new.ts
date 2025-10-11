import { NextRequest, NextResponse } from 'next/server';
import { 
  getTenantVouchers, 
  saveTenantVoucher, 
  deleteTenantVoucher 
} from '@/lib/tenant-voucher-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const vouchers = await getTenantVouchers(tenantId);
    
    return NextResponse.json(vouchers);
  } catch (error) {
    console.error('Error fetching tenant vouchers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vouchers' },
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

    const voucherData = await request.json();
    
    // Validate required fields
    if (!voucherData.code || !voucherData.value || !voucherData.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required voucher fields' },
        { status: 400 }
      );
    }

    await saveTenantVoucher(tenantId, voucherData);
    
    return NextResponse.json({
      success: true,
      message: 'Voucher saved successfully'
    });
  } catch (error) {
    console.error('Error saving tenant voucher:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save voucher' },
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
        { success: false, error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    await deleteTenantVoucher(tenantId, id);
    
    return NextResponse.json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant voucher:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete voucher' },
      { status: 500 }
    );
  }
}
