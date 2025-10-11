'use server';

import db from './db';
import { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
    MenuCategory,
    MenuItem,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    CreateMenuItemRequest,
    UpdateMenuItemRequest,
    MenuWithCategories,
    MenuStats,
    DatabaseResult
} from './menu-types';
import { ItemComponent } from './component-types';

// Helper function to save dietary characteristics for a menu item
async function saveDietaryCharacteristicsForMenuItem(
    tenantId: string, 
    menuItemId: string, 
    characteristics: any[]
): Promise<void> {
    try {
        // First, remove existing characteristics
        await db.execute(
            'DELETE FROM menu_item_characteristics WHERE menu_item_id = ? AND tenant = ?',
            [menuItemId, tenantId]
        );
        
        // Then add new characteristics
        if (characteristics.length > 0) {
            const characteristicIds = characteristics
                .map(c => typeof c === 'object' ? parseInt(c.id) : parseInt(c))
                .filter(id => !isNaN(id));
            
            for (const charId of characteristicIds) {
                await db.execute(
                    'INSERT INTO menu_item_characteristics (menu_item_id, characteristic_id, tenant) VALUES (?, ?, ?)',
                    [menuItemId, charId, tenantId]
                );
            }
        }
        
        console.log(`✅ Saved ${characteristics.length} dietary characteristics for menu item ${menuItemId}`);
    } catch (error) {
        console.error('Error saving dietary characteristics:', error);
        throw error;
    }
}

// Helper function to save mixed item components for a menu item
async function saveComponentsForMenuItem(
    tenantId: string,
    menuItemId: string,
    components: any[]
): Promise<void> {
    try {
        // First, remove existing components
        await db.execute(
            'DELETE FROM item_components WHERE menu_item_id = ?',
            [menuItemId]
        );
        
        // Then add new components
        if (components.length > 0) {
            for (const component of components) {
                await db.execute(
                    `INSERT INTO item_components (
                        id, menu_item_id, component_name, component_cost, 
                        vat_rate, component_type, is_active, display_order,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        component.id || `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        menuItemId,
                        component.componentName,
                        component.componentCost,
                        component.vatRate,
                        component.componentType,
                        component.isActive !== false,
                        component.displayOrder || 0,
                        new Date(),
                        new Date()
                    ]
                );
            }
        }
        
        console.log(`✅ Saved ${components.length} components for menu item ${menuItemId}`);
    } catch (error) {
        console.error('Error saving mixed item components:', error);
        throw error;
    }
}

// ==================== UTILITY FUNCTIONS ====================

function parseJsonField<T>(field: any): T | null {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field) as T;
        } catch (e) {
            console.warn('Failed to parse JSON field:', field);
            return null;
        }
    }
    return field ?? null;
}

function validateTenantId(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string') {
        throw new Error('Valid tenant ID is required');
    }
}

function generateId(): string {
    return uuidv4();
}

// ==================== CATEGORY OPERATIONS ====================

export async function getCategories(tenantId: string): Promise<MenuCategory[]> {
    validateTenantId(tenantId);
    
    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
                id, tenant_id, name, description, active, display_order, 
                parent_id, image_url, icon, color, created_at, updated_at
            FROM categories 
            WHERE tenant_id = ? 
            ORDER BY display_order ASC, name ASC`,
            [tenantId]
        );

        return rows.map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            active: Boolean(row.active),
            displayOrder: row.display_order || 0,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            icon: row.icon,
            color: row.color,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw new Error('Failed to fetch categories');
    }
}

export async function getCategoryById(tenantId: string, categoryId: string): Promise<MenuCategory | null> {
    validateTenantId(tenantId);
    
    if (!categoryId) {
        throw new Error('Category ID is required');
    }

    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
                id, tenant_id, name, description, active, display_order, 
                parent_id, image_url, icon, color, created_at, updated_at
            FROM categories 
            WHERE tenant_id = ? AND id = ?`,
            [tenantId, categoryId]
        );

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            active: Boolean(row.active),
            displayOrder: row.display_order || 0,
            parentId: row.parent_id,
            imageUrl: row.image_url,
            icon: row.icon,
            color: row.color,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    } catch (error) {
        console.error('Error fetching category by ID:', error);
        throw new Error('Failed to fetch category');
    }
}

export async function createCategory(tenantId: string, categoryData: CreateCategoryRequest): Promise<MenuCategory> {
    validateTenantId(tenantId);
    
    if (!categoryData.name?.trim()) {
        throw new Error('Category name is required');
    }

    const categoryId = generateId();
    const now = new Date();

    try {
        await db.execute(
            `INSERT INTO categories (
                id, tenant_id, name, description, active, display_order, 
                parent_id, image_url, icon, color, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                categoryId,
                tenantId,
                categoryData.name.trim(),
                categoryData.description?.trim() || null,
                categoryData.active !== false,
                categoryData.displayOrder || 0,
                categoryData.parentId || null,
                categoryData.imageUrl?.trim() || null,
                categoryData.icon?.trim() || null,
                categoryData.color?.trim() || null,
                now,
                now
            ]
        );

        const createdCategory = await getCategoryById(tenantId, categoryId);
        if (!createdCategory) {
            throw new Error('Failed to retrieve created category');
        }

        return createdCategory;
    } catch (error) {
        console.error('Error creating category:', error);
        throw new Error('Failed to create category');
    }
}

export async function updateCategory(tenantId: string, categoryData: UpdateCategoryRequest): Promise<MenuCategory> {
    validateTenantId(tenantId);
    
    if (!categoryData.id) {
        throw new Error('Category ID is required');
    }

    // Check if category exists
    const existingCategory = await getCategoryById(tenantId, categoryData.id);
    if (!existingCategory) {
        throw new Error('Category not found');
    }

    try {
        const updates: string[] = [];
        const values: any[] = [];

        if (categoryData.name !== undefined) {
            if (!categoryData.name.trim()) {
                throw new Error('Category name cannot be empty');
            }
            updates.push('name = ?');
            values.push(categoryData.name.trim());
        }

        if (categoryData.description !== undefined) {
            updates.push('description = ?');
            values.push(categoryData.description?.trim() || null);
        }

        if (categoryData.active !== undefined) {
            updates.push('active = ?');
            values.push(categoryData.active);
        }

        if (categoryData.displayOrder !== undefined) {
            updates.push('display_order = ?');
            values.push(categoryData.displayOrder);
        }

        if (categoryData.parentId !== undefined) {
            updates.push('parent_id = ?');
            values.push(categoryData.parentId || null);
        }

        if (categoryData.imageUrl !== undefined) {
            updates.push('image_url = ?');
            values.push(categoryData.imageUrl?.trim() || null);
        }

        if (categoryData.icon !== undefined) {
            updates.push('icon = ?');
            values.push(categoryData.icon?.trim() || null);
        }

        if (categoryData.color !== undefined) {
            updates.push('color = ?');
            values.push(categoryData.color?.trim() || null);
        }

        if (updates.length === 0) {
            return existingCategory;
        }

        updates.push('updated_at = ?');
        values.push(new Date());

        values.push(categoryData.id);
        values.push(tenantId);

        await db.execute(
            `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
            values
        );

        const updatedCategory = await getCategoryById(tenantId, categoryData.id);
        if (!updatedCategory) {
            throw new Error('Failed to retrieve updated category');
        }

        return updatedCategory;
    } catch (error) {
        console.error('Error updating category:', error);
        throw new Error('Failed to update category');
    }
}

export async function deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    validateTenantId(tenantId);
    
    if (!categoryId) {
        throw new Error('Category ID is required');
    }

    try {
        // Update menu items to remove category reference
        await db.execute(
            'UPDATE menu_items SET category_id = NULL WHERE category_id = ? AND tenant_id = ?',
            [categoryId, tenantId]
        );

        // Delete the category
        const [result] = await db.execute(
            'DELETE FROM categories WHERE id = ? AND tenant_id = ?',
            [categoryId, tenantId]
        );

        if ((result as DatabaseResult).affectedRows === 0) {
            throw new Error('Category not found');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        throw new Error('Failed to delete category');
    }
}

// ==================== MENU ITEM OPERATIONS ====================

