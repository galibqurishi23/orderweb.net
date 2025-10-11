'use server';

import db from './db';
import { RowDataPacket } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import {
  AddonGroup,
  AddonOption,
  CreateAddonGroupRequest,
  UpdateAddonGroupRequest,
  CreateAddonOptionRequest,
  UpdateAddonOptionRequest,
  AssignAddonGroupRequest,
  AddonStats,
  AddonValidationResult,
  SelectedAddon,
  AddonCalculationResult,
  AddonPricingConfig
} from './addon-types';
import { DatabaseResult } from './menu-types';

// ==================== UTILITY FUNCTIONS ====================

function parseJsonField<T>(field: any): T | null {
  if (field === null || field === undefined) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  }
  return field;
}

function validateTenantId(tenantId: string): void {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('Valid tenant ID is required');
  }
}

function generateId(): string {
  return uuidv4();
}

function validateAddonGroup(data: CreateAddonGroupRequest | UpdateAddonGroupRequest): string[] {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('Addon group name is required');
  }
  
  if (data.type && !['single', 'multiple'].includes(data.type)) {
    errors.push('Addon type must be either "single" or "multiple"');
  }
  
  if (data.minSelections !== undefined && data.minSelections < 0) {
    errors.push('Minimum selections cannot be negative');
  }
  
  if (data.maxSelections !== undefined && data.maxSelections < 1) {
    errors.push('Maximum selections must be at least 1');
  }
  
  if (data.minSelections !== undefined && data.maxSelections !== undefined && 
      data.minSelections > data.maxSelections) {
    errors.push('Minimum selections cannot exceed maximum selections');
  }
  
  if (data.type === 'single' && data.maxSelections !== undefined && data.maxSelections > 1) {
    errors.push('Single-choice addon groups cannot have more than 1 maximum selection');
  }
  
  return errors;
}

function validateAddonOption(data: CreateAddonOptionRequest | UpdateAddonOptionRequest): string[] {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('Addon option name is required');
  }
  
  if (data.price !== undefined && data.price < 0) {
    errors.push('Addon option price cannot be negative');
  }
  
  return errors;
}

// ==================== ADDON GROUP OPERATIONS ====================

