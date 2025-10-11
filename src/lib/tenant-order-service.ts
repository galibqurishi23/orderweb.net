'use server';

import pool from './db';
import type { Order, OrderStatus } from './types';
import { v4 as uuidv4 } from 'uuid';
import { generateOrderNumber } from './order-utils';
import { getTenantSettings } from './tenant-service';
import { defaultRestaurantSettings } from './defaultRestaurantSettings';
import PhoneLoyaltyService from './phone-loyalty-service';
import { OrderVATCalculator } from './order-vat-calculator';
import { POSQueueService } from './pos-queue-service';
import { broadcastNewOrder, broadcastOrderUpdate } from './websocket-broadcaster';

export async function getTenantOrders(tenantId: string): Promise<Order[]> {
    try {
        console.log('Fetching orders for tenant:', tenantId);
        
        return await pool.withConnection(async (connection) => {
        const [orderRows] = await connection.query(
            `SELECT o.*, 
                    o.createdAt as createdAt,
                    o.customerName as customerName,
                    o.customerPhone as customerPhone,
                    o.customerEmail as customerEmail,
                    o.orderType as orderType,
                    'online' as orderSource,
                    o.isAdvanceOrder as isAdvanceOrder,
                    o.scheduledTime as scheduledTime,
                    o.subtotal,
                    o.deliveryFee as deliveryFee,
                    o.discount,
                    o.tax,
                    o.voucherCode as voucherCode,
                    o.printed,
                    o.customerId as customerId,
                    o.paymentMethod as paymentMethod,
                    o.specialInstructions as specialInstructions
             FROM orders o 
             WHERE o.tenant_id = ? 
             ORDER BY o.createdAt DESC`,
            [tenantId]
        );
        
        const orders = orderRows as any[];
        console.log(`Found ${orders.length} orders for tenant ${tenantId}`);
        
        // Get order items for all orders
        const orderIds = orders.map(order => order.id);
        if (orderIds.length === 0) return [];
        
        const [itemRows] = await connection.query(
            `SELECT oi.*, mi.name as menuItemName, mi.price as menuItemPrice, 
             mi.vat_rate as menuItemVatRate, mi.is_vat_exempt as menuItemIsVatExempt, 
             mi.vat_type as menuItemVatType, mi.vat_notes as menuItemVatNotes
             FROM order_items oi 
             LEFT JOIN menu_items mi ON oi.menuItemId = mi.id 
             WHERE oi.orderId IN (${orderIds.map(() => '?').join(',')})`,
            orderIds
        );
        
        const items = itemRows as any[];
        
        // Group items by order
        const itemsByOrder: { [orderId: string]: any[] } = {};
        items.forEach(item => {
            if (!itemsByOrder[item.orderId]) {
                itemsByOrder[item.orderId] = [];
            }
            itemsByOrder[item.orderId].push({
                ...item,
                selectedAddons: item.selectedAddons ? 
                    (typeof item.selectedAddons === 'string' ? JSON.parse(item.selectedAddons) : item.selectedAddons) : 
                    [],
                specialInstructions: item.specialInstructions,
                menuItem: {
                    id: item.menuItemId,
                    name: item.menuItemName,
                    price: item.menuItemPrice,
                    vatRate: item.menuItemVatRate !== null ? parseFloat(item.menuItemVatRate) : null,
                    isVatExempt: item.menuItemIsVatExempt || false,
                    vatType: item.menuItemVatType || 'simple',
                    vatNotes: item.menuItemVatNotes
                }
            });
        });
        
        // Attach items to orders and ensure orderNumber exists
        const ordersWithItems = orders.map(order => ({
            ...order,
            orderNumber: order.orderNumber || `ORD-${Math.floor(1000 + Math.random() * 9000)}`, // Fallback for old orders
            orderSource: order.orderSource || 'online', // Default to 'online' for orders without orderSource
            items: itemsByOrder[order.id] || []
        }));

        // For orders that don't have proper VAT information, recalculate using current menu item VAT rates
        const enrichedOrders = await Promise.all(ordersWithItems.map(async (order) => {
            // Calculate VAT dynamically based on order contents
            let totalVAT = 0;
            let hasHotFoodVAT = false;
            let hasMixedItems = false;
            let hotFoodVAT = 0;
            let coldFoodVAT = 0;
            let alcoholVAT = 0;
            let softDrinkVAT = 0;
            let otherVAT = 0;
            const itemBreakdowns: any[] = [];
            
            for (const item of order.items) {
                const menuItem = item.menuItem;
                let itemVAT = 0;
                const quantity = parseInt(item.quantity) || 1;
                
                if (menuItem.vatType === 'mixed') {
                    // Mixed item - get components from database
                    hasMixedItems = true;
                    
                    try {
                        const [components] = await connection.execute(`
                            SELECT component_name, component_cost, vat_rate, component_type
                            FROM item_components
                            WHERE menu_item_id = ?
                        `, [menuItem.id]);
                        
                        const componentBreakdowns = [];
                        
                        for (const comp of components as any[]) {
                            const compCost = parseFloat(comp.component_cost);
                            const compVatRate = parseFloat(comp.vat_rate);
                            // VAT-inclusive pricing: VAT = (price × vatRate) / (100 + vatRate)
                            const compVAT = (compCost * compVatRate) / (100 + compVatRate);
                            
                            itemVAT += compVAT;
                            
                            if (comp.component_type === 'hot_food' && compVAT > 0) {
                                hasHotFoodVAT = true;
                                hotFoodVAT += compVAT * quantity;
                            } else if (comp.component_type === 'cold_food') {
                                coldFoodVAT += compVAT * quantity;
                            }
                            
                            componentBreakdowns.push({
                                componentName: comp.component_name,
                                componentCost: compCost,
                                vatRate: compVatRate,
                                vatAmount: compVAT,
                                componentType: comp.component_type
                            });
                        }
                        
                        itemBreakdowns.push({
                            itemId: item.id.toString(),
                            itemName: menuItem.name,
                            isMixedItem: true,
                            vatAmount: Math.round(itemVAT * quantity * 100) / 100,
                            components: componentBreakdowns
                        });
                        
                        totalVAT += itemVAT * quantity;
                        
                    } catch (error) {
                        console.error(`Error fetching components for ${menuItem.name}:`, error);
                        // Fallback: use menu item's average VAT rate
                        const itemPrice = parseFloat(item.finalPrice || menuItem.price || 0);
                        if (menuItem.vatRate && menuItem.vatRate > 0) {
                            itemVAT = (itemPrice * parseFloat(menuItem.vatRate)) / (100 + parseFloat(menuItem.vatRate));
                            totalVAT += itemVAT * quantity;
                            hotFoodVAT += itemVAT * quantity;
                            hasHotFoodVAT = true;
                        }
                        
                        itemBreakdowns.push({
                            itemId: item.id.toString(),
                            itemName: menuItem.name,
                            isMixedItem: true,
                            vatAmount: Math.round(itemVAT * quantity * 100) / 100
                        });
                    }
                } else if (!menuItem.isVatExempt && menuItem.vatRate && menuItem.vatRate > 0) {
                    // Standard item - prices are gross (VAT-inclusive)
                    const itemPrice = parseFloat(item.finalPrice || menuItem.price || 0);
                    itemVAT = (itemPrice * parseFloat(menuItem.vatRate)) / (100 + parseFloat(menuItem.vatRate));
                    
                    if (parseFloat(menuItem.vatRate) === 20) {
                        hasHotFoodVAT = true;
                        hotFoodVAT += itemVAT * quantity;
                    } else {
                        otherVAT += itemVAT * quantity;
                    }
                    
                    totalVAT += itemVAT * quantity;
                    
                    itemBreakdowns.push({
                        itemId: item.id.toString(),
                        itemName: menuItem.name,
                        isMixedItem: false,
                        vatAmount: Math.round(itemVAT * quantity * 100) / 100
                    });
                } else {
                    // VAT exempt or zero-rated item
                    itemBreakdowns.push({
                        itemId: item.id.toString(),
                        itemName: menuItem.name,
                        isMixedItem: false,
                        vatAmount: 0
                    });
                }
            }
            
            const vatInfo = {
                totalVAT: Math.round(totalVAT * 100) / 100,
                hasHotFoodVAT: hasHotFoodVAT,
                hasMixedItems: hasMixedItems,
                vatBreakdown: {
                    hotFoodVAT: Math.round(hotFoodVAT * 100) / 100,
                    coldFoodVAT: Math.round(coldFoodVAT * 100) / 100,
                    alcoholVAT: Math.round(alcoholVAT * 100) / 100,
                    softDrinkVAT: Math.round(softDrinkVAT * 100) / 100,
                    otherVAT: Math.round(otherVAT * 100) / 100
                },
                hmrcCompliant: true,
                itemBreakdowns
            };
            
            return {
                ...order,
                vatInfo
            };
        }));

        return enrichedOrders;
    }); // Close the withConnection function
    } catch (error) {
        console.error('Error in getTenantOrders:', error);
        throw error;
    }
}

