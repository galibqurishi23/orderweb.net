import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'dinedesk_db'
};

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string; id: string; variantId: string }> }
) {
    try {
        const { tenant, id: itemId, variantId } = await params;
        
        const connection = await mysql.createConnection(dbConfig);

        try {
            await connection.beginTransaction();

            // Delete variant options first
            await connection.execute(`
                DELETE FROM item_variant_options WHERE variant_type_id = ?
            `, [variantId]);

            // Delete the variant type
            const [result] = await connection.execute(`
                DELETE FROM item_variant_types WHERE id = ? AND item_id = ?
            `, [variantId, itemId]);

            await connection.commit();

            if ((result as any).affectedRows === 0) {
                return NextResponse.json(
                    { error: 'Variant not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ 
                success: true, 
                message: 'Variant deleted successfully' 
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Error deleting variant:', error);
        return NextResponse.json(
            { error: 'Failed to delete variant' },
            { status: 500 }
        );
    }
}
