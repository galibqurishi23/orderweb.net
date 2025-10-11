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
    
    console.log('=== VOUCHER API REQUEST ===');
    console.log('Tenant ID:', tenantId);
    
    if (!tenantId) {
      console.error('Missing tenant ID');
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const voucherData = await request.json();
    console.log('Received voucher data:', voucherData);
    
    // Basic validation
    if (!voucherData.code || !voucherData.type || !voucherData.value) {
      console.error('Missing required fields:', { 
        code: voucherData.code, 
        type: voucherData.type, 
        value: voucherData.value 
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: code, type, and value' },
        { status: 400 }
      );
    }

    // Save the voucher
    await saveTenantVoucher(tenantId, voucherData);
    
    console.log('Voucher saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Voucher saved successfully'
    });
    
  } catch (error) {
    console.error('=== VOUCHER API ERROR ===');
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

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const { id, action } = await request.json();
    
    if (!id && action !== 'deleteAll') {
      return NextResponse.json(
        { success: false, error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    if (action === 'toggle') {
      const { toggleTenantVoucherStatus } = await import('@/lib/tenant-voucher-service');
      await toggleTenantVoucherStatus(tenantId, id);
      
      return NextResponse.json({
        success: true,
        message: 'Voucher status toggled successfully'
      });
    } else if (action === 'deleteAll') {
      const { deleteAllTenantVouchers } = await import('@/lib/tenant-voucher-service');
      await deleteAllTenantVouchers(tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'All vouchers deleted successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH vouchers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
