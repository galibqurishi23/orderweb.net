import { NextRequest, NextResponse } from 'next/server';
import { updateSuperAdminUserStatus, deleteSuperAdminUser } from '@/lib/tenant-service';

interface Params {
  id: string;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { active } = body;

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid active status' },
        { status: 400 }
      );
    }

    await updateSuperAdminUserStatus(id, active);

    return NextResponse.json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    console.error('Error updating super admin user status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await deleteSuperAdminUser(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting super admin user:', error);
    
    if (error.message === 'Cannot delete the last active super admin user') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the last active super admin user' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