export async function getAllAddonGroupsForTenant(tenantId: string, includeOptions: boolean = true): Promise<AddonGroup[]> {
  validateTenantId(tenantId);
  
  try {
    // Check if addon_groups table exists
    const [tables] = await db.query<RowDataPacket[]>(
      'SHOW TABLES LIKE ?',
      ['addon_groups']
    );
    
    if (tables.length === 0) {
      console.log('addon_groups table does not exist, returning empty array');
      return [];
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM addon_groups WHERE tenant_id = ? ORDER BY name ASC`,
      [tenantId]
    );

    const addonGroups: AddonGroup[] = [];

    for (const row of rows) {
      let options: AddonOption[] = [];
      
      if (includeOptions) {
        try {
          options = await getAddonOptionsByGroupId(row.id);
        } catch (error) {
          console.warn(`Error fetching options for addon group ${row.id}:`, error);
          options = [];
        }
      }

      addonGroups.push({
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description,
        category: row.category || 'custom',
        type: row.multiple_select === 1 ? 'multiple' : 'single',
        required: row.required === 1,
        minSelections: row.min_selections || 0,
        maxSelections: row.max_selections || (row.multiple_select === 1 ? 999 : 1),
        displayOrder: row.display_order || 0,
        active: row.active === 1,
        conditionalVisibility: undefined, // Not in the DB
        displayStyle: 'list', // Default since not in the DB
        allowCustomInput: false, // Default since not in the DB
        options,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    }

    return addonGroups;
  } catch (error) {
    console.error('Error fetching addon groups:', error);
    return [];
  }
}

export async function getAddonGroupById(tenantId: string, groupId: string): Promise<AddonGroup | null> {
  validateTenantId(tenantId);
  
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        ag.id, ag.tenant_id, ag.name, ag.description, ag.type,
        ag.required, ag.multiple, ag.max_selections, ag.display_order,
        ag.active, ag.created_at, ag.updated_at
      FROM addon_groups ag
      WHERE ag.tenant_id = ? AND ag.id = ?`,
      [tenantId, groupId]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    const options = await getAddonOptionsByGroupId(row.id);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      category: 'extras', // Default since not in DB
      type: row.type === 'radio' ? 'single' : 'multiple',
      required: Boolean(row.required),
      minSelections: 0, // Default since not in DB
      maxSelections: row.max_selections || 1,
      displayOrder: row.display_order || 0,
      active: Boolean(row.active),
      conditionalVisibility: undefined, // Not in DB
      displayStyle: 'list', // Default since not in DB
      allowCustomInput: false, // Default since not in DB
      options,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error fetching addon group by ID:', error);
    throw new Error('Failed to fetch addon group');
  }
}

export async function createAddonGroup(tenantId: string, data: CreateAddonGroupRequest): Promise<AddonGroup> {
  validateTenantId(tenantId);
  
  const validationErrors = validateAddonGroup(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  const groupId = generateId();
  const now = new Date();

  try {
    // Insert addon group - using the actual database schema
    await db.execute(
      `INSERT INTO addon_groups (
        id, tenant_id, name, description, type, required,
        multiple, max_selections, display_order, active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        tenantId,
        data.name.trim(),
        data.description?.trim() || null,
        data.type === 'single' ? 'radio' : 'checkbox',
        data.required || false,
        data.type === 'multiple' || (data.maxSelections && data.maxSelections > 1) ? true : false,
        data.maxSelections || (data.type === 'single' ? 1 : 10),
        data.displayOrder || 0,
        data.active !== false,
        now,
        now
      ]
    );

    // Insert addon options
    for (const optionData of data.options || []) {
      await createAddonOption(tenantId, {
        addonGroupId: groupId,
        ...optionData
      });
    }

    const createdGroup = await getAddonGroupById(tenantId, groupId);
    if (!createdGroup) {
      throw new Error('Failed to retrieve created addon group');
    }

    return createdGroup;
  } catch (error) {
    console.error('Error creating addon group:', error);
    throw new Error('Failed to create addon group');
  }
}

export async function updateAddonGroup(tenantId: string, data: UpdateAddonGroupRequest): Promise<AddonGroup> {
  validateTenantId(tenantId);
  
  const validationErrors = validateAddonGroup(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  const existingGroup = await getAddonGroupById(tenantId, data.id);
  if (!existingGroup) {
    throw new Error('Addon group not found');
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name.trim());
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description?.trim() || null);
    }

    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }

    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }

    if (data.required !== undefined) {
      updates.push('required = ?');
      values.push(data.required);
    }

    if (data.minSelections !== undefined) {
      updates.push('min_selections = ?');
      values.push(data.minSelections);
    }

    if (data.maxSelections !== undefined) {
      updates.push('max_selections = ?');
      values.push(data.maxSelections);
    }

    if (data.displayOrder !== undefined) {
      updates.push('display_order = ?');
      values.push(data.displayOrder);
    }

    if (data.active !== undefined) {
      updates.push('active = ?');
      values.push(data.active);
    }

    if (data.conditionalVisibility !== undefined) {
      updates.push('conditional_visibility = ?');
      values.push(JSON.stringify(data.conditionalVisibility));
    }

    if (data.displayStyle !== undefined) {
      updates.push('display_style = ?');
      values.push(data.displayStyle);
    }

    if (data.allowCustomInput !== undefined) {
      updates.push('allow_custom_input = ?');
      values.push(data.allowCustomInput);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date());

      values.push(data.id);
      values.push(tenantId);

      await db.execute(
        `UPDATE addon_groups SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
        values
      );
    }

    const updatedGroup = await getAddonGroupById(tenantId, data.id);
    if (!updatedGroup) {
      throw new Error('Failed to retrieve updated addon group');
    }

    return updatedGroup;
  } catch (error) {
    console.error('Error updating addon group:', error);
    throw new Error('Failed to update addon group');
  }
}

export async function deleteAddonGroup(tenantId: string, groupId: string): Promise<void> {
  validateTenantId(tenantId);

  try {
    // Delete addon options first
    await db.execute(
      'DELETE FROM addon_options WHERE addon_group_id = ?',
      [groupId]
    );

    // Delete group-menu item associations
    await db.execute(
      'DELETE FROM menu_item_addon_groups WHERE addon_group_id = ?',
      [groupId]
    );

    // Delete the addon group
    const [result] = await db.execute(
      'DELETE FROM addon_groups WHERE id = ? AND tenant_id = ?',
      [groupId, tenantId]
    );

    if ((result as DatabaseResult).affectedRows === 0) {
      throw new Error('Addon group not found');
    }
  } catch (error) {
    console.error('Error deleting addon group:', error);
    throw new Error('Failed to delete addon group');
  }
}

// ==================== ADDON OPTION OPERATIONS ====================

export async function getAddonOptionsByGroupId(groupId: string): Promise<AddonOption[]> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        id, addon_group_id, name, price, available, display_order, created_at, updated_at
      FROM addon_options
      WHERE addon_group_id = ?
      ORDER BY display_order ASC, name ASC`,
      [groupId]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      available: Boolean(row.available),
      description: undefined, // Not in DB
      imageUrl: undefined, // Not in DB
      nutritionInfo: undefined, // Not in DB
      quantityPricing: undefined // Not in DB
    }));
  } catch (error) {
    console.error('Error fetching addon options:', error);
    throw new Error('Failed to fetch addon options');
  }
}

export async function createAddonOption(tenantId: string, data: CreateAddonOptionRequest): Promise<AddonOption> {
  validateTenantId(tenantId);
  
  const validationErrors = validateAddonOption(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  const optionId = generateId();
  const now = new Date();

  try {
    await db.execute(
      `INSERT INTO addon_options (
        id, addon_group_id, name, price, available, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        optionId,
        data.addonGroupId,
        data.name.trim(),
        data.price,
        data.available !== false,
        0, // default display order
        now,
        now
      ]
    );

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        id, addon_group_id, name, price, available, display_order, created_at, updated_at
      FROM addon_options
      WHERE id = ?`,
      [optionId]
    );

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      available: Boolean(row.available),
      description: undefined, // Not in DB
      imageUrl: undefined, // Not in DB
      nutritionInfo: undefined, // Not in DB
      quantityPricing: undefined // Not in DB
    };
  } catch (error) {
    console.error('Error creating addon option:', error);
    throw new Error('Failed to create addon option');
  }
}

export async function updateAddonOption(tenantId: string, data: UpdateAddonOptionRequest): Promise<AddonOption> {
  validateTenantId(tenantId);
  
  const validationErrors = validateAddonOption(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name.trim());
    }

    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }

    if (data.available !== undefined) {
      updates.push('available = ?');
      values.push(data.available);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description?.trim() || null);
    }

    if (data.imageUrl !== undefined) {
      updates.push('image_url = ?');
      values.push(data.imageUrl?.trim() || null);
    }

    if (data.nutritionInfo !== undefined) {
      updates.push('nutrition_info = ?');
      values.push(JSON.stringify(data.nutritionInfo));
    }

    if (data.quantityPricing !== undefined) {
      updates.push('quantity_pricing = ?');
      values.push(JSON.stringify(data.quantityPricing));
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(new Date());

      values.push(data.id);

      await db.execute(
        `UPDATE addon_options SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        id, addon_group_id, name, price, available, description,
        image_url, nutrition_info, quantity_pricing, created_at, updated_at
      FROM addon_options
      WHERE id = ?`,
      [data.id]
    );

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      available: Boolean(row.available),
      description: row.description,
      imageUrl: row.image_url,
      nutritionInfo: parseJsonField(row.nutrition_info) || undefined,
      quantityPricing: parseJsonField(row.quantity_pricing) || undefined
    };
  } catch (error) {
    console.error('Error updating addon option:', error);
    throw new Error('Failed to update addon option');
  }
}

export async function deleteAddonOption(tenantId: string, optionId: string): Promise<void> {
  validateTenantId(tenantId);

  try {
    const [result] = await db.execute(
      'DELETE FROM addon_options WHERE id = ?',
      [optionId]
    );

    if ((result as DatabaseResult).affectedRows === 0) {
      throw new Error('Addon option not found');
    }
  } catch (error) {
    console.error('Error deleting addon option:', error);
    throw new Error('Failed to delete addon option');
  }
}

// ==================== MENU ITEM ADDON ASSOCIATIONS ====================

export async function getMenuItemAddonGroups(tenantId: string, menuItemId: string): Promise<AddonGroup[]> {
  validateTenantId(tenantId);

  try {
    let addonGroups: AddonGroup[] = [];

    // First, try to get addon groups from the formal addon system
    const [tables] = await db.query<RowDataPacket[]>(
      `SHOW TABLES LIKE 'menu_item_addon_groups'`
    );

    if (tables.length > 0) {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT ag.id
        FROM addon_groups ag
        INNER JOIN menu_item_addon_groups miag ON ag.id = miag.addon_group_id
        WHERE miag.menu_item_id = ? AND ag.tenant_id = ? AND ag.active = 1
        ORDER BY ag.display_order ASC, ag.name ASC`,
        [menuItemId, tenantId]
      );

      for (const row of rows) {
        try {
          const group = await getAddonGroupById(tenantId, row.id);
          if (group) {
            addonGroups.push(group);
          }
        } catch (groupError) {
          console.error(`Error fetching addon group ${row.id}:`, groupError);
          continue;
        }
      }
    }

    // If no formal addon groups found, check for simple addons in menu_items table
    if (addonGroups.length === 0) {
      const [menuRows] = await db.query<RowDataPacket[]>(
        'SELECT addons FROM menu_items WHERE id = ? AND tenant_id = ?',
        [menuItemId, tenantId]
      );

      if (menuRows.length > 0 && menuRows[0].addons) {
        let simpleAddons: any[] = [];
        
        try {
          simpleAddons = JSON.parse(menuRows[0].addons);
        } catch (parseError) {
          console.error('Error parsing simple addons:', parseError);
        }

        // Convert simple addons to addon groups format
        if (simpleAddons && simpleAddons.length > 0) {
          const simpleAddonGroup: AddonGroup = {
            id: `simple_addons_${menuItemId}`,
            tenantId: tenantId,
            name: 'Add-ons',
            description: 'Optional add-ons for your item',
            category: 'extras',
            type: 'multiple',
            required: false,
            minSelections: 0,
            maxSelections: simpleAddons.length, // Allow all to be selected
            displayOrder: 0,
            active: true,
            options: simpleAddons.map((addon, index) => ({
              id: addon.id || `simple_${index}`,
              addonGroupId: `simple_addons_${menuItemId}`,
              name: addon.name || `Add-on ${index + 1}`,
              description: undefined,
              price: parseFloat(addon.price) || 0,
              available: true,
              displayOrder: index,
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          addonGroups.push(simpleAddonGroup);
        }
      }
    }

    return addonGroups;
  } catch (error) {
    console.error('Error getting menu item addon groups:', error);
    return [];
  }
}

export async function assignAddonGroupsToMenuItem(tenantId: string, data: AssignAddonGroupRequest): Promise<void> {
  validateTenantId(tenantId);

  try {
    // Remove existing associations
    await db.execute(
      'DELETE FROM menu_item_addon_groups WHERE menu_item_id = ?',
      [data.menuItemId]
    );

    // Add new associations
    for (const groupId of data.addonGroupIds) {
      await db.execute(
        'INSERT INTO menu_item_addon_groups (menu_item_id, addon_group_id) VALUES (?, ?)',
        [data.menuItemId, groupId]
      );
    }
  } catch (error) {
    console.error('Error assigning addon groups to menu item:', error);
    throw new Error('Failed to assign addon groups to menu item');
  }
}

// ==================== VALIDATION AND CALCULATIONS ====================

export async function validateAddonSelection(
  tenantId: string,
  menuItemId: string,
  selectedAddons: SelectedAddon[]
): Promise<AddonValidationResult> {
  const addonGroups = await getMenuItemAddonGroups(tenantId, menuItemId);
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const group of addonGroups) {
    const selectedGroup = selectedAddons.find(sa => sa.groupId === group.id);
    const selectedCount = selectedGroup ? selectedGroup.options.reduce((sum, opt) => sum + opt.quantity, 0) : 0;

    // Check required groups
    if (group.required && selectedCount === 0) {
      errors.push(`${group.name} is required`);
    }

    // Check minimum selections
    if (selectedCount > 0 && selectedCount < group.minSelections) {
      errors.push(`${group.name} requires at least ${group.minSelections} selection(s)`);
    }

    // Check maximum selections
    if (selectedCount > group.maxSelections) {
      errors.push(`${group.name} allows maximum ${group.maxSelections} selection(s)`);
    }

    // Check single vs multiple type
    if (group.type === 'single' && selectedGroup && selectedGroup.options.length > 1) {
      errors.push(`${group.name} allows only one selection`);
    }

    // Validate option availability
    if (selectedGroup) {
      for (const selectedOption of selectedGroup.options) {
        const option = group.options.find(opt => opt.id === selectedOption.optionId);
        if (!option) {
          errors.push(`Invalid option selected in ${group.name}`);
        } else if (!option.available) {
          errors.push(`${option.name} is currently unavailable`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export async function calculateAddonPrice(
  selectedAddons: SelectedAddon[],
  config?: AddonPricingConfig
): Promise<AddonCalculationResult> {
  let subtotal = 0;
  const breakdown: AddonCalculationResult['breakdown'] = [];

  for (const selectedGroup of selectedAddons) {
    let groupTotal = 0;
    const groupBreakdown: AddonCalculationResult['breakdown'][0] = {
      groupId: selectedGroup.groupId,
      groupName: selectedGroup.groupName,
      options: [],
      groupTotal: 0
    };

    for (const selectedOption of selectedGroup.options) {
      let unitPrice = selectedOption.totalPrice / selectedOption.quantity;
      let totalPrice = selectedOption.totalPrice;

      groupBreakdown.options.push({
        optionId: selectedOption.optionId,
        optionName: '', // Would need to fetch from database
        quantity: selectedOption.quantity,
        unitPrice,
        totalPrice
      });

      groupTotal += totalPrice;
    }

    groupBreakdown.groupTotal = groupTotal;
    breakdown.push(groupBreakdown);
    subtotal += groupTotal;
  }

  // Apply bulk discounts if configured
  let discounts = 0;
  if (config?.bulkDiscounts) {
    const totalOptions = selectedAddons.reduce((sum, group) => 
      sum + group.options.reduce((optSum, opt) => optSum + opt.quantity, 0), 0);
    
    for (const discount of config.bulkDiscounts) {
      if (totalOptions >= discount.threshold) {
        discounts = (subtotal * discount.discountPercent) / 100;
        break;
      }
    }
  }

  const total = subtotal - discounts;

  return {
    subtotal,
    discounts,
    total,
    breakdown
  };
}

// ==================== STATISTICS ====================

export async function getAddonStats(tenantId: string): Promise<AddonStats> {
  validateTenantId(tenantId);

  try {
    const [statsRows] = await db.query<RowDataPacket[]>(
      `SELECT 
        COUNT(DISTINCT ag.id) as total_groups,
        COUNT(DISTINCT ao.id) as total_options,
        COUNT(DISTINCT CASE WHEN ag.active = 1 THEN ag.id END) as active_groups,
        COUNT(DISTINCT CASE WHEN ao.available = 1 THEN ao.id END) as active_options,
        COUNT(DISTINCT CASE WHEN ag.required = 1 THEN ag.id END) as required_groups,
        COUNT(DISTINCT CASE WHEN ag.required = 0 THEN ag.id END) as optional_groups,
        AVG(option_count.cnt) as avg_options_per_group,
        AVG(ao.price) as avg_price_per_option
      FROM addon_groups ag
      LEFT JOIN addon_options ao ON ag.id = ao.addon_group_id
      LEFT JOIN (
        SELECT addon_group_id, COUNT(*) as cnt
        FROM addon_options
        GROUP BY addon_group_id
      ) option_count ON ag.id = option_count.addon_group_id
      WHERE ag.tenant_id = ?`,
      [tenantId]
    );

    const [categoryRows] = await db.query<RowDataPacket[]>(
      `SELECT category, COUNT(*) as count
      FROM addon_groups
      WHERE tenant_id = ?
      GROUP BY category`,
      [tenantId]
    );

    const groupsByCategory: Record<string, number> = {};
    categoryRows.forEach(row => {
      groupsByCategory[row.category] = row.count;
    });

    const stats = statsRows[0];
    return {
      totalGroups: stats.total_groups || 0,
      totalOptions: stats.total_options || 0,
      activeGroups: stats.active_groups || 0,
      activeOptions: stats.active_options || 0,
      requiredGroups: stats.required_groups || 0,
      optionalGroups: stats.optional_groups || 0,
      groupsByCategory,
      avgOptionsPerGroup: parseFloat(stats.avg_options_per_group) || 0,
      avgPricePerOption: parseFloat(stats.avg_price_per_option) || 0,
      topUsedAddons: [] // Would require order data analysis
    };
  } catch (error) {
    console.error('Error fetching addon stats:', error);
    throw new Error('Failed to fetch addon stats');
  }
}
