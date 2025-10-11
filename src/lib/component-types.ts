// Phase 2: Component Management Types for Mixed Item VAT System
// TypeScript interfaces for component templates and mixed items

export interface ComponentTemplate {
  id: string;
  tenantId: string;
  templateName: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateComponent {
  id: string;
  templateId: string;
  componentName: string;
  defaultCost: number;
  vatRate: number;
  componentType: ComponentType;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemComponent {
  id: string;
  menuItemId: string;
  componentName: string;
  componentCost: number;
  vatRate: number;
  componentType: ComponentType;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommonComponent {
  id: string;
  tenantId: string;
  componentName: string;
  averageCost: number;
  vatRate: number;
  componentType: ComponentType;
  usageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ComponentType = 
  | 'hot_food'      // 20% VAT - hot food items
  | 'cold_food'     // 0% VAT - cold food items (temp under 60°C)
  | 'alcohol'       // 20% VAT - alcoholic beverages
  | 'soft_drink'    // 20% VAT - non-alcoholic beverages
  | 'other';        // Default 20% VAT

// Request/Response types
export interface CreateComponentTemplateRequest {
  templateName: string;
  description?: string;
  components: CreateTemplateComponentRequest[];
}

export interface CreateTemplateComponentRequest {
  componentName: string;
  defaultCost: number;
  vatRate: number;
  componentType: ComponentType;
  displayOrder: number;
}

export interface CreateItemComponentRequest {
  componentName: string;
  componentCost: number;
  vatRate: number;
  componentType: ComponentType;
  displayOrder: number;
}

export interface UpdateItemComponentRequest {
  id: string;
  componentName?: string;
  componentCost?: number;
  vatRate?: number;
  componentType?: ComponentType;
  isActive?: boolean;
  displayOrder?: number;
}

// Mixed Item with Components
export interface MixedMenuItem {
  id: string;
  name: string;
  description?: string;
  totalPrice: number;
  isMixedItem: boolean;
  components: ItemComponent[];
  // Standard menu item fields
  categoryId?: string;
  isAvailable: boolean;
  vatRate?: number; // Legacy field - use component-level rates instead
  vatType?: string;
  isVatExempt?: boolean;
  vatNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// VAT Calculation for Mixed Items
export interface ComponentVATBreakdown {
  componentId: string;
  componentName: string;
  componentCost: number;
  vatRate: number;
  vatAmount: number;
  componentType: ComponentType;
}

export interface MixedItemVATCalculation {
  itemId: string;
  itemName: string;
  totalPrice: number;
  totalVAT: number;
  components: ComponentVATBreakdown[];
  vatSummary: {
    hotFoodVAT: number;      // 20% VAT items
    coldFoodVAT: number;     // 0% VAT items
    alcoholVAT: number;      // 20% VAT items
    softDrinkVAT: number;    // 20% VAT items
    otherVAT: number;        // Other items
  };
  hmrcCompliant: boolean;
  calculationMethod: 'cost_apportionment' | 'component_based';
}

// Component Library Management
export interface ComponentLibraryItem {
  id: string;
  componentName: string;
  averageCost: number;
  vatRate: number;
  componentType: ComponentType;
  usageCount: number;
  isPopular: boolean;
}

// Template Application
export interface ApplyTemplateRequest {
  templateId: string;
  menuItemId: string;
  adjustments?: ComponentAdjustment[];
}

export interface ComponentAdjustment {
  componentName: string;
  newCost?: number;
  newVatRate?: number;
  exclude?: boolean;
}

// Reporting Types
export interface ComponentUsageReport {
  componentName: string;
  totalUsage: number;
  averageCost: number;
  totalVATGenerated: number;
  popularInItems: string[];
}

export interface MixedItemsVATReport {
  totalMixedItems: number;
  totalVATFromMixedItems: number;
  averageComponentsPerItem: number;
  componentBreakdown: {
    hotFood: { count: number; totalVAT: number };
    coldFood: { count: number; totalVAT: number };
    alcohol: { count: number; totalVAT: number };
    softDrink: { count: number; totalVAT: number };
    other: { count: number; totalVAT: number };
  };
}
