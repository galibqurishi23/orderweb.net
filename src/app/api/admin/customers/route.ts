import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * GET /api/admin/customers
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
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customers'
    }, { status: 500 });
  }
}
