import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { decreaseItemStock } from '@/lib/shop-service';
import { POSQueueService } from '@/lib/pos-queue-service';

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant } = await params;
    const body = await request.json();
    
    const {
      paymentIntentId,
      customerInfo,
      orderType,
      cart,
      total,
      metadata
    } = body;

    // Get tenant ID
    const [tenantRows] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenant]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = (tenantRows[0] as any).id;

    // Generate order number
    const orderNumber = `SHOP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Insert shop order
    const [orderResult] = await db.execute(`
      INSERT INTO shop_orders (
        tenant_id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        order_type,
        delivery_address,
        delivery_city,
        delivery_postcode,
        total_amount,
        payment_intent_id,
        payment_status,
        order_status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      tenantId,
      orderNumber,
      customerInfo.name,
      customerInfo.email,
      customerInfo.phone,
      orderType,
      orderType === 'delivery' ? customerInfo.address : null,
      orderType === 'delivery' ? customerInfo.city : null,
      orderType === 'delivery' ? customerInfo.postcode : null,
      total,
      paymentIntentId,
      'paid',
      'pending'
    ]);

    const orderId = (orderResult as any).insertId;

    // Insert order items
    for (const item of cart) {
      await db.execute(`
        INSERT INTO shop_order_items (
          order_id,
          item_id,
          item_name,
          item_type,
          price,
          quantity,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.id,
        item.name,
        item.type,
        item.price,
        item.quantity,
        item.price * item.quantity
      ]);

      // Decrease stock for physical items (not gift cards)
      if (item.type !== 'gift_card') {
        try {
          await decreaseItemStock(item.id, item.quantity);
        } catch (stockError) {
          console.error('Error decreasing stock for item:', item.id, stockError);
          // Continue processing other items even if stock update fails
        }
      }
    }

    // Queue order for POS synchronization if POS integration is enabled
    try {
      console.log('📊 Queuing shop order for POS sync:', orderId);
      
      const shopOrderData = {
        order_id: orderId,
        order_number: orderNumber,
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone
        },
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? customerInfo.address : null,
        delivery_city: orderType === 'delivery' ? customerInfo.city : null,
        delivery_postcode: orderType === 'delivery' ? customerInfo.postcode : null,
        total_amount: total,
        payment_intent_id: paymentIntentId,
        payment_status: 'paid',
        items: cart,
        created_at: new Date().toISOString(),
        source: 'shop'
      };
      
      await POSQueueService.queueOrder(tenantId, orderId, shopOrderData);
      console.log('✅ Shop order queued for POS sync successfully');
    } catch (posQueueError) {
      // Don't fail the order if POS queuing fails
      console.error('⚠️ Error queuing shop order for POS sync:', posQueueError);
    }

    // Send confirmation email (you can implement this)
    // await sendShopOrderConfirmationEmail(customerInfo.email, orderNumber, cart, total);

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId,
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Error creating shop order:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant } = await params;
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      );
    }

    // Get tenant ID
    const [tenantRows] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenant]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantId = (tenantRows[0] as any).id;

    // Get order details
    const [orderRows] = await db.execute(`
      SELECT 
        so.*,
        t.name as restaurant_name
      FROM shop_orders so
      JOIN tenants t ON so.tenant_id = t.id
      WHERE so.tenant_id = ? AND so.order_number = ?
    `, [tenantId, orderNumber]);

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderRows[0] as any;

    // Get order items
    const [itemRows] = await db.execute(`
      SELECT * FROM shop_order_items WHERE order_id = ?
    `, [(order as any).id]);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items: itemRows
      }
    });

  } catch (error) {
    console.error('Error fetching shop order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