export async function getMenuItems(tenantId: string): Promise<MenuItem[]> {
    validateTenantId(tenantId);
    
    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
                id, tenant_id, category_id, name, description, price, image_url, 
                image_hint, available, is_featured, is_set_menu, preparation_time,
                display_order, addons, characteristics, nutrition, set_menu_items, smart_set_menu_config, tags,
                vat_rate, vat_type, is_vat_exempt, vat_notes,
                created_at, updated_at
            FROM menu_items 
            WHERE tenant_id = ? 
            ORDER BY display_order ASC, name ASC`,
            [tenantId]
        );

        // Process menu items and load components for mixed items
        const menuItems = await Promise.all(rows.map(async (row) => {
            const parsedCharacteristics = parseJsonField(row.characteristics) || [];
            const parsedTags = parseJsonField(row.tags) || [];
            const parsedAddons = parseJsonField(row.addons) || [];
            
            const menuItem = {
                id: row.id,
                tenantId: row.tenant_id,
                categoryId: row.category_id,
                name: row.name,
                description: row.description,
                price: parseFloat(row.price),
                image: row.image_url, // Map image_url to image
                imageHint: row.image_hint,
                available: Boolean(row.available),
                isFeatured: Boolean(row.is_featured),
                preparationTime: row.preparation_time || 15,
                displayOrder: row.display_order || 0,
                addons: Array.isArray(parsedAddons) ? parsedAddons : [],
                characteristics: Array.isArray(parsedCharacteristics) ? parsedCharacteristics : [],
                nutrition: parseJsonField(row.nutrition) || undefined,
                tags: Array.isArray(parsedTags) ? parsedTags : [],
                // VAT Management Fields
                vatRate: row.vat_rate !== null ? parseFloat(row.vat_rate) : null, // Preserve 0 values, no default
                vatType: row.vat_type || 'simple',
                isVatExempt: Boolean(row.is_vat_exempt),
                vatNotes: row.vat_notes || null,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };

            // Load components for mixed items
            if (row.vat_type === 'mixed') {
                try {
                    const [componentRows] = await db.query<RowDataPacket[]>(
                        `SELECT 
                            id, component_name, component_cost, vat_rate, 
                            component_type, is_active, display_order
                        FROM item_components 
                        WHERE menu_item_id = ? 
                        ORDER BY display_order ASC`,
                        [row.id]
                    );
                    
                    const components = componentRows.map(comp => ({
                        id: comp.id,
                        componentName: comp.component_name,
                        componentCost: parseFloat(comp.component_cost),
                        vatRate: parseFloat(comp.vat_rate),
                        componentType: comp.component_type,
                        isActive: Boolean(comp.is_active),
                        displayOrder: comp.display_order || 0
                    }));
                    
                    // Attach components to menu item for mixed items
                    (menuItem as any).components = components;
                    
                    console.log(`🧩 Loaded ${components.length} components for mixed item: ${menuItem.name}`);
                } catch (error) {
                    console.error(`❌ Error loading components for item ${menuItem.name}:`, error);
                    (menuItem as any).components = [];
                }
            }

            return menuItem;
        }));
        
        console.log(`[API] getMenuItems returning ${menuItems.length} items for tenant ${tenantId}`);
        return menuItems;
    } catch (error) {
        console.error('Error fetching menu items:', error);
        throw new Error('Failed to fetch menu items');
    }
}

export async function getMenuItemById(tenantId: string, itemId: string): Promise<(MenuItem & { components?: any[] }) | null> {
    validateTenantId(tenantId);
    
    if (!itemId) {
        throw new Error('Item ID is required');
    }

    try {
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT 
                id, tenant_id, category_id, name, description, price, image_url, 
                image_hint, available, is_featured, is_set_menu, preparation_time,
                display_order, addons, characteristics, nutrition, set_menu_items, smart_set_menu_config, tags,
                vat_rate, vat_type, is_vat_exempt, vat_notes,
                created_at, updated_at
            FROM menu_items 
            WHERE tenant_id = ? AND id = ?`,
            [tenantId, itemId]
        );

        if (rows.length === 0) {
            return null;
        }

        const row = rows[0];
        const vatRateFromDb = row.vat_rate;
        const finalVatRate = vatRateFromDb !== null ? parseFloat(vatRateFromDb) : null;
        
        console.log('📖 Retrieved item from database:', {
            itemName: row.name,
            rawVatRate: vatRateFromDb,
            parsedVatRate: parseFloat(vatRateFromDb || '0'),
            finalVatRate: finalVatRate,
            isVatExempt: Boolean(row.is_vat_exempt),
            vatType: row.vat_type
        });

        // Load components for mixed items
        let components: any[] = [];
        if (row.vat_type === 'mixed') {
            console.log('🧩 Loading components for mixed item:', row.id);
            const [componentRows] = await db.query<RowDataPacket[]>(
                `SELECT 
                    id, component_name, component_cost, vat_rate, 
                    component_type, is_active, display_order
                FROM item_components 
                WHERE menu_item_id = ? 
                ORDER BY display_order ASC`,
                [row.id]
            );
            
            components = componentRows.map(comp => ({
                id: comp.id,
                componentName: comp.component_name,
                componentCost: parseFloat(comp.component_cost),
                vatRate: parseFloat(comp.vat_rate),
                componentType: comp.component_type,
                isActive: Boolean(comp.is_active),
                displayOrder: comp.display_order || 0
            }));
            
            console.log(`✅ Loaded ${components.length} components for mixed item`);
        }
        
        const menuItem = {
            id: row.id,
            tenantId: row.tenant_id,
            categoryId: row.category_id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            image: row.image_url, // Map image_url to image
            imageHint: row.image_hint,
            available: Boolean(row.available),
            isFeatured: Boolean(row.is_featured),
            preparationTime: row.preparation_time || 15,
            displayOrder: row.display_order || 0,
            addons: Array.isArray(parseJsonField(row.addons)) 
                ? parseJsonField(row.addons) as any[] 
                : [],
            characteristics: Array.isArray(parseJsonField(row.characteristics)) 
                ? parseJsonField(row.characteristics) as any[] 
                : [],
            nutrition: parseJsonField(row.nutrition) || undefined,
            tags: Array.isArray(parseJsonField(row.tags)) 
                ? parseJsonField(row.tags) as string[] 
                : [],
            // VAT Management Fields
            vatRate: finalVatRate, // Preserve 0 values
            vatType: row.vat_type || 'simple',
            isVatExempt: Boolean(row.is_vat_exempt),
            vatNotes: row.vat_notes || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

        // Add components to mixed items
        if (row.vat_type === 'mixed' && components.length > 0) {
            (menuItem as any).components = components;
        }

        return menuItem;
    } catch (error) {
        console.error('Error fetching menu item by ID:', error);
        throw new Error('Failed to fetch menu item');
    }
}

