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

    // Get customer addresses - using correct column names
    const query = `
      SELECT * FROM addresses 
      WHERE customerId = ? 
      ORDER BY isDefault DESC, created_at DESC
    `;

    const dbAddresses = await db.query(query, [customerId]);
    
    // Map database fields to frontend format
    const addresses = (dbAddresses as any[]).map(addr => ({
      id: addr.id,
      type: 'home', // Default type
      isDefault: !!addr.isDefault,
      addressLine1: addr.street.split(', ')[0] || addr.street,
      addressLine2: addr.street.split(', ')[1] || '',
      city: addr.city,
      postcode: addr.postcode,
      country: 'UK', // Default country
      createdAt: addr.created_at
    }));

    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Addresses fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/customer/addresses called');
    
    // Get JWT token from cookie
    const token = request.cookies.get('customer_token')?.value;
    
    if (!token) {
      console.log('❌ No customer token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      console.log('✅ JWT token verified for customer:', decoded.customerId);
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const customerId = decoded.customerId;

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

    // Validate required fields
    if (!addressLine1 || !city || !postcode) {
      console.log('❌ Missing required fields:', { addressLine1, city, postcode });
      return NextResponse.json({ error: 'Missing required fields: addressLine1, city, postcode' }, { status: 400 });
    }

    console.log('💾 Saving address for customer:', customerId);
    console.log('📍 Address data:', body);

    // Get tenant_id - try multiple methods
    const url = new URL(request.url);
    const refererHeader = request.headers.get('referer');
    console.log('🔍 Full URL:', request.url);
    console.log('🔍 Referer:', refererHeader);
    
    let tenantSlug = null;
    
    // Try to extract tenant from referer URL (more reliable)
    if (refererHeader) {
      const refererUrl = new URL(refererHeader);
      const refererPath = refererUrl.pathname;
      console.log('🔍 Referer path:', refererPath);
      const refererSegments = refererPath.split('/').filter(Boolean);
      console.log('🔍 Referer segments:', refererSegments);
      if (refererSegments.length > 0) {
        tenantSlug = refererSegments[0];
      }
    }
    
    console.log('🔍 Extracted tenant slug:', tenantSlug);
    
    if (!tenantSlug) {
      console.log('❌ Could not determine tenant slug');
      return NextResponse.json({ error: 'Could not determine tenant' }, { status: 400 });
    }
    
    // Get tenant ID
    const tenantQuery = 'SELECT id FROM tenants WHERE slug = ?';
    const tenantResult = await db.query(tenantQuery, [tenantSlug]);
    
    if (!tenantResult || (tenantResult as any[]).length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    
    const tenantId = (tenantResult as any[])[0].id;

    // If this is being set as default, update all other addresses to not be default
    if (isDefault) {
      await db.query(
        'UPDATE addresses SET isDefault = FALSE WHERE customerId = ?',
        [customerId]
      );
    }

    // Generate ID for the new address
    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert new address - using correct column names
    const insertQuery = `
      INSERT INTO addresses 
      (id, tenant_id, customerId, street, city, postcode, isDefault, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    // Combine address lines
    const streetAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;

    await db.query(insertQuery, [
      addressId,
      tenantId,
      customerId,
      streetAddress,
      city,
      postcode,
      isDefault ? 1 : 0
    ]);

    console.log('✅ Address saved successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Address creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
