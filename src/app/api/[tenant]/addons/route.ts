import { NextRequest, NextResponse } from 'next/server';
import { getAllAddonGroupsForTenant, createAddonGroup, updateAddonGroup, deleteAddonGroup } from '@/lib/addon-service';
import { CreateAddonGroupRequest, UpdateAddonGroupRequest } from '@/lib/addon-types';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const tenantId = params.tenant;
    const addonGroups = await getAllAddonGroupsForTenant(tenantId);
    
    return NextResponse.json({
      success: true,
      data: addonGroups
    });
  } catch (error) {
    console.error('Error fetching addon groups:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const tenantId = params.tenant;
    const body: CreateAddonGroupRequest = await request.json();
    const addonGroup = await createAddonGroup(tenantId, body);
    
    return NextResponse.json({
      success: true,
      data: addonGroup
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating addon group:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const tenantId = params.tenant;
    const body: UpdateAddonGroupRequest = await request.json();
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Group ID is required for update'
      }, { status: 400 });
    }
    
    const updatedGroup = await updateAddonGroup(tenantId, body);
    
    return NextResponse.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating addon group:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> }
) {
  try {
    const params = await context.params;
    const tenantId = params.tenant;
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'groupId parameter is required'
      }, { status: 400 });
    }
    
    await deleteAddonGroup(tenantId, groupId);
    
    return NextResponse.json({
      success: true,
      message: 'Addon group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting addon group:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
