import db from '@/lib/db';

// Types
export interface ShopCategory {
    id: string;
    tenant_id: string;
    name: string;
    description?: string;
    image_url?: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ShopItem {
    id: string;
    tenant_id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    compare_price?: number;
    sku?: string;
    type: 'physical' | 'digital' | 'gift_card';
    stock_quantity: number;
    track_inventory: boolean;
    weight?: number;
    dimensions?: string;
    image_url?: string;
    gallery_images?: string[];
    is_featured: boolean;
    is_active: boolean;
    sort_order: number;
    tags?: string[];
    meta_title?: string;
    meta_description?: string;
    created_at: string;
    updated_at: string;
    category?: ShopCategory;
}

export interface ShopItemVariant {
    id: string;
    item_id: string;
    name: string;
    type: string;
    price_modifier: number;
    stock_quantity: number;
    sku?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface CartItem {
    id: string;
    tenant_id: string;
    session_id?: string;
    customer_id?: string;
    item_id: string;
    variant_id?: string;
    quantity: number;
    price: number;
    created_at: string;
    updated_at: string;
    item?: ShopItem;
    variant?: ShopItemVariant;
}

// Categories
export async function getShopCategories(tenantId: string): Promise<ShopCategory[]> {
    const [rows] = await db.query(
        'SELECT * FROM shop_categories WHERE tenant_id = ? AND is_active = TRUE ORDER BY sort_order, name',
        [tenantId]
    ) as any[];
    return rows;
}

export async function createShopCategory(tenantId: string, data: Partial<ShopCategory>): Promise<ShopCategory> {
    const id = crypto.randomUUID();
    await db.query(
        `INSERT INTO shop_categories (id, tenant_id, name, description, image_url, sort_order, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, tenantId, data.name, data.description || null, data.image_url || null, data.sort_order || 0, data.is_active !== false]
    );
    
    const [rows] = await db.query('SELECT * FROM shop_categories WHERE id = ?', [id]) as any[];
    return rows[0];
}

export async function updateShopCategory(id: string, data: Partial<ShopCategory>): Promise<ShopCategory> {
    const fields = [];
    const values: any[] = [];
    
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    
    values.push(id);
    
    await db.query(
        `UPDATE shop_categories SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
    );
    
    const [rows] = await db.query('SELECT * FROM shop_categories WHERE id = ?', [id]) as any[];
    return rows[0];
}

export async function deleteShopCategory(id: string): Promise<void> {
    await db.query('DELETE FROM shop_categories WHERE id = ?', [id]);
}

// Shop Items
export async function getShopItems(tenantId: string, options: {
    categoryId?: string;
    featured?: boolean;
    active?: boolean;
    limit?: number;
    offset?: number;
} = {}): Promise<ShopItem[]> {
    let query = `
        SELECT si.*, sc.name as category_name 
        FROM shop_items si 
        LEFT JOIN shop_categories sc ON si.category_id = sc.id 
        WHERE si.tenant_id = ?
    `;
    const params: any[] = [tenantId];
    
    if (options.categoryId) {
        query += ' AND si.category_id = ?';
        params.push(options.categoryId);
    }
    
    if (options.featured !== undefined) {
        query += ' AND si.is_featured = ?';
        params.push(options.featured);
    }
    
    if (options.active !== undefined) {
        query += ' AND si.is_active = ?';
        params.push(options.active);
    }
    
    query += ' ORDER BY si.sort_order, si.name';
    
    if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }
    }
    
    const [rows] = await db.query(query, params) as any[];
    
    // Parse JSON fields
    return rows.map((row: any) => ({
        ...row,
        gallery_images: row.gallery_images ? JSON.parse(row.gallery_images) : [],
        tags: row.tags ? JSON.parse(row.tags) : []
    }));
}

export async function getShopItem(id: string): Promise<ShopItem | null> {
    const [rows] = await db.query(
        `SELECT si.*, sc.name as category_name 
         FROM shop_items si 
         LEFT JOIN shop_categories sc ON si.category_id = sc.id 
         WHERE si.id = ?`,
        [id]
    ) as any[];
    
    if (rows.length === 0) return null;
    
    const item = rows[0];
    return {
        ...item,
        gallery_images: item.gallery_images ? JSON.parse(item.gallery_images) : [],
        tags: item.tags ? JSON.parse(item.tags) : []
    };
}

