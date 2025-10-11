// WebSocket event broadcaster for triggering events from API routes
// This module provides functions to broadcast POS-related events to connected WebSocket clients

// WebSocket server is running on separate port (9011)
const WS_SERVER_URL = process.env.WS_SERVER_URL || 'http://localhost:9011';

/**
 * Send broadcast request to WebSocket server
 * @param {string} tenant - Tenant slug
 * @param {object} event - Event object to broadcast
 */
async function sendBroadcastRequest(tenant: string, event: any) {
  try {
    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant,
        event
      })
    });

    if (!response.ok) {
      console.error(`[WS] Broadcast request failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`[WS] Broadcast request sent successfully to ${tenant}`);
    return true;
  } catch (error) {
    console.error('[WS] Error sending broadcast request:', error.message);
    return false;
  }
}

/**
 * Broadcast a new order event to POS systems
 * @param {string} tenant - The tenant slug
 * @param {object} order - The order object with full details
 */
export async function broadcastNewOrder(tenant, order) {
  try {
    // Only broadcast online orders
    if (order.orderSource !== 'online') {
      console.log(`[WS] Skipping non-online order ${order.id} (source: ${order.orderSource})`);
      return;
    }

    const event = {
      type: 'new_order',
      tenant: tenant,
      timestamp: new Date().toISOString(),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderType: order.orderType,
        orderSource: order.orderSource,
        status: order.status,
        totalAmount: order.totalAmount,
        items: order.items || [],
        specialInstructions: order.specialInstructions,
        scheduledFor: order.scheduledFor,
        createdAt: order.createdAt
      }
    };

    const success = await sendBroadcastRequest(tenant, event);
    if (success) {
      console.log(`[WS] ✅ New order broadcasted to ${tenant}: Order #${order.orderNumber}`);
    }
  } catch (error) {
    console.error('[WS] Error broadcasting new order:', error.message);
  }
}

/**
 * Broadcast an order update event to POS systems
 * @param {string} tenant - The tenant slug
 * @param {object} order - The updated order object
 */
export async function broadcastOrderUpdate(tenant, order) {
  try {
    // Only broadcast online orders
    if (order.orderSource !== 'online') {
      return;
    }

    const event = {
      type: 'order_updated',
      tenant: tenant,
      timestamp: new Date().toISOString(),
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        previousStatus: order.previousStatus,
        updatedAt: new Date().toISOString()
      }
    };

    const success = await sendBroadcastRequest(tenant, event);
    if (success) {
      console.log(`[WS] ✅ Order update broadcasted to ${tenant}: Order #${order.orderNumber}`);
    }
  } catch (error) {
    console.error('[WS] Error broadcasting order update:', error.message);
  }
}

/**
 * Broadcast a gift card purchase event to POS systems
 * @param {string} tenant - The tenant slug
 * @param {object} giftCard - The gift card object
 */
export async function broadcastGiftCardPurchase(tenant, giftCard) {
  try {
    const event = {
      type: 'gift_card_purchased',
      tenant: tenant,
      timestamp: new Date().toISOString(),
      data: {
        cardNumber: giftCard.cardNumber,
        initialBalance: giftCard.balance,
        currentBalance: giftCard.balance,
        purchasedBy: giftCard.purchasedBy,
        recipientName: giftCard.recipientName,
        recipientEmail: giftCard.recipientEmail,
        expiryDate: giftCard.expiryDate,
        purchasedAt: giftCard.createdAt
      }
    };

    const success = await sendBroadcastRequest(tenant, event);
    if (success) {
      console.log(`[WS] ✅ Gift card purchase broadcasted to ${tenant}: Card ${giftCard.cardNumber}`);
    }
  } catch (error) {
    console.error('[WS] Error broadcasting gift card purchase:', error.message);
  }
}

/**
 * Broadcast a loyalty points update event to POS systems
 * @param {string} tenant - The tenant slug
 * @param {object} loyalty - The loyalty transaction details
 */
export async function broadcastLoyaltyUpdate(tenant, loyalty) {
  try {
    const event = {
      type: 'loyalty_updated',
      tenant: tenant,
      timestamp: new Date().toISOString(),
      data: {
        customerId: loyalty.customerId,
        customerPhone: loyalty.customerPhone,
        pointsChange: loyalty.pointsChange,
        newBalance: loyalty.newBalance,
        transactionType: loyalty.transactionType,
        reason: loyalty.reason,
        updatedAt: new Date().toISOString()
      }
    };

    const success = await sendBroadcastRequest(tenant, event);
    if (success) {
      console.log(`[WS] ✅ Loyalty update broadcasted to ${tenant}: ${loyalty.customerPhone}`);
    }
  } catch (error) {
    console.error('[WS] Error broadcasting loyalty update:', error.message);
  }
}

/**
 * Get connection stats for a tenant
 * @param {string} tenant - The tenant slug
 * @returns {object} Connection statistics
 */
export function getConnectionStats(tenant) {
  // Return empty stats since WebSocket is on separate server
  // Stats should be fetched via API endpoint from WebSocket server
  return { connected: 0, active: 0 };
}
