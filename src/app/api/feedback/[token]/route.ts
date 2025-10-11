import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

// GET - Fetch order details for feedback
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const { token } = params;

    // Get order details using feedback token
    const [rows] = await db.execute(`
      SELECT 
        o.id,
        o.customer_name,
        o.customer_email,
        o.total,
        o.items,
        o.created_at,
        t.id as tenant_id,
        t.business_name,
        t.logo_url,
        t.primary_color,
        of.id as feedback_id
      FROM order_feedback of
      JOIN orders o ON o.id = of.order_id
      JOIN tenants t ON t.id = of.tenant_id
      WHERE of.feedback_token = ? AND of.rating IS NULL
    `, [token]);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found or feedback already submitted' },
        { status: 404 }
      );
    }

    const orderData = rows[0] as any;

    return NextResponse.json({
      id: orderData.id,
      customer_name: orderData.customer_name,
      customer_email: orderData.customer_email,
      tenant_id: orderData.tenant_id,
      business_name: orderData.business_name,
      logo_url: orderData.logo_url,
      primary_color: orderData.primary_color,
      total: parseFloat(orderData.total),
      items: JSON.parse(orderData.items || '[]'),
      created_at: orderData.created_at
    });

  } catch (error) {
    console.error('Error fetching order for feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Submit feedback
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const params = await context.params;
    const { token } = params;
    const { rating, review, customer_name, customer_email } = await request.json();

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Update the feedback record
    const [result] = await db.execute(`
      UPDATE order_feedback 
      SET 
        rating = ?,
        review = ?,
        customer_name = ?,
        customer_email = ?
      WHERE feedback_token = ? AND rating IS NULL
    `, [rating, review || null, customer_name, customer_email, token]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Feedback not found or already submitted' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
