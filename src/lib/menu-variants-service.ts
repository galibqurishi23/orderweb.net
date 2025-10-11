// Type definitions for menu variants
export interface MenuVariant {
  id: string;
  menu_item_id: string;
  name: string;
  description?: string;
  price: number;
  display_order: number;
  active: boolean;
}

export interface CreateVariantData {
  menuItemId: string;
  tenantId: string;
  name: string;
  description?: string;
  price: number;
  displayOrder?: number;
}

export interface UpdateVariantData {
  id: string;
  name: string;
  description?: string;
  price: number;
  displayOrder?: number;
  active?: boolean;
}

// Menu Variants API service
export class MenuVariantsService {
  private static baseUrl = '/api/menu-variants';

  // Get all variants for a menu item
  static async getVariants(menuItemId: string): Promise<MenuVariant[]> {
    try {
      const response = await fetch(`${this.baseUrl}?menuItemId=${menuItemId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch variants');
      }
      
      return data.variants || [];
    } catch (error) {
      console.error('Error fetching menu variants:', error);
      throw error;
    }
  }

  // Create a new variant
  static async createVariant(variantData: CreateVariantData): Promise<MenuVariant> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variantData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create variant');
      }
      
      return data.variant;
    } catch (error) {
      console.error('Error creating menu variant:', error);
      throw error;
    }
  }

  // Update a variant
  static async updateVariant(variantData: UpdateVariantData): Promise<MenuVariant> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variantData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update variant');
      }
      
      return data.variant;
    } catch (error) {
      console.error('Error updating menu variant:', error);
      throw error;
    }
  }

  // Delete a variant
  static async deleteVariant(variantId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}?variantId=${variantId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete variant');
      }
    } catch (error) {
      console.error('Error deleting menu variant:', error);
      throw error;
    }
  }

  // Reorder variants
  static async reorderVariants(variants: { id: string; displayOrder: number }[]): Promise<void> {
    try {
      const promises = variants.map(({ id, displayOrder }) =>
        this.updateVariant({
          id,
          name: '', // We'll need to get the current name
          price: 0, // We'll need to get the current price
          displayOrder,
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error reordering variants:', error);
      throw error;
    }
  }
}
