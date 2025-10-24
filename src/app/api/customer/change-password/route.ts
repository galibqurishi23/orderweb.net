import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Not authenticated' 
      }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    const customerId = decoded.customerId;

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        message: 'Current and new password are required'
      }, { status: 400 });
    }

    // Get current password hash
    const [customers] = await db.execute(
      'SELECT password FROM customers WHERE id = ?',
      [customerId]
    );

    const customer = (customers as any[])[0];
    if (!customer) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found'
      }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, customer.password);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        message: 'Current password is incorrect'
      }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.execute(
      'UPDATE customers SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, customerId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to change password'
    }, { status: 500 });
  }
}
