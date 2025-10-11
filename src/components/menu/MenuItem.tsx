import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderItem, MenuItem as LocalMenuItem } from '@/lib/types';
import { SelectedAddon } from '@/lib/addon-types';
import { MenuVariantsService, MenuVariant } from '@/lib/menu-variants-service';
import { getCurrencySymbol } from '@/lib/currency-utils';
import DietaryCharacteristicsDisplay from '@/components/DietaryCharacteristicsDisplay';
import { Plus } from 'lucide-react';

interface MenuItemProps {
  item: LocalMenuItem;
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  currencySymbol: string;
  tenantId: string;
}

export const MenuItem = memo(function MenuItem({
  item,
  onAddToCart,
  currencySymbol,
  tenantId
}: MenuItemProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variants, setVariants] = useState<MenuVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(null);

  // Load variants for this item
  useEffect(() => {
    const loadVariants = async () => {
      try {
        setLoadingVariants(true);
        const variantsData = await MenuVariantsService.getVariants(item.id);
        const activeVariants = variantsData.filter(v => v.active);
        setVariants(activeVariants);
        
        // Auto-select the first variant if available
        if (activeVariants.length > 0) {
          setSelectedVariant(activeVariants[0]);
        }
      } catch (error) {
        console.error('Error loading variants for item:', item.id, error);
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };

    loadVariants();
  }, [item.id]);
  
  // Memoized calculations for better performance
  const hasImage = useMemo(() => 
    item.image && item.image.length > 0 && !item.image.includes('placehold.co'), 
    [item.image]
  );

  const isBasePriceZero = useMemo(() => item.price === 0, [item.price]);
  const displayPrice = useMemo(() => item.price, [item.price]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the dialog
    
    if (variants.length > 0 && selectedVariant) {
      // Add item with selected variant
      const itemWithVariant = {
        ...item,
        price: Number(selectedVariant.price),
        variantName: selectedVariant.name,
        variantId: selectedVariant.id
      };
      onAddToCart(itemWithVariant, 1, '', []);
    } else {
      // Add regular item
      onAddToCart(item, 1, '', []);
    }
  }, [item, onAddToCart, variants, selectedVariant]);

  const handleVariantSelect = useCallback((variant: MenuVariant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening dialog
    setSelectedVariant(variant);
  }, []);

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  return (
    <div 
      className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden hover:border-primary/20 hover:-translate-y-1"
      onClick={handleOpenDialog}
    >
      <div className="flex items-start p-3 space-x-3">
        {/* Item Image */}
        {hasImage && (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 640px) 80px, 96px"
              loading="lazy"
            />
          </div>
        )}
        
        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors">
                {item.name}
              </h3>
              
              {item.description && (
                <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              
              {/* Dietary Characteristics */}
              <div className="mt-2">
                <DietaryCharacteristicsDisplay
                  menuItemId={item.id}
                  tenantId={tenantId}
                  size="sm"
                  showTooltips={false}
                  className="flex flex-wrap gap-1"
                />
              </div>
              
              {/* Price Variants */}
              {variants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={(e) => handleVariantSelect(variant, e)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        selectedVariant?.id === variant.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary'
                      }`}
                    >
                      {variant.name}: {currencySymbol}{Number(variant.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Price and Add Button */}
            <div className="flex flex-col items-end space-y-2 ml-3">
              <div className="text-right">
                {!isBasePriceZero && (
                  <p className="font-bold text-primary text-sm sm:text-base">
                    {currencySymbol}{(selectedVariant ? Number(selectedVariant.price) : displayPrice).toFixed(2)}
                  </p>
                )}
              </div>
              
              <Button
                size="sm"
                onClick={handleQuickAdd}
                className="h-8 w-8 rounded-full p-0 shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hover indicator */}
      <div className="h-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
});

export default MenuItem;