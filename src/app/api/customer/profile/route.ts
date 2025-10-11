import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;

    // Get customer profile
    const customerQuery = `
      SELECT 
        id,
        first_name,
        last_name,
        name,
        email,
        phone,
        date_of_birth,
        preferences,
        marketing_consent,
        total_orders,
        created_at
      FROM customers 
      WHERE id = ?
    `;

    const customerQueryResult = await db.query(customerQuery, [customerId]);
    const customers = customerQueryResult[0]; // Get the rows from the result tuple
    
    if (!customers || (customers as any[]).length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = (customers as any[])[0];

    // Format response using the new first_name and last_name fields
    const profile = {
      id: customer.id,
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      email: customer.email,
      phone: customer.phone || '',
      dateOfBirth: customer.date_of_birth || '',
      loyaltyTier: 'bronze', // Default tier
      totalPoints: 0, // Default points
      totalOrders: customer.total_orders || 0,
      memberSince: customer.created_at,
      preferences: {
        emailNotifications: customer.marketing_consent || true,
        smsNotifications: false,
        promotionalEmails: customer.marketing_consent || true,
        orderUpdates: true,
        dietaryRestrictions: customer.preferences || '',
        favoriteItems: []
      }
    };

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const customerId = decoded.customerId;

    const body = await request.json();
    const { firstName, lastName, email, phone, dateOfBirth, preferences } = body;

    // Update customer basic info using the new first_name and last_name fields
    const updateCustomerQuery = `
      UPDATE customers 
      SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, preferences = ?, marketing_consent = ?
      WHERE id = ?
    `;

    await db.query(updateCustomerQuery, [
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth || null,
      preferences.dietaryRestrictions || '',
      preferences.emailNotifications || true,
      customerId
    ]);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