export async function createTenantOrder(tenantId: string, orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'>): Promise<{
    id: string;
    orderNumber: string;
    total: number;
    customerName: string;
    orderType: string;
    scheduledTime?: Date;
}> {
    const orderId = uuidv4();
    const createdAt = new Date();
    
    // Get tenant settings to generate proper order number
    const tenantSettings = await getTenantSettings(tenantId);
    let restaurantSettings = tenantSettings;
    
    // If settings is JSON string, parse it
    if (typeof tenantSettings === 'string') {
        restaurantSettings = JSON.parse(tenantSettings);
    }
    
    // Generate order number with proper prefix (use default if null)
    const orderNumber = generateOrderNumber(restaurantSettings || defaultRestaurantSettings, orderData.isAdvanceOrder);
    
    // Convert scheduledTime to proper format for database
    const scheduledTime = orderData.scheduledTime ? new Date(orderData.scheduledTime) : null;
    
    if (process.env.NODE_ENV === 'development') {
        console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
        console.log('Generated order number:', orderNumber);
        console.log('Scheduled time:', scheduledTime);
    }
    
    // Calculate VAT information for the order
    // First, we need to create a temporary order object for VAT calculation
    const tempOrder: Order = {
        id: orderId,
        orderNumber,
        createdAt,
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail || '',
        address: orderData.address,
        total: orderData.total,
        status: 'confirmed',
        orderType: orderData.orderType,
        orderSource: 'online',
        isAdvanceOrder: orderData.isAdvanceOrder,
        scheduledTime: orderData.scheduledTime,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        discount: orderData.discount,
        tax: 0,
        voucherCode: orderData.voucherCode || undefined,
        printed: false,
        customerId: orderData.customerId || undefined,
        paymentMethod: orderData.paymentMethod || 'cash',
        specialInstructions: orderData.specialInstructions || undefined,
        items: orderData.items.map(item => ({
            id: uuidv4(),
            orderId,
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            selectedAddons: item.selectedAddons || [],
            specialInstructions: item.specialInstructions || undefined,
            menuItem: item.menuItem,
            basePrice: parseFloat(String(item.menuItem.price || 0)),
            addonPrice: (item.selectedAddons || []).reduce((sum, addon) => sum + addon.totalPrice, 0),
            finalPrice: (parseFloat(String(item.menuItem.price || 0)) + (item.selectedAddons || []).reduce((sum, addon) => sum + addon.totalPrice, 0)) * item.quantity,
            // VAT info will be calculated
            vatInfo: undefined,
            isMixedItem: false,
            totalVATAmount: 0
        }))
    };
    
    // Calculate VAT for the order
    const enrichedOrder = await OrderVATCalculator.enrichOrderWithVAT(tempOrder);
    console.log('✅ VAT calculation completed:', {
        totalVAT: enrichedOrder.vatInfo?.totalVAT || 0,
        hasMixedItems: enrichedOrder.vatInfo?.hasMixedItems || false,
        hmrcCompliant: enrichedOrder.vatInfo?.hmrcCompliant || true
    });
    
    try {
        await pool.execute(
            `INSERT INTO orders (
                id, tenant_id, orderNumber, createdAt, customerName, customerPhone, customerEmail, 
                address, total, status, orderType, isAdvanceOrder, scheduledTime,
                subtotal, deliveryFee, discount, tax, voucherCode, printed, customerId, paymentMethod, specialInstructions,
                vat_info, total_vat_amount, has_mixed_items, hmrc_compliant
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId, tenantId, orderNumber, createdAt, orderData.customerName, orderData.customerPhone,
                orderData.customerEmail || null, orderData.address, orderData.total, 'confirmed',
                orderData.orderType, orderData.isAdvanceOrder, scheduledTime,
                orderData.subtotal, orderData.deliveryFee, orderData.discount, 0, // tax = 0 (application is tax-free)
                orderData.voucherCode || null, false, orderData.customerId || null, (orderData.paymentMethod === 'gift_card' ? 'voucher' : (orderData.paymentMethod || 'cash')),
                orderData.specialInstructions || null,
                // VAT information
                JSON.stringify(enrichedOrder.vatInfo || {}),
                enrichedOrder.vatInfo?.totalVAT || 0,
                enrichedOrder.vatInfo?.hasMixedItems || false,
                enrichedOrder.vatInfo?.hmrcCompliant || true
            ]
        );
        console.log('✅ Order inserted successfully with VAT information');
    } catch (insertError) {
        console.error('❌ Error inserting order:', insertError);
        console.error('📋 Insert parameters:', {
            orderId, tenantId, orderNumber, createdAt, 
            customerName: orderData.customerName,
            customerPhone: orderData.customerPhone,
            orderType: orderData.orderType,
            isAdvanceOrder: orderData.isAdvanceOrder,
            scheduledTime
        });
        throw insertError;
    }
    
    // Insert order items with VAT information
    if (enrichedOrder.items && enrichedOrder.items.length > 0) {
        const itemValues = enrichedOrder.items.map((item: any) => [
            tenantId, orderId, item.menuItem.id, item.quantity,
            JSON.stringify(item.selectedAddons || []), item.specialInstructions || null,
            // VAT information
            JSON.stringify(item.vatInfo || {}),
            item.vatInfo?.isMixedItem || false,
            item.vatInfo?.totalVAT || 0
        ]);
        
        const placeholders = itemValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
        const flatValues = itemValues.flat();
        
        await pool.execute(
            `INSERT INTO order_items (
                tenant_id, orderId, menuItemId, quantity, selectedAddons, specialInstructions,
                vat_info, is_mixed_item, total_vat_amount
            ) VALUES ${placeholders}`,
            flatValues
        );
        console.log('✅ Order items inserted successfully with VAT information');
    }
    
    // Process loyalty points if customer has a phone number
    if (orderData.customerPhone) {
        try {
            console.log('🎯 Processing loyalty points for phone:', orderData.customerPhone);
            await PhoneLoyaltyService.processOrderPoints(
                orderData.customerPhone,
                tenantId,
                orderData.total,
                orderId,
                orderData.customerName || 'Customer'
            );
            console.log('✅ Loyalty points processed successfully');
        } catch (loyaltyError) {
            // Don't fail the order if loyalty processing fails
            console.error('⚠️ Error processing loyalty points:', loyaltyError);
        }
    }
    
    // IMMEDIATE POS delivery - 0 seconds delay!
    try {
        console.log('🚀 INSTANT POS delivery starting for order:', orderId);
        
        // 1. Internal push-order API (existing system)
        const pushOrderPromise = fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://orderweb.net'}/api/pos/push-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tenantId,
                orderId,
                priority: 'urgent', // Mark as urgent for immediate processing
                deliveryMethod: 'instant'
            })
        });

        // 2. Direct webhook delivery (if configured)
        const webhookPromise = deliverOrderWebhook(tenantId, orderId);
        
        // 3. Execute both in parallel for maximum speed
        Promise.allSettled([pushOrderPromise, webhookPromise]).then(results => {
            const [pushResult, webhookResult] = results;
            
            if (pushResult.status === 'fulfilled' && pushResult.value.ok) {
                console.log('✅ Internal POS push successful (0-second delivery):', orderId);
            } else {
                console.error('❌ Internal POS push failed:', pushResult);
            }
            
            if (webhookResult.status === 'fulfilled') {
                console.log('✅ Direct webhook delivery completed:', orderId);
            } else {
                console.error('❌ Direct webhook delivery failed:', webhookResult.reason);
            }
        }).catch(error => {
            console.error('❌ Error in INSTANT POS delivery:', error);
        });
        
    } catch (posError) {
        // Don't fail the order if POS push fails
        console.error('⚠️ Error initiating POS push:', posError);
    }
    
    console.log('✅ Order created successfully and ready for POS pickup:', orderId);
    
    // WebSocket broadcast for real-time POS notification (online orders only)
    try {
        // Get tenant slug for WebSocket broadcast
        const [tenantRows] = await pool.execute(
            'SELECT slug FROM tenants WHERE id = ?',
            [tenantId]
        );
        
        if (Array.isArray(tenantRows) && tenantRows.length > 0) {
            const tenant = tenantRows[0] as any;
            const tenantSlug = tenant.slug;
            
            // Prepare order data for WebSocket broadcast
            const orderForBroadcast = {
                id: orderId,
                orderNumber,
                customerName: orderData.customerName,
                customerPhone: orderData.customerPhone,
                customerEmail: orderData.customerEmail,
                orderType: orderData.orderType,
                orderSource: 'online', // This is always online for this endpoint
                status: 'confirmed',
                totalAmount: orderData.total,
                items: enrichedOrder.items.map((item: any) => ({
                    menuItemId: item.menuItem.id,
                    name: item.menuItem.name,
                    quantity: item.quantity,
                    price: item.menuItem.price,
                    selectedAddons: item.selectedAddons,
                    specialInstructions: item.specialInstructions
                })),
                specialInstructions: orderData.specialInstructions,
                scheduledFor: orderData.scheduledTime,
                createdAt: createdAt.toISOString()
            };
            
            // Broadcast to all connected POS systems for this tenant
            await broadcastNewOrder(tenantSlug, orderForBroadcast);
            console.log('✅ WebSocket broadcast sent for order:', orderNumber);
        }
    } catch (wsError) {
        // Don't fail the order if WebSocket broadcast fails
        console.error('⚠️ Error broadcasting order via WebSocket:', wsError);
    }
    
    // Return order details for confirmation page
    return {
        id: orderId,
        orderNumber,
        total: orderData.total,
        customerName: orderData.customerName,
        orderType: orderData.orderType,
        scheduledTime: orderData.scheduledTime
    };
}

/**
 * Direct webhook delivery for immediate POS notification
 * Delivers orders in 0 seconds instead of 30+ seconds polling
 */
async function deliverOrderWebhook(tenantId: string, orderId: string): Promise<void> {
    try {
        // Get tenant webhook configuration
        const [tenantRows] = await pool.execute(
            'SELECT pos_webhook_url, pos_api_key FROM tenants WHERE id = ?',
            [tenantId]
        );
        
        if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
            console.log('⚠️ No tenant found for webhook delivery:', tenantId);
            return;
        }
        
        const tenant = tenantRows[0] as any;
        if (!tenant.pos_webhook_url) {
            console.log('⚠️ No webhook URL configured for tenant:', tenantId);
            return;
        }
        
        // Get order details
        const [orderRows] = await pool.execute(`
            SELECT 
                o.id, o.orderNumber, o.customerName, o.customerPhone,
                o.total, o.status, o.orderType, o.createdAt,
                o.specialInstructions, o.address
            FROM orders o 
            WHERE o.id = ?
        `, [orderId]);
        
        if (!Array.isArray(orderRows) || orderRows.length === 0) {
            console.log('⚠️ Order not found for webhook delivery:', orderId);
            return;
        }
        
        const order = orderRows[0];
        
        // Send immediate webhook - 0 second delivery!
        console.log('🚀 Sending INSTANT webhook to:', tenant.pos_webhook_url);
        
        const response = await fetch(tenant.pos_webhook_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tenant.pos_api_key}`,
                'X-OrderWeb-Event': 'order.created',
                'X-OrderWeb-Delivery': 'instant',
                'User-Agent': 'OrderWeb-Webhook/1.0'
            },
            body: JSON.stringify({
                event: 'order.created',
                order: order,
                tenant_id: tenantId,
                delivery_time: '0_seconds',
                timestamp: new Date().toISOString()
            }),
            // Timeout after 5 seconds to avoid blocking
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            console.log('✅ INSTANT webhook delivered successfully in 0 seconds!');
        } else {
            console.error('❌ Webhook delivery failed:', response.status, response.statusText);
        }
        
    } catch (error) {
        console.error('❌ Error in direct webhook delivery:', error);
        // Don't throw - webhook failure shouldn't break order creation
    }
}

