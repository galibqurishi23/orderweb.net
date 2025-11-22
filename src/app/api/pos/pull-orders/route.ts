import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTenantDatabase } from '@/lib/tenant-db-connection';

/**
 * Pull Orders API - Allows POS system to fetch orders on demand
 * This is a backup system in case push notifications fail
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    const status = searchParams.get('status') || 'confirmed';
    const limit = parseInt(searchParams.get('limit') || '50');
    const since = searchParams.get('since'); // ISO date string
    const includeAll = searchParams.get('include_all') === 'true'; // Include printed/failed orders for POS admin view
    
    // 🚀 Performance optimization headers for efficient polling
    // GET /api/pos/pull-orders?tenant=kitchen&since=2025-09-30T10:30:00Z
    // If-Modified-Since: Mon, 30 Sep 2025 10:30:00 GMT
    const ifModifiedSince = request.headers.get('if-modified-since');
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // Extract API key from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    
    const apiKey = authHeader.substring(7);
    
    if (!tenantSlug) {
      return NextResponse.json(
        { success: false, error: 'Missing tenant parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Pull Orders API called:', { tenantSlug, status, limit, since });
    
    // Try device-level authentication first (new system)
    let tenant: any = null;
    let deviceId: string | null = null;
    
    const [deviceRows] = await db.execute(
      `SELECT d.*, t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug 
       FROM pos_devices d
       JOIN tenants t ON d.tenant_id = t.id
       WHERE d.api_key = ? AND d.is_active = TRUE AND t.slug = ?`,
      [apiKey, tenantSlug]
    );

    if (Array.isArray(deviceRows) && deviceRows.length > 0) {
      // Device-level authentication successful
      const device = deviceRows[0] as any;
      tenant = {
        id: device.tenant_id,
        name: device.tenant_name,
        slug: device.tenant_slug
      };
      deviceId = device.device_id;
      
      // Update last_seen_at for device heartbeat
      await db.execute(
        'UPDATE pos_devices SET last_seen_at = NOW(), last_heartbeat_at = NOW() WHERE device_id = ?',
        [deviceId]
      );
      
      console.log('✅ Device authenticated:', deviceId);
    } else {
      // Fall back to tenant-level authentication (backward compatibility)
      const [tenantRows] = await db.execute(
        'SELECT id, name, slug FROM tenants WHERE slug = ? AND pos_api_key = ?',
        [tenantSlug, apiKey]
      );

      if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid tenant or API key' },
          { status: 401 }
        );
      }

      tenant = tenantRows[0] as any;
      console.log('✅ Tenant authenticated (legacy):', tenant.name);
    }

    // Get tenant-specific database connection
    const tenantDb = getTenantDatabase(tenant.slug);

    // Build query conditions
    // Pull orders that are:
    // 1. pending - never sent via WebSocket
    // 2. sent_to_pos - sent via WebSocket but not yet confirmed printed
    // 3. Orders updated since last sync (for status changes)
    // 4. ALL orders if include_all=true (for POS admin to see order history)
    let whereConditions = 'WHERE o.status = ?';
    let queryParams: any[] = [status];
    
    // Add print status filter - only get orders that need POS attention
    // UNLESS include_all=true, then return all orders for POS admin view
    if (!includeAll) {
      whereConditions += ' AND (o.print_status IN (?, ?) OR o.print_status IS NULL)';
      queryParams.push('pending', 'sent_to_pos');
    }
    
    // Add time filter if provided
    if (since) {
      // When 'since' is provided, only get orders created/updated after that time
      whereConditions += ' AND (o.createdAt >= ? OR o.updated_at >= ?)';
      queryParams.push(since, since);
    } else if (!includeAll) {
      // Default: Get orders from last 2 months
      // This prevents loading years of old orders while still showing recent history
      whereConditions += ' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 2 MONTH)';
    }
    // Note: If include_all=true, no time filter applied (get everything)

    // Get orders from tenant-specific database
    const [orderRows] = await tenantDb.execute(
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
        o.scheduledTime,
        o.print_status,
        o.print_status_updated_at,
        o.websocket_sent,
        o.websocket_sent_at
      FROM orders o 
      ${whereConditions}
      ORDER BY o.createdAt ASC
      LIMIT ?`,
      [...queryParams, limit]
    );

    const orders = orderRows as any[];
    console.log(`📦 Found ${orders.length} orders`);

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        orders: [],
        count: 0,
        filters: { status, since, limit, include_all: includeAll },
        timestamp: new Date().toISOString()
      });
    }

        // Get order items for each order from tenant database
        const orderIds = orders.map((order: any) => order.id);
        let orderItems: any[] = [];
        
        if (orderIds.length > 0) {
          const placeholders = orderIds.map(() => '?').join(',');
          const [itemRows] = await tenantDb.execute(
            `SELECT 
              oi.*,
              mi.name as menuItemName,
              mi.price as menuItemPrice
            FROM order_items oi 
            LEFT JOIN menu_items mi ON oi.menuItemId = mi.id 
            WHERE oi.orderId IN (${placeholders})`,
            orderIds
          );
          orderItems = itemRows as any[];
        }

        // Group items by order
        const itemsByOrder: { [orderId: string]: any[] } = {};
        
        // Process each item and enrich addon data with pricing
        for (const item of orderItems) {
          if (!itemsByOrder[item.orderId]) {
            itemsByOrder[item.orderId] = [];
          }

          // Parse selected addons and enrich with pricing information
          let enrichedAddons: any[] = [];
          if (item.selectedAddons) {
            const parsedAddons = typeof item.selectedAddons === 'string' 
              ? JSON.parse(item.selectedAddons) 
              : item.selectedAddons;
            
            // Get addon pricing information from tenant database
            if (parsedAddons && parsedAddons.length > 0) {
              const addonIds = parsedAddons.map((addon: any) => addon.id || addon.optionId).filter(Boolean);
              
              if (addonIds.length > 0) {
                const [addonRows] = await tenantDb.execute(
                  `SELECT id, name, price FROM addon_options WHERE id IN (${addonIds.map(() => '?').join(',')})`,
                  addonIds
                );
                
                const addonPricing = new Map();
                (addonRows as any[]).forEach(addon => {
                  addonPricing.set(addon.id, {
                    id: addon.id,
                    name: addon.name,
                    price: addon.price
                  });
                });
                
                // Enrich addons with pricing data
                enrichedAddons = parsedAddons.map((addon: any) => {
                  const addonId = addon.id || addon.optionId;
                  const pricingInfo = addonPricing.get(addonId);
                  
                  return {
                    id: addonId,
                    name: addon.name || (pricingInfo ? pricingInfo.name : 'Unknown Addon'),
                    price: pricingInfo ? pricingInfo.price : (addon.price || '0.00'),
                    quantity: addon.quantity || 1
                  };
                });
              }
            }
          }

          itemsByOrder[item.orderId].push({
            id: item.id,
            menuItemId: item.menuItemId,
            name: item.menuItemName || item.name || 'Unknown Item',
            price: item.menuItemPrice || item.price || '0.00',
            quantity: item.quantity,
            selectedAddons: enrichedAddons,
            specialInstructions: item.specialInstructions
          });
        }    // Attach items to orders
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: itemsByOrder[order.id] || []
    }));

    // 🚀 Performance optimization: Calculate last modified time
    const lastModified = orders.length > 0 
      ? new Date(Math.max(...orders.map((o: any) => new Date(o.createdAt).getTime())))
      : new Date();
    
    // 🚀 Check If-Modified-Since header for efficient polling
    if (ifModifiedSince) {
      const clientLastModified = new Date(ifModifiedSince);
      if (lastModified <= clientLastModified) {
        // No new orders since last check - return 304 Not Modified
        return new NextResponse(null, { 
          status: 304,
          headers: {
            'Last-Modified': lastModified.toUTCString(),
            'Cache-Control': 'no-cache, must-revalidate'
          }
        });
      }
    }

    // Generate ETag for caching
    const etag = `"${Buffer.from(JSON.stringify(ordersWithItems)).toString('base64').slice(0, 16)}"`;
    
    // Check If-None-Match header
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          'Last-Modified': lastModified.toUTCString(),
          'ETag': etag,
          'Cache-Control': 'no-cache, must-revalidate'
        }
      });
    }
    
    const response = NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      },
      orders: ordersWithItems,
      count: ordersWithItems.length,
      filters: { status, since, limit, include_all: includeAll },
      timestamp: new Date().toISOString(),
      lastModified: lastModified.toISOString(),
      device_id: deviceId, // Include device ID if authenticated via device
      performance: {
        optimizedPolling: true,
        supportsConditionalRequests: true,
        tip: "Use If-Modified-Since header for efficient polling"
      }
    });

    // 🚀 Add performance optimization headers
    response.headers.set('Last-Modified', lastModified.toUTCString());
    response.headers.set('ETag', etag);
    response.headers.set('Cache-Control', 'no-cache, must-revalidate');
    response.headers.set('X-Performance-Optimized', 'true');
    
    return response;

  } catch (error) {
    console.error('❌ Pull Orders API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}