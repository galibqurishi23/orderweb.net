import { GroupCodeService } from '@/lib/group-code-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const group = await GroupCodeService.getGroupForTenant(tenantId);

    return NextResponse.json({
      success: true,
      group: group
    });

  } catch (error) {
    console.error('Get group API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { groupId, tenantId } = await request.json();

    if (!groupId || !tenantId) {
      return NextResponse.json(
        { error: 'Group ID and tenant ID are required' },
        { status: 400 }
      );
    }

    const result = await GroupCodeService.leaveGroup(groupId, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Leave group API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
