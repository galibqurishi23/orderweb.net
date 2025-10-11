import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json({
                success: false,
                error: 'Reset token and new password are required'
            }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({
                success: false,
                error: 'Password must be at least 6 characters long'
            }, { status: 400 });
        }

        console.log('🔐 Processing password reset with token:', token);

        // Find customer with valid reset token
        const [customerRows] = await db.execute(`
            SELECT id, name, email, tenant_id 
            FROM customers 
            WHERE reset_token = ? 
            AND reset_token_expiry > NOW()
        `, [token]);

        if (!Array.isArray(customerRows) || customerRows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid or expired reset token. Please request a new password reset.'
            }, { status: 400 });
        }

        const customer = customerRows[0] as any;

        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token
        await db.execute(`
            UPDATE customers 
            SET password = ?, reset_token = NULL, reset_token_expiry = NULL 
            WHERE id = ?
        `, [hashedPassword, customer.id]);

        console.log('✅ Password reset successful for customer:', customer.email);

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });

    } catch (error) {
        console.error('❌ Password reset error:', error);
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred. Please try again later.'
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'Reset token is required'
            }, { status: 400 });
        }

        // Validate token without revealing customer details
        const [customerRows] = await db.execute(`
            SELECT id 
            FROM customers 
            WHERE reset_token = ? 
            AND reset_token_expiry > NOW()
        `, [token]);

        const isValid = Array.isArray(customerRows) && customerRows.length > 0;

        return NextResponse.json({
            success: true,
            valid: isValid
        });

    } catch (error) {
        console.error('❌ Token validation error:', error);
        return NextResponse.json({
            success: false,
            error: 'An unexpected error occurred while validating token.'
        }, { status: 500 });
    }
}
