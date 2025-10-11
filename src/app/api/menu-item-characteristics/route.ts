import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Database connection
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dinedesk_db',
    charset: 'utf8mb4'
  });
}

// GET - Fetch characteristics for a menu item
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menu_item_id');
    const tenant = searchParams.get('tenant');
    
    if (!menuItemId || !tenant) {
      return NextResponse.json(
        { success: false, error: 'menu_item_id and tenant are required' },
        { status: 400 }
      );
    }
    
    // Fetch characteristics for the menu item with full details
    const [rows] = await connection.execute(`
      SELECT 
        mic.id as assignment_id,
        dc.id,
        dc.name,
        dc.description,
        dc.icon_type,
        dc.svg_content,
        dc.png_path,
        dc.default_color,
        dc.category,
        dc.is_active,
        dc.display_order
      FROM menu_item_characteristics mic
      JOIN dietary_characteristics dc ON mic.characteristic_id = dc.id
      WHERE mic.menu_item_id = ? AND mic.tenant = ? AND dc.is_active = 1
      ORDER BY dc.display_order ASC, dc.name ASC
    `, [menuItemId, tenant]);
    
    return NextResponse.json({
      success: true,
      characteristics: rows
    });
    
  } catch (error) {
    console.error('Error fetching menu item characteristics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch menu item characteristics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// POST - Assign characteristics to a menu item
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    const body = await request.json();
    
    const { menu_item_id, tenant, characteristic_ids } = body;
    
    // Validation
    if (!menu_item_id || !tenant || !Array.isArray(characteristic_ids)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'menu_item_id, tenant, and characteristic_ids (array) are required' 
        },
        { status: 400 }
      );
    }
    
    await connection.beginTransaction();
    
    try {
      // First, remove all existing characteristics for this menu item
      await connection.execute(
        'DELETE FROM menu_item_characteristics WHERE menu_item_id = ? AND tenant = ?',
        [menu_item_id, tenant]
      );
      
      // Then, insert new characteristics if any
      if (characteristic_ids.length > 0) {
        // Verify all characteristic IDs exist and are active
        const placeholders = characteristic_ids.map(() => '?').join(',');
        const [existingChars] = await connection.execute(
          `SELECT id FROM dietary_characteristics WHERE id IN (${placeholders}) AND is_active = 1`,
          characteristic_ids
        );
        
        const existingIds = (existingChars as any[]).map(row => row.id);
        const invalidIds = characteristic_ids.filter(id => !existingIds.includes(id));
        
        if (invalidIds.length > 0) {
          await connection.rollback();
          return NextResponse.json(
            { 
              success: false, 
              error: `Invalid or inactive characteristic IDs: ${invalidIds.join(', ')}` 
            },
            { status: 400 }
          );
        }
        
        // Insert new assignments
        const insertPromises = characteristic_ids.map(charId =>
          connection!.execute(
            'INSERT INTO menu_item_characteristics (menu_item_id, characteristic_id, tenant) VALUES (?, ?, ?)',
            [menu_item_id, charId, tenant]
          )
        );
        
        await Promise.all(insertPromises);
      }
      
      await connection.commit();
      
      // Fetch the updated characteristics
      const [updatedRows] = await connection.execute(`
        SELECT 
          mic.id as assignment_id,
          dc.id,
          dc.name,
          dc.description,
          dc.icon_type,
          dc.svg_content,
          dc.png_path,
          dc.default_color,
          dc.category,
          dc.display_order
        FROM menu_item_characteristics mic
        JOIN dietary_characteristics dc ON mic.characteristic_id = dc.id
        WHERE mic.menu_item_id = ? AND mic.tenant = ? AND dc.is_active = 1
        ORDER BY dc.display_order ASC, dc.name ASC
      `, [menu_item_id, tenant]);
      
      return NextResponse.json({
        success: true,
        message: 'Menu item characteristics updated successfully',
        characteristics: updatedRows
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    
  } catch (error: any) {
    console.error('Error updating menu item characteristics:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Characteristic already assigned to this menu item' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update menu item characteristics',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// DELETE - Remove specific characteristic from menu item
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menu_item_id');
    const characteristicId = searchParams.get('characteristic_id');
    const tenant = searchParams.get('tenant');
    
    if (!menuItemId || !characteristicId || !tenant) {
      return NextResponse.json(
        { success: false, error: 'menu_item_id, characteristic_id, and tenant are required' },
        { status: 400 }
      );
    }
    
    // Check if the assignment exists
    const [existing] = await connection.execute(
      'SELECT id FROM menu_item_characteristics WHERE menu_item_id = ? AND characteristic_id = ? AND tenant = ?',
      [menuItemId, characteristicId, tenant]
    );
    
    if ((existing as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Characteristic assignment not found' },
        { status: 404 }
      );
    }
    
    // Remove the assignment
    await connection.execute(
      'DELETE FROM menu_item_characteristics WHERE menu_item_id = ? AND characteristic_id = ? AND tenant = ?',
      [menuItemId, characteristicId, tenant]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Characteristic removed from menu item successfully'
    });
    
  } catch (error) {
    console.error('Error removing menu item characteristic:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove menu item characteristic',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