export async function updateTenantOrderStatus(tenantId: string, orderId: string, status: OrderStatus): Promise<void> {
    // Get the previous status before updating
    const [orderRows] = await pool.execute(
        'SELECT status, orderNumber, orderSource FROM orders WHERE tenant_id = ? AND id = ?',
        [tenantId, orderId]
    );
    
    const previousStatus = Array.isArray(orderRows) && orderRows.length > 0 ? (orderRows[0] as any).status : null;
    const orderNumber = Array.isArray(orderRows) && orderRows.length > 0 ? (orderRows[0] as any).orderNumber : null;
    const orderSource = Array.isArray(orderRows) && orderRows.length > 0 ? (orderRows[0] as any).orderSource : null;
    
    // Update the order status
    await pool.execute(
        'UPDATE orders SET status = ? WHERE tenant_id = ? AND id = ?',
        [status, tenantId, orderId]
    );
    
    // WebSocket broadcast for status update (online orders only)
    if (orderSource === 'online') {
        try {
            // Get tenant slug
            const [tenantRows] = await pool.execute(
                'SELECT slug FROM tenants WHERE id = ?',
                [tenantId]
            );
            
            if (Array.isArray(tenantRows) && tenantRows.length > 0) {
                const tenant = tenantRows[0] as any;
                const tenantSlug = tenant.slug;
                
                // Broadcast order update
                await broadcastOrderUpdate(tenantSlug, {
                    id: orderId,
                    orderNumber,
                    status,
                    previousStatus,
                    orderSource: 'online'
                });
                
                console.log(`✅ WebSocket broadcast sent for order status update: ${orderNumber} → ${status}`);
            }
        } catch (wsError) {
            console.error('⚠️ Error broadcasting order update via WebSocket:', wsError);
        }
    }
}

export async function updateTenantOrderPrintStatus(tenantId: string, orderId: string, printed: boolean): Promise<void> {
    await pool.execute(
        'UPDATE orders SET printed = ? WHERE tenant_id = ? AND id = ?',
        [printed, tenantId, orderId]
    );
}