export async function createMenuItem(tenantId: string, itemData: CreateMenuItemRequest): Promise<MenuItem> {
    console.log('🔍 createMenuItem called with:', {
        tenantId,
        itemName: itemData.name,
        itemPrice: itemData.price,
        hasAddons: !!(itemData as any).addons,
        addonsCount: (itemData as any).addons?.length || 0
    });
    
    validateTenantId(tenantId);
    
    if (!itemData.name?.trim()) {
        console.error('❌ Validation failed: Missing name');
        throw new Error('Menu item name is required');
    }

    if (itemData.price === undefined || itemData.price < 0) {
        console.error('❌ Validation failed: Invalid price', itemData.price);
        throw new Error('Valid price is required');
    }

    if (!itemData.categoryId?.trim()) {
        console.error('❌ Validation failed: Missing or empty category ID', itemData.categoryId);
        throw new Error('Please select a category for the menu item');
    }

    const itemId = generateId();
    const now = new Date();
    
    console.log('📝 Inserting menu item:', {
        itemId,
        tenantId,
        name: itemData.name,
        price: itemData.price,
        vatRate: itemData.vatRate,
        finalVatRate: itemData.vatRate ?? null,
        vatType: itemData.vatType ?? 'simple',
        isVatExempt: itemData.isVatExempt ?? false
    });

    try {
        await db.execute(
            `INSERT INTO menu_items (
                id, tenant_id, category_id, name, description, price, image_url, 
                image_hint, available, is_featured, preparation_time,
                display_order, addons, characteristics, nutrition, tags,
                vat_rate, vat_type, is_vat_exempt, vat_notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                itemId,
                tenantId,
                itemData.categoryId || null,
                itemData.name.trim(),
                itemData.description?.trim() || null,
                itemData.price,
                itemData.image?.trim() || null, // Changed from imageUrl to image
                itemData.imageHint?.trim() || null,
                itemData.available !== false,
                itemData.isFeatured || false,
                itemData.preparationTime || 15,
                0, // display_order - default to 0
                JSON.stringify((itemData as any).addons || []), // addons - save the actual addons
                JSON.stringify(itemData.characteristics || []),
                JSON.stringify(itemData.nutrition || null),
                JSON.stringify(itemData.tags || []),
                itemData.vatRate, // Require explicit VAT rate - no defaults
                itemData.vatType || 'simple',
                itemData.isVatExempt, // Require explicit exempt status - no defaults
                itemData.vatNotes?.trim() || null,
                now,
                now
            ]
        );
        
        console.log('✅ Menu item inserted into database successfully');

        // Handle addons if present (legacy format conversion)
        if ((itemData as any).addons && Array.isArray((itemData as any).addons) && (itemData as any).addons.length > 0) {
            console.log('🔧 Processing addons:', (itemData as any).addons.length);
            const addonGroups = convertLegacyAddonsToGroups((itemData as any).addons);
            await saveAddonGroupsForMenuItem(tenantId, itemId, addonGroups);
            console.log('✅ Addons processed and saved');
        } else {
            console.log('⚠️  No addons to process');
        }

        // Handle dietary characteristics if present
        if (itemData.characteristics && Array.isArray(itemData.characteristics) && itemData.characteristics.length > 0) {
            console.log('🔧 Processing dietary characteristics:', itemData.characteristics.length);
            await saveDietaryCharacteristicsForMenuItem(tenantId, itemId, itemData.characteristics);
            console.log('✅ Dietary characteristics processed and saved');
        } else {
            console.log('⚠️  No dietary characteristics to process');
        }

        // Handle mixed item components if present
        if ((itemData as any).components && Array.isArray((itemData as any).components) && (itemData as any).components.length > 0) {
            console.log('🔧 Processing mixed item components:', (itemData as any).components.length);
            await saveComponentsForMenuItem(tenantId, itemId, (itemData as any).components);
            console.log('✅ Mixed item components processed and saved');
        } else {
            console.log('⚠️  No mixed item components to process');
        }

        console.log('📖 Retrieving created menu item...');
        const createdItem = await getMenuItemById(tenantId, itemId);
        if (!createdItem) {
            console.error('❌ Failed to retrieve created item');
            throw new Error('Failed to retrieve created menu item');
        }

        console.log('✅ Menu item creation completed:', createdItem.id);
        return createdItem;
    } catch (error) {
        console.error('Error creating menu item:', error);
        
        // Provide specific error messages for common issues
        if (error instanceof Error) {
            if (error.message.includes('Cannot add or update a child row') && error.message.includes('category_id')) {
                throw new Error('Invalid category selected. Please choose a valid category.');
            }
            if (error.message.includes('tenant_id')) {
                throw new Error('Invalid tenant configuration. Please contact support.');
            }
        }
        
        throw new Error('Failed to create menu item');
    }
}

export async function updateMenuItem(tenantId: string, itemData: UpdateMenuItemRequest): Promise<MenuItem> {
    validateTenantId(tenantId);
    
    if (!itemData.id) {
        throw new Error('Menu item ID is required');
    }

    // Check if item exists
    const existingItem = await getMenuItemById(tenantId, itemData.id);
    if (!existingItem) {
        throw new Error('Menu item not found');
    }

    try {
        const updates: string[] = [];
        const values: any[] = [];

        if (itemData.name !== undefined) {
            if (!itemData.name.trim()) {
                throw new Error('Menu item name cannot be empty');
            }
            updates.push('name = ?');
            values.push(itemData.name.trim());
        }

        if (itemData.description !== undefined) {
            updates.push('description = ?');
            values.push(itemData.description?.trim() || null);
        }

        if (itemData.price !== undefined) {
            if (itemData.price < 0) {
                throw new Error('Price cannot be negative');
            }
            updates.push('price = ?');
            values.push(itemData.price);
        }

        if (itemData.categoryId !== undefined) {
            updates.push('category_id = ?');
            values.push(itemData.categoryId || null);
        }

        if (itemData.image !== undefined) {
            updates.push('image_url = ?');
            values.push(itemData.image?.trim() || null);
        }

        if (itemData.imageHint !== undefined) {
            updates.push('image_hint = ?');
            values.push(itemData.imageHint?.trim() || null);
        }

        if (itemData.available !== undefined) {
            updates.push('available = ?');
            values.push(itemData.available);
        }

        if (itemData.isFeatured !== undefined) {
            updates.push('is_featured = ?');
            values.push(itemData.isFeatured);
        }

        if (itemData.preparationTime !== undefined) {
            updates.push('preparation_time = ?');
            values.push(itemData.preparationTime);
        }

        if (itemData.characteristics !== undefined) {
            updates.push('characteristics = ?');
            values.push(JSON.stringify(itemData.characteristics || []));
        }

        if (itemData.nutrition !== undefined) {
            updates.push('nutrition = ?');
            values.push(JSON.stringify(itemData.nutrition || null));
        }

        if (itemData.tags !== undefined) {
            updates.push('tags = ?');
            values.push(JSON.stringify(itemData.tags || []));
        }

        // Handle addons - save simple addons directly to the addons field
        if ((itemData as any).addons !== undefined) {
            updates.push('addons = ?');
            values.push(JSON.stringify((itemData as any).addons || []));
        }

        // VAT Management Fields Updates
        if (itemData.vatRate !== undefined) {
            console.log('🔄 Updating VAT Rate from', existingItem.vatRate, 'to', itemData.vatRate);
            updates.push('vat_rate = ?');
            values.push(itemData.vatRate);
        }

        if (itemData.vatType !== undefined) {
            console.log('🔄 Updating VAT Type from', existingItem.vatType, 'to', itemData.vatType);
            updates.push('vat_type = ?');
            values.push(itemData.vatType);
        }

        if (itemData.isVatExempt !== undefined) {
            console.log('🔄 Updating VAT Exempt from', existingItem.isVatExempt, 'to', itemData.isVatExempt);
            updates.push('is_vat_exempt = ?');
            values.push(itemData.isVatExempt);
        }

        if (itemData.vatNotes !== undefined) {
            updates.push('vat_notes = ?');
            values.push(itemData.vatNotes?.trim() || null);
        }

        if (updates.length === 0) {
            return existingItem;
        }

        updates.push('updated_at = ?');
        values.push(new Date());

        values.push(itemData.id);
        values.push(tenantId);

        await db.execute(
            `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
            values
        );

        // Handle addons if present (legacy format conversion)
        if ((itemData as any).addons && Array.isArray((itemData as any).addons) && (itemData as any).addons.length > 0) {
            try {
                console.log('Processing addons:', (itemData as any).addons);
                const addonGroups = convertLegacyAddonsToGroups((itemData as any).addons);
                console.log('Converted addon groups:', addonGroups);
                await saveAddonGroupsForMenuItem(tenantId, itemData.id, addonGroups);
                console.log('Successfully saved addon groups');
            } catch (addonError) {
                console.error('Error processing addons:', addonError);
                // Don't fail the entire operation, just log the error
                console.warn('Continuing without saving addons due to error');
            }
        }

        // Handle dietary characteristics if present
        if (itemData.characteristics && Array.isArray(itemData.characteristics)) {
            try {
                console.log('Processing dietary characteristics:', itemData.characteristics.length);
                await saveDietaryCharacteristicsForMenuItem(tenantId, itemData.id, itemData.characteristics);
                console.log('Successfully saved dietary characteristics');
            } catch (charError) {
                console.error('Error processing dietary characteristics:', charError);
                // Don't fail the entire operation, just log the error
                console.warn('Continuing without saving dietary characteristics due to error');
            }
        }

        // Handle mixed item components if present
        if ((itemData as any).components && Array.isArray((itemData as any).components)) {
            try {
                console.log('Processing mixed item components:', (itemData as any).components.length);
                await saveComponentsForMenuItem(tenantId, itemData.id, (itemData as any).components);
                console.log('Successfully saved mixed item components');
            } catch (compError) {
                console.error('Error processing mixed item components:', compError);
                // Don't fail the entire operation, just log the error
                console.warn('Continuing without saving mixed item components due to error');
            }
        }

        const updatedItem = await getMenuItemById(tenantId, itemData.id);
        if (!updatedItem) {
            throw new Error('Failed to retrieve updated menu item');
        }

        return updatedItem;
    } catch (error) {
        console.error('Error updating menu item:', error);
        throw new Error('Failed to update menu item');
    }
}

