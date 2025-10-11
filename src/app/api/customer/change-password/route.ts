import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    // Get current customer data
    const customerQuery = 'SELECT password FROM customers WHERE id = ? AND tenant_id = ?';
    const customers = await db.query(customerQuery, [customerId, tenantId]);
    
    if (!customers || (customers as any[]).length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = (customers as any[])[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, customer.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const updateQuery = 'UPDATE customers SET password = ? WHERE id = ? AND tenant_id = ?';
    await db.query(updateQuery, [hashedNewPassword, customerId, tenantId]);

    return NextResponse.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
