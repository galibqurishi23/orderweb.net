import { NextApiRequest, NextApiResponse } from 'next';
import { createTenantOrder } from '@/lib/tenant-order-service';

/**
 * ULTRA-SIMPLE ORDER SUBMISSION ENDPOINT
 * This endpoint handles form POST directly and returns HTML redirect
 * No JSON, no complex responses - just create order and redirect
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    console.log('📥 SIMPLE ORDER API - Request received');
    console.log('📦 Raw body:', req.body);
    
    // Parse the data field if it's stringified
    let orderData;
    if (req.body.data) {
      orderData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } else {
      orderData = req.body;
    }
    
    console.log('📦 Parsed order data:', JSON.stringify(orderData, null, 2));

    const {
      tenantId,
      tenantSlug,
      customerName,
      customerPhone,
      customerEmail,
      address,
      orderType,
      paymentMethod,
      items,
      subtotal,
      deliveryFee,
      discount,
      total,
      scheduledTime,
      voucherCode,
      specialInstructions
    } = orderData;

    // Basic validation
    if (!tenantId || !customerName || !customerPhone || !items || items.length === 0) {
      console.error('❌ Missing required fields');
      return res.status(400).send(`
        <html>
          <body>
            <h1>Order Failed</h1>
            <p>Missing required information. Please go back and try again.</p>
            <a href="/${tenantSlug}">Go Back</a>
          </body>
        </html>
      `);
    }

    console.log('✅ Validation passed, creating order...');

    // Create the order using tenant order service
    const orderPayload = {
      tenantId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || '',
      address: address || 'Collection',
      total: parseFloat(total),
      orderType: orderType || 'collection',
      orderSource: 'online' as const,
      paymentMethod: paymentMethod || 'cash',
      items: items.map((item: any) => ({
        id: item.orderItemId,
        menuItem: {
          id: item.menuItemId,
          name: item.name,
          description: item.description || '',
          price: parseFloat(item.price),
          available: true,
          categoryId: item.categoryId || '',
        },
        orderItemId: item.orderItemId,
        quantity: parseInt(item.quantity),
        selectedAddons: item.selectedAddons || [],
        specialInstructions: item.specialInstructions || '',
        basePrice: parseFloat(item.price),
        addonPrice: parseFloat(item.addonPrice || 0),
        finalPrice: parseFloat(item.finalPrice),
      })),
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      isAdvanceOrder: orderType === 'advance',
      subtotal: parseFloat(subtotal),
      deliveryFee: parseFloat(deliveryFee || 0),
      discount: parseFloat(discount || 0),
      tax: 0,
      voucherCode: voucherCode || undefined,
      specialInstructions: specialInstructions || undefined,
      printed: false,
    };

    console.log('📤 Calling createTenantOrder with data:', JSON.stringify(orderPayload, null, 2));

    const result = await createTenantOrder(tenantId, orderPayload);

    console.log('✅ Order created successfully:', result);

    // Build redirect URL
    const redirectUrl = `/${tenantSlug}/order-confirmation?orderId=${result.id}&orderNumber=${result.orderNumber}&orderType=${orderType}&paymentMethod=${paymentMethod}`;

    console.log('🚀 Redirecting to:', redirectUrl);

    // Return HTML with immediate redirect
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
          <title>Order Placed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .success {
              color: #059669;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #111827;
              margin-bottom: 0.5rem;
            }
            p {
              color: #6b7280;
              margin-bottom: 1rem;
            }
            a {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: #059669;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #059669;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 1rem auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h1>Order Placed Successfully!</h1>
            <p>Order #${result.orderNumber}</p>
            <div class="spinner"></div>
            <p>Redirecting to confirmation page...</p>
            <a href="${redirectUrl}">Click here if not redirected automatically</a>
          </div>
          <script>
            // Triple redirect for maximum reliability
            setTimeout(function() {
              window.location.href = "${redirectUrl}";
            }, 100);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ Order creation failed:', error);
    
    const tenantSlug = req.body.tenantSlug || 'kitchen';
    
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            .error {
              color: #dc2626;
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #111827;
              margin-bottom: 0.5rem;
            }
            p {
              color: #6b7280;
              margin-bottom: 1rem;
            }
            .error-details {
              background: #fee2e2;
              border: 1px solid #fecaca;
              padding: 1rem;
              border-radius: 4px;
              margin: 1rem 0;
              text-align: left;
              font-size: 0.875rem;
            }
            a {
              display: inline-block;
              padding: 0.75rem 1.5rem;
              background: #dc2626;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">❌</div>
            <h1>Order Failed</h1>
            <p>We couldn't process your order. Please try again.</p>
            <div class="error-details">
              <strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
            <a href="/${tenantSlug}">Return to Menu</a>
          </div>
        </body>
      </html>
    `);
  }
}
