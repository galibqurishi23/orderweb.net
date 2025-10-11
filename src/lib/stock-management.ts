import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'dinedesk_db'
};

/**
 * Reduces stock quantity for an item and auto-deactivates if stock reaches 0
 */
export async function reduceStock(itemId: string, quantity: number = 1): Promise<boolean> {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        await connection.beginTransaction();
        
        // Get current item details
        const [items] = await connection.execute(`
            SELECT stock_quantity, track_inventory, is_active 
            FROM shop_items 
            WHERE id = ? AND track_inventory = 1
        `, [itemId]);
        
        if ((items as any[]).length === 0) {
            await connection.rollback();
            return false; // Item not found or doesn't track inventory
        }
        
        const item = (items as any[])[0];
        const newStock = Math.max(0, item.stock_quantity - quantity);
        
        // Update stock and auto-deactivate if needed
        await connection.execute(`
            UPDATE shop_items 
            SET stock_quantity = ?, 
                is_active = CASE 
                    WHEN ? <= 0 THEN 0 
                    ELSE is_active 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [newStock, newStock, itemId]);
        
        await connection.commit();
        
        if (newStock <= 0) {
            console.log(`Item ${itemId} auto-deactivated due to zero stock`);
        }
        
        return true;
    } catch (error) {
        await connection.rollback();
        console.error('Error reducing stock:', error);
        return false;
    } finally {
        await connection.end();
    }
}

/**
 * Checks if item has sufficient stock
 */
export async function checkStock(itemId: string, requestedQuantity: number = 1): Promise<{ available: boolean; currentStock: number }> {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        const [items] = await connection.execute(`
            SELECT stock_quantity, track_inventory, is_active 
            FROM shop_items 
            WHERE id = ?
        `, [itemId]);
        
        if ((items as any[]).length === 0) {
            return { available: false, currentStock: 0 };
        }
        
        const item = (items as any[])[0];
        
        // If item doesn't track inventory, consider it always available
        if (!item.track_inventory) {
            return { available: item.is_active, currentStock: -1 }; // -1 indicates unlimited stock
        }
        
        return {
            available: item.is_active && item.stock_quantity >= requestedQuantity,
            currentStock: item.stock_quantity
        };
    } catch (error) {
        console.error('Error checking stock:', error);
        return { available: false, currentStock: 0 };
    } finally {
        await connection.end();
    }
}

/**
 * Restores stock (for order cancellations)
 */
export async function restoreStock(itemId: string, quantity: number = 1): Promise<boolean> {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        await connection.beginTransaction();
        
        // Update stock and potentially reactivate item
        const [result] = await connection.execute(`
            UPDATE shop_items 
            SET stock_quantity = stock_quantity + ?,
                is_active = CASE 
                    WHEN track_inventory = 1 AND stock_quantity + ? > 0 AND is_active = 0 THEN 1
                    ELSE is_active 
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND track_inventory = 1
        `, [quantity, quantity, itemId]);
        
        await connection.commit();
        return (result as any).affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        console.error('Error restoring stock:', error);
        return false;
    } finally {
        await connection.end();
    }
}
