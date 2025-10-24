import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { PhoneLoyaltyService } from '@/lib/phone-loyalty-service';

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    const customerId = decoded.customerId;
    const tenantId = decoded.tenantId;

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
    const customers = customerQueryResult[0];
    
    if (!customers || (customers as any[]).length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = (customers as any[])[0];

    // Get loyalty data using PhoneLoyaltyService (same as admin uses)
    let loyalty = { points_balance: 0, tier_level: 'bronze', total_points_earned: 0, total_points_redeemed: 0 };
    
    if (customer.phone && tenantId) {
      try {
        const loyaltyData = await PhoneLoyaltyService.lookupByPhone(customer.phone, tenantId);
        if (loyaltyData) {
          loyalty = {
            points_balance: loyaltyData.pointsBalance || 0,
            tier_level: loyaltyData.tierLevel || 'bronze',
            total_points_earned: loyaltyData.totalPointsEarned || 0,
            total_points_redeemed: loyaltyData.totalPointsRedeemed || 0
          };
        }
      } catch (loyaltyError) {
        console.error('Error fetching loyalty data:', loyaltyError);
        // Continue with default values
      }
    }

    // Format response
    const profile = {
      id: customer.id,
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      email: customer.email,
      phone: customer.phone || '',
      dateOfBirth: customer.date_of_birth || '',
      loyaltyTier: loyalty.tier_level || 'bronze',
      totalPoints: loyalty.points_balance || 0,
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
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET || 'customer-secret-key') as any;
    const customerId = decoded.customerId;

    const body = await request.json();
    const { firstName, lastName, email, phone, dateOfBirth, preferences } = body;

    // Update customer basic info
    const updateCustomerQuery = `
      UPDATE customers 
      SET first_name = ?, last_name = ?, name = ?, email = ?, phone = ?, date_of_birth = ?, 
          preferences = ?, marketing_consent = ?, updated_at = NOW()
      WHERE id = ?
    `;

    const fullName = `${firstName} ${lastName}`.trim();

    await db.query(updateCustomerQuery, [
      firstName,
      lastName,
      fullName,
      email,
      phone,
      dateOfBirth || null,
      preferences?.dietaryRestrictions || '',
      preferences?.emailNotifications !== false,
      customerId
    ]);

    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully' 
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
