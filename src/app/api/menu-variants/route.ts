import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection
async function getConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'dinedesk_db',
    port: 3306
  });
}

// GET: Fetch variants for a menu item
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const menuItemId = searchParams.get('menuItemId');

  if (!menuItemId) {
    return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    
    const [variants] = await connection.execute(`
      SELECT id, menu_item_id, name, description, price, display_order, active
      FROM menu_item_variants 
      WHERE menu_item_id = ? 
      ORDER BY display_order ASC, created_at ASC
    `, [menuItemId]) as any;

    // Convert price strings to numbers
    const processedVariants = variants.map((variant: any) => ({
      ...variant,
      price: Number(variant.price)
    }));

    return NextResponse.json({ success: true, variants: processedVariants });
  } catch (error) {
    console.error('Error fetching menu item variants:', error);
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// POST: Create a new variant
export async function POST(request: NextRequest) {
  let connection;
  try {
    const { menuItemId, tenantId, name, description, price, displayOrder } = await request.json();

    if (!menuItemId || !tenantId || !name || price === undefined) {
      return NextResponse.json({ 
        error: 'Menu item ID, tenant ID, name, and price are required' 
      }, { status: 400 });
    }

    connection = await getConnection();
    
    const [result] = await connection.execute(`
      INSERT INTO menu_item_variants (menu_item_id, tenant_id, name, description, price, display_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [menuItemId, tenantId, name, description || null, price, displayOrder || 0]);

    const [newVariant] = await connection.execute(`
      SELECT id, menu_item_id, name, description, price, display_order, active
      FROM menu_item_variants 
      WHERE id = LAST_INSERT_ID()
    `) as any;

    // Convert price to number
    const processedVariant = {
      ...newVariant[0],
      price: Number(newVariant[0].price)
    };

    return NextResponse.json({ 
      success: true, 
      variant: processedVariant 
    });
  } catch (error) {
    console.error('Error creating menu item variant:', error);
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// PUT: Update a variant
export async function PUT(request: NextRequest) {
  let connection;
  try {
    const { id, name, description, price, displayOrder, active } = await request.json();

    if (!id || !name || price === undefined) {
      return NextResponse.json({ 
        error: 'Variant ID, name, and price are required' 
      }, { status: 400 });
    }

    connection = await getConnection();
    
    await connection.execute(`
      UPDATE menu_item_variants 
      SET name = ?, description = ?, price = ?, display_order = ?, active = ?
      WHERE id = ?
    `, [name, description || null, price, displayOrder || 0, active !== false, id]);

    const [updatedVariant] = await connection.execute(`
      SELECT id, menu_item_id, name, description, price, display_order, active
      FROM menu_item_variants 
      WHERE id = ?
    `, [id]) as any;

    // Convert price to number
    const processedVariant = {
      ...updatedVariant[0],
      price: Number(updatedVariant[0].price)
    };

    return NextResponse.json({ 
      success: true, 
      variant: processedVariant 
    });
  } catch (error) {
    console.error('Error updating menu item variant:', error);
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}

// DELETE: Delete a variant
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get('variantId');

  if (!variantId) {
    return NextResponse.json({ error: 'Variant ID is required' }, { status: 400 });
  }

  let connection;
  try {
    connection = await getConnection();
    
    await connection.execute(`
      DELETE FROM menu_item_variants WHERE id = ?
    `, [variantId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item variant:', error);
    return NextResponse.json({ error: 'Failed to delete variant' }, { status: 500 });
  } finally {
    if (connection) await connection.end();
  }
}