export async function createShopItem(tenantId: string, data: Partial<ShopItem>): Promise<ShopItem> {
    const id = crypto.randomUUID();
    
    await db.query(
        `INSERT INTO shop_items (
            id, tenant_id, category_id, name, description, 
            price, compare_price, sku, type, stock_quantity, track_inventory,
            weight, dimensions, image_url, gallery_images, is_featured, 
            is_active, sort_order, tags, meta_title, meta_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, tenantId, data.category_id, data.name, data.description || null,
            data.price, data.compare_price || null,
            data.sku || null, data.type || 'physical', data.stock_quantity || 0,
            data.track_inventory !== false, data.weight || null, data.dimensions || null,
            data.image_url || null, JSON.stringify(data.gallery_images || []),
            data.is_featured || false, data.is_active !== false, data.sort_order || 0,
            JSON.stringify(data.tags || []), data.meta_title || null, data.meta_description || null
        ]
    );
    
    return await getShopItem(id) as ShopItem;
}

export async function updateShopItem(id: string, data: Partial<ShopItem>): Promise<ShopItem> {
    const fields = [];
    const values: any[] = [];
    
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
    if (data.compare_price !== undefined) { fields.push('compare_price = ?'); values.push(data.compare_price); }
    if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.stock_quantity !== undefined) { fields.push('stock_quantity = ?'); values.push(data.stock_quantity); }
    if (data.track_inventory !== undefined) { fields.push('track_inventory = ?'); values.push(data.track_inventory); }
    if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
    if (data.dimensions !== undefined) { fields.push('dimensions = ?'); values.push(data.dimensions); }
    if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
    if (data.gallery_images !== undefined) { fields.push('gallery_images = ?'); values.push(JSON.stringify(data.gallery_images)); }
    if (data.is_featured !== undefined) { fields.push('is_featured = ?'); values.push(data.is_featured); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.meta_title !== undefined) { fields.push('meta_title = ?'); values.push(data.meta_title); }
    if (data.meta_description !== undefined) { fields.push('meta_description = ?'); values.push(data.meta_description); }
    
    values.push(id);
    
    await db.query(
        `UPDATE shop_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
    );
    
    return await getShopItem(id) as ShopItem;
}

export async function deleteShopItem(id: string): Promise<void> {
    await db.query('DELETE FROM shop_items WHERE id = ?', [id]);
}

// Shopping Cart
export async function getCartItems(tenantId: string, sessionId?: string, customerId?: string): Promise<CartItem[]> {
    let query = `
        SELECT sc.*, si.name as item_name, si.price as item_price, si.image_url as item_image,
               si.type as item_type, siv.name as variant_name
        FROM shopping_cart sc
        LEFT JOIN shop_items si ON sc.item_id = si.id
        LEFT JOIN shop_item_variants siv ON sc.variant_id = siv.id
        WHERE sc.tenant_id = ?
    `;
    const params: any[] = [tenantId];
    
    if (customerId) {
        query += ' AND sc.customer_id = ?';
        params.push(customerId);
    } else if (sessionId) {
        query += ' AND sc.session_id = ?';
        params.push(sessionId);
    }
    
    query += ' ORDER BY sc.created_at DESC';
    
    const [rows] = await db.query(query, params) as any[];
    return rows;
}

export async function addToCart(tenantId: string, data: {
    sessionId?: string;
    customerId?: string;
    itemId: string;
    variantId?: string;
    quantity: number;
    price: number;
}): Promise<CartItem> {
    const id = crypto.randomUUID();
    
    await db.query(
        `INSERT INTO shopping_cart (id, tenant_id, session_id, customer_id, item_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, tenantId, data.sessionId || null, data.customerId || null, data.itemId, data.variantId || null, data.quantity, data.price]
    );
    
    const [rows] = await db.query('SELECT * FROM shopping_cart WHERE id = ?', [id]) as any[];
    return rows[0];
}

export async function updateCartItem(id: string, quantity: number): Promise<void> {
    await db.query(
        'UPDATE shopping_cart SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [quantity, id]
    );
}

export async function removeFromCart(id: string): Promise<void> {
    await db.query('DELETE FROM shopping_cart WHERE id = ?', [id]);
}

export async function clearCart(tenantId: string, sessionId?: string, customerId?: string): Promise<void> {
    if (customerId) {
        await db.query('DELETE FROM shopping_cart WHERE tenant_id = ? AND customer_id = ?', [tenantId, customerId]);
    } else if (sessionId) {
        await db.query('DELETE FROM shopping_cart WHERE tenant_id = ? AND session_id = ?', [tenantId, sessionId]);
    }
}

// Stock Management
export async function decreaseItemStock(itemId: string, quantity: number): Promise<void> {
    await db.query(
        `UPDATE shop_items 
         SET stock_quantity = GREATEST(0, stock_quantity - ?), 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND track_inventory = TRUE`,
        [quantity, itemId]
    );
}

export async function increaseItemStock(itemId: string, quantity: number): Promise<void> {
    await db.query(
        `UPDATE shop_items 
         SET stock_quantity = stock_quantity + ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND track_inventory = TRUE`,
        [quantity, itemId]
    );
}

export async function checkItemStock(itemId: string): Promise<{ stock_quantity: number; track_inventory: boolean } | null> {
    const [rows] = await db.query(
        'SELECT stock_quantity, track_inventory FROM shop_items WHERE id = ?',
        [itemId]
    ) as any[];
    
    return rows.length > 0 ? rows[0] : null;
}
