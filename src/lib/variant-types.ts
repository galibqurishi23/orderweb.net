// Item Variants Types
export interface ItemVariantType {
    id: string;
    item_id: string;
    name: string; // e.g., "Size", "Color", "Material"
    display_order: number;
    is_required: boolean;
    created_at: string;
    updated_at: string;
    options?: ItemVariantOption[];
}

export interface ItemVariantOption {
    id: string;
    variant_type_id: string;
    name: string; // e.g., "Small", "Red", "Cotton"
    price_modifier: number; // Additional price for this option
    stock_quantity: number;
    is_available: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

// For creating new variants
export interface CreateVariantType {
    name: string;
    display_order?: number;
    is_required?: boolean;
    options: CreateVariantOption[];
}

export interface CreateVariantOption {
    name: string;
    price_modifier?: number;
    stock_quantity?: number;
    is_available?: boolean;
    display_order?: number;
}

// Combined variant data for admin forms
export interface VariantFormData {
    type: {
        name: string;
        is_required: boolean;
        display_order: number;
    };
    options: {
        name: string;
        price_modifier: number;
        stock_quantity: number;
        is_available: boolean;
    }[];
}
