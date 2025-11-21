import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { emailService } from '@/lib/universal-email-service';
import jsPDF from 'jspdf';

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

    const invoice = invoices[0];

    console.log('📧 Preparing to send invoice email to:', invoice.tenant_email);

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // Email content
    const subject = `Invoice #${invoice.id.slice(0, 8)} - ${invoice.tenant_name}`;
    const htmlContent = generateEmailContent(invoice);

    // Send email using universal email service
    const result = await emailService.sendEmail(
      invoice.tenant_email,
      subject,
      htmlContent,
      [
        {
          filename: `invoice-${invoice.id.slice(0, 8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email. Please check SMTP configuration in Settings.' },
        { status: 500 }
      );
    }

    console.log('✅ Invoice email sent successfully to:', invoice.tenant_email);

    return NextResponse.json({
      success: true,
      message: `Invoice sent successfully to ${invoice.tenant_email}`
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send invoice email';
    
    if (error instanceof Error) {
      if (error.message.includes('authentication failed') || error.message.includes('EAUTH')) {
        errorMessage = 'SMTP authentication failed. Please check your email settings in Super Admin > Settings.';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to email server. Please verify SMTP host and port.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// Helper function to generate PDF
async function generateInvoicePDF(invoice: any): Promise<Buffer> {
  const doc = new jsPDF();
  
  // Set up colors and fonts
  doc.setTextColor(44, 62, 80); // Dark blue-gray
  
  // Header
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', 20, 30);
  
  // Company info (top right)
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('OrderWeb Platform', 140, 25);
  doc.text('Invoice Management System', 140, 32);
  
  // Invoice details
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Invoice Details', 20, 55);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, 20, 68);
  doc.text(`Date: ${formatDateForEmail(invoice.created_at)}`, 20, 78);
  doc.text(`Due Date: ${formatDateForEmail(invoice.due_date || invoice.created_at)}`, 20, 88);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 98);
  
  // Bill To section
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', 20, 118);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(invoice.tenant_name, 20, 131);
  doc.text(invoice.tenant_email, 20, 141);
  if (invoice.tenant_phone) {
    doc.text(`Phone: ${invoice.tenant_phone}`, 20, 151);
  }
  if (invoice.tenant_address) {
    doc.text(`Address: ${invoice.tenant_address}`, 20, 161);
  }
  
  // Service details
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Service Details', 20, 185);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const planName = getPlanDisplayName(invoice.subscription_plan);
  doc.text(`Plan: ${planName} Plan`, 20, 198);
  doc.text(`Billing Period: ${formatDateForEmail(invoice.billing_period_start)} - ${formatDateForEmail(invoice.billing_period_end)}`, 20, 208);
  
  if (invoice.description) {
    doc.text('Description:', 20, 218);
    const splitText = doc.splitTextToSize(invoice.description, 170);
    doc.text(splitText, 20, 228);
  }
  
  // Amount section
  const yPos = invoice.description ? 250 : 230;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(34, 139, 34); // Forest green
  doc.text(`Total Amount: ${formatCurrencyForEmail(invoice.amount, invoice.currency)}`, 20, yPos);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128); // Gray
  doc.setFont(undefined, 'normal');
  doc.text('Thank you for your business!', 20, 280);
  doc.text('This is an automatically generated invoice.', 20, 290);
  
  return Buffer.from(doc.output('arraybuffer'));
}

function generateEmailContent(invoice: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Invoice from OrderWeb Platform</h2>
      
      <p>Dear ${invoice.tenant_name},</p>
      
      <p>Please find attached your invoice for the ${getPlanDisplayName(invoice.subscription_plan)} plan.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">Invoice Details:</h3>
        <p><strong>Invoice #:</strong> ${invoice.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Amount:</strong> ${formatCurrencyForEmail(invoice.amount, invoice.currency)}</p>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
        <p><strong>Due Date:</strong> ${formatDateForEmail(invoice.due_date || invoice.created_at)}</p>
      </div>
      
      ${invoice.description ? `<p><strong>Description:</strong> ${invoice.description}</p>` : ''}
      
      <p>If you have any questions about this invoice, please don't hesitate to contact our support team.</p>
      
      <p>Thank you for choosing OrderWeb Platform!</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
      <p style="font-size: 12px; color: #6c757d;">
        This is an automatically generated email. Please do not reply to this email.
      </p>
    </div>
  `;
}

// Helper functions
function formatDateForEmail(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatCurrencyForEmail(amount: string | number, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const validAmount = typeof numAmount === 'number' && !isNaN(numAmount) ? numAmount : 0;
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency
  }).format(validAmount);
}

function getPlanDisplayName(planKey: string): string {
  const planNames: Record<string, string> = {
    'starter': 'Starter',
    'professional': 'Professional', 
    'enterprise': 'Enterprise',
    'online-order': 'Online Order',
    'online-order-pos': 'Online Order + POS'
  };
  return planNames[planKey] || planKey;
}
