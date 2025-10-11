import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemIds, tenantId, categoryId } = body;

    if (!itemIds || !Array.isArray(itemIds) || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Item IDs array and tenant ID are required' },
        { status: 400 }
      );
    }

    console.log('Reordering menu items for tenant:', tenantId);
    console.log('Category ID:', categoryId);
    console.log('New order:', itemIds);

    // First, get tenant ID by slug
    const [tenantRows] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ?',
      [tenantId]
    );

    if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantUuid = (tenantRows[0] as any).id;

    // Update display_order for each menu item
    for (let i = 0; i < itemIds.length; i++) {
      const updateQuery = categoryId 
        ? 'UPDATE menu_items SET display_order = ? WHERE id = ? AND tenant_id = ? AND category_id = ?'
        : 'UPDATE menu_items SET display_order = ? WHERE id = ? AND tenant_id = ?';
      
      const updateParams = categoryId 
        ? [i, itemIds[i], tenantUuid, categoryId]
        : [i, itemIds[i], tenantUuid];

      await db.execute(updateQuery, updateParams);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Menu items reordered successfully' 
    });
  } catch (error) {
    console.error('Error reordering menu items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder menu items' },
      { status: 500 }
    );
  }
}
