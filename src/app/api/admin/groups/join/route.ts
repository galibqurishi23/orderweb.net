import { GroupCodeService } from '@/lib/group-code-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { groupCode, tenantId } = await request.json();

    if (!groupCode || !tenantId) {
      return NextResponse.json(
        { error: 'Group code and tenant ID are required' },
        { status: 400 }
      );
    }

    // Validate group code format
    if (!GroupCodeService.isValidGroupCode(groupCode.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid group code format. Must be 6 characters (A-Z, 0-9)' },
        { status: 400 }
      );
    }

    const result = await GroupCodeService.joinGroup(groupCode, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      groupId: result.groupId
    });

  } catch (error) {
    console.error('Join group API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
