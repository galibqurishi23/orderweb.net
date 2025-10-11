import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, currentPassword, newPassword } = await request.json();

    if (!email || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, current password, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Get current super admin user
    const [userRows] = await db.execute(
      'SELECT * FROM super_admin_users ORDER BY created_at ASC LIMIT 1'
    );

    const users = userRows as any[];
    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'No super admin user found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update user credentials
    await db.execute(
      'UPDATE super_admin_users SET email = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [email, hashedNewPassword, user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Super admin credentials updated successfully'
    });

  } catch (error) {
    console.error('Error updating super admin credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
