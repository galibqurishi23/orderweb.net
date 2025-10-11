// Smart Meal Deals Service Layer
// Comprehensive CRUD operations and validation for dynamic meal deals

import db from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { RowDataPacket, OkPacket } from 'mysql2'
import { 
    MealDeal, 
    MealDealCategory, 
    CreateMealDealRequest, 
    UpdateMealDealRequest,
    MealDealSelection,
    ValidationResult
} from '@/lib/menu-types'

/**
 * Utility functions
 */
function validateTenantId(tenantId: string): void {
    if (!tenantId?.trim()) {
        throw new Error('Tenant ID is required')
    }
}

function generateMealDealId(): string {
    return `meal-${uuidv4()}`
}

/**
 * Get all meal deals for a tenant
 */
export async function getMealDeals(tenantId: string): Promise<MealDeal[]> {
    validateTenantId(tenantId)

    try {
        const [rows] = await db.execute(`
            SELECT * FROM meal_deals 
            WHERE tenant_id = ? 
            ORDER BY display_order ASC, created_at DESC
        `, [tenantId]) as [RowDataPacket[], any]

        return rows.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || '',
            price: parseFloat(row.price),
            image: row.image || '',
            categories: JSON.parse(row.categories) as MealDealCategory[],
            active: Boolean(row.active),
            displayOrder: row.display_order || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }))
    } catch (error) {
        console.error('Error fetching meal deals:', error)
        throw new Error('Failed to fetch meal deals')
    }
}

/**
 * Get a single meal deal by ID
 */
export async function getMealDealById(tenantId: string, dealId: string): Promise<MealDeal | null> {
    validateTenantId(tenantId)

    if (!dealId?.trim()) {
        throw new Error('Deal ID is required')
    }

    try {
        const [rows] = await db.execute(`
            SELECT * FROM meal_deals 
            WHERE id = ? AND tenant_id = ?
        `, [dealId, tenantId]) as [RowDataPacket[], any]

        if (rows.length === 0) {
            return null
        }

        const row = rows[0]
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || '',
            price: parseFloat(row.price),
            image: row.image || '',
            categories: JSON.parse(row.categories) as MealDealCategory[],
            active: Boolean(row.active),
            displayOrder: row.display_order || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    } catch (error) {
        console.error('Error fetching meal deal:', error)
        throw new Error('Failed to fetch meal deal')
    }
}

/**
 * Create a new meal deal
 */
