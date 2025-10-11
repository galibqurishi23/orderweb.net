import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { status, paymentMethod, notes } = await request.json();
    const params = await context.params;
    const { invoiceId } = params;

    if (!invoiceId || !status) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current invoice
    const [invoiceRows] = await db.execute(
      'SELECT * FROM billing WHERE id = ?',
      [invoiceId]
    );

    const invoices = invoiceRows as any[];
    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update invoice status
    const updateQuery = `
      UPDATE billing 
      SET status = ?, payment_method = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await db.execute(updateQuery, [status, paymentMethod || null, invoiceId]);

    // If status is 'paid', update tenant subscription status
    if (status === 'paid') {
      const invoice = invoices[0];
      await db.execute(
        `UPDATE tenants 
         SET subscription_status = 'active', 
             trial_ends_at = NULL,
             updated_at = NOW()
         WHERE id = ?`,
        [invoice.tenant_id]
      );
    }

    // Get updated invoice with tenant info
    const [updatedRows] = await db.execute(
      `SELECT 
        b.*, 
        t.name as tenant_name, 
        t.email as tenant_email 
       FROM billing b
       JOIN tenants t ON b.tenant_id = t.id
       WHERE b.id = ?`,
      [invoiceId]
    );

    const updatedInvoice = (updatedRows as any[])[0];

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: status === 'paid' ? 'Invoice marked as paid and subscription activated' : `Invoice status updated to ${status}`
    });

  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const params = await context.params;
    const { invoiceId } = params;

    const [invoiceRows] = await db.execute(
      `SELECT 
        b.*, 
        t.name as tenant_name, 
        t.email as tenant_email,
        t.slug as tenant_slug,
        t.phone as tenant_phone,
        t.address as tenant_address
       FROM billing b
       JOIN tenants t ON b.tenant_id = t.id
       WHERE b.id = ?`,
      [invoiceId]
    );

    const invoices = invoiceRows as any[];
    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: invoices[0]
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
