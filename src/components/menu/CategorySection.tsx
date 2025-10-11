import React, { memo, useMemo } from 'react';
import { Category, MenuItem as LocalMenuItem } from '@/lib/types';
import { SelectedAddon } from '@/lib/addon-types';
import MenuItem from './MenuItem';

interface CategorySectionProps {
  category: Category;
  items: LocalMenuItem[];
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  currencySymbol: string;
  tenantId: string;
}

export const CategorySection = memo(function CategorySection({
  category,
  items,
  onAddToCart,
  currencySymbol,
  tenantId
}: CategorySectionProps) {
  // Memoize filtered items to avoid recalculation
  const availableItems = useMemo(() => 
    items?.filter(item => item.available !== false) || [],
    [items]
  );

  if (availableItems.length === 0) {
    return null;
  }

  return (
    <section 
      id={`category-${category.id}`}
      className="mb-8"
    >
      <div className="sticky top-[72px] z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {category.name}
        </h2>
      </div>
      
      <div className="grid gap-3 sm:gap-4">
        {availableItems.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
            currencySymbol={currencySymbol}
            tenantId={tenantId}
          />
        ))}
      </div>
    </section>
  );
});

export default CategorySection;