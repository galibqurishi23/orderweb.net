// New Menu Management Type Definitions
export interface MenuCategory {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    active: boolean;
    displayOrder: number;
    parentId?: string;
    imageUrl?: string;
    icon?: string;
    color?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Simple addon structure for basic addon management
export interface SimpleAddon {
    id: string;
    name: string;
    price: number;
}

export interface MenuItem {
    id: string;
    tenantId: string;
    categoryId?: string;
    name: string;
    description?: string;
    price: number;
    image?: string; // Changed from imageUrl to image for base64 storage
    imageHint?: string;
    available: boolean;
    isFeatured: boolean;
    preparationTime: number;
    displayOrder?: number;
    characteristics?: ItemCharacteristic[];
    nutrition?: NutritionInfo;
    addons?: SimpleAddon[]; // Use proper typing instead of any[]
    tags?: string[];
    // VAT Management Fields
    vatRate?: number | null; // VAT rate as percentage (e.g., 20.00 for 20%), null if not set
    vatType?: 'simple' | 'mixed'; // Simple items have single VAT rate, mixed items have components
    isVatExempt?: boolean; // True if item is VAT exempt (0% rate)
    vatNotes?: string; // Admin notes about VAT classification
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ItemCharacteristic {
    id: string;
    name: string;
    icon?: string;
    color?: string;
}

export interface NutritionInfo {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
}

// API Response types
export interface MenuApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface MenuWithCategories {
    category: MenuCategory;
    items: MenuItem[];
}

// Validation schemas (for input validation)
export interface CreateCategoryRequest {
    name: string;
    description?: string;
    active?: boolean;
    displayOrder?: number;
    parentId?: string;
    imageUrl?: string;
    icon?: string;
    color?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
    id: string;
}

export interface CreateMenuItemRequest {
    name: string;
    description?: string;
    price: number;
    categoryId?: string;
    image?: string; // Changed from imageUrl to image for base64 storage
    imageHint?: string;
    available?: boolean;
    isFeatured?: boolean;
    preparationTime?: number;
    characteristics?: ItemCharacteristic[];
    nutrition?: NutritionInfo;
    tags?: string[];
    // VAT Management Fields
    vatRate?: number; // VAT rate as percentage (e.g., 20.00 for 20%)
    vatType?: 'simple' | 'mixed'; // Simple items have single VAT rate, mixed items have components
    isVatExempt?: boolean; // True if item is VAT exempt (0% rate)
    vatNotes?: string; // Admin notes about VAT classification
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> {
    id: string;
}

// Database result types
export interface DatabaseResult {
    affectedRows: number;
    insertId: number;
    warningCount: number;
}

export interface MenuStats {
    totalCategories: number;
    totalMenuItems: number;
    totalAddonGroups: number;
    totalAddonOptions: number;
    activeCategories: number;
    activeMenuItems: number;
    featuredItems: number;
    totalMealDeals: number;
    activeMealDeals: number;
}

// ==================== MEAL DEALS SYSTEM ====================

// Smart Meal Deals - Customer selection tracking
export interface MealDealSelection {
    categoryId: string
    itemId: string
    quantity?: number
}

// Smart Meal Deals - Validation result
export interface ValidationResult {
    isValid: boolean
    errors?: string[]
}

// Smart Meal Deals - Dynamic category selection types
export type CategorySelectionType = 'required' | 'optional'

export interface MealDealCategory {
    id: string
    name: string // Dynamic name like "Choose a Main", "Pick Sides", "Add Extras"
    selectionType: CategorySelectionType
    minSelections: number
    maxSelections: number
    menuItemIds: string[] // IDs of menu items available in this category
}

export interface MealDeal {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    categories: MealDealCategory[];
    active: boolean;
    displayOrder: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Customer selection for meal deals
export interface MealDealSelection {
    dealId: string;
    categorySelections: {
        categoryId: string;
        selectedItems: {
            itemId: string;
            itemName: string;
            quantity: number;
        }[];
    }[];
}

// API Request types for meal deals
export interface CreateMealDealRequest {
    name: string;
    description?: string;
    price: number;
    image?: string;
    categories: Omit<MealDealCategory, 'id'>[];
    active?: boolean;
    displayOrder?: number;
}

export interface UpdateMealDealRequest extends Partial<CreateMealDealRequest> {
    id: string;
}
