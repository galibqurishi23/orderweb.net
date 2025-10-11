import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'dinedesk_db'
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string; id: string }> }
) {
    try {
        const { tenant, id: itemId } = await params;
        const body = await request.json();
        
        // Simplified variant structure: just name and options with prices
        const { variantName, options } = body;

        if (!variantName || !options || options.length === 0) {
            return NextResponse.json(
                { error: 'Variant name and options are required' },
                { status: 400 }
            );
        }

        const connection = await mysql.createConnection(dbConfig);

        try {
            await connection.beginTransaction();

            // Create the variant type with simplified structure (use shorter UUID)
            const variantTypeId = `vt-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
            
            await connection.execute(`
                INSERT INTO item_variant_types (id, item_id, name, display_order, is_required)
                VALUES (?, ?, ?, ?, ?)
            `, [
                variantTypeId,
                itemId,
                variantName,
                0,
                false
            ]);

            // Create the variant options (simplified - just name and price)
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const optionId = `vo-${Date.now().toString(36)}-${i}-${Math.random().toString(36).substr(2, 4)}`;
                
                await connection.execute(`
                    INSERT INTO item_variant_options (id, variant_type_id, name, price_modifier, stock_quantity, is_available, display_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    optionId,
                    variantTypeId,
                    option.name || `Option ${i + 1}`,
                    parseFloat(option.price || 0),
                    999, // Default high stock
                    true,
                    i
                ]);
            }

            // Enable variants for this item
            await connection.execute(`
                UPDATE shop_items SET variants_enabled = TRUE WHERE id = ?
            `, [itemId]);

            await connection.commit();

            return NextResponse.json({ 
                success: true, 
                message: 'Variant created successfully',
                variantTypeId 
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Error creating variant:', error);
        return NextResponse.json(
            { error: 'Failed to create variant' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string; id: string }> }
) {
    try {
        const { tenant, id: itemId } = await params;
        
        const connection = await mysql.createConnection(dbConfig);

        try {
            // Get all variant types for this item
            const [variantTypeRows] = await connection.execute(`
                SELECT * FROM item_variant_types WHERE item_id = ? ORDER BY display_order
            `, [itemId]);

            const variantTypes = [];
            
            for (const variantType of variantTypeRows as any[]) {
                // Get options for each variant type
                const [optionRows] = await connection.execute(`
                    SELECT * FROM item_variant_options WHERE variant_type_id = ? ORDER BY display_order
                `, [variantType.id]);
                
                variantTypes.push({
                    ...variantType,
                    options: optionRows
                });
            }

            return NextResponse.json(variantTypes);

        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Error fetching variants:', error);
        return NextResponse.json(
            { error: 'Failed to fetch variants' },
            { status: 500 }
        );
    }
}


