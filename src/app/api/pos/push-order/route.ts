import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * Enhanced Push Order API - Immediate 0-second order delivery to POS
 * POST http://pos-system-ip:8880/webhook/orders
 * Content-Type: application/json
 * Authorization: Bearer webhook_token
 * 
 * Performance: Instant delivery instead of 30+ second polling delays!
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantId, orderId, posWebhookUrl } = await request.json();
    
    console.log('🚀 Push Order API called:', { tenantId, orderId, posWebhookUrl });
    
    if (!tenantId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing tenantId or orderId' },
        { status: 400 }
      );
    }

    // Get tenant info and verify POS integration is enabled
    const [tenantRows] = await db.execute(
      'SELECT id, name, slug, pos_api_key, pos_webhook_url FROM tenants WHERE id = ?',
      [tenantId]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantRows[0] as any;
    
    if (!tenant.pos_api_key) {
      console.log('⚠️ POS integration not configured for tenant:', tenantId);
      return NextResponse.json(
        { success: false, error: 'POS integration not configured' },
        { status: 400 }
      );
    }

    // Get the complete order data
    const [orderRows] = await db.execute(
      `SELECT 
        o.id,
        o.orderNumber,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        o.total,
        o.subtotal,
        o.deliveryFee,
        o.tax,
        o.status,
        o.orderType,
        o.paymentMethod,
        o.address,
        o.specialInstructions,
        o.createdAt,
        o.scheduledTime
      FROM orders o 
      WHERE o.id = ? AND o.tenant_id = ?`,
      [orderId, tenantId]
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderRows[0] as any;

    // Get order items
    const [itemRows] = await db.execute(
      `SELECT 
        oi.id,
        oi.menuItemId,
        oi.name,
        oi.price,
        oi.quantity,
        oi.selectedAddons,
        oi.specialInstructions
      FROM order_items oi 
      WHERE oi.orderId = ?`,
      [orderId]
    );

    const items = (itemRows as any[]).map(item => ({
      ...item,
      selectedAddons: item.selectedAddons ? JSON.parse(item.selectedAddons) : []
    }));

    // Prepare order data for POS
    const posOrderData = {
      order: {
        ...order,
        items: items
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      timestamp: new Date().toISOString(),
      event: 'order_created'
    };

    console.log('📦 Prepared order data for POS:', JSON.stringify(posOrderData, null, 2));

    // Use provided webhook URL or tenant's configured URL
    const webhookUrl = posWebhookUrl || tenant.pos_webhook_url;
    
    if (webhookUrl) {
      // Send to POS system via webhook
      try {
        console.log('🔔 Sending webhook to POS:', webhookUrl);
        
        // Create a timeout wrapper for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tenant.pos_api_key}`,
            'X-Tenant-ID': tenant.id,
            'X-Event-Type': 'order_created'
          },
          body: JSON.stringify(posOrderData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (webhookResponse.ok) {
          console.log('✅ Webhook sent successfully to POS');
          
          return NextResponse.json({
            success: true,
            message: 'Order pushed to POS successfully',
            data: {
              orderId: orderId,
              orderNumber: order.orderNumber,
              webhookUrl: webhookUrl,
              webhookStatus: 'sent',
              timestamp: new Date().toISOString()
            }
          });
        } else {
          console.error('❌ Webhook failed:', webhookResponse.status, webhookResponse.statusText);
          
          return NextResponse.json({
            success: false,
            error: 'Failed to send webhook to POS',
            details: `HTTP ${webhookResponse.status}: ${webhookResponse.statusText}`,
            orderData: posOrderData // Return order data as fallback
          }, { status: 500 });
        }
        
      } catch (webhookError) {
        console.error('❌ Webhook error:', webhookError);
        
        return NextResponse.json({
          success: false,
          error: 'Webhook delivery failed',
          details: webhookError instanceof Error ? webhookError.message : 'Unknown error',
          orderData: posOrderData // Return order data as fallback
        }, { status: 500 });
      }
    } else {
      // No webhook configured, return order data for manual processing
      console.log('⚠️ No webhook URL configured, returning order data');
      
      return NextResponse.json({
        success: true,
        message: 'Order data prepared (no webhook configured)',
        data: posOrderData
      });
    }

  } catch (error) {
    console.error('❌ Push Order API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to push order to POS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}