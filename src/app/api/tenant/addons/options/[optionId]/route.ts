import { NextRequest, NextResponse } from 'next/server';
import { updateAddonOption, deleteAddonOption } from '@/lib/addon-service';
import { UpdateAddonOptionRequest } from '@/lib/addon-types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; optionId: string }> }
) {
  try {
    const { tenant: tenantId, optionId } = await params;
    const body = await request.json();
    
    const updateData: UpdateAddonOptionRequest = {
      id: optionId,
      ...body
    };
    
    const updatedOption = await updateAddonOption(tenantId, updateData);
    
    return NextResponse.json({
      success: true,
      data: updatedOption
    });
    
  } catch (error) {
    console.error('Error updating addon option:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string; optionId: string }> }
) {
  try {
    const { tenant: tenantId, optionId } = await params;
    
    await deleteAddonOption(tenantId, optionId);
    
    return NextResponse.json({
      success: true,
      message: 'Addon option deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting addon option:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
