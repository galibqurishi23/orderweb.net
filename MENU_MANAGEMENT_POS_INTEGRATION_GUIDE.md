# Menu Management System - POS Integration Guide

## Overview
This document provides a comprehensive guide to the Menu Management System used in the OrderWeb restaurant platform. This guide is designed for POS developers who need to understand and replicate the menu management functionality.

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Category Management](#category-management)
3. [Menu Item Management](#menu-item-management)
4. [Meal Deals (Set Menus)](#meal-deals-set-menus)
5. [VAT Management](#vat-management)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Business Logic & Workflows](#business-logic--workflows)

---

## System Architecture

### Multi-Tenant Design
All menu data is isolated by `tenant_id` to support multiple restaurants on the same platform:
- Every database query includes `tenant_id` filtering
- All API operations require tenant context (extracted from URL or session)
- Data access control enforced at service layer

### Key Components
1. **Database Layer**: MySQL tables with JSON fields for flexible data storage
2. **Service Layer**: Server-side business logic (`new-menu-service.ts`, `meal-deals-service.ts`)
3. **API Layer**: REST endpoints for CRUD operations
4. **Type System**: TypeScript interfaces defining data structures (`menu-types.ts`)

---

## Category Management

### Category Features

#### 1. Basic Category Properties
```typescript
interface MenuCategory {
  id: string;                    // UUID: "cat-xxxxx-xxxx-xxxx"
  tenantId: string;              // Restaurant/tenant identifier
  name: string;                  // Display name: "Starters", "Main Course"
  description?: string;          // Optional description
  active: boolean;               // Visibility toggle
  displayOrder: number;          // Sort order (0-999)
  createdAt: Date;
  updatedAt: Date;
  
  // Appearance
  imageUrl?: string;             // Category image
  icon?: string;                 // Icon identifier
  color?: string;                // Brand color (hex)
  
  // Hierarchy
  parentId?: string | null;      // For sub-categories
}
```

#### 2. Category Hierarchy (Parent/Sub-Categories)

**How It Works:**
- **Top-Level Categories**: Have `parentId = null`
- **Sub-Categories**: Have `parentId = <parent_category_id>`
- Unlimited nesting depth supported (though UI typically limits to 2 levels)

**Example Structure:**
```
Beverages (parentId: null)
  ├─ Hot Drinks (parentId: beverages_id)
  │   ├─ Coffee (parentId: hot_drinks_id)
  │   └─ Tea (parentId: hot_drinks_id)
  └─ Cold Drinks (parentId: beverages_id)
      ├─ Soft Drinks (parentId: cold_drinks_id)
      └─ Juices (parentId: cold_drinks_id)
```

**Implementation Logic:**
```typescript
// Creating top-level category
{
  name: "Beverages",
  parentId: null,  // No parent
  displayOrder: 1
}

// Creating sub-category
{
  name: "Hot Drinks",
  parentId: "cat-beverages-uuid",  // Links to parent
  displayOrder: 1
}
```

#### 3. Display Order Management
- Categories sorted by `displayOrder` ASC, then by `created_at` DESC
- Lower numbers appear first
- Admin can drag-and-drop to reorder (updates `displayOrder` values)
- Sub-categories ordered within their parent context

#### 4. Active/Inactive Toggle
- `active: false` hides category and ALL its items from customer view
- Items remain in database (soft hide, not deletion)
- Sub-categories inherit parent's active state (if parent inactive, children hidden too)

---

## Menu Item Management

### Menu Item Properties

```typescript
interface MenuItem {
  id: string;                    // UUID: "item-xxxxx-xxxx-xxxx"
  tenantId: string;              // Multi-tenant isolation
  categoryId: string;            // Parent category link
  name: string;                  // Item name
  description?: string;          // Item description
  price: number;                 // Base price (decimal)
  image?: string;                // Image URL
  available: boolean;            // Stock availability
  isFeatured: boolean;           // Highlight in UI
  preparationTime?: number;      // Minutes to prepare
  displayOrder: number;          // Sort within category
  createdAt: Date;
  updatedAt: Date;
  
  // Additional Features
  characteristics: ItemCharacteristic[];  // Dietary info
  nutrition?: NutritionInfo;              // Nutritional data
  addons: SimpleAddon[];                  // Optional extras
  tags: string[];                         // Search/filter tags
  
  // VAT Management (see VAT section below)
  vatRate?: number;
  vatType?: 'simple' | 'mixed';
  isVatExempt?: boolean;
  vatNotes?: string;
}
```

### Item Features

#### 1. Dietary Characteristics & Allergens
```typescript
interface ItemCharacteristic {
  id: string;
  name: string;                  // "Vegetarian", "Gluten-Free", "Nuts"
  icon?: string;                 // Icon identifier
  color?: string;                // Display color
}
```

**Usage:**
- Stored in `menu_item_dietary_characteristics` junction table
- Many-to-many relationship (item can have multiple characteristics)
- Used for filtering ("Show all vegetarian items")
- Displayed with icons/badges on menu

**Database Storage:**
```sql
-- Junction table
menu_item_dietary_characteristics
  - id (PRIMARY KEY)
  - menu_item_id (FOREIGN KEY)
  - characteristic_id (references predefined list)
  - tenant_id (isolation)
```

#### 2. Nutrition Information
```typescript
interface NutritionInfo {
  calories?: number;             // kcal
  protein?: number;              // grams
  carbs?: number;                // grams
  fat?: number;                  // grams
  fiber?: number;                // grams
  sugar?: number;                // grams
  sodium?: number;               // mg
}
```

**Storage**: JSON field in `menu_items.nutrition_info` column

#### 3. Addons/Extras
```typescript
interface SimpleAddon {
  id: string;
  name: string;                  // "Extra Cheese", "Add Bacon"
  price: number;                 // Additional cost
  available: boolean;
}
```

**Storage**: JSON array in `menu_items.addons` column

**Order Logic:**
- Customer selects base item ($10)
- Adds extra cheese (+$2)
- Adds bacon (+$3)
- Total: $15

#### 4. Tags for Search/Filtering
```typescript
tags: string[];  // ["spicy", "chef-special", "gluten-free"]
```

**Storage**: JSON array in `menu_items.tags` column

**Usage:**
- Full-text search across menu
- Filter by tag ("Show all spicy items")
- Marketing/promotions

---

## Meal Deals (Set Menus)

Meal Deals are bundled menu offerings where customers select items from different categories at a fixed price.

### Meal Deal Structure

```typescript
interface MealDeal {
  id: string;                    // "meal-xxxxx-xxxx-xxxx"
  tenantId: string;
  name: string;                  // "Lunch Special", "Family Bundle"
  description: string;           // Promotional text
  price: number;                 // Fixed bundle price
  image?: string;                // Marketing image
  categories: MealDealCategory[]; // Selection structure
  active: boolean;               // Availability
  displayOrder: number;          // Sort order
  createdAt: Date;
  updatedAt: Date;
}

interface MealDealCategory {
  id: string;                    // "cat-meal-xxxxx-1"
  name: string;                  // "Choose Your Main"
  selectionType: 'required' | 'optional';
  minSelections: number;         // Minimum items to choose
  maxSelections: number;         // Maximum items allowed
  menuItemIds: string[];         // Available items for this category
}
```

### How Meal Deals Work

#### Example: Lunch Special ($15.99)
```typescript
{
  name: "Lunch Special",
  price: 15.99,
  categories: [
    {
      name: "Choose Your Main",
      selectionType: "required",
      minSelections: 1,
      maxSelections: 1,
      menuItemIds: ["item-burger", "item-pasta", "item-salad"]
    },
    {
      name: "Choose Your Side",
      selectionType: "required",
      minSelections: 1,
      maxSelections: 1,
      menuItemIds: ["item-fries", "item-coleslaw", "item-rice"]
    },
    {
      name: "Choose Your Drink",
      selectionType: "optional",
      minSelections: 0,
      maxSelections: 1,
      menuItemIds: ["item-coke", "item-water", "item-juice"]
    }
  ]
}
```

#### Customer Selection Flow
1. Customer sees "Lunch Special - $15.99"
2. Must select 1 main (required)
3. Must select 1 side (required)
4. Can optionally select 1 drink
5. System validates selections meet min/max requirements
6. If valid, adds meal deal to cart at fixed price

#### Validation Logic
```typescript
export async function validateMealDealSelection(
    tenantId: string, 
    dealId: string, 
    selections: MealDealSelection[]
): Promise<ValidationResult> {
    // For each category:
    // 1. Check if selections meet minSelections
    // 2. Check if selections don't exceed maxSelections
    // 3. Verify selected items are in allowed menuItemIds
    // 4. If selectionType='required', must have min selections
    
    return {
        isValid: true/false,
        errors: ["List of validation errors"]
    }
}
```

### Meal Deal Categories Storage
- **Database**: Stored as JSON in `meal_deals.categories` column
- **Format**: Array of MealDealCategory objects
- **Validation**: Enforced at service layer before saving

---

## VAT Management

The system supports sophisticated VAT (Value Added Tax) handling for regulatory compliance.

### VAT Types

#### 1. Simple VAT Items
Items with a single VAT rate applied to entire price.

```typescript
{
  name: "Hamburger",
  price: 10.00,
  vatType: "simple",
  vatRate: 20.00,        // 20% VAT
  isVatExempt: false
}
```

**Calculation:**
- Net Price: £10.00
- VAT (20%): £2.00
- Gross Price: £12.00

#### 2. Mixed VAT Items
Items with multiple components, each with different VAT rates (common for bundled items).

```typescript
{
  name: "Kids Meal with Toy",
  price: 8.00,
  vatType: "mixed",
  isVatExempt: false
}
```

**Component Breakdown:**
Stored in separate `item_components` table:

```typescript
interface ItemComponent {
  id: string;
  menuItemId: string;
  componentName: string;         // "Food", "Toy"
  componentCost: number;         // Portion of total price
  vatRate: number;               // VAT rate for this component
  componentType: string;         // "food", "non-food"
  isActive: boolean;
  displayOrder: number;
}
```

**Example:**
```typescript
// Kids Meal: £8.00 total
[
  {
    componentName: "Food (Burger + Fries)",
    componentCost: 6.00,
    vatRate: 20.00,        // Food VAT rate
    componentType: "food"
  },
  {
    componentName: "Toy",
    componentCost: 2.00,
    vatRate: 0.00,         // Toys exempt in some regions
    componentType: "non-food"
  }
]
```

**VAT Calculation:**
- Component 1: £6.00 × 20% = £1.20 VAT
- Component 2: £2.00 × 0% = £0.00 VAT
- Total VAT: £1.20
- Total Price: £8.00 + £1.20 = £9.20

#### 3. VAT-Exempt Items
```typescript
{
  name: "Children's Clothing",
  price: 15.00,
  isVatExempt: true,
  vatRate: 0.00,
  vatNotes: "Children's clothing is VAT exempt"
}
```

### VAT Database Schema

**menu_items table:**
```sql
vat_rate DECIMAL(5,2)          -- Percentage (e.g., 20.00)
vat_type ENUM('simple','mixed') -- VAT calculation method
is_vat_exempt BOOLEAN          -- Exemption flag
vat_notes TEXT                 -- Admin notes
```

**item_components table** (for mixed VAT):
```sql
id VARCHAR(100) PRIMARY KEY
menu_item_id VARCHAR(100)      -- Foreign key
component_name VARCHAR(255)
component_cost DECIMAL(10,2)
vat_rate DECIMAL(5,2)
component_type VARCHAR(50)
is_active BOOLEAN
display_order INT
tenant_id VARCHAR(100)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### VAT Business Rules

1. **Receipt/Invoice Breakdown**
   - Must show net price, VAT amount, gross price separately
   - For mixed VAT items, show per-component breakdown

2. **Reporting Requirements**
   - Daily VAT summary by rate (0%, 5%, 20%)
   - Audit trail for VAT rate changes

3. **Menu Changes**
   - Changing VAT rate creates new historical record
   - Past orders retain original VAT rate

---

## Database Schema

### Core Tables

#### 1. menu_categories
```sql
CREATE TABLE menu_categories (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    image_url VARCHAR(500),
    icon VARCHAR(100),
    color VARCHAR(50),
    parent_id VARCHAR(100),           -- For sub-categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_parent (parent_id),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (parent_id) REFERENCES menu_categories(id) ON DELETE CASCADE
);
```

#### 2. menu_items
```sql
CREATE TABLE menu_items (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    preparation_time INT,              -- minutes
    display_order INT DEFAULT 0,
    
    -- JSON fields
    nutrition_info JSON,               -- NutritionInfo object
    addons JSON,                       -- SimpleAddon[] array
    tags JSON,                         -- string[] array
    
    -- VAT fields
    vat_rate DECIMAL(5,2),
    vat_type ENUM('simple','mixed'),
    is_vat_exempt BOOLEAN DEFAULT FALSE,
    vat_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_category (category_id),
    INDEX idx_featured (is_featured),
    INDEX idx_available (available),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
);
```

#### 3. menu_item_dietary_characteristics
```sql
CREATE TABLE menu_item_dietary_characteristics (
    id VARCHAR(100) PRIMARY KEY,
    menu_item_id VARCHAR(100) NOT NULL,
    characteristic_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_item_characteristic (menu_item_id, characteristic_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### 4. item_components (for mixed VAT items)
```sql
CREATE TABLE item_components (
    id VARCHAR(100) PRIMARY KEY,
    menu_item_id VARCHAR(100) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    component_cost DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) NOT NULL,
    component_type VARCHAR(50),        -- 'food', 'non-food', etc.
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    tenant_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_menu_item (menu_item_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);
```

#### 5. meal_deals
```sql
CREATE TABLE meal_deals (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500),
    categories JSON NOT NULL,          -- MealDealCategory[] array
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tenant (tenant_id),
    INDEX idx_active (active),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

---

## API Endpoints

### Category Endpoints

#### GET /api/tenant/menu/categories
**Description**: Retrieve all categories for a tenant (including sub-categories)

**Request:**
```http
GET /api/{tenant-slug}/menu/categories
```

**Response:**
```json
[
  {
    "id": "cat-12345",
    "tenantId": "tenant-uuid",
    "name": "Starters",
    "description": "Appetizers and small plates",
    "active": true,
    "displayOrder": 1,
    "parentId": null,
    "imageUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": "cat-67890",
    "name": "Soups",
    "parentId": "cat-12345",
    "displayOrder": 1
  }
]
```

#### POST /api/tenant/menu/categories
**Description**: Create a new category

**Request:**
```json
{
  "name": "Desserts",
  "description": "Sweet treats",
  "active": true,
  "displayOrder": 5,
  "parentId": null,
  "imageUrl": "https://...",
  "icon": "cake",
  "color": "#FF6B6B"
}
```

**Response:** Created category object (201)

#### PUT /api/tenant/menu/categories
**Description**: Update existing category

**Request:**
```json
{
  "id": "cat-12345",
  "name": "Updated Name",
  "active": false
}
```

#### DELETE /api/tenant/menu/categories
**Description**: Delete category

**Request:**
```json
{
  "id": "cat-12345"
}
```

**Note**: Cascade deletes all sub-categories and unlinks menu items

---

### Menu Item Endpoints

#### GET /api/tenant/menu/items
**Description**: Get all menu items (with optional category filter)

**Query Parameters:**
- `categoryId` (optional): Filter by category

**Response:**
```json
[
  {
    "id": "item-12345",
    "categoryId": "cat-12345",
    "name": "Margherita Pizza",
    "price": 12.99,
    "available": true,
    "vatRate": 20.00,
    "vatType": "simple",
    "characteristics": [
      {
        "id": "char-veg",
        "name": "Vegetarian",
        "icon": "leaf"
      }
    ],
    "addons": [
      {
        "id": "addon-cheese",
        "name": "Extra Cheese",
        "price": 2.00
      }
    ]
  }
]
```

#### POST /api/tenant/menu/items
**Description**: Create menu item

**Request:**
```json
{
  "categoryId": "cat-12345",
  "name": "Caesar Salad",
  "description": "Fresh romaine, parmesan, croutons",
  "price": 8.99,
  "image": "https://...",
  "available": true,
  "isFeatured": false,
  "preparationTime": 10,
  "vatRate": 20.00,
  "vatType": "simple",
  "characteristics": ["char-veg"],
  "addons": [
    {
      "name": "Grilled Chicken",
      "price": 3.50
    }
  ],
  "tags": ["salad", "healthy", "lunch"]
}
```

#### PUT /api/tenant/menu/items
**Description**: Update menu item

#### DELETE /api/tenant/menu/items
**Description**: Delete menu item

---

### Meal Deal Endpoints

#### GET /api/[tenant]/meal-deals
**Description**: Get all meal deals

**Response:**
```json
[
  {
    "id": "meal-12345",
    "name": "Lunch Special",
    "price": 15.99,
    "active": true,
    "categories": [
      {
        "id": "cat-meal-1",
        "name": "Choose Your Main",
        "selectionType": "required",
        "minSelections": 1,
        "maxSelections": 1,
        "menuItemIds": ["item-1", "item-2", "item-3"]
      }
    ]
  }
]
```

#### POST /api/[tenant]/meal-deals
**Description**: Create meal deal

**Request:**
```json
{
  "name": "Family Bundle",
  "description": "Perfect for 4 people",
  "price": 49.99,
  "image": "https://...",
  "active": true,
  "categories": [
    {
      "name": "Choose 4 Mains",
      "selectionType": "required",
      "minSelections": 4,
      "maxSelections": 4,
      "menuItemIds": ["item-1", "item-2", "item-3"]
    },
    {
      "name": "Choose 4 Sides",
      "selectionType": "required",
      "minSelections": 4,
      "maxSelections": 4,
      "menuItemIds": ["item-4", "item-5"]
    }
  ]
}
```

#### PUT /api/[tenant]/meal-deals/[id]
**Description**: Update meal deal

#### DELETE /api/[tenant]/meal-deals/[id]
**Description**: Delete meal deal

---

## Business Logic & Workflows

### 1. Menu Setup Workflow

**Step 1: Create Category Hierarchy**
```
1. Create top-level categories (Starters, Mains, Desserts)
2. Set display order for each
3. Create sub-categories if needed
4. Link sub-categories via parentId
```

**Step 2: Add Menu Items**
```
1. Create item with basic info (name, price, description)
2. Assign to category via categoryId
3. Add dietary characteristics
4. Configure VAT (simple or mixed)
5. Add optional features (addons, nutrition, tags)
6. Set display order within category
```

**Step 3: Create Meal Deals**
```
1. Define deal name and price
2. Create selection categories
3. Specify min/max selections for each
4. Assign menu items to each category
5. Set active status
```

### 2. Customer Ordering Flow

**Regular Item Order:**
```
1. Customer selects category
2. Views items in that category (sorted by displayOrder)
3. Selects item
4. Optionally adds addons
5. Item added to cart with:
   - Base price
   - Addon prices
   - VAT calculation
```

**Meal Deal Order:**
```
1. Customer views available meal deals
2. Selects a meal deal
3. For each category in deal:
   a. Views available items
   b. Selects required number of items
4. System validates selections
5. If valid, adds to cart at fixed deal price
```

### 3. VAT Calculation Logic

**Simple VAT Calculation:**
```typescript
function calculateSimpleVAT(item: MenuItem): VATBreakdown {
  const netPrice = item.price;
  const vatAmount = (netPrice * item.vatRate) / 100;
  const grossPrice = netPrice + vatAmount;
  
  return {
    netPrice,
    vatRate: item.vatRate,
    vatAmount,
    grossPrice
  };
}
```

**Mixed VAT Calculation:**
```typescript
function calculateMixedVAT(
  item: MenuItem, 
  components: ItemComponent[]
): VATBreakdown {
  let totalVAT = 0;
  
  const componentBreakdown = components.map(comp => {
    const compVAT = (comp.componentCost * comp.vatRate) / 100;
    totalVAT += compVAT;
    
    return {
      name: comp.componentName,
      netPrice: comp.componentCost,
      vatRate: comp.vatRate,
      vatAmount: compVAT
    };
  });
  
  return {
    netPrice: item.price,
    totalVAT,
    grossPrice: item.price + totalVAT,
    components: componentBreakdown
  };
}
```

### 4. Inventory Management

**Stock Availability:**
- `available: true` → Item can be ordered
- `available: false` → Item shows as "Out of Stock"
- Admin can toggle availability in real-time

**Category Visibility:**
- `active: false` → Hides entire category and all items
- Used for seasonal menus or time-based offerings

### 5. Display & Sorting

**Category Sorting:**
```sql
ORDER BY display_order ASC, created_at DESC
```

**Item Sorting Within Category:**
```sql
ORDER BY is_featured DESC, display_order ASC, created_at DESC
```

**Featured Items:**
- `isFeatured: true` items appear first in category
- Used for promotions, specials, high-margin items

---

## Integration Checklist for POS Developers

### Phase 1: Core Menu Structure
- [ ] Implement category CRUD operations
- [ ] Support category hierarchy (parent/sub-categories)
- [ ] Implement display order management
- [ ] Add active/inactive toggle

### Phase 2: Menu Items
- [ ] Implement item CRUD operations
- [ ] Link items to categories
- [ ] Add pricing and availability
- [ ] Implement dietary characteristics
- [ ] Add addon/modifier support

### Phase 3: VAT Management
- [ ] Support simple VAT items
- [ ] Implement mixed VAT with components
- [ ] VAT-exempt item handling
- [ ] VAT breakdown in receipts/invoices

### Phase 4: Meal Deals
- [ ] Implement meal deal CRUD
- [ ] Category selection system
- [ ] Min/max selection validation
- [ ] Dynamic pricing for bundles

### Phase 5: Advanced Features
- [ ] Nutrition information storage
- [ ] Tag-based search/filtering
- [ ] Image upload and management
- [ ] Preparation time tracking
- [ ] Real-time availability updates

---

## Key Concepts Summary

### Categories
- **Hierarchy**: Use `parentId` for sub-categories
- **Sorting**: `displayOrder` field controls order
- **Visibility**: `active` flag for show/hide
- **Isolation**: Always filter by `tenant_id`

### Menu Items
- **Pricing**: Base price + optional addon prices
- **Characteristics**: Dietary/allergen info via junction table
- **VAT**: Simple (single rate) or Mixed (component-based)
- **Availability**: Real-time stock control with `available` flag

### Meal Deals
- **Structure**: Multiple categories with selection rules
- **Validation**: Min/max selections enforced
- **Pricing**: Fixed bundle price regardless of selections
- **Flexibility**: Optional vs. required categories

### VAT System
- **Simple**: Single VAT rate on entire item
- **Mixed**: Different VAT rates per component
- **Exempt**: Zero-rate items with documentation
- **Reporting**: Detailed breakdown for compliance

---

## Technical Notes

### UUID Generation
```typescript
function generateId(prefix: string): string {
  return `${prefix}-${uuidv4()}`;
}

// Examples:
// "cat-550e8400-e29b-41d4-a716-446655440000"
// "item-7c9e6679-7425-40de-944b-e07fc1f90ae7"
// "meal-3fa85f64-5717-4562-b3fc-2c963f66afa6"
```

### JSON Field Parsing
```typescript
function parseJsonField<T>(field: any): T | null {
  if (!field) return null;
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return null;
    }
  }
  return field as T;
}
```

### Tenant Isolation Pattern
```typescript
// All queries must include tenant_id
const [items] = await db.execute(
  'SELECT * FROM menu_items WHERE tenant_id = ? AND category_id = ?',
  [tenantId, categoryId]
);
```

---

## Questions & Support

For POS integration questions, please provide:
1. Specific feature you're implementing
2. Current implementation approach
3. Expected vs. actual behavior
4. Sample data/JSON structures

This guide covers the complete menu management system. Refer to specific sections as needed during development.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: OrderWeb Development Team
