import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;

    const { id } = await params;
    const body = await request.json();
    const {
      type,
      isDefault,
      addressLine1,
      addressLine2,
      city,
      postcode,
      county,
      country,
      deliveryInstructions
    } = body;

    // Check if address exists and belongs to user
    const checkQuery = 'SELECT id FROM customer_addresses WHERE id = ? AND customer_id = ?';
    const existingAddresses = await db.query(checkQuery, [id, customerId]);
    
    if (!existingAddresses || (existingAddresses as any[]).length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // If this is being set as default, update all other addresses to not be default
    if (isDefault) {
      await db.query(
        'UPDATE addresses SET isDefault = FALSE WHERE customerId = ? AND id != ?',
        [customerId, id]
      );
    }

    // Update address - using correct column names
    const streetAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;
    
    const updateQuery = `
      UPDATE addresses 
      SET isDefault = ?, street = ?, city = ?, postcode = ?, updated_at = NOW()
      WHERE id = ? AND customerId = ?
    `;

    await db.query(updateQuery, [
      isDefault ? 1 : 0,
      streetAddress,
      city,
      postcode,
      id,
      customerId
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Address update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;

    const { id } = await params;

    // Verify the address belongs to the customer
    const checkQuery = 'SELECT id, isDefault FROM addresses WHERE id = ? AND customerId = ?';
    const existingAddresses = await db.query(checkQuery, [id, customerId]);
    
    if (!existingAddresses || (existingAddresses as any[]).length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const address = (existingAddresses as any[])[0];

    // Don't allow deletion of the default address if it's the only one
    if (address.isDefault) {
      const countQuery = 'SELECT COUNT(*) as count FROM addresses WHERE customerId = ?';
      const countResult = await db.query(countQuery, [customerId]);
      const totalAddresses = (countResult[0] as any).count;

      if (totalAddresses === 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the only address. Add another address first.' 
        }, { status: 400 });
      }

      // If deleting default address and there are others, make the next one default
      await db.query(
        `UPDATE addresses 
         SET isDefault = TRUE 
         WHERE customerId = ? AND id != ? 
         ORDER BY created_at ASC 
         LIMIT 1`,
        [customerId, id]
      );
    }

    // Delete the address
    await db.query(
      'DELETE FROM addresses WHERE id = ? AND customerId = ?',
      [id, customerId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Address deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
