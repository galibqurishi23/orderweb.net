import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const params = await context.params;
    const { invoiceId } = params;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Get invoice details
    const [invoiceRows] = await db.execute(
      `SELECT b.*, t.name as tenant_name, t.email as tenant_email, t.address as tenant_address
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

    const invoice = invoices[0];

    // Send email (simplified version)
    const emailSent = await sendInvoiceEmail(invoice);

    if (emailSent) {
      // Log the successful send (we'll skip updating the database for now)
      console.log(`Invoice ${invoice.id.slice(0, 8)} sent successfully to ${invoice.tenant_email}`);

      return NextResponse.json({
        success: true,
        message: `Invoice sent successfully to ${invoice.tenant_email}`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}

async function sendInvoiceEmail(invoice: any): Promise<boolean> {
  try {
    // This is a simplified version - in production you'd use a proper email service
    // like SendGrid, AWS SES, or Nodemailer
    
    console.log(`Sending invoice ${invoice.id.slice(0, 8)} to ${invoice.tenant_email}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, just log the email content
    const emailContent = {
      to: invoice.tenant_email,
      subject: `Invoice #${invoice.id.slice(0, 8)} from OrderWeb`,
      body: `
Dear ${invoice.tenant_name},

Please find attached your invoice #${invoice.id.slice(0, 8)}.

Invoice Details:
- Amount: £${invoice.amount}
- Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
- Description: ${invoice.description}

Please ensure payment is made by the due date.

Best regards,
OrderWeb Team
      `
    };

    console.log('Email content:', emailContent);
    
    // Return true to simulate successful sending
    return true;
    
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
