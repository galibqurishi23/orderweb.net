import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import jsPDF from 'jspdf';
import path from 'path';
import fs from 'fs';

// GET - Download invoice as PDF
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const params = await context.params;
    const { invoiceId } = params;

    // Get platform settings for company info
    const [settingsRows] = await db.execute(
      `SELECT settings_json FROM platform_settings WHERE id = 1`
    ) as [any[], any];
    
    let companyInfo = {
      appName: 'Order Web',
      companyName: 'Order Web Ltd',
      companyAddress: '443A Brockley Road, London',
      supportEmail: 'mail@orderweb.co.uk',
      supportPhone: '+44(0)20 8058 8807',
      appLogo: '/icons/login_logo.svg'
    };

    if (settingsRows.length > 0 && settingsRows[0].settings_json) {
      try {
        const settings = JSON.parse(settingsRows[0].settings_json);
        companyInfo = {
          appName: settings.appName || settings.platformName || companyInfo.appName,
          companyName: settings.companyName || companyInfo.companyName,
          companyAddress: settings.companyAddress || companyInfo.companyAddress,
          supportEmail: settings.supportEmail || companyInfo.supportEmail,
          supportPhone: settings.supportPhone || companyInfo.supportPhone,
          appLogo: settings.appLogo || companyInfo.appLogo
        };
      } catch (e) {
        console.error('Error parsing settings:', e);
      }
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

    // Generate PDF with professional layout
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add elegant header border
    doc.setDrawColor(99, 102, 241); // Purple
    doc.setLineWidth(2);
    doc.line(15, 15, pageWidth - 15, 15);
    
    // Company Logo and Info (Top Left)
    let currentY = 25;
    
    // Try to add logo if it's an SVG or accessible file
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241); // Purple
    doc.text(companyInfo.appName, 20, currentY);
    
    // Company details (smaller font)
    currentY += 8;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(companyInfo.companyName, 20, currentY);
    
    currentY += 5;
    const addressLines = doc.splitTextToSize(companyInfo.companyAddress, 70);
    doc.text(addressLines, 20, currentY);
    currentY += (addressLines.length * 5);
    
    doc.text(companyInfo.supportEmail, 20, currentY);
    currentY += 5;
    doc.text(companyInfo.supportPhone, 20, currentY);
    
    // INVOICE Title (Top Right)
    doc.setFontSize(32);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241); // Purple
    doc.text('INVOICE', pageWidth - 20, 30, { align: 'right' });
    
    // Invoice Number Box (Top Right)
    const boxY = 38;
    doc.setFillColor(245, 247, 250); // Light gray background
    doc.roundedRect(pageWidth - 75, boxY, 55, 20, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('INVOICE NO.', pageWidth - 20, boxY + 7, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text(invoice.id.slice(0, 8).toUpperCase(), pageWidth - 20, boxY + 15, { align: 'right' });
    
    // Divider line
    currentY = 75;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    
    // Invoice Details Section (2 columns)
    currentY += 10;
    
    // Left Column - Bill To
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text('BILL TO', 20, currentY);
    
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(invoice.tenant_name, 20, currentY);
    
    currentY += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(invoice.tenant_email, 20, currentY);
    
    if (invoice.tenant_phone) {
      currentY += 5;
      doc.text(invoice.tenant_phone, 20, currentY);
    }
    
    if (invoice.tenant_address) {
      currentY += 5;
      const clientAddressLines = doc.splitTextToSize(invoice.tenant_address, 80);
      doc.text(clientAddressLines, 20, currentY);
    }
    
    // Right Column - Invoice Details
    let rightColY = 85;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text('INVOICE DETAILS', pageWidth - 90, rightColY);
    
    rightColY += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(80, 80, 80);
    
    // Date row
    doc.text('Invoice Date:', pageWidth - 90, rightColY);
    doc.setFont(undefined, 'normal');
    doc.text(formatDateForPDF(invoice.created_at), pageWidth - 20, rightColY, { align: 'right' });
    
    rightColY += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Due Date:', pageWidth - 90, rightColY);
    doc.setFont(undefined, 'normal');
    doc.text(formatDateForPDF(invoice.due_date || invoice.created_at), pageWidth - 20, rightColY, { align: 'right' });
    
    rightColY += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Status:', pageWidth - 90, rightColY);
    doc.setFont(undefined, 'normal');
    
    // Status with color
    const statusColor = invoice.status === 'paid' ? [34, 197, 94] : invoice.status === 'pending' ? [234, 179, 8] : [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(invoice.status.toUpperCase(), pageWidth - 20, rightColY, { align: 'right' });
    
    // Service Details Table
    currentY = 140;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text('SERVICE DETAILS', 20, currentY);
    
    // Table header
    currentY += 10;
    doc.setFillColor(245, 247, 250);
    doc.rect(20, currentY - 6, pageWidth - 40, 10, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Description', 25, currentY);
    doc.text('Period', pageWidth - 100, currentY);
    doc.text('Amount', pageWidth - 25, currentY, { align: 'right' });
    
    // Table content
    currentY += 10;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    
    doc.text('Subscription Fee', 25, currentY);
    doc.text(`${formatDateShort(invoice.billing_period_start)} - ${formatDateShort(invoice.billing_period_end)}`, pageWidth - 100, currentY);
    doc.setFont(undefined, 'bold');
    doc.text(formatCurrencyForPDF(invoice.amount, invoice.currency), pageWidth - 25, currentY, { align: 'right' });
    
    if (invoice.description) {
      currentY += 7;
      doc.setFontSize(9);
      doc.setFont(undefined, 'italic');
      doc.setTextColor(120, 120, 120);
      const descLines = doc.splitTextToSize(invoice.description, pageWidth - 60);
      doc.text(descLines, 25, currentY);
      currentY += (descLines.length * 4);
    }
    
    // Bottom line
    currentY += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(20, currentY, pageWidth - 20, currentY);
    
    // Total Section (with background)
    currentY += 15;
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(pageWidth - 95, currentY - 8, 75, 16, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL AMOUNT:', pageWidth - 90, currentY);
    
    doc.setFontSize(16);
    doc.text(formatCurrencyForPDF(invoice.amount, invoice.currency), pageWidth - 25, currentY + 5, { align: 'right' });
    
    // Add PAID watermark if invoice is paid
    if (invoice.status === 'paid') {
      doc.setFontSize(60);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94, 0.3); // Green with transparency effect
      doc.text('PAID', pageWidth / 2, pageHeight / 2, { 
        align: 'center',
        angle: 45 
      });
      
      // Add paid date if available
      if (invoice.paid_at) {
        doc.setFontSize(10);
        doc.setTextColor(34, 197, 94);
        doc.setFont(undefined, 'normal');
        const paidText = `Paid on ${formatDateForPDF(invoice.paid_at)}`;
        doc.text(paidText, pageWidth / 2, (pageHeight / 2) + 20, { align: 'center', angle: 45 });
      }
    }
    
    // Footer Section
    currentY = pageHeight - 40;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(99, 102, 241);
    doc.text('Thank you for your business!', 20, currentY);
    
    currentY += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('This invoice was automatically generated. For any queries, please contact us.', 20, currentY);
    
    currentY += 5;
    doc.text(`${companyInfo.supportEmail} | ${companyInfo.supportPhone}`, 20, currentY);
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// Helper functions
function formatDateForPDF(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrencyForPDF(amount: string | number, currency: string): string {
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