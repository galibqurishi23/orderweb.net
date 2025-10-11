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

// GET - Fetch all dietary characteristics
export async function GET(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    
    let query = `
      SELECT 
        id, name, description, icon_type, svg_content, png_path, 
        default_color, category, is_active, display_order,
        created_at, updated_at
      FROM dietary_characteristics
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (active !== null) {
      conditions.push('is_active = ?');
      params.push(active === 'true');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY display_order ASC, name ASC';
    
    const [rows] = await connection.execute(query, params);
    
    return NextResponse.json({
      success: true,
      characteristics: rows
    });
    
  } catch (error) {
    console.error('Error fetching dietary characteristics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dietary characteristics',
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

// POST - Create new dietary characteristic
export async function POST(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    const body = await request.json();
    
    console.log('🔍 POST /api/dietary-characteristics - Received data:', body);
    
    const {
      name,
      description,
      icon_type = 'svg',
      svg_content,
      png_path,
      default_color = '#22c55e',
      category = 'dietary',
      is_active = true,
      display_order = 0
    } = body;
    
    console.log('🔍 Parsed data:', {
      name, icon_type, svg_content: svg_content?.substring(0, 50) + '...', 
      png_path: png_path?.substring(0, 50) + '...', category
    });
    
    // Validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    
    if (icon_type === 'svg' && !svg_content) {
      return NextResponse.json(
        { success: false, error: 'SVG content is required for SVG icons' },
        { status: 400 }
      );
    }
    
    if (icon_type === 'png' && !png_path) {
      return NextResponse.json(
        { success: false, error: 'PNG path is required for PNG icons' },
        { status: 400 }
      );
    }
    
    // Insert new characteristic - ensure no undefined values
    const insertParams = [
      name,
      description || '',
      icon_type,
      icon_type === 'svg' ? (svg_content || '') : null,
      icon_type === 'png' ? (png_path || null) : null,
      default_color,
      category,
      is_active ? 1 : 0,
      display_order || 0
    ];
    
    console.log('🔍 Insert parameters:', insertParams);
    
    const [result] = await connection.execute(`
      INSERT INTO dietary_characteristics 
      (name, description, icon_type, svg_content, png_path, default_color, category, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, insertParams);
    
    const insertResult = result as mysql.ResultSetHeader;
    
    // Fetch the created characteristic
    const [rows] = await connection.execute(
      'SELECT * FROM dietary_characteristics WHERE id = ?',
      [insertResult.insertId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Dietary characteristic created successfully',
      characteristic: (rows as any[])[0]
    });
    
  } catch (error: any) {
    console.error('Error creating dietary characteristic:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Characteristic name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create dietary characteristic',
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

// PUT - Update dietary characteristic
export async function PUT(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    const body = await request.json();
    
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    const allowedFields = [
      'name', 'description', 'icon_type', 'svg_content', 'png_path',
      'default_color', 'category', 'is_active', 'display_order'
    ];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    updateValues.push(id);
    
    await connection.execute(
      `UPDATE dietary_characteristics SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Fetch updated characteristic
    const [rows] = await connection.execute(
      'SELECT * FROM dietary_characteristics WHERE id = ?',
      [id]
    );
    
    if ((rows as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Characteristic not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Dietary characteristic updated successfully',
      characteristic: (rows as any[])[0]
    });
    
  } catch (error: any) {
    console.error('Error updating dietary characteristic:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: 'Characteristic name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update dietary characteristic',
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

// DELETE - Remove dietary characteristic
export async function DELETE(request: NextRequest) {
  let connection;
  
  try {
    connection = await getConnection();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Check if characteristic exists
    const [existing] = await connection.execute(
      'SELECT id FROM dietary_characteristics WHERE id = ?',
      [id]
    );
    
    if ((existing as any[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Characteristic not found' },
        { status: 404 }
      );
    }
    
    // Delete the characteristic (will cascade delete menu_item_characteristics)
    await connection.execute(
      'DELETE FROM dietary_characteristics WHERE id = ?',
      [id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Dietary characteristic deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting dietary characteristic:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete dietary characteristic',
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
