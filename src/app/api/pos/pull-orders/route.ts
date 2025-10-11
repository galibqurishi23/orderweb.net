import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

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
    
    // Verify tenant and API key
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

    const tenant = tenantRows[0] as any;
    console.log('✅ Tenant verified:', tenant.name);

    // Build query conditions
    let whereConditions = 'WHERE o.tenant_id = ? AND o.status = ?';
    let queryParams: any[] = [tenant.id, status];
    
    // Add time filter if provided
    if (since) {
      whereConditions += ' AND o.createdAt >= ?';
      queryParams.push(since);
    } else {
      // Default to last 24 hours if no since parameter
      whereConditions += ' AND o.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }

    // Get orders
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
        filters: { status, since, limit },
        timestamp: new Date().toISOString()
      });
    }

        // Get order items for each order
        const orderIds = orders.map((order: any) => order.id);
        let orderItems: any[] = [];
        
        if (orderIds.length > 0) {
          const placeholders = orderIds.map(() => '?').join(',');
          const [itemRows] = await db.execute(
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
            
            // Get addon pricing information from database
            if (parsedAddons && parsedAddons.length > 0) {
              const addonIds = parsedAddons.map((addon: any) => addon.id || addon.optionId).filter(Boolean);
              
              if (addonIds.length > 0) {
                const [addonRows] = await db.execute(
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
      filters: { status, since, limit },
      timestamp: new Date().toISOString(),
      lastModified: lastModified.toISOString(),
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