import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * GET /ap    console.log('[CREATE CUSTOMER] ✅ Loyalty points initialized');

    // Initialize customer_loyalty record
    await connection.execute(
      `INSERT INTO customer_loyalty (
        id, customer_id, tenant_id, points_balance, tier_level,
        created_at, updated_at
      ) VALUES (?, ?, ?, 0, 'bronze', NOW(), NOW())`,
      [uuidv4(), customerId, tenantId]
    );

    console.log('[CREATE CUSTOMER] ✅ Customer loyalty record created');omers
 * Get all customers for a tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tenant ID is required' 
      }, { status: 400 });
    }

    // Get customers with basic info and loyalty data if available
    const [customersResult] = await db.execute(`
      SELECT 
        c.id,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), c.name, 'Unknown Customer') as name,
        c.email,
        c.phone,
        c.created_at,
        c.total_orders,
        c.total_spent,
        c.last_order_date,
        COALESCE(clp.points_balance, 0) as points_balance,
        COALESCE(clp.tier_level, 'bronze') as tier_level,
        COALESCE(clp.total_points_earned, 0) as total_points_earned
      FROM customers c
      LEFT JOIN customer_loyalty_points clp ON c.id = clp.customer_id
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
    `, [tenantId]);

    const customers = (customersResult as any[]).map(customer => ({
      id: customer.id,
      name: customer.name || 'Unknown Customer',
      email: customer.email || '',
      phone: customer.phone || '',
      created_at: customer.created_at,
      points_balance: customer.points_balance || 0,
      tier_level: customer.tier_level || 'bronze',
      total_points_earned: customer.total_points_earned || 0,
      total_orders: customer.total_orders || 0,
      total_spent: parseFloat(customer.total_spent) || 0,
      last_order_date: customer.last_order_date
    }));

    return NextResponse.json({
      success: true,
      customers,
      total: customers.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customers'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { name, email, phone, password, tenantId } = body;

    console.log('[CREATE CUSTOMER] Request body received:', { name, email, phone, tenantId, hasPassword: !!password });

    // Validation
    if (!name || !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    if (!tenantId) {
      console.error('[CREATE CUSTOMER] ❌ Missing tenantId in request');
      return NextResponse.json({ 
        success: false, 
        error: 'Tenant ID is required but was not provided' 
      }, { status: 400 });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if customer already exists
    const [existingCustomers] = await connection.execute(
      'SELECT id FROM customers WHERE tenant_id = ? AND (email = ? OR phone = ?)',
      [tenantId, email, phone || null]
    );

    if ((existingCustomers as any[]).length > 0) {
      await connection.rollback();
      return NextResponse.json({ 
        success: false, 
        error: 'A customer with this email or phone already exists' 
      }, { status: 400 });
    }

    // Generate customer ID
    const customerId = uuidv4();
    
    // Hash password if provided, otherwise use a random one
    const hashedPassword = password 
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash(Math.random().toString(36), 10);

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('[CREATE CUSTOMER] Inserting customer with:', {
      customerId,
      tenantId,
      name,
      firstName,
      lastName,
      email,
      phone: phone || null
    });

    // Insert customer
    await connection.execute(
      `INSERT INTO customers (
        id, tenant_id, name, first_name, last_name, email, phone, password,
        total_orders, total_spent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
      [customerId, tenantId, name, firstName, lastName, email, phone || null, hashedPassword]
    );

    console.log('[CREATE CUSTOMER] ✅ Customer record created:', customerId);

    // Initialize loyalty points
    await connection.execute(
      `INSERT INTO customer_loyalty_points (
        customer_id, tenant_id, points_balance, tier_level, total_points_earned,
        total_points_redeemed, created_at, updated_at
      ) VALUES (?, ?, 0, 'bronze', 0, 0, NOW(), NOW())`,
      [customerId, tenantId]
    );

    console.log('[CREATE CUSTOMER] ✅ Loyalty points initialized');

    // Initialize customer_loyalty record (legacy table without tenant_id)
    await connection.execute(
      `INSERT INTO customer_loyalty (
        customer_id, points_balance, tier_level, total_points_earned, 
        total_points_redeemed, next_tier_points, created_at, updated_at
      ) VALUES (?, 0, 'bronze', 0, 0, 500, NOW(), NOW())`,
      [customerId]
    );

    console.log('[CREATE CUSTOMER] ✅ Customer loyalty record created');

    // If phone provided, add to lookup
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      const displayPhone = phone; // Keep original format for display
      await connection.execute(
        `INSERT INTO loyalty_phone_lookup (
          customer_id, tenant_id, phone, normalized_phone, 
          display_phone, formatted_phone, is_active, is_primary,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [customerId, tenantId, phone, normalizedPhone, displayPhone, phone]
      );
      console.log('[CREATE CUSTOMER] ✅ Phone lookup added');
    }

    await connection.commit();
    console.log('[CREATE CUSTOMER] Transaction committed successfully');

    // Fetch the created customer with loyalty data
    const [customerResult] = await connection.execute(
      `SELECT 
        c.id,
        COALESCE(c.name, CONCAT(c.first_name, ' ', c.last_name), 'Unknown Customer') as name,
        c.email,
        c.phone,
        c.created_at,
        c.total_orders,
        c.total_spent,
        c.last_order_date,
        COALESCE(clp.points_balance, 0) as points_balance,
        COALESCE(clp.tier_level, 'bronze') as tier_level,
        COALESCE(clp.total_points_earned, 0) as total_points_earned
      FROM customers c
      LEFT JOIN customer_loyalty_points clp ON c.id = clp.customer_id
      WHERE c.id = ?`,
      [customerId]
    );

    const customer = (customerResult as any[])[0];

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        created_at: customer.created_at,
        points_balance: customer.points_balance || 0,
        tier_level: customer.tier_level || 'bronze',
        total_points_earned: customer.total_points_earned || 0,
        total_orders: customer.total_orders || 0,
        total_spent: parseFloat(customer.total_spent) || 0,
        last_order_date: customer.last_order_date
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[CREATE CUSTOMER] ❌ Error:', error);
    console.error('[CREATE CUSTOMER] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to create customer: ' + (error as Error).message
    }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
