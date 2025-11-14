import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '@/lib/universal-email-service';

// GET - List all invoices
export async function GET(request: NextRequest) {
  try {
    const invoices = await query(`
      SELECT 
        b.*,
        t.name as tenant_name,
        t.email as tenant_email
      FROM billing b
      LEFT JOIN tenants t ON b.tenant_id = t.id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ 
      invoices: invoices || [],
      success: true 
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', success: false },
      { status: 500 }
    );
  }
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      subscriptionPlan,
      amount,
      currency = 'GBP',
      billingPeriodStart,
      billingPeriodEnd,
      description,
      isCustomInvoice = false,
      lineItems = []
    } = body;

    // Validate required fields
    if (!tenantId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId and amount are required', success: false },
        { status: 400 }
      );
    }

    // Validate amount
    const invoiceAmount = parseFloat(amount);
    if (isNaN(invoiceAmount) || invoiceAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be a positive number', success: false },
        { status: 400 }
      );
    }

    // Get tenant details
    const tenantResult = await query(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!tenantResult || tenantResult.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found', success: false },
        { status: 404 }
      );
    }

    const tenant = tenantResult[0];

    // Generate invoice ID
    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now()}`;

    // Calculate dates
    const startDate = billingPeriodStart || new Date().toISOString().split('T')[0];
    const endDate = billingPeriodEnd || (() => {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 30);
      return end.toISOString().split('T')[0];
    })();

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create invoice description
    let invoiceDescription = description || `${subscriptionPlan || 'Custom'} subscription`;
    
    if (isCustomInvoice && lineItems && lineItems.length > 0) {
      const itemDescriptions = lineItems
        .filter((item: any) => item.description && item.amount)
        .map((item: any) => `${item.description}: £${parseFloat(item.amount).toFixed(2)}`);
      
      if (itemDescriptions.length > 0) {
        invoiceDescription = itemDescriptions.join('; ');
      }
    }

    // Insert invoice into database
    await query(
      `INSERT INTO billing (
        id, 
        tenant_id,
        invoice_number, 
        subscription_plan, 
        amount, 
        currency,
        billing_period_start,
        billing_period_end,
        due_date,
        status,
        description,
        is_custom_invoice,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        invoiceId,
        tenantId,
        invoiceNumber,
        subscriptionPlan || 'starter',
        invoiceAmount,
        currency,
        startDate,
        endDate,
        dueDateStr,
        'pending',
        invoiceDescription,
        isCustomInvoice ? 1 : 0
      ]
    );

    // If custom invoice with line items, store them
    if (isCustomInvoice && lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        if (item.description && item.amount) {
          await query(
            `INSERT INTO invoice_line_items (
              id,
              invoice_id,
              description,
              amount,
              created_at
            ) VALUES (?, ?, ?, ?, NOW())`,
            [
              uuidv4(),
              invoiceId,
              item.description,
              parseFloat(item.amount)
            ]
          );
        }
      }
    }

    // Send invoice email to tenant
    try {
      const emailHtml = generateInvoiceEmailHtml({
        tenantName: tenant.name,
        invoiceNumber,
        amount: invoiceAmount,
        currency,
        description: invoiceDescription,
        billingPeriodStart: startDate,
        billingPeriodEnd: endDate,
        dueDate: dueDateStr,
        lineItems: isCustomInvoice ? lineItems : []
      });

      await emailService.sendEmail({
        to: tenant.email,
        subject: `New Invoice ${invoiceNumber} - Order Web POS`,
        html: emailHtml
      });

      console.log(`✅ Invoice email sent to ${tenant.email}`);
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError);
      // Don't fail the invoice creation if email fails
    }

    // Fetch the created invoice with tenant details
    const createdInvoice = await query(
      `SELECT 
        b.*,
        t.name as tenant_name,
        t.email as tenant_email
      FROM billing b
      LEFT JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = ?`,
      [invoiceId]
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice created successfully',
      invoice: createdInvoice[0]
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create invoice',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Helper function to generate invoice email HTML
function generateInvoiceEmailHtml(data: {
  tenantName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  description: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  lineItems?: any[];
}): string {
  const {
    tenantName,
    invoiceNumber,
    amount,
    currency,
    description,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
    lineItems = []
  } = data;

  const currencySymbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency;
  const formattedAmount = `${currencySymbol}${amount.toFixed(2)}`;

  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Build line items HTML
  let lineItemsHtml = '';
  if (lineItems && lineItems.length > 0) {
    lineItemsHtml = lineItems
      .filter(item => item.description && item.amount)
      .map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
            ${currencySymbol}${parseFloat(item.amount).toFixed(2)}
          </td>
        </tr>
      `).join('');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoiceNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                    📄 New Invoice
                  </h1>
                  <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                    Order Web POS
                  </p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Dear <strong>${tenantName}</strong>,
                  </p>

                  <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                    A new invoice has been generated for your account. Please find the details below:
                  </p>

                  <!-- Invoice Details Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">
                              ${invoiceNumber}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Billing Period:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                              ${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                            <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                              ${formatDate(dueDate)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${lineItems && lineItems.length > 0 ? `
                    <!-- Line Items -->
                    <div style="margin-bottom: 30px;">
                      <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; font-weight: 600;">
                        Invoice Items:
                      </h3>
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f9fafb;">
                            <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">
                              Description
                            </th>
                            <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          ${lineItemsHtml}
                        </tbody>
                      </table>
                    </div>
                  ` : `
                    <!-- Description -->
                    <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #667eea; color: #374151; font-size: 14px; line-height: 1.6;">
                      ${description}
                    </p>
                  `}

                  <!-- Total Amount -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 25px; text-align: center;">
                        <p style="margin: 0 0 5px 0; color: #e0e7ff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                          Total Amount Due
                        </p>
                        <p style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">
                          ${formattedAmount}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Payment Instructions -->
                  <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                      💳 Payment Instructions
                    </h3>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">
                      Please contact our billing team to arrange payment. You can reach us at 
                      <a href="mailto:billing@orderweb.co.uk" style="color: #667eea; text-decoration: none; font-weight: 600;">
                        billing@orderweb.co.uk
                      </a>
                    </p>
                  </div>

                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    If you have any questions about this invoice, please don't hesitate to contact us.
                  </p>

                  <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                    Thank you for your business!
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px;">
                    Order Web POS - Restaurant Management System
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    This is an automated invoice. Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
