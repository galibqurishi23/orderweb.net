import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryIds, tenantId } = body;

    if (!categoryIds || !Array.isArray(categoryIds) || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Category IDs array and tenant ID are required' },
        { status: 400 }
      );
    }

    console.log('Reordering categories for tenant:', tenantId);
    console.log('New order:', categoryIds);

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

    // Update display_order for each category
    for (let i = 0; i < categoryIds.length; i++) {
      await db.execute(
        'UPDATE categories SET display_order = ? WHERE id = ? AND tenant_id = ?',
        [i, categoryIds[i], tenantUuid]
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Categories reordered successfully' 
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder categories' },
      { status: 500 }
    );
  }
}
