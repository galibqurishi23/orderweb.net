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

    // Get user info from headers for audit trail
    const userEmail = request.headers.get('x-user-email') || 'system';
    
    // Update invoice status with audit trail
    let updateQuery: string;
    let updateParams: any[];
    
    if (status === 'paid') {
      // Mark as paid with timestamp and user tracking
      updateQuery = `
        UPDATE billing 
        SET status = ?, 
            payment_method = ?, 
            paid_at = NOW(),
            paid_by = ?,
            archived = 1,
            notes = CONCAT(COALESCE(notes, ''), '\n', 'Marked as paid by ', ?, ' on ', NOW()),
            updated_at = NOW()
        WHERE id = ?
      `;
      updateParams = [status, paymentMethod || null, userEmail, userEmail, invoiceId];
    } else {
      updateQuery = `
        UPDATE billing 
        SET status = ?, 
            payment_method = ?, 
            updated_at = NOW()
        WHERE id = ?
      `;
      updateParams = [status, paymentMethod || null, invoiceId];
    }
    
    await db.execute(updateQuery, updateParams);

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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const params = await context.params;
    const { invoiceId } = params;
    
    // Get deletion reason from request body
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'No reason provided';
    
    // Get user info for audit trail
    const userEmail = request.headers.get('x-user-email') || 'system';

    // Check if invoice exists
    const [existingRows] = await db.execute(
      'SELECT id, status FROM billing WHERE id = ? AND deleted_at IS NULL',
      [invoiceId]
    );

    const existingInvoices = existingRows as any[];
    if (!existingInvoices || existingInvoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // SOFT DELETE: Archive invoice instead of hard delete
    // This preserves all invoice data for audit trail and reporting
    await db.execute(
      `UPDATE billing 
       SET deleted_at = NOW(),
           deleted_by = ?,
           deletion_reason = ?,
           archived = 1,
           notes = CONCAT(COALESCE(notes, ''), '\n', 'Deleted by ', ?, ' on ', NOW(), ' - Reason: ', ?),
           updated_at = NOW()
       WHERE id = ?`,
      [userEmail, reason, userEmail, reason, invoiceId]
    );

    console.log(`📝 Invoice ${invoiceId} archived (soft deleted) by ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted and moved to reports'
    });

  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
