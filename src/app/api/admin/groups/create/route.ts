import { GroupCodeService } from '@/lib/group-code-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { groupName, tenantId, createdBy } = await request.json();

    if (!groupName || !tenantId || !createdBy) {
      return NextResponse.json(
        { error: 'Group name, tenant ID, and creator are required' },
        { status: 400 }
      );
    }

    const result = await GroupCodeService.createGroup(groupName, tenantId, createdBy);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      groupCode: result.groupCode,
      groupId: result.groupId
    });

  } catch (error) {
    console.error('Create group API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
