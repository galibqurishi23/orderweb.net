import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

export async function DELETE(request: NextRequest) {
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

    // Get customer data for logging purposes
    const customerQuery = `
      SELECT email, first_name, last_name 
      FROM customers 
      WHERE id = ? AND tenant_id = ?
    `;

    const customerResult = await db.query(customerQuery, [customerId, tenantId]);
    const customers = customerResult[0] as any[];
    
    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customers[0];

    // Start transaction for safe deletion
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Log the deletion attempt for audit purposes
      console.log(`🗑️ Starting permanent deletion of customer account:`, {
        customerId,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        tenantId,
        timestamp: new Date().toISOString()
      });

      // Delete all customer-related data in proper order (respecting foreign key constraints)
      
      console.log('🗑️ Step 1: Deleting customer addresses...');
      await connection.execute(
        'DELETE FROM addresses WHERE customerId = ?',
        [customerId]
      );

      console.log('🗑️ Step 2: Anonymizing orders (preserving business records)...');
      // Anonymize orders rather than delete for business record keeping
      await connection.execute(`
        UPDATE orders 
        SET 
          customerName = 'Deleted Customer',
          customerPhone = 'DELETED',
          customerEmail = 'deleted@customer.com',
          customerId = NULL,
          address = CASE 
            WHEN address != 'Collection' THEN 'DELETED ADDRESS' 
            ELSE address 
          END
        WHERE customerId = ?
      `, [customerId]);

      console.log('🗑️ Step 3: Deleting main customer record...');
      await connection.execute(
        'DELETE FROM customers WHERE id = ? AND tenant_id = ?',
        [customerId, tenantId]
      );

      // Commit the transaction
      await connection.commit();

      console.log(`✅ Successfully deleted customer account:`, {
        customerId,
        email: customer.email,
        deletedAt: new Date().toISOString()
      });

      // Clear the authentication cookie
      const response = NextResponse.json({ 
        success: true,
        message: 'Your account has been permanently deleted. All your personal data has been removed.'
      });

      response.cookies.set('customer_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/'
      });

      return response;

    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('❌ Error during customer account deletion:', error);
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Customer account deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account. Please try again or contact support.' 
    }, { status: 500 });
  }
}