export async function createMealDeal(tenantId: string, dealData: CreateMealDealRequest): Promise<MealDeal> {
    validateTenantId(tenantId)
    
    // Validate deal data
    if (!dealData.name?.trim()) {
        throw new Error('Deal name is required')
    }
    
    if (!dealData.price || dealData.price <= 0) {
        throw new Error('Valid deal price is required')
    }

    if (!dealData.categories || dealData.categories.length === 0) {
        throw new Error('At least one category is required')
    }

    // Validate categories
    for (const category of dealData.categories) {
        if (!category.name?.trim()) {
            throw new Error('All categories must have a name')
        }
        
        if (category.minSelections < 0) {
            throw new Error('Minimum selections cannot be negative')
        }
        
        if (category.maxSelections < category.minSelections) {
            throw new Error('Maximum selections must be greater than or equal to minimum selections')
        }
    }

    const dealId = generateMealDealId()
    const now = new Date()

    // Process categories with IDs
    const processedCategories = dealData.categories.map((category, index) => {
        const categoryId = `cat-${dealId}-${index + 1}`
        return {
            id: categoryId,
            name: category.name.trim(),
            selectionType: category.selectionType || 'optional',
            minSelections: category.minSelections || 0,
            maxSelections: category.maxSelections || 1,
            menuItemIds: category.menuItemIds || []
        }
    })

    try {
        await db.execute(`
            INSERT INTO meal_deals (
                id, tenant_id, name, description, price, image, categories, 
                active, display_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            dealId,
            tenantId,
            dealData.name.trim(),
            dealData.description?.trim() || null,
            dealData.price,
            dealData.image?.trim() || null,
            JSON.stringify(processedCategories),
            dealData.active !== false,
            dealData.displayOrder || 0,
            now,
            now
        ])

        console.log(`✅ Meal deal created successfully: ${dealId}`)

        // Return the created deal
        const createdDeal = await getMealDealById(tenantId, dealId)
        if (!createdDeal) {
            throw new Error('Failed to retrieve created meal deal')
        }

        return createdDeal
    } catch (error: any) {
        console.error('Error creating meal deal:', error)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new Error('Invalid tenant ID')
        }
        throw new Error('Failed to create meal deal')
    }
}

/**
 * Update an existing meal deal
 */
export async function updateMealDeal(tenantId: string, dealData: UpdateMealDealRequest): Promise<MealDeal> {
    validateTenantId(tenantId)
    
    if (!dealData.id) {
        throw new Error('Deal ID is required for update')
    }

    // Check if deal exists
    const existingDeal = await getMealDealById(tenantId, dealData.id)
    if (!existingDeal) {
        throw new Error('Meal deal not found')
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (dealData.name !== undefined) {
        if (!dealData.name.trim()) {
            throw new Error('Deal name cannot be empty')
        }
        updates.push('name = ?')
        values.push(dealData.name.trim())
    }

    if (dealData.description !== undefined) {
        updates.push('description = ?')
        values.push(dealData.description?.trim() || null)
    }

    if (dealData.price !== undefined) {
        if (dealData.price <= 0) {
            throw new Error('Price must be greater than 0')
        }
        updates.push('price = ?')
        values.push(dealData.price)
    }

    if (dealData.image !== undefined) {
        updates.push('image = ?')
        values.push(dealData.image?.trim() || null)
    }

    if (dealData.categories !== undefined) {
        if (dealData.categories.length === 0) {
            throw new Error('At least one category is required')
        }

        // Process categories with IDs
        const processedCategories = dealData.categories.map((category, index) => {
            // Generate new ID for categories without one
            const categoryId = `cat-${dealData.id}-${index + 1}`
            return {
                id: categoryId,
                name: category.name.trim(),
                selectionType: category.selectionType || 'optional',
                minSelections: category.minSelections || 0,
                maxSelections: category.maxSelections || 1,
                menuItemIds: category.menuItemIds || []
            }
        })

        updates.push('categories = ?')
        values.push(JSON.stringify(processedCategories))
    }

    if (dealData.active !== undefined) {
        updates.push('active = ?')
        values.push(dealData.active)
    }

    if (dealData.displayOrder !== undefined) {
        updates.push('display_order = ?')
        values.push(dealData.displayOrder)
    }

    if (updates.length === 0) {
        throw new Error('No fields to update')
    }

    updates.push('updated_at = ?')
    values.push(new Date())

    // Add WHERE clause parameters
    values.push(dealData.id, tenantId)

    try {
        const [result] = await db.execute(`
            UPDATE meal_deals 
            SET ${updates.join(', ')} 
            WHERE id = ? AND tenant_id = ?
        `, values) as [OkPacket, any]

        if (result.affectedRows === 0) {
            throw new Error('Meal deal not found or no changes made')
        }

        console.log(`✅ Meal deal updated successfully: ${dealData.id}`)

        // Return the updated deal
        const updatedDeal = await getMealDealById(tenantId, dealData.id)
        if (!updatedDeal) {
            throw new Error('Failed to retrieve updated meal deal')
        }

        return updatedDeal
    } catch (error) {
        console.error('Error updating meal deal:', error)
        throw new Error('Failed to update meal deal')
    }
}

/**
 * Delete a meal deal
 */
export async function deleteMealDeal(tenantId: string, dealId: string): Promise<void> {
    validateTenantId(tenantId)

    if (!dealId?.trim()) {
        throw new Error('Deal ID is required')
    }

    try {
        const [result] = await db.execute(`
            DELETE FROM meal_deals 
            WHERE id = ? AND tenant_id = ?
        `, [dealId, tenantId]) as [OkPacket, any]

        if (result.affectedRows === 0) {
            throw new Error('Meal deal not found')
        }

        console.log(`✅ Meal deal deleted successfully: ${dealId}`)
    } catch (error) {
        console.error('Error deleting meal deal:', error)
        throw new Error('Failed to delete meal deal')
    }
}

/**
 * Validate customer's meal deal selection
 */
export async function validateMealDealSelection(
    tenantId: string, 
    dealId: string, 
    selections: MealDealSelection[]
): Promise<ValidationResult> {
    const deal = await getMealDealById(tenantId, dealId)
    if (!deal) {
        return {
            isValid: false,
            errors: ['Meal deal not found']
        }
    }

    if (!deal.active) {
        return {
            isValid: false,
            errors: ['Meal deal is not currently available']
        }
    }

    const errors: string[] = []

    // Validate each category
    for (const category of deal.categories) {
        const categorySelections = selections.filter(s => s.categoryId === category.id)

        // Check selection type requirements
        if (category.selectionType === 'required') {
            if (categorySelections.length < category.minSelections) {
                errors.push(`${category.name}: Must select at least ${category.minSelections} item(s)`)
                continue
            }
        }

        // Check selection count limits
        if (categorySelections.length < category.minSelections) {
            errors.push(`${category.name}: Must select at least ${category.minSelections} item(s)`)
        }

        if (categorySelections.length > category.maxSelections) {
            errors.push(`${category.name}: Can select at most ${category.maxSelections} item(s)`)
        }

        // Check if selected items are allowed in this category
        for (const selection of categorySelections) {
            if (!category.menuItemIds.includes(selection.itemId)) {
                errors.push(`${category.name}: Selected item is not available in this category`)
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    }
}

/**
 * Get active meal deals for customer display
 */
export async function getActiveMealDeals(tenantId: string): Promise<MealDeal[]> {
    validateTenantId(tenantId)

    try {
        const [rows] = await db.execute(`
            SELECT * FROM meal_deals 
            WHERE tenant_id = ? AND active = true 
            ORDER BY display_order ASC, created_at DESC
        `, [tenantId]) as [RowDataPacket[], any]

        return rows.map((row: any) => ({
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description || '',
            price: parseFloat(row.price),
            image: row.image || '',
            categories: JSON.parse(row.categories) as MealDealCategory[],
            active: Boolean(row.active),
            displayOrder: row.display_order || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }))
    } catch (error) {
        console.error('Error fetching active meal deals:', error)
        throw new Error('Failed to fetch active meal deals')
    }
}
