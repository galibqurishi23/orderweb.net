import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import PhoneLoyaltyService from '@/lib/phone-loyalty-service';
import { RowDataPacket } from 'mysql2';
import { broadcastLoyaltyUpdate } from '@/lib/websocket-broadcaster';

interface Customer extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const { customerId, points, reason, tenantId } = await request.json();

    console.log('🎯 [LOYALTY POINTS] Request received:', {
      customerId,
      points,
      reason,
      tenantId
    });

    // Validate input
    if (!customerId || !points || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID, points, and tenant ID are required' },
        { status: 400 }
      );
    }

    if (points <= 0) {
      return NextResponse.json(
        { success: false, error: 'Points must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if tenantId is already a UUID or if it's a slug that needs conversion
    let actualTenantId = tenantId;
    
    // If tenantId looks like a UUID (contains hyphens), use it directly
    if (tenantId.includes('-')) {
      // Verify the UUID exists in tenants table
      const [tenantResult] = await db.execute(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );
      
      const tenant = (tenantResult as any[])[0];
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      actualTenantId = tenantId;
    } else {
      // It's a slug, convert to UUID
      const [tenantResult] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenantId]
      );

      const tenant = (tenantResult as any[])[0];
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      actualTenantId = tenant.id;
    }

    // Verify customer exists and get phone number
    const customerResult = await db.query<Customer[]>(
      'SELECT id, name, email, phone FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, actualTenantId]
    );

    console.log('🔍 [LOYALTY POINTS] Customer query result:', {
      customerId,
      actualTenantId,
      found: customerResult[0].length,
      customer: customerResult[0][0]
    });

    if (customerResult[0].length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0][0];

    console.log('👤 [LOYALTY POINTS] Customer details:', {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      hasPhone: !!customer.phone
    });

    if (!customer.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer must have a phone number for loyalty program' },
        { status: 400 }
      );
    }

    // Check if customer is enrolled in loyalty program
    let loyaltyCustomer = await PhoneLoyaltyService.lookupByPhone(customer.phone, actualTenantId);

    console.log('🔎 [LOYALTY POINTS] Loyalty lookup result:', {
      phone: customer.phone,
      tenantId: actualTenantId,
      found: !!loyaltyCustomer,
      loyaltyCustomer
    });

    if (!loyaltyCustomer) {
      // Auto-enroll customer in loyalty program
      loyaltyCustomer = await PhoneLoyaltyService.createLoyaltyMember(
        customer.phone,
        actualTenantId,
        customer.name,
        customer.id
      );

      if (!loyaltyCustomer) {
        return NextResponse.json(
          { success: false, error: 'Failed to enroll customer in loyalty program' },
          { status: 500 }
        );
      }
    }

    // Add points using phone loyalty service
    const success = await PhoneLoyaltyService.addPoints(
      customer.phone,
      actualTenantId,
      points,
      reason || 'Admin awarded points',
      'bonus' // transactionType for admin awards
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add points' },
        { status: 500 }
      );
    }

    // Get updated loyalty data
    const updatedLoyalty = await PhoneLoyaltyService.lookupByPhone(customer.phone, actualTenantId);

    // Broadcast real-time update to customer dashboard
    await broadcastLoyaltyUpdate(actualTenantId, {
      customerId: customer.id,
      customerPhone: customer.phone,
      customerName: customer.name,
      pointsChange: points,
      newBalance: updatedLoyalty?.pointsBalance || 0,
      totalPointsEarned: updatedLoyalty?.totalPointsEarned || 0,
      totalPointsRedeemed: updatedLoyalty?.totalPointsRedeemed || 0,
      transactionType: 'bonus',
      reason: reason || 'Admin awarded points'
    });

    console.log(`✅ Loyalty update broadcasted for ${customer.name} - ${points} points added`);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${points} points to ${customer.name}`,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      loyaltyUpdate: {
        pointsAdded: points,
        newBalance: updatedLoyalty?.pointsBalance || 0,
        newTotalEarned: updatedLoyalty?.totalPointsEarned || 0,
        tierLevel: updatedLoyalty?.tierLevel || 'bronze'
      }
    });

  } catch (error) {
    console.error('Error adding loyalty points:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add loyalty points',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Get loyalty points for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const tenantId = searchParams.get('tenantId');

    if (!customerId || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and tenant ID are required' },
        { status: 400 }
      );
    }

    // Check if tenantId is already a UUID or if it's a slug that needs conversion
    let actualTenantId = tenantId;
    
    // If tenantId looks like a UUID (contains hyphens), use it directly
    if (tenantId.includes('-')) {
      // Verify the UUID exists in tenants table
      const [tenantResult] = await db.execute(
        'SELECT id FROM tenants WHERE id = ?',
        [tenantId]
      );
      
      const tenant = (tenantResult as any[])[0];
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      actualTenantId = tenantId;
    } else {
      // It's a slug, convert to UUID
      const [tenantResult] = await db.execute(
        'SELECT id FROM tenants WHERE slug = ?',
        [tenantId]
      );

      const tenant = (tenantResult as any[])[0];
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      actualTenantId = tenant.id;
    }

    // Get customer phone number
    const customerResult = await db.query<Customer[]>(
      'SELECT id, name, email, phone FROM customers WHERE id = ? AND tenant_id = ?',
      [customerId, actualTenantId]
    );

    if (customerResult[0].length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0][0];

    if (!customer.phone) {
      return NextResponse.json({
        success: true,
        loyalty: null,
        message: 'Customer needs phone number for loyalty program'
      });
    }

    // Get loyalty data using phone-based system
    const loyaltyCustomer = await PhoneLoyaltyService.lookupByPhone(customer.phone, actualTenantId);

    return NextResponse.json({
      success: true,
      loyalty: loyaltyCustomer
    });

  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty points',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