export async function deleteMenuItem(tenantId: string, itemId: string): Promise<void> {
    validateTenantId(tenantId);
    
    if (!itemId) {
        throw new Error('Menu item ID is required');
    }

    try {
        const [result] = await db.execute(
            'DELETE FROM menu_items WHERE id = ? AND tenant_id = ?',
            [itemId, tenantId]
        );

        if ((result as DatabaseResult).affectedRows === 0) {
            throw new Error('Menu item not found');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        throw new Error('Failed to delete menu item');
    }
}

// ==================== COMBINED OPERATIONS ====================

export async function getMenuWithCategories(tenantId: string): Promise<MenuWithCategories[]> {
    validateTenantId(tenantId);
    
    try {
        const [categories, menuItems] = await Promise.all([
            getCategories(tenantId),
            getMenuItems(tenantId)
        ]);

        return categories.map(category => ({
            category,
            items: menuItems.filter(item => item.categoryId === category.id)
        }));
    } catch (error) {
        console.error('Error fetching menu with categories:', error);
        throw new Error('Failed to fetch menu with categories');
    }
}

export async function getMenuStats(tenantId: string): Promise<MenuStats> {
    validateTenantId(tenantId);
    
    try {
        const [stats] = await db.query<RowDataPacket[]>(
            `SELECT 
                (SELECT COUNT(*) FROM categories WHERE tenant_id = ?) as total_categories,
                (SELECT COUNT(*) FROM menu_items WHERE tenant_id = ?) as total_menu_items,
                (SELECT COUNT(*) FROM categories WHERE tenant_id = ? AND active = true) as active_categories,
                (SELECT COUNT(*) FROM menu_items WHERE tenant_id = ? AND available = true) as active_menu_items,
                (SELECT COUNT(*) FROM menu_items WHERE tenant_id = ? AND is_featured = true) as featured_items`,
            [tenantId, tenantId, tenantId, tenantId, tenantId]
        );

        const row = stats[0];
        return {
            totalCategories: row.total_categories || 0,
            totalMenuItems: row.total_menu_items || 0,
            totalAddonGroups: 0,
            totalAddonOptions: 0,
            activeCategories: row.active_categories || 0,
            activeMenuItems: row.active_menu_items || 0,
            featuredItems: row.featured_items || 0,
            totalMealDeals: 0,
            activeMealDeals: 0
        };
    } catch (error) {
        console.error('Error fetching menu stats:', error);
        throw new Error('Failed to fetch menu stats');
    }
}

// ==================== ADDON CONVERSION UTILITIES ====================

interface LegacyAddon {
    id: string;
    name: string;
    price?: number; // Optional for frontend format
    type?: string;
    required?: boolean;
    multiple?: boolean;
    maxSelections?: number;
    // Frontend-specific fields
    tenantId?: string;
    description?: string;
    displayOrder?: number;
    active?: boolean;
    options?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface ModernAddonGroup {
    id: string;
    name: string;
    type: 'single' | 'multiple';
    category: 'size' | 'extra' | 'sauce' | 'sides' | 'drink' | 'dessert';
    required: boolean;
    minSelections: number;
    maxSelections: number;
    options: {
        id: string;
        name: string;
        price: number;
        available: boolean;
    }[];
}

/**
 * Convert legacy addon format to modern addon groups
 */
function convertLegacyAddonsToGroups(legacyAddons: LegacyAddon[]): ModernAddonGroup[] {
    if (!legacyAddons || legacyAddons.length === 0) {
        return [];
    }

    // Group addons by type
    const groupedByType = legacyAddons.reduce((acc, addon) => {
        const type = addon.type || 'extra';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(addon);
        return acc;
    }, {} as Record<string, LegacyAddon[]>);

    return Object.entries(groupedByType).map(([type, addons], index) => {
        const firstAddon = addons[0];
        // Determine if multiple selections are allowed
        // Frontend format: maxSelections > 1 or type = 'multiple' 
        // Legacy format: multiple = true
        const isMultiple = firstAddon.multiple === true || 
                          (firstAddon.maxSelections && firstAddon.maxSelections > 1) ||
                          firstAddon.type === 'multiple';
        
        return {
            id: `converted_group_${Date.now()}_${index}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Options`,
            type: isMultiple ? 'multiple' : 'single',
            category: (type as any) || 'extra',
            required: firstAddon.required || false,
            minSelections: firstAddon.required ? 1 : 0,
            maxSelections: isMultiple ? (firstAddon.maxSelections || 5) : 1,
            options: addons.map(addon => ({
                id: addon.id,
                name: addon.name,
                price: addon.price || 0, // Default to 0 if price is not provided
                available: true
            }))
        };
    });
}

/**
 * Save addon groups for a menu item
 */
async function saveAddonGroupsForMenuItem(tenantId: string, menuItemId: string, addonGroups: ModernAddonGroup[]): Promise<void> {
    try {
        // Clear existing addon groups for this menu item
        await db.execute(
            'DELETE FROM menu_item_addons WHERE menu_item_id = ?',
            [menuItemId]
        );

        // Save each addon group
        for (const group of addonGroups) {
            // Insert the group using the correct table name 'addons'
            await db.execute(
                `INSERT INTO addons (
                    id, tenant_id, name, type, required, max_selections, display_order, active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    type = VALUES(type),
                    required = VALUES(required),
                    max_selections = VALUES(max_selections),
                    updated_at = NOW()`,
                [
                    group.id,
                    tenantId,
                    group.name,
                    group.type === 'multiple' ? 'multiple' : 'single',
                    group.required,
                    group.maxSelections,
                    0,
                    true
                ]
            );

            // Create the relationship in junction table using correct table name 'menu_item_addons'
            // Use INSERT IGNORE to avoid duplicate key errors or handle the unique constraint
            await db.execute(
                `INSERT INTO menu_item_addons (
                    id, menu_item_id, addon_id, created_at
                ) VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    created_at = VALUES(created_at)`,
                [
                    generateId(),
                    menuItemId,
                    group.id
                ]
            );

            // Insert the options for this group
            for (let i = 0; i < group.options.length; i++) {
                const option = group.options[i];
                await db.execute(
                    `INSERT INTO addon_options (
                        id, addon_id, name, price, available, display_order, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        price = VALUES(price),
                        available = VALUES(available),
                        display_order = VALUES(display_order),
                        updated_at = NOW()`,
                    [
                        option.id,
                        group.id,
                        option.name,
                        option.price,
                        option.available,
                        i
                    ]
                );
            }
        }
    } catch (error) {
        console.error('Error saving addon groups:', error);
        throw new Error('Failed to save addon groups');
    }
}

// ==================== REORDER OPERATIONS ====================

export async function reorderCategories(tenantId: string, categoryIds: string[]): Promise<void> {
    validateTenantId(tenantId);
    
    if (!categoryIds || !Array.isArray(categoryIds)) {
        throw new Error('Category IDs array is required');
    }

    try {
        // Update display order for each category
        const updatePromises = categoryIds.map((categoryId, index) => 
            db.execute(
                `UPDATE categories SET display_order = ?, updated_at = NOW() 
                 WHERE tenant_id = ? AND id = ?`,
                [index, tenantId, categoryId]
            )
        );

        await Promise.all(updatePromises);
        console.log(`Successfully reordered ${categoryIds.length} categories for tenant ${tenantId}`);
    } catch (error) {
        console.error('Error reordering categories:', error);
        throw new Error('Failed to reorder categories');
    }
}

export async function reorderMenuItems(tenantId: string, itemIds: string[], categoryId?: string): Promise<void> {
    validateTenantId(tenantId);
    
    if (!itemIds || !Array.isArray(itemIds)) {
        throw new Error('Item IDs array is required');
    }

    try {
        // Update display order for each menu item
        const updatePromises = itemIds.map((itemId, index) => {
            let query = `UPDATE menu_items SET display_order = ?, updated_at = NOW() 
                         WHERE tenant_id = ? AND id = ?`;
            let params = [index, tenantId, itemId];

            // If categoryId is provided, filter by category as well
            if (categoryId) {
                query += ` AND category_id = ?`;
                params.push(categoryId);
            }

            return db.execute(query, params);
        });

        await Promise.all(updatePromises);
        console.log(`Successfully reordered ${itemIds.length} menu items for tenant ${tenantId}`, 
                   categoryId ? `in category ${categoryId}` : '');
    } catch (error) {
        console.error('Error reordering menu items:', error);
        throw new Error('Failed to reorder menu items');
    }
}
