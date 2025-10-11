import { NextRequest, NextResponse } from 'next/server';
import { createAddonOption, getAddonOptionsByGroupId } from '@/lib/addon-service';
import { CreateAddonOptionRequest } from '@/lib/addon-types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const addonGroupId = searchParams.get('addonGroupId');
    
    if (!addonGroupId) {
      return NextResponse.json({
        success: false,
        error: 'addonGroupId is required'
      }, { status: 400 });
    }

    const addonOptions = await getAddonOptionsByGroupId(addonGroupId);
    
    return NextResponse.json({
      success: true,
      data: addonOptions
    });
  } catch (error) {
    console.error('Error fetching addon options:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantId } = await params;
    const body: CreateAddonOptionRequest = await request.json();
    
    const addonOption = await createAddonOption(tenantId, body);
    
    return NextResponse.json({
      success: true,
      data: addonOption
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating addon option:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
