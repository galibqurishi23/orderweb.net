'use client';

import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePerformanceMonitor, useDebounce } from '@/lib/performance-utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTenantData } from '@/context/TenantDataContext';
import { useTenant } from '@/context/TenantContext';
import StripePaymentWrapper from '@/components/StripePaymentForm';
import type { OrderItem, MenuItem as LocalMenuItem, Category, OpeningHoursPerDay, Order, Voucher } from '@/lib/types';
import type { MealDeal, MealDealCategory } from '@/lib/menu-types';
import { SelectedAddon, AddonGroup } from '@/lib/addon-types';
import { calculateSelectedAddonPrice } from '@/lib/addon-utils';
import { MenuVariantsService, type MenuVariant } from '@/lib/menu-variants-service';
import AddonSelection from '@/components/SimpleAddonSelection';
import * as AddonService from '@/lib/addon-service';
import {
  MinusCircle,
  PlusCircle,
  Trash2,
  Utensils,
  X,
  Plus,
  Calendar as CalendarIcon,
  ShoppingBasket,
  Search,
  User,
  LogIn,
  CheckCircle,
  LogOut,
  Home,
  Menu as MenuIcon,
  Heart,
  ChevronUp,
  ChevronDown,
  Clock,
  Truck,
  Store,
  Package,
  AlertTriangle,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import MenuNav from '@/components/menu/MenuNav';
import DietaryCharacteristicsDisplay from '@/components/DietaryCharacteristicsDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as TenantVoucherService from '@/lib/tenant-voucher-service';
import * as TenantZoneService from '@/lib/tenant-zone-service';
import { getRestaurantStatus } from '@/lib/opening-hours-utils';
import { createSuperOptimizedPlaceOrderHandler } from '@/lib/super-optimized-place-order';

// Meal Deal Dialog Component
function MealDealDialog({
  item,
  isOpen,
  onClose,
  onAddToCart,
  currencySymbol
}: {
  item: LocalMenuItem & { mealDeal?: boolean; categories?: MealDealCategory[] };
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  currencySymbol: string;
}) {
  const [quantity, setQuantity] = React.useState(1);
  const [instructions, setInstructions] = React.useState('');
  const [selections, setSelections] = React.useState<{[categoryId: string]: string[]}>({});
  const { getMenuWithCategoriesForCustomer } = useTenantData();
  const { tenantData } = useTenant();

  const menuData = getMenuWithCategoriesForCustomer();
  
  React.useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setInstructions('');
      setSelections({});
    }
  }, [isOpen]);

  const handleCategorySelection = (categoryId: string, selectedItems: string[]) => {
    setSelections(prev => ({
      ...prev,
      [categoryId]: selectedItems
    }));
  };

  const isSelectionComplete = () => {
    if (!item.categories) return true;
    
    return item.categories.every(category => {
      const selectedCount = selections[category.id]?.length || 0;
      return selectedCount >= (category.minSelections || 0);
    });
  };

  const handleConfirm = () => {
    // Create a special meal deal order item with selections
    const mealDealItem = {
      ...item,
      mealDealSelections: selections
    };
    onAddToCart(mealDealItem, quantity, instructions, []);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <Utensils className="h-6 w-6 text-orange-500" />
            {item.name}
          </DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        
        {/* Dietary Characteristics Display */}
        <div className="mb-2">
          <DietaryCharacteristicsDisplay
            menuItemId={item.id}
            tenantId={tenantData?.slug || ''}
            size="md"
            showTooltips={true}
            className="flex flex-wrap gap-2"
          />
        </div>
        
        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {item.categories && item.categories.map((category) => {
            // For meal deals, get items by their IDs from the category's menuItemIds
            const availableItems = category.menuItemIds 
              ? category.menuItemIds.map(itemId => {
                  // Find the menu item from all menu categories
                  for (const menuCategory of menuData) {
                    const foundItem = menuCategory.items.find(item => item.id === itemId);
                    if (foundItem) return foundItem;
                  }
                  return null;
                }).filter(Boolean) // Remove null entries
              : [];
            
            console.log(`🎯 Meal deal category "${category.name}" has ${availableItems.length} available items`);
            
            const selectedCount = selections[category.id]?.length || 0;
            const isRequired = (category.minSelections || 0) > 0;
            
            return (
              <div key={category.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  <div className="flex items-center gap-2">
                    {isRequired && (
                      <Badge variant="secondary" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <span className="text-sm text-gray-500">
                      {selectedCount}/{category.maxSelections || '∞'} selected
                    </span>
                  </div>
                </div>
                
                {availableItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Utensils className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No items available for this category</p>
                    <p className="text-sm mt-1">Category ID: {category.id}</p>
                    <p className="text-sm">Menu Item IDs: {category.menuItemIds?.join(', ')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {availableItems.map((menuItem) => {
                      const isSelected = selections[category.id]?.includes(menuItem.id) || false;
                      const canSelect = !isSelected && (selectedCount < (category.maxSelections || Infinity));
                      const canDeselect = isSelected;
                    
                    return (
                      <div
                        key={menuItem.id}
                        className={cn(
                          "border rounded-md p-3 cursor-pointer transition-all hover:shadow-sm",
                          isSelected 
                            ? "border-blue-300 bg-blue-50 shadow-sm" 
                            : canSelect 
                              ? "border-gray-200 hover:border-blue-200 hover:bg-blue-25" 
                              : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (isSelected && canDeselect) {
                            // Remove from selection
                            setSelections(prev => ({
                              ...prev,
                              [category.id]: (prev[category.id] || []).filter(id => id !== menuItem.id)
                            }));
                          } else if (!isSelected && canSelect) {
                            // Add to selection
                            setSelections(prev => ({
                              ...prev,
                              [category.id]: [...(prev[category.id] || []), menuItem.id]
                            }));
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 flex-1">
                            <div className={cn(
                              "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              isSelected 
                                ? "border-blue-400 bg-blue-400" 
                                : "border-gray-300 hover:border-blue-300"
                            )}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-gray-900">{menuItem.name}</h4>
                              {menuItem.description && (
                                <p className="text-xs text-gray-600 mt-0.5">{menuItem.description}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-blue-600 font-medium text-xs">
                              Selected
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            );
          })}          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="special-instructions" className="font-semibold text-muted-foreground">Special Instructions</Label>
            <Textarea 
              id="special-instructions" 
              placeholder="e.g. no onions, extra spicy" 
              value={instructions}
              onChange={(e) => {
                const text = e.target.value;
                const words = text.trim().split(/\s+/).filter(Boolean);
                if (words.length <= 10) {
                  setInstructions(text);
                } else {
                  setInstructions(words.slice(0, 10).join(' '));
                }
              }}
              className="p-3"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(instructions.trim() ? instructions.trim().split(/\s+/).filter(Boolean).length : 0)} / 10 words
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex-col gap-4 pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Label className="font-semibold text-muted-foreground">Quantity</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q-1))}>
                <MinusCircle className="h-5 w-5"/>
              </Button>
              <span className="font-bold text-lg w-10 text-center">{quantity}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantity(q => q+1)}>
                <PlusCircle className="h-5 w-5"/>
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleConfirm} 
            disabled={!isSelectionComplete()}
            className="w-full font-headline text-lg h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
          >
            {isSelectionComplete() 
              ? `Add to Order - ${currencySymbol}${(item.price * quantity).toFixed(2)}`
              : "Please complete your selections"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Optimized MenuNav component with performance improvements
function MenuItemDialog({
  item,
  isOpen,
  onClose,
  onAddToCart,
  currencySymbol
}: {
  item: LocalMenuItem & { mealDeal?: boolean; categories?: MealDealCategory[] };
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  currencySymbol: string;
}) {
  // If this is a meal deal, use the MealDealDialog instead
  if ((item as any).mealDeal && (item as any).categories) {
    return (
      <MealDealDialog 
        item={item}
        isOpen={isOpen}
        onClose={onClose}
        onAddToCart={onAddToCart}
        currencySymbol={currencySymbol}
      />
    );
  }

  // Regular menu item dialog logic
  const [quantity, setQuantity] = React.useState(1);
  const [instructions, setInstructions] = React.useState('');
  const [selectedAddons, setSelectedAddons] = React.useState<SelectedAddon[]>([]);
  const [addonPrice, setAddonPrice] = React.useState(0);
  const [itemAddonGroups, setItemAddonGroups] = React.useState<AddonGroup[]>([]);
  const [loadingAddons, setLoadingAddons] = React.useState(false);
  
  // Price variants state
  const [variants, setVariants] = React.useState<MenuVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = React.useState<MenuVariant | null>(null);
  const [loadingVariants, setLoadingVariants] = React.useState(false);
  
  const { tenantData } = useTenant();
  const { menuItems = [], categories = [] } = useTenantData();

  const loadItemAddons = React.useCallback(async () => {
    try {
      setLoadingAddons(true);
      
      // Fetch fresh addon data directly from API to ensure we have the latest data
      const response = await fetch(`/api/menu?tenantId=${tenantData?.slug || 'kitchen'}&action=menu`);
      const menuData = await response.json();
      
      if (menuData.success) {
        const allItems = menuData.data.flatMap((cat: any) => cat.items);
        const freshItem = allItems.find((i: any) => i.id === item.id);
        
        if (freshItem && freshItem.addons && Array.isArray(freshItem.addons) && freshItem.addons.length > 0) {
          // Convert SimpleAddon[] to AddonGroup format
          const addonGroup: AddonGroup = {
            id: `simple_addons_${item.id}`,
            tenantId: tenantData?.id || '',
            name: 'Add-ons',
            description: 'Optional add-ons for your item',
            category: 'extras',
            type: 'multiple',
            required: false,
            minSelections: 0,
            maxSelections: freshItem.addons.length,
            displayOrder: 0,
            active: true,
            options: freshItem.addons.map((addon: any, index: number) => ({
              id: addon.id || `simple_${index}`,
              addonGroupId: `simple_addons_${item.id}`,
              name: addon.name || `Add-on ${index + 1}`,
              description: undefined,
              price: parseFloat(addon.price.toString()) || 0,
              available: true,
              displayOrder: index,
              createdAt: new Date(),
              updatedAt: new Date()
            })),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          setItemAddonGroups([addonGroup]);
        } else {
          setItemAddonGroups([]);
        }
      } else {
        setItemAddonGroups([]);
      }
    } catch (error) {
      console.error('Error loading item addons:', error);
      setItemAddonGroups([]);
    } finally {
      setLoadingAddons(false);
    }
  }, [item.id, tenantData?.id, tenantData?.slug]);

  // Load price variants for the item
  const loadVariants = React.useCallback(async () => {
    try {
      setLoadingVariants(true);
      const variantsData = await MenuVariantsService.getVariants(item.id);
      const activeVariants = variantsData.filter(v => v.active);
      setVariants(activeVariants);
      
      // Auto-select the first variant if available
      if (activeVariants.length > 0) {
        setSelectedVariant(activeVariants[0]);
      } else {
        setSelectedVariant(null);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
      setVariants([]);
      setSelectedVariant(null);
    } finally {
      setLoadingVariants(false);
    }
  }, [item.id]);

  React.useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setInstructions('');
      setSelectedAddons([]);
      setAddonPrice(0);
      loadItemAddons();
      loadVariants();
    }
  }, [isOpen, loadItemAddons, loadVariants]);

  const handleAddonSelectionChange = React.useCallback((addons: SelectedAddon[], totalAddonPrice: number) => {
    setSelectedAddons(addons);
    setAddonPrice(totalAddonPrice);
  }, []);
  
  // Calculate total price
  const totalPrice = React.useMemo(() => {
    const basePrice = selectedVariant ? Number(selectedVariant.price) : item.price;
    return (basePrice + addonPrice) * quantity;
  }, [item.price, selectedVariant, addonPrice, quantity]);

  const handleConfirm = () => {
    // Create item with variant price if variant is selected
    const itemWithVariantPrice = selectedVariant ? {
      ...item,
      price: Number(selectedVariant.price),
      variantName: selectedVariant.name,
      variantId: selectedVariant.id
    } : item;
    
    onAddToCart(itemWithVariantPrice, quantity, instructions, selectedAddons);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-0">
          {item.image && !item.image.includes('placehold.co') && (
            <div className="relative h-48 -mx-6 -mt-6 mb-4">
              <img src={item.image!} alt={item.name} className="w-full h-full rounded-t-lg object-cover" />
            </div>
          )}
          <DialogTitle className="font-headline text-2xl">{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6 max-h-[50vh] overflow-y-auto pr-2">
            {/* Dietary Characteristics Display */}
            <div className="space-y-2">
              <DietaryCharacteristicsDisplay
                menuItemId={item.id}
                tenantId={tenantData?.slug || ''}
                size="md"
                showTooltips={true}
                className="flex flex-wrap gap-2"
              />
            </div>

            {item.nutrition &&
              // Only show if at least one nutrition value is present and not zero/empty
              (item.nutrition.calories || item.nutrition.protein || item.nutrition.carbs || item.nutrition.fat) ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-muted-foreground">Nutrition Facts (per 100g)</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm p-3 border rounded-md">
                    <div className="flex justify-between"><span>Calories</span><span className="font-medium">{item.nutrition.calories} kcal</span></div>
                    <div className="flex justify-between"><span>Protein</span><span className="font-medium">{item.nutrition.protein}g</span></div>
                    <div className="flex justify-between"><span>Carbohydrates</span><span className="font-medium">{item.nutrition.carbs}g</span></div>
                    <div className="flex justify-between"><span>Fat</span><span className="font-medium">{item.nutrition.fat}g</span></div>
                  </div>
                </div>
              ) : null
            }

            {/* Addon Selection */}
            {loadingAddons ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading options...</p>
                </div>
              ) : itemAddonGroups.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <span className="w-1 h-4 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></span>
                    Customize Your Order
                  </h4>
                  <AddonSelection
                    menuItem={item}
                    addonGroups={itemAddonGroups}
                    onSelectionChange={handleAddonSelectionChange}
                    currencySymbol={currencySymbol}
                  />
                </div>
              ) : null
            }

            {/* Price Variants Selection */}
            {loadingVariants ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading size options...</p>
              </div>
            ) : variants.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <span className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></span>
                  Choose Size
                </h4>
                <RadioGroup
                  value={selectedVariant?.id || ''}
                  onValueChange={(value) => {
                    const variant = variants.find(v => v.id === value);
                    setSelectedVariant(variant || null);
                  }}
                  className="space-y-2"
                >
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedVariant?.id === variant.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={variant.id} className="pointer-events-none" />
                        <div>
                          <div className="font-medium text-sm">{variant.name}</div>
                          {variant.description && (
                            <div className="text-xs text-muted-foreground">{variant.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-primary">
                        {currencySymbol}{Number(variant.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : null}

            {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="special-instructions" className="font-semibold text-muted-foreground">Special Instructions</Label>
            <Textarea 
              id="special-instructions" 
              placeholder="e.g. no onions, extra spicy" 
              value={instructions}
              onChange={(e) => {
                const text = e.target.value;
                const words = text.trim().split(/\s+/).filter(Boolean);
                if (words.length <= 10) {
                  setInstructions(text);
                } else {
                  setInstructions(words.slice(0, 10).join(' '));
                }
              }}
              className="p-3"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(instructions.trim() ? instructions.trim().split(/\s+/).filter(Boolean).length : 0)} / 10 words
            </p>
          </div>
        </div>
        <DialogFooter className="flex-col gap-4 pt-4 border-t">
            <div className="flex items-center justify-between w-full">
                <Label className="font-semibold text-muted-foreground">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => Math.max(1, q-1))}><MinusCircle className="h-5 w-5"/></Button>
                  <span className="font-bold text-lg w-10 text-center">{quantity}</span>
                  <Button variant="outline" size="icon" onClick={() => setQuantity(q => q+1)}><PlusCircle className="h-5 w-5"/></Button>
                </div>
            </div>
            
            {/* Price Breakdown */}
            {(addonPrice > 0 || selectedVariant) && (
              <div className="w-full space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>{selectedVariant ? `${selectedVariant.name} price:` : 'Base price:'}</span>
                  <span>{currencySymbol}{(selectedVariant ? Number(selectedVariant.price) : item.price).toFixed(2)}</span>
                </div>
                {addonPrice > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons:</span>
                    <span>{currencySymbol}{addonPrice.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between font-medium text-foreground">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{((selectedVariant ? Number(selectedVariant.price) : item.price) + addonPrice).toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button onClick={handleConfirm} className="w-full font-headline text-lg h-12 bg-green-600 hover:bg-green-700">
              Add to Order - {currencySymbol}{totalPrice.toFixed(2)}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Optimized MenuItem component with React.memo for performance
const MenuItem = React.memo(function MenuItem({
  item,
  onAddToCart,
  currencySymbol,
  tenantId
}: {
  item: LocalMenuItem;
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  currencySymbol: string;
  tenantId: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [variants, setVariants] = React.useState<MenuVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = React.useState(false);
  const [selectedVariant, setSelectedVariant] = React.useState<MenuVariant | null>(null);

  // Load variants for this item
  React.useEffect(() => {
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
  const hasImage = React.useMemo(() => 
    item.image && item.image.length > 0 && !item.image.includes('placehold.co'), 
    [item.image]
  );

  const isBasePriceZero = React.useMemo(() => item.price === 0, [item.price]);
  
  const displayPrice = React.useMemo(() => item.price, [item.price]);
  const pricePrefix = '';

  // Memoized handlers to prevent unnecessary re-renders
  const handleQuickAdd = React.useCallback((e: React.MouseEvent) => {
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

  const handleVariantSelect = React.useCallback((variant: MenuVariant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening dialog
    setSelectedVariant(variant);
  }, []);

  const handleOpenDialog = React.useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  return (
    <>
      <div 
        className="relative group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden hover:border-primary/20 hover:-translate-y-1"
        onClick={handleOpenDialog}
      >
        {/* Modern Layout Structure */}
        <div className="flex items-start p-3 space-x-3">
          {/* Content Area - Enhanced Typography */}
          <div className="flex-1 min-w-0">
            {/* Item Title with Professional Typography */}
            <div className="mb-2">
              <h4 className="font-semibold text-base text-gray-900 leading-tight mb-1 group-hover:text-primary transition-colors duration-200">
                {item.name}
              </h4>
              {item.description && (
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}
              
              {/* Dietary Characteristics Display */}
              <div className="mt-1.5">
                <DietaryCharacteristicsDisplay
                  menuItemId={item.id}
                  tenantId={tenantId}
                  size="sm"
                />
              </div>
            </div>
            
            {/* Enhanced Price and Features Section */}
            <div className="flex items-center justify-between mt-auto">
              {/* Price Variants Display */}
              {loadingVariants ? (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : variants.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={(e) => handleVariantSelect(variant, e)}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="font-medium">{variant.name}</span>
                      <span className="ml-1 font-semibold">{currencySymbol}{Number(variant.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                /* Professional Price Display */
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-bold text-primary">
                    {currencySymbol}{typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}
                  </span>
                  {isBasePriceZero && (
                    <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full">
                      Starting
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* DEBUG: Show addon details */}
            {item.addons && item.addons.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-xs">
                <strong>Addons:</strong>
                {item.addons.map((addon: any, index: number) => (
                  <div key={index}>• {addon.name} - {currencySymbol}{addon.price}</div>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Image and Smart Action Button */}
          <div className="relative flex-shrink-0">
            {hasImage ? (
              <div className="relative">
                {/* Professional Image Container */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-all duration-300 border-2 border-white ring-1 ring-gray-100">
                  <img
                    src={item.image!}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Subtle Overlay for Better Button Visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Premium Add Button */}
                <div className="absolute -bottom-1.5 -right-1.5">
                  <Button
                    size="icon"
                    onClick={handleQuickAdd}
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-white ring-1 ring-green-200 hover:ring-green-300"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <Plus className="h-5 w-5 text-white font-bold" />
                  </Button>
                </div>
              </div>
            ) : (
              /* No-Image Container with Bottom-Right Positioned Button */
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <div className="absolute -bottom-1.5 -right-1.5">
                  <Button
                    size="icon"
                    onClick={handleQuickAdd}
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-white ring-1 ring-green-200 hover:ring-green-300"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <Plus className="h-5 w-5 text-white font-bold" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subtle Bottom Accent */}
        <div className="h-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <MenuItemDialog 
        item={item} 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onAddToCart={onAddToCart}
        currencySymbol={currencySymbol}
      />
    </>
  );
});

const MenuSection = React.memo(function MenuSection({
  menuData,
  onAddToCart,
  searchQuery: debouncedSearchQuery,
  setSearchQuery,
  currencySymbol,
  tenantId
}: {
  menuData: {
      category: Category;
      items: LocalMenuItem[];
      subCategories: { category: Category; items: LocalMenuItem[] }[]
  }[];
  onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currencySymbol: string;
  tenantId: string;
}) {

  const accordionDefaultValue = debouncedSearchQuery ? menuData.map(d => d.category.name) : (menuData.length > 0 ? [menuData[0].category.name] : []);
  
  return (
    <div className="space-y-8 px-2">
      {/* Enhanced Menu Categories */}
      <Accordion type="multiple" defaultValue={accordionDefaultValue} className="w-full space-y-6">{" "}
        {menuData.map(({ category, items, subCategories }) => (
          <Card key={category.id} className="border-0 shadow-lg overflow-hidden bg-white rounded-2xl">
            <AccordionItem
              value={category.name}
              id={`cat-${category.id}`}
              className="border-none"
            >
              <AccordionTrigger className="font-headline text-lg scroll-mt-40 bg-gradient-to-r from-primary/10 via-primary/8 to-primary/10 hover:from-primary/15 hover:via-primary/12 hover:to-primary/15 text-foreground px-6 py-4 font-bold hover:no-underline transition-all duration-300 [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-primary/20 [&[data-state=open]]:via-primary/15 [&[data-state=open]]:to-primary/20 rounded-t-2xl group">
                <div className="flex items-center gap-3">
                  {category.icon && (
                    <span className="text-2xl bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      {category.icon}
                    </span>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-gray-900 group-hover:text-primary transition-colors duration-200">
                      {category.name}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 py-6 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      onAddToCart={onAddToCart}
                      currencySymbol={currencySymbol}
                      tenantId={tenantId}
                    />
                  ))}
                </div>
                 {subCategories.length > 0 && (
                  <div className="mt-8 space-y-6">
                    {subCategories.map(({ category: subCat, items: subItems }) => (
                       <div key={subCat.id}>
                         <div className="flex items-center gap-3 mb-4">
                           <div className="w-1 h-8 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
                           <h4 className="font-bold text-lg text-gray-800">{subCat.name}</h4>
                           <div className="h-px bg-gradient-to-r from-primary/30 to-transparent flex-1"></div>
                           <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                             {subItems.length} items
                           </span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {subItems.map((item) => (
                              <MenuItem
                                key={item.id}
                                item={item}
                                onAddToCart={onAddToCart}
                                currencySymbol={currencySymbol}
                                tenantId={tenantId}
                              />
                           ))}
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Card>
        ))}
      </Accordion>
        
        {/* Enhanced No results message */}
        {menuData.length === 0 && debouncedSearchQuery && (
            <Card className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
              <CardContent className="text-center py-16">
                  <div className="max-w-md mx-auto">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                        <Search className="h-12 w-12 text-primary" />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">No items found</h3>
                      <p className="text-gray-600 mb-4">
                        We couldn't find any items matching <span className="font-semibold text-primary">"{debouncedSearchQuery}"</span>
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Try:</span> Different keywords, browse categories, or check spelling
                        </p>
                      </div>
                  </div>
              </CardContent>
            </Card>
        )}
      </div>
  );
});

const OrderSummary = React.memo(function OrderSummary({
  order,
  updateQuantity,
  removeFromOrder,
  clearOrder,
  currencySymbol,
  router,
  hideCartItems = false,
  paymentConfig,
  stripePublishableKey
}: {
  order: OrderItem[];
  updateQuantity: (orderItemId: string, quantity: number) => void;
  removeFromOrder: (orderItemId: string) => void;
  clearOrder: () => void;
  currencySymbol: string;
  router: any;
  hideCartItems?: boolean;
  paymentConfig?: {
    configured: boolean;
    activeGateway: string | null;
    gatewayName: string;
    stripeMode?: string;
    globalPaymentsEnvironment?: string;
  } | null;
  stripePublishableKey: string;
}) {
  const { toast } = useToast();
  const { restaurantSettings, currentUser, createOrder } = useTenantData();
  const { tenantData } = useTenant();
  
  const totalItems = order.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = order.reduce(
    (acc, item) => {
      const itemPrice = item.price;
      const addonPrice = calculateSelectedAddonPrice(item.selectedAddons);
      return acc + (itemPrice + addonPrice) * item.quantity;
    },
    0
  );
  // No tax calculation - application is tax-free
  
  const availableOrderTypes = React.useMemo(() => [
        restaurantSettings?.orderTypeSettings?.deliveryEnabled && 'delivery',
        restaurantSettings?.orderTypeSettings?.collectionEnabled && 'collection',
        restaurantSettings?.orderTypeSettings?.advanceOrderEnabled && 'advance',
    ].filter(Boolean) as ('delivery' | 'collection' | 'advance')[], [restaurantSettings]);

  // Check if card payment is enabled based on payment configuration
  const isCardPaymentEnabled = React.useMemo(() => {
    const result = paymentConfig?.configured && paymentConfig?.activeGateway;
    console.log('🔧 isCardPaymentEnabled calculation:', {
      paymentConfig,
      configured: paymentConfig?.configured,
      activeGateway: paymentConfig?.activeGateway,
      result: result
    });
    return result;
  }, [paymentConfig]);

  // Determine available payment methods
    const availablePaymentMethods = React.useMemo(() => {
    const methods: ('cash' | 'card' | 'gift_card')[] = [];

    if (restaurantSettings?.paymentSettings?.cash?.enabled) {
      methods.push('cash');
    }

    if (isCardPaymentEnabled) {
      methods.push('card');
    }

    if (restaurantSettings?.paymentSettings?.giftCards?.enabled) {
      methods.push('gift_card');
    }

    console.log('🔧 availablePaymentMethods calculation:', {
      cashEnabled: restaurantSettings?.paymentSettings?.cash?.enabled,
      cardEnabled: isCardPaymentEnabled,
      giftCardEnabled: restaurantSettings?.paymentSettings?.giftCards?.enabled,
      methods,
      restaurantPaymentSettings: restaurantSettings?.paymentSettings
    });

    return methods;
  }, [restaurantSettings?.paymentSettings?.cash?.enabled, restaurantSettings?.paymentSettings?.giftCards?.enabled, isCardPaymentEnabled]);

  const defaultOrderType = availableOrderTypes.length > 0 ? availableOrderTypes[0] : 'delivery';
  const defaultPaymentMethod = availablePaymentMethods.length > 0 ? availablePaymentMethods[0] : 'cash';
  
  const [selectedOrderType, setSelectedOrderType] = React.useState<'delivery' | 'collection' | 'advance'>(defaultOrderType);
  const [advanceFulfillmentType, setAdvanceFulfillmentType] = React.useState<'delivery' | 'collection'>('delivery');
  
  const [advanceDate, setAdvanceDate] = React.useState<Date | undefined>();
  const [advanceTime, setAdvanceTime] = React.useState('');
  const [timeSlots, setTimeSlots] = React.useState<string[]>([]);
  
  const [postcode, setPostcode] = React.useState(currentUser?.addresses?.find(a => a.isDefault)?.postcode || '');
  const [deliveryFee, setDeliveryFee] = React.useState(0);
  const [deliveryError, setDeliveryError] = React.useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'cash' | 'card' | 'gift_card'>(defaultPaymentMethod);
  const [showStripePaymentForm, setShowStripePaymentForm] = React.useState(false);
  const [voucherInput, setVoucherInput] = React.useState('');
  const [voucherError, setVoucherError] = React.useState('');
  const [appliedVoucher, setAppliedVoucher] = React.useState<Voucher | null>(null);
  const [orderNote, setOrderNote] = React.useState(''); // Overall order note/special instructions
  
  // Loyalty Points Redemption State
  const [customerAuth, setCustomerAuth] = React.useState<{authenticated: boolean, customer: any} | null>(null);
  const [loyaltyData, setLoyaltyData] = React.useState<{pointsBalance: number} | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = React.useState('');
  const [pointsDiscount, setPointsDiscount] = React.useState(0);
  const [pointsError, setPointsError] = React.useState('');
  const [showPointsSection, setShowPointsSection] = React.useState(false);
  
  // Gift card state
  const [giftCardCode, setGiftCardCode] = React.useState('');
  const [giftCardBalance, setGiftCardBalance] = React.useState<number | null>(null);
  const [giftCardStatus, setGiftCardStatus] = React.useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [giftCardError, setGiftCardError] = React.useState('');
  
  // Update selected payment method when available methods change
  React.useEffect(() => {
    if (!availablePaymentMethods.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(defaultPaymentMethod);
    }
  }, [availablePaymentMethods, selectedPaymentMethod, defaultPaymentMethod]);

  // Reset gift card data when method changes
  React.useEffect(() => {
    if (selectedPaymentMethod !== 'gift_card') {
      setGiftCardCode('');
      setGiftCardBalance(null);
      setGiftCardStatus('idle');
      setGiftCardError('');
    }
  }, [selectedPaymentMethod]);

  // Calculate delivery fee based on postcode and order value
  React.useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')) {
        if (!postcode.trim() || !tenantData?.id) {
          setDeliveryFee(0);
          setDeliveryError('');
          return;
        }
        
        try {
          const result = await TenantZoneService.calculateDeliveryFee(tenantData.id, postcode, subtotal);
          if (result.error) {
            setDeliveryError(result.error);
            setDeliveryFee(0);
          } else {
            setDeliveryError('');
            setDeliveryFee(result.fee);
          }
        } catch (error) {
          console.error('Error calculating delivery fee:', error);
          setDeliveryError('Unable to calculate delivery fee');
          setDeliveryFee(0);
        }
      } else {
        setDeliveryFee(0);
        setDeliveryError('');
      }
    };
    
    calculateDeliveryFee();
  }, [selectedOrderType, advanceFulfillmentType, postcode, subtotal, tenantData?.id]);

  // Check customer authentication for loyalty points
  React.useEffect(() => {
    const checkCustomerAuth = async () => {
      try {
        const response = await fetch('/api/customer/check-auth', {
          credentials: 'include'
        });
        const data = await response.json();
        setCustomerAuth(data);
        
        if (data.authenticated) {
          // Fetch loyalty data
          const loyaltyResponse = await fetch('/api/customer/loyalty', {
            credentials: 'include'
          });
          const loyaltyResult = await loyaltyResponse.json();
          if (loyaltyResult.success) {
            setLoyaltyData(loyaltyResult.loyalty);
            setShowPointsSection(true);
          }
        }
      } catch (error) {
        console.error('Error checking customer auth:', error);
        setCustomerAuth({ authenticated: false, customer: null });
      }
    };
    
    checkCustomerAuth();
  }, []);

  // Generate time slots for advance orders with smart same-day logic
  React.useEffect(() => {
    if (selectedOrderType === 'advance' && advanceDate) {
      const slots: string[] = [];
      const now = new Date();
      const selectedDate = new Date(advanceDate);
      
      // Normalize dates for comparison (remove time component)
      const todayNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDateNormalized = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const isToday = todayNormalized.getTime() === selectedDateNormalized.getTime();
      
      // Get settings with proper defaults
      const minHoursNotice = restaurantSettings?.advanceOrderSettings?.minHoursNotice || 4;
      const timeSlotInterval = restaurantSettings?.advanceOrderSettings?.timeSlotInterval || 15;
      
      let startHour = 0;
      let startMinute = 0;
      
      if (isToday) {
        // For same day, start from current time + minimum notice
        const earliestTime = new Date(now.getTime() + (minHoursNotice * 60 * 60 * 1000));
        startHour = earliestTime.getHours();
        startMinute = Math.ceil(earliestTime.getMinutes() / timeSlotInterval) * timeSlotInterval;
        
        // If minutes overflow to next hour
        if (startMinute >= 60) {
          startHour += 1;
          startMinute = 0;
        }
        
        // If we've passed business hours for today, no slots available
        if (startHour >= 24) {
          setTimeSlots([]);
          return;
        }
      }
      
      // Generate slots for the day (business hours can be customized here)
      const businessStartHour = 9; // 9 AM
      const businessEndHour = 22; // 10 PM
      
      const actualStartHour = isToday ? Math.max(startHour, businessStartHour) : businessStartHour;
      const actualStartMinute = isToday && startHour === actualStartHour ? startMinute : 0;
      
      for (let hour = actualStartHour; hour < businessEndHour; hour++) {
        const minuteStart = (hour === actualStartHour) ? actualStartMinute : 0;
        
        for (let minute = minuteStart; minute < 60; minute += timeSlotInterval) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
      
      // If it's today and no slots available, clear selections
      if (isToday && slots.length === 0) {
        setAdvanceDate(undefined);
        setAdvanceTime('');
        // Could show a toast message here about selecting a future date
        return;
      }
      
      setTimeSlots(slots);
      
      // Auto-select first available slot if none selected
      if (slots.length > 0 && !advanceTime) {
        // Don't auto-select, let user choose
        // setAdvanceTime(slots[0]);
      }
    } else {
      setTimeSlots([]);
    }
  }, [selectedOrderType, advanceDate, restaurantSettings?.advanceOrderSettings]);

  const [voucherDiscount, setVoucherDiscount] = React.useState(0);

  // Calculate voucher discount when applied voucher changes
  React.useEffect(() => {
    const calculateDiscount = async () => {
      if (appliedVoucher) {
        const discount = await TenantVoucherService.calculateVoucherDiscount(appliedVoucher, subtotal);
        setVoucherDiscount(discount);
      } else {
        setVoucherDiscount(0);
      }
    };
    calculateDiscount();
  }, [appliedVoucher, subtotal]);

  // Calculate final total without tax (application is tax-free)
  const finalTotal = subtotal + deliveryFee - voucherDiscount - pointsDiscount;

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) {
      setVoucherError('Please enter a voucher code');
      return;
    }

    if (!tenantData?.id) {
      setVoucherError('Unable to validate voucher');
      return;
    }

    try {
      const result = await TenantVoucherService.validateTenantVoucher(tenantData.id, voucherInput, subtotal);
      
      if (result.valid && result.voucher) {
        setAppliedVoucher(result.voucher);
        setVoucherError('');
        const discount = await TenantVoucherService.calculateVoucherDiscount(result.voucher, subtotal);
        toast({
          title: 'Voucher Applied!',
          description: `You saved ${currencySymbol}${discount.toFixed(2)}`,
        });
      } else {
        setVoucherError(result.error || 'Invalid voucher code');
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      setVoucherError('Unable to validate voucher. Please try again.');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    toast({
      title: 'Voucher Removed',
      description: 'The voucher discount has been removed from your order.',
    });
  };

  // Handle points redemption validation
  const handleApplyPoints = async () => {
    const points = parseInt(pointsToRedeem);
    
    if (!points || points <= 0) {
      setPointsError('Please enter a valid number of points');
      return;
    }

    try {
      const response = await fetch('/api/customer/redeem-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          pointsToRedeem: points,
          orderTotal: subtotal + deliveryFee - voucherDiscount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setPointsDiscount(parseFloat(result.redemption.discountAmount));
        setPointsError('');
        toast({
          title: 'Points Applied!',
          description: `You saved £${result.redemption.discountAmount} using ${points} points`,
        });
      } else {
        setPointsError(result.error || 'Unable to apply points');
      }
    } catch (error) {
      console.error('Error applying points:', error);
      setPointsError('Unable to apply points. Please try again.');
    }
  };

  const handleRemovePoints = () => {
    setPointsDiscount(0);
    setPointsToRedeem('');
    setPointsError('');
    toast({
      title: 'Points Removed',
      description: 'The points discount has been removed from your order.',
    });
  };

  // Validate gift card balance
  const handleCheckGiftCard = async () => {
    if (!tenantData?.slug) {
      setGiftCardError('Tenant info missing.');
      return;
    }
    if (!giftCardCode.trim()) {
      setGiftCardError('Please enter a gift card number');
      return;
    }
    try {
      setGiftCardError('');
      setGiftCardStatus('checking');
      const res = await fetch(`/api/tenant/${tenantData.slug}/gift-cards/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to check balance');
      }
      setGiftCardBalance(parseFloat(data.balance));
      if ((data.is_expired || data.status === 'expired') || parseFloat(data.balance) <= 0) {
        setGiftCardStatus('invalid');
        setGiftCardError('Gift card is expired or has no balance');
      } else {
        setGiftCardStatus('valid');
      }
    } catch (err: any) {
      setGiftCardStatus('invalid');
      setGiftCardError(err?.message || 'Failed to validate gift card');
    }
  };

  // Process card payment using Global Payments
  const processCardPayment = async (formData: FormData, amount: number, customerName: string) => {
    try {
      console.log('🔄 Processing card payment with tenant data:', tenantData);
      console.log('🔧 Payment settings:', restaurantSettings?.paymentSettings);
      
      if (!tenantData?.slug) {
        throw new Error('Tenant information not available. Please reload the page.');
      }

      // Determine which payment gateway to use based on payment configuration
      if (!paymentConfig?.configured || !paymentConfig?.activeGateway) {
        throw new Error('Payment gateway not configured. Please contact the restaurant.');
      }

      let paymentGateway = paymentConfig.activeGateway;
      let apiEndpoint = null;

      if (paymentGateway === 'stripe') {
        apiEndpoint = `/api/tenant/${tenantData.slug}/payments/stripe`;
      } else if (paymentGateway === 'global_payments') {
        paymentGateway = 'globalPayments'; // Keep the old naming for compatibility
        apiEndpoint = `/api/payments/global-payments-sdk`;
      } else {
        throw new Error(`Unsupported payment gateway: ${paymentGateway}`);
      }

      console.log('💳 Using payment gateway:', paymentGateway, 'API endpoint:', apiEndpoint);
      
      const cardNumber = formData.get('cardNumber') as string;
      const expiryDate = formData.get('expiryDate') as string;
      const cvv = formData.get('cvv') as string;
      const cardholderName = formData.get('cardholderName') as string || customerName;

      console.log('Card payment data:', {
        cardNumber: cardNumber ? '****' + cardNumber.slice(-4) : 'missing',
        expiryDate,
        cvv: cvv ? '***' : 'missing',
        cardholderName,
        customerName,
        gateway: paymentGateway
      });

      if (!cardNumber || !expiryDate || !cvv) {
        throw new Error('Please fill in all card details');
      }

      if (!cardholderName || cardholderName.trim().length === 0) {
        throw new Error('Please enter the cardholder name');
      }

      // Parse expiry date (MM/YY format)
      const [expMonth, expYear] = expiryDate.split('/');
      if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
        throw new Error('Invalid expiry date format. Use MM/YY');
      }

      // Get billing address for card payment
      const billingAddress = selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery') ? {
        line_1: formData.get('address') as string,
        city: formData.get('city') as string,
        postal_code: formData.get('postcode') as string,
        country: 'GB'
      } : undefined;

      // Create payment request based on gateway
      let paymentRequest;
      const orderReference = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (paymentGateway === 'stripe') {
        paymentRequest = {
          action: 'create_payment_intent',
          amount: amount, // Send amount in pounds, API will convert to cents
          currency: 'gbp',
          orderId: orderReference, // Required field for Stripe API
          customerName: cardholderName,
          description: `Online Order - ${tenantData?.name || 'Restaurant'}`,
          metadata: {
            order_reference: orderReference,
            customer_name: customerName,
            payment_gateway: 'stripe'
          },
          payment_method_data: {
            type: 'card',
            card: {
              number: cardNumber.replace(/\s/g, ''),
              exp_month: parseInt(expMonth),
              exp_year: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
              cvc: cvv
            },
            billing_details: {
              name: cardholderName,
              address: billingAddress ? {
                line1: billingAddress.line_1,
                city: billingAddress.city,
                postal_code: billingAddress.postal_code,
                country: billingAddress.country
              } : undefined
            }
          }
        };
      } else if (paymentGateway === 'worldpay') {
        // Worldpay format
        paymentRequest = {
          action: 'process_payment',
          amount: amount,
          orderId: orderReference,
          paymentMethod: {
            card: {
              number: cardNumber.replace(/\s/g, ''),
              exp_month: expMonth,
              exp_year: expYear.length === 2 ? `20${expYear}` : expYear,
              cvc: cvv
            },
            billing_details: {
              name: cardholderName,
              address: billingAddress ? {
                line1: billingAddress.line_1,
                city: billingAddress.city,
                postal_code: billingAddress.postal_code,
                country: billingAddress.country
              } : undefined
            }
          }
        };
      } else {
        // Global Payments SDK format
        paymentRequest = {
          action: 'process-payment',
          tenantId: tenantData.id,
          paymentRequest: {
            amount: amount,
            currency: 'GBP',
            orderId: orderReference,
            customerEmail: formData.get('email') as string || '',
            customerName: cardholderName,
            customerPhone: formData.get('phone') as string,
            billingAddress: billingAddress ? {
              streetAddress1: billingAddress.line_1,
              city: billingAddress.city,
              postalCode: billingAddress.postal_code,
              countryCode: billingAddress.country || 'GB'
            } : undefined
          },
          cardData: {
            number: cardNumber.replace(/\s/g, ''),
            expMonth: parseInt(expMonth),
            expYear: parseInt(expYear.length === 2 ? `20${expYear}` : expYear),
            cvv: cvv,
            holderName: cardholderName
          }
        };
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentRequest),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Payment processing failed');
      }

      return result;
    } catch (error) {
      console.error('Card payment processing error:', error);
      throw error;
    }
  };

  // Initialize the super optimized place order handler
  const handlePlaceOrder = React.useMemo(() => {
    return createSuperOptimizedPlaceOrderHandler({
      toast,
      createOrder,
      clearOrder,
      TenantVoucherService,
      calculateSelectedAddonPrice
    });
  }, [toast, createOrder, clearOrder]);

  // Create order with payment reference (for Stripe payments)
  const createOrderWithPayment = async (paymentIntentId: string) => {
    try {
      const formElement = document.querySelector('form[data-order-form="true"]') as HTMLFormElement;
      if (!formElement) {
        throw new Error('Order form not found');
      }

      const formData = new FormData(formElement);
      
      // Get form values
      const customerName = formData.get('customerName') as string;
      const customerPhone = formData.get('customerPhone') as string;
      const customerEmail = formData.get('customerEmail') as string;

      // Calculate voucher discount
      const voucherDiscount = appliedVoucher ? (appliedVoucher.type === 'percentage' 
        ? (subtotal * appliedVoucher.value) / 100 
        : appliedVoucher.value) : 0;

      const orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'> = {
        customerName,
        customerPhone,
        customerEmail: customerEmail || '',
        address: selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery') 
          ? `${formData.get('address')}, ${formData.get('city')}, ${formData.get('postcode')}` 
          : 'Collection',
        total: finalTotal,
        orderType: selectedOrderType,
        orderSource: 'online',
        paymentMethod: selectedPaymentMethod,
        items: order.map(item => {
          const addonPrice = calculateSelectedAddonPrice(item.selectedAddons);
          return {
            id: item.orderItemId,
            menuItem: {
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              available: true,
              categoryId: item.categoryId || '',
            },
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            selectedAddons: item.selectedAddons || [],
            specialInstructions: item.specialInstructions || '',
            basePrice: item.price,
            addonPrice: addonPrice,
            finalPrice: item.price + addonPrice,
          };
        }),
        scheduledTime: selectedOrderType === 'advance' && advanceDate && advanceTime 
          ? new Date(`${advanceDate.toISOString().split('T')[0]}T${advanceTime}:00`) 
          : undefined,
        isAdvanceOrder: selectedOrderType === 'advance',
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        discount: voucherDiscount + pointsDiscount,
        tax: 0,
        voucherCode: appliedVoucher?.code || undefined,
        printed: false,
        customerId: undefined,
        // Add payment transaction reference for Stripe payment
        paymentTransactionId: paymentIntentId,
        // Add overall order note/special instructions
        specialInstructions: orderNote.trim() || undefined,
      };

      const orderResult = await createOrder(orderData);
      
      // Process loyalty points redemption if points were used
      if (parseInt(pointsToRedeem) > 0 && customerAuth) {
        try {
          const response = await fetch('/api/customer/redeem-points', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              pointsToRedeem: parseInt(pointsToRedeem),
              orderId: orderResult.orderId,
              orderTotal: finalTotal
            }),
          });

          if (!response.ok) {
            console.error('Failed to redeem points, but order was placed successfully');
          }
        } catch (error) {
          console.error('Error redeeming points:', error);
        }
      }
      
      // Clear the cart and form state
      clearOrder();
      setDeliveryFee(0);
      setVoucherInput('');
      setAppliedVoucher(null);
      setPointsToRedeem('');
      setPointsDiscount(0);
      setOrderNote('');

      toast({
        title: 'Order Placed Successfully!',
        description: `Your order #${orderResult.orderNumber} has been confirmed and payment processed.`,
      });
      
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: 'Order Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Check if no order types are available
  if (availableOrderTypes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-4 sm:py-8">
          <X className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mb-2 sm:mb-4" />
          <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Orders Currently Unavailable</h3>
          <p className="text-muted-foreground text-center text-sm sm:text-base">
            All order types (delivery, collection, advance) are currently disabled.<br />
            Please contact the restaurant directly or try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (order.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-4 sm:py-8">
          <ShoppingBasket className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-2 sm:mb-4" />
          <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Your basket is empty</h3>
          <p className="text-muted-foreground text-center text-sm sm:text-base">
            Add items from the menu to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
            <ShoppingBasket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="hidden sm:inline">Your Order ({totalItems} items)</span>
            <span className="sm:hidden">Cart ({totalItems})</span>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearOrder} 
            className="text-xs sm:text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        {/* Order Items - Hide when hideCartItems is true (for mobile cart overlay) */}
        {!hideCartItems && (
          <div className="lg:block">
            <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 lg:max-h-none overflow-y-auto">
              {order.map((item) => {
                const addonPrice = calculateSelectedAddonPrice(item.selectedAddons);
                const itemTotalPrice = (item.price + addonPrice) * item.quantity;
                
                return (
                  <div key={item.orderItemId} className="flex items-start justify-between py-2 border-b last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{item.name}</h4>
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.selectedAddons.map((addonGroup, groupIndex) => (
                            <div key={groupIndex} className="mb-1">
                              <span className="font-medium">{addonGroup.groupName}:</span>
                              {addonGroup.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="ml-2">
                                  {option.quantity > 1 ? `${option.quantity}x ` : ''}{option.optionId}
                                  {option.totalPrice > 0 && ` (+${currencySymbol}${option.totalPrice.toFixed(2)})`}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.specialInstructions && (
                        <div className="text-xs sm:text-sm text-muted-foreground italic truncate mt-1">
                          Note: {item.specialInstructions}
                        </div>
                      )}
                      <div className="text-sm sm:text-base font-medium">
                        {currencySymbol}{itemTotalPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 ml-2 sm:ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateQuantity(item.orderItemId, item.quantity - 1)}
                      >
                        <MinusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <span className="w-6 sm:w-8 text-center text-sm sm:text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8"
                        onClick={() => updateQuantity(item.orderItemId, item.quantity + 1)}
                      >
                        <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                        onClick={() => removeFromOrder(item.orderItemId)}
                        title="Remove item"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Type Selection */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <Label className="text-lg font-bold text-gray-900">
            How would you like your order?
          </Label>
          <RadioGroup value={selectedOrderType} onValueChange={(value: any) => setSelectedOrderType(value)}>
            <div className="space-y-3">
              {availableOrderTypes.includes('collection') && (
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="collection" id="collection" />
                  <Label htmlFor="collection" className="font-medium text-gray-900 cursor-pointer">
                    Collection
                  </Label>
                </div>
              )}
              {availableOrderTypes.includes('delivery') && (
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="font-medium text-gray-900 cursor-pointer">
                    Delivery
                  </Label>
                </div>
              )}
              {availableOrderTypes.includes('advance') && (
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="advance" id="advance" />
                  <Label htmlFor="advance" className="font-medium text-gray-900 cursor-pointer">
                    Advance Order
                  </Label>
                </div>
              )}
            </div>
          </RadioGroup>
        </div>

        {/* Advance Order Configuration */}
        {selectedOrderType === 'advance' && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="font-bold text-gray-900">Schedule Your Order</h3>
            
            {/* Step 1: Fulfillment Method */}
            <div className="space-y-3">
              <Label className="font-medium text-gray-900">How would you like to receive your order?</Label>
              <div className="space-y-2">
                {restaurantSettings?.orderTypeSettings?.deliveryEnabled && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="advance-delivery"
                      name="advance-fulfillment"
                      checked={advanceFulfillmentType === 'delivery'}
                      onChange={() => {
                        setAdvanceFulfillmentType('delivery');
                        setAdvanceDate(undefined);
                        setAdvanceTime('');
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="advance-delivery" className="font-medium text-gray-900 cursor-pointer">
                      Delivery
                    </Label>
                  </div>
                )}
                {restaurantSettings?.orderTypeSettings?.collectionEnabled && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="advance-collection"
                      name="advance-fulfillment"
                      checked={advanceFulfillmentType === 'collection'}
                      onChange={() => {
                        setAdvanceFulfillmentType('collection');
                        setAdvanceDate(undefined);
                        setAdvanceTime('');
                      }}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="advance-collection" className="font-medium text-gray-900 cursor-pointer">
                      Collection
                    </Label>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Date and Time Selection */}
            {advanceFulfillmentType && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800">Choose Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-left h-10 bg-white border border-gray-300"
                        >
                          {advanceDate ? (
                            <span>{format(advanceDate, "EEEE, MMMM do, yyyy")}</span>
                          ) : (
                            <span className="text-gray-500">Select a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={advanceDate}
                          onSelect={(date) => {
                            setAdvanceDate(date);
                            setAdvanceTime('');
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const maxDays = restaurantSettings?.advanceOrderSettings?.maxDaysInAdvance || 60;
                            const maxDate = new Date();
                            maxDate.setDate(today.getDate() + maxDays);
                            return date < today || date > maxDate;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time Selection */}
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-800">Choose Time</Label>
                    {advanceDate && timeSlots.length > 0 ? (
                      <Select value={advanceTime} onValueChange={setAdvanceTime}>
                        <SelectTrigger className="h-10 bg-white border border-gray-300">
                          {advanceTime ? (
                            <span className="font-medium">{advanceTime}</span>
                          ) : (
                            <span className="text-gray-500">Select time</span>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled 
                        className="h-10 w-full bg-gray-100 border border-gray-200 text-gray-400"
                      >
                        {advanceDate ? (
                          timeSlots.length === 0 ? "No slots available" : "Loading slots..."
                        ) : (
                          "Select date first"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Order Summary */}
            {advanceDate && advanceTime && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-green-800 font-medium">Order Scheduled</div>
                <div className="text-green-700 text-sm">
                  {advanceFulfillmentType === 'delivery' ? 'Delivery' : 'Collection'} on {format(advanceDate, "EEEE, MMMM do")} at {advanceTime}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Postcode for Delivery */}
        {(selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')) && (
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <Label htmlFor="postcode" className="font-medium text-gray-900">
              Delivery Address
            </Label>
            <Input
              id="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Enter your postcode"
              className="h-10 border border-gray-300"
            />
            <p className="text-sm text-gray-600">We'll calculate delivery fee based on your location</p>
            {deliveryError && (
              <p className="text-sm text-red-600">{deliveryError}</p>
            )}
          </div>
        )}

        {/* Voucher Section */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <Label className="font-medium text-gray-900">
            Promo Code
          </Label>
          {appliedVoucher ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div>
                <span className="text-sm font-medium text-green-700">
                  {appliedVoucher.code} applied
                </span>
                <div className="text-sm text-green-600">
                  You saved {currencySymbol}{voucherDiscount.toFixed(2)}!
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRemoveVoucher}
                className="text-red-600 hover:text-white hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  placeholder="Enter promo code"
                  className="h-10 border border-gray-300"
                />
                <Button 
                  onClick={handleApplyVoucher} 
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
          {voucherError && (
            <p className="text-sm text-red-600">{voucherError}</p>
          )}
        </div>

        {/* Loyalty Points Redemption Section - Only for logged-in customers */}
        {showPointsSection && customerAuth?.authenticated && loyaltyData && loyaltyData.pointsBalance > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <Label className="flex items-center gap-2">
              <span>Redeem Loyalty Points</span>
              <span className="text-xs text-muted-foreground">
                Available: {loyaltyData.pointsBalance || 0} points (£{((loyaltyData.pointsBalance || 0) * 0.01).toFixed(2)})
              </span>
            </Label>
            {pointsDiscount > 0 ? (
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                <div>
                  <span className="text-sm font-medium text-blue-700">
                    {pointsToRedeem} points applied
                  </span>
                  <div className="text-xs text-blue-600">
                    Save £{pointsDiscount.toFixed(2)}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRemovePoints}
                  className="text-red-600 hover:text-white hover:bg-red-600 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  placeholder="Enter Point"
                  type="number"
                  min="100"
                  max={loyaltyData.pointsBalance}
                  className={pointsError ? 'border-destructive' : ''}
                />
                <Button onClick={handleApplyPoints} variant="outline">
                  Apply
                </Button>
              </div>
            )}
            {pointsError && (
              <p className="text-sm text-destructive">{pointsError}</p>
            )}
          </div>
        )}

        {/* Gift Card Section */}
        {selectedPaymentMethod === 'gift_card' && (
          <div className="mt-3 space-y-2">
            <Label htmlFor="giftCard">Gift Card Number</Label>
            <div className="flex gap-2">
              <Input
                id="giftCard"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                placeholder="Enter gift card number"
                className={giftCardError ? 'border-destructive' : ''}
              />
              <Button type="button" onClick={handleCheckGiftCard} disabled={giftCardStatus === 'checking'}>
                {giftCardStatus === 'checking' ? 'Checking…' : 'Check'}
              </Button>
            </div>
            {giftCardStatus === 'valid' && (
              <p className="text-sm text-green-600">Balance: {currencySymbol}{(giftCardBalance || 0).toFixed(2)}</p>
            )}
            {giftCardError && (
              <p className="text-sm text-red-600">{giftCardError}</p>
            )}
            {giftCardStatus === 'valid' && giftCardBalance !== null && giftCardBalance < finalTotal && (
              <p className="text-sm text-red-600">Insufficient balance. Total due is {currencySymbol}{finalTotal.toFixed(2)}.</p>
            )}
          </div>
        )}

        {/* Order Summary */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Delivery Fee:</span>
              <span>{currencySymbol}{deliveryFee.toFixed(2)}</span>
            </div>
          )}
          {voucherDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Voucher Discount:</span>
              <span>-{currencySymbol}{voucherDiscount.toFixed(2)}</span>
            </div>
          )}
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Points Discount:</span>
              <span>-{currencySymbol}{pointsDiscount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{currencySymbol}{finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200" size="lg">
              <ShoppingBasket className="mr-2 h-5 w-5" />
              Place Order - {currencySymbol}{finalTotal.toFixed(2)}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <form data-order-form="true" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              
              const context = {
                selectedOrderType,
                availableOrderTypes,
                restaurantSettings,
                advanceDate,
                advanceTime,
                advanceFulfillmentType,
                deliveryError,
                order,
                tenantData,
                orderNote,
                subtotal,
                deliveryFee,
                voucherDiscount,
                pointsDiscount: 0, // Add this since it's expected
                finalTotal,
                appliedVoucher,
                router,
                selectedPaymentMethod,
                giftCardCode,
                currencySymbol
              };
              
              await handlePlaceOrder(formData, context);
            }}>
              <DialogHeader>
                <DialogTitle>Checkout</DialogTitle>
                <DialogDescription>
                  Enter your details to complete the order.
                </DialogDescription>
                
                {/* Collection Time Notice */}
                {selectedOrderType === 'collection' && 
                 restaurantSettings?.collectionTimeSettings?.enabled && 
                 restaurantSettings?.collectionTimeSettings?.displayMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>
                        {restaurantSettings.collectionTimeSettings.displayMessage.replace(
                          '{time}', 
                          String(restaurantSettings.collectionTimeSettings.collectionTimeMinutes || 30)
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Full Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      defaultValue={currentUser?.name}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone Number</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      defaultValue={currentUser?.phone}
                      placeholder="07123456789"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    defaultValue={currentUser?.email}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                {/* Address for Delivery */}
                {(selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')) && (
                  <>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        placeholder="123 Main St" 
                        defaultValue={currentUser?.addresses?.find(a => a.isDefault)?.street} 
                        required={selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" placeholder="London" defaultValue={currentUser?.addresses?.find(a => a.isDefault)?.city} required={selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')} />
                        </div>
                        <div>
                            <Label htmlFor="postcode">Postcode</Label>
                            <Input 
                              id="postcode" 
                              name="postcode" 
                              placeholder="SW1A 1AA" 
                              value={postcode}
                              onChange={(e) => setPostcode(e.target.value)}
                              required={selectedOrderType === 'delivery' || (selectedOrderType === 'advance' && advanceFulfillmentType === 'delivery')} 
                            />
                            {deliveryError && (
                              <p className="text-sm text-red-500">{deliveryError}</p>
                            )}
                        </div>
                    </div>
                  </>
                )}

                {/* Order Notes */}
                <div>
                  <Label htmlFor="notes">Order Note (optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={orderNote}
                    onChange={(e) => {
                      const text = e.target.value;
                      const words = text.trim().split(/\s+/).filter(Boolean);
                      if (words.length <= 70) {
                        setOrderNote(text);
                      } else {
                        setOrderNote(words.slice(0, 70).join(' '));
                      }
                    }}
                    placeholder="Any special instructions? e.g., no onions"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(orderNote.trim() ? orderNote.trim().split(/\s+/).filter(Boolean).length : 0)} / 70 words
                  </p>
                </div>

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  {(() => {
                    console.log('🎯 RENDERING PAYMENT METHODS:', {
                      availablePaymentMethods,
                      selectedPaymentMethod,
                      paymentConfig,
                      timestamp: new Date().toISOString()
                    });
                    return null;
                  })()}
                  <RadioGroup value={selectedPaymentMethod} onValueChange={(value: any) => setSelectedPaymentMethod(value)}>
                    {availablePaymentMethods.includes('cash') && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Cash</Label>
                      </div>
                    )}
                    {availablePaymentMethods.includes('card') && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Card</Label>
                      </div>
                    )}
                    {availablePaymentMethods.includes('gift_card') && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gift_card" id="gift_card" />
                        <Label htmlFor="gift_card">Gift Card</Label>
                      </div>
                    )}
                  </RadioGroup>
                  {availablePaymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No payment methods are currently available. Please contact the restaurant.
                    </p>
                  )}

                  {selectedPaymentMethod === 'gift_card' && (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor="giftCard">Gift Card Number</Label>
                      <div className="flex gap-2">
                        <Input
                          id="giftCard"
                          value={giftCardCode}
                          onChange={(e) => setGiftCardCode(e.target.value)}
                          placeholder="Enter gift card number"
                          className={giftCardError ? 'border-destructive' : ''}
                        />
                        <Button type="button" onClick={handleCheckGiftCard} disabled={giftCardStatus === 'checking'}>
                          {giftCardStatus === 'checking' ? 'Checking…' : 'Check'}
                        </Button>
                      </div>
                      {giftCardStatus === 'valid' && (
                        <p className="text-sm text-green-600">Balance: {currencySymbol}{(giftCardBalance || 0).toFixed(2)}</p>
                      )}
                      {giftCardError && (
                        <p className="text-sm text-red-600">{giftCardError}</p>
                      )}
                      {giftCardStatus === 'valid' && giftCardBalance !== null && giftCardBalance < finalTotal && (
                        <p className="text-sm text-red-600">Insufficient balance. Total due is {currencySymbol}{finalTotal.toFixed(2)}.</p>
                      )}
                    </div>
                  )}
                </div>

              </div>
              
              {/* Submit button - different text based on payment method */}
              <DialogFooter>
                <Button type="submit" className="w-full" size="lg" disabled={selectedPaymentMethod === 'gift_card' && (!(giftCardStatus === 'valid') || (giftCardBalance !== null && giftCardBalance < finalTotal))}>
                  {selectedPaymentMethod === 'cash' 
                    ? `Place Order - ${currencySymbol}${finalTotal.toFixed(2)}` 
                    : selectedPaymentMethod === 'gift_card'
                      ? `Redeem Gift Card - ${currencySymbol}${finalTotal.toFixed(2)}`
                      : `Continue to Payment - ${currencySymbol}${finalTotal.toFixed(2)}`
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
});

// Login Dialog Component
const LoginDialog = React.memo(function LoginDialog({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const { login } = useTenantData();
    const { tenantData } = useTenant();
    const { toast } = useToast();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    
    // Sign up form state
    const [signupFirstName, setSignupFirstName] = React.useState('');
    const [signupLastName, setSignupLastName] = React.useState('');
    const [signupEmail, setSignupEmail] = React.useState('');
    const [signupPhone, setSignupPhone] = React.useState('');
    const [signupPassword, setSignupPassword] = React.useState('');
    
    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = React.useState('');
    const [isForgotPasswordLoading, setIsForgotPasswordLoading] = React.useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const success = await login(email, password);
            if (success) {
                toast({ title: 'Login Successful', description: 'Welcome back!' });
                setIsOpen(false);
                setEmail('');
                setPassword('');
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: '❌ Login Failed', 
                    description: '⚠️ Invalid username or password. Please check your credentials and try again.',
                    duration: 5000
                });
            }
        } catch (error) {
            toast({ 
                variant: 'destructive', 
                title: '❌ Login Error', 
                description: '⚠️ An unexpected error occurred. Please try again later.',
                duration: 5000
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/customer/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: `${signupFirstName} ${signupLastName}`.trim(),
                    email: signupEmail,
                    phone: signupPhone,
                    password: signupPassword,
                    tenantId: tenantData?.id
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ 
                    title: '🎉 Account Created Successfully!', 
                    description: `Welcome ${signupFirstName} ${signupLastName}! ${result.message}`,
                    duration: 6000
                });
                
                // Clear form and close dialog
                setSignupFirstName('');
                setSignupLastName('');
                setSignupEmail('');
                setSignupPhone('');
                setSignupPassword('');
                setIsOpen(false);
                
                // Auto-login after successful registration
                if (result.customer) {
                    // Refresh the page or trigger a re-fetch of customer data
                    window.location.reload();
                }
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: '❌ Registration Failed', 
                    description: result.error || 'Failed to create account. Please try again.',
                    duration: 5000
                });
            }
        } catch (error) {
            console.error('Sign up error:', error);
            toast({ 
                variant: 'destructive', 
                title: '❌ Registration Error', 
                description: '⚠️ An unexpected error occurred. Please try again later.',
                duration: 5000
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsForgotPasswordLoading(true);
        
        try {
            const response = await fetch('/api/customer/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: forgotPasswordEmail,
                    tenantId: tenantData?.id
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ 
                    title: '📧 Password Reset Email Sent', 
                    description: 'Please check your email for password reset instructions.',
                    duration: 6000
                });
                
                // Clear form and return to login
                setForgotPasswordEmail('');
                setShowForgotPassword(false);
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: '❌ Reset Failed', 
                    description: result.error || 'Failed to send reset email. Please try again.',
                    duration: 5000
                });
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            toast({ 
                variant: 'destructive', 
                title: '❌ Reset Error', 
                description: '⚠️ An unexpected error occurred. Please try again later.',
                duration: 5000
            });
        } finally {
            setIsForgotPasswordLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {showForgotPassword ? 'Reset Password' : 'Welcome Back'}
                    </DialogTitle>
                    <DialogDescription>
                        {showForgotPassword 
                            ? 'Enter your email address and we\'ll send you a link to reset your password.'
                            : 'Sign in to your account to access exclusive features and faster checkout.'
                        }
                    </DialogDescription>
                </DialogHeader>
                
                {showForgotPassword ? (
                    // Forgot Password Form
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="forgot-email">Email</Label>
                            <Input
                                id="forgot-email"
                                type="email"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                placeholder="Enter your email address"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isForgotPasswordLoading}>
                            {isForgotPasswordLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                        </Button>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            className="w-full"
                            onClick={() => {
                                setShowForgotPassword(false);
                                setForgotPasswordEmail('');
                            }}
                        >
                            Back to Login
                        </Button>
                    </form>
                ) : (
                    // Login and Signup Tabs
                    <Tabs defaultValue="login">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="login">Login</TabsTrigger>
                                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                                </TabsList>
                            </div>
                            
                            <div className="space-y-4">
                        
                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="link" 
                                    className="w-full text-sm text-muted-foreground"
                                    onClick={() => setShowForgotPassword(true)}
                                >
                                    Forgot your password?
                                </Button>
                            </form>
                        </TabsContent>
                    <TabsContent value="signup">
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-firstname">First Name</Label>
                                    <Input
                                        id="signup-firstname"
                                        type="text"
                                        value={signupFirstName}
                                        onChange={(e) => setSignupFirstName(e.target.value)}
                                        placeholder="Enter your first name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-lastname">Surname</Label>
                                    <Input
                                        id="signup-lastname"
                                        type="text"
                                        value={signupLastName}
                                        onChange={(e) => setSignupLastName(e.target.value)}
                                        placeholder="Enter your surname"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-email">Email</Label>
                                <Input
                                    id="signup-email"
                                    type="email"
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-phone">Phone Number</Label>
                                <Input
                                    id="signup-phone"
                                    type="tel"
                                    value={signupPhone}
                                    onChange={(e) => setSignupPhone(e.target.value)}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Password</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    value={signupPassword}
                                    onChange={(e) => setSignupPassword(e.target.value)}
                                    placeholder="Create a password (min 6 characters)"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Creating Account...' : 'Create Account'}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                By signing up, you'll receive 100 loyalty points as a welcome bonus!
                            </p>
                        </form>
                    </TabsContent>
                </div>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
});

// Header Component
const CustomerHeader = React.memo(function CustomerHeader({ router, tenantData }: { router: any; tenantData: any }) {
    const { currentUser, isAuthenticated, logout, restaurantSettings } = useTenantData();

    const restaurantStatus = restaurantSettings?.openingHours ? 
        getRestaurantStatus(restaurantSettings.openingHours) : 
        { isOpen: true, message: 'Open' };

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm shadow-sm">
            <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-2 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {restaurantSettings?.logo ? (
                            <Image 
                                src={restaurantSettings.logo} 
                                alt={restaurantSettings.name || 'Restaurant Logo'}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover rounded-full"
                                data-ai-hint={restaurantSettings.logoHint}
                            />
                        ) : (
                            <span className="text-white font-bold text-sm sm:text-lg">
                                {tenantData?.name?.charAt(0) || 'R'}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-headline text-lg sm:text-2xl font-bold text-foreground truncate">
                            {restaurantSettings?.name || tenantData?.name || 'Restaurant'}
                        </h1>
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${restaurantStatus.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={`text-xs sm:text-sm ${restaurantStatus.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                {restaurantStatus.message}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    {isAuthenticated && currentUser ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
                                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span className="hidden sm:inline">Hi, {currentUser.name.split(' ')[0]}</span>
                                    <span className="sm:hidden">{currentUser.name.split(' ')[0]}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/${tenantData?.slug}/customer/dashboard`)}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Dashboard</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${tenantData?.slug}/customer/profile`)}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/${tenantData?.slug}/customer/orders`)}>
                                    <Package className="mr-2 h-4 w-4" />
                                    <span>My Orders</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <LoginDialog>
                            <Button variant="ghost" className="px-2 sm:px-3">
                                <LogIn className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5"/>
                                <span className="hidden sm:inline">Login / Sign Up</span>
                                <span className="sm:hidden">Login</span>
                            </Button>
                        </LoginDialog>
                    )}
                </div>
            </div>
        </header>
    );
});

// Mobile Bottom Navigation Component
const MobileBottomNav = React.memo(function MobileBottomNav({ 
  totalItems, 
  onCartClick, 
  onSearchClick,
  activeSection = 'menu',
  router,
  tenantSlug
}: { 
  totalItems: number;
  onCartClick: () => void;
  onSearchClick: () => void;
  activeSection?: 'menu' | 'cart' | 'search' | 'account';
  router: any;
  tenantSlug?: string;
}) {
    const { currentUser, isAuthenticated } = useTenantData();

    const handleAccountClick = () => {
        if (isAuthenticated && tenantSlug) {
            router.push(`/${tenantSlug}/customer/dashboard`);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl border-t border-gray-100/80 shadow-2xl lg:hidden">
            <div className="safe-area-inset-bottom">
                <div className="grid grid-cols-4 h-20 px-3 py-2">
                    {/* Menu */}
                    <button 
                        className={`flex flex-col items-center justify-center space-y-1.5 py-2.5 rounded-2xl mx-1 transition-all duration-300 ${
                            activeSection === 'menu' 
                                ? 'text-primary bg-gradient-to-t from-primary/15 to-primary/10 shadow-lg scale-105' 
                                : 'text-gray-500 hover:text-primary hover:bg-gray-50/80 hover:scale-105'
                        }`}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                            activeSection === 'menu' ? 'bg-primary/20' : ''
                        }`}>
                            <MenuIcon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold">Menu</span>
                    </button>

                    {/* Search */}
                    <button 
                        className={`flex flex-col items-center justify-center space-y-1.5 py-2.5 rounded-2xl mx-1 transition-all duration-300 ${
                            activeSection === 'search' 
                                ? 'text-primary bg-gradient-to-t from-primary/15 to-primary/10 shadow-lg scale-105' 
                                : 'text-gray-500 hover:text-primary hover:bg-gray-50/80 hover:scale-105'
                        }`}
                        onClick={onSearchClick}
                    >
                        <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                            activeSection === 'search' ? 'bg-primary/20' : ''
                        }`}>
                            <Search className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold">Search</span>
                    </button>

                    {/* Cart */}
                    <button 
                        className={`flex flex-col items-center justify-center space-y-1.5 py-2.5 rounded-2xl mx-1 transition-all duration-300 relative ${
                            activeSection === 'cart' 
                                ? 'text-primary bg-gradient-to-t from-primary/15 to-primary/10 shadow-lg scale-105' 
                                : 'text-gray-500 hover:text-primary hover:bg-gray-50/80 hover:scale-105'
                        }`}
                        onClick={onCartClick}
                    >
                        <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${
                            activeSection === 'cart' ? 'bg-primary/20' : ''
                        }`}>
                            <ShoppingBasket className="h-5 w-5" />
                            {totalItems > 0 && (
                                <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg animate-pulse">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-semibold">Cart</span>
                    </button>

                    {/* Account */}
                    {isAuthenticated ? (
                        <button 
                            className={`flex flex-col items-center justify-center space-y-1.5 py-2.5 rounded-2xl mx-1 transition-all duration-300 ${
                                activeSection === 'account' 
                                    ? 'text-primary bg-gradient-to-t from-primary/15 to-primary/10 shadow-lg scale-105' 
                                    : 'text-gray-500 hover:text-primary hover:bg-gray-50/80 hover:scale-105'
                            }`}
                            onClick={handleAccountClick}
                        >
                            <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                activeSection === 'account' ? 'bg-primary/20' : ''
                            }`}>
                                <User className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-semibold">Account</span>
                        </button>
                    ) : (
                        <LoginDialog>
                            <button 
                                className={`flex flex-col items-center justify-center space-y-1.5 py-2.5 rounded-2xl mx-1 transition-all duration-300 ${
                                    activeSection === 'account' 
                                        ? 'text-primary bg-gradient-to-t from-primary/15 to-primary/10 shadow-lg scale-105' 
                                        : 'text-gray-500 hover:text-primary hover:bg-gray-50/80 hover:scale-105'
                                }`}
                            >
                                <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                                    activeSection === 'account' ? 'bg-primary/20' : ''
                                }`}>
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-semibold">Login</span>
                            </button>
                        </LoginDialog>
                    )}
                </div>
            </div>
        </div>
    );
});

// Floating Cart Button Component (for desktop/tablet)
const FloatingCartButton = React.memo(function FloatingCartButton({ 
    totalItems, 
    totalAmount, 
    currencySymbol, 
    onClick 
}: { 
    totalItems: number;
    totalAmount: number;
    currencySymbol: string;
    onClick: () => void;
}) {
    if (totalItems === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-40 hidden lg:block">
            <Button 
                onClick={onClick}
                className="rounded-full h-14 w-14 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-primary hover:bg-primary/90 group"
                size="lg"
            >
                <div className="relative">
                    <ShoppingBasket className="h-6 w-6" />
                    <Badge className="absolute -top-3 -right-3 h-6 w-6 p-0 flex items-center justify-center text-xs bg-background text-foreground border-2 border-primary">
                        {totalItems}
                    </Badge>
                </div>
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg px-3 py-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <p className="text-sm font-medium whitespace-nowrap">
                        {totalItems} items • {currencySymbol}{totalAmount.toFixed(2)}
                    </p>
                </div>
            </Button>
        </div>
    );
});

// Mobile Quick Search Component
const MobileQuickSearch = React.memo(function MobileQuickSearch({ 
    isOpen, 
    onClose, 
    searchQuery, 
    onSearchChange 
}: {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}) {
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
            <div className="flex items-center gap-3 p-4 border-b">
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        ref={searchInputRef}
                        placeholder="Search menu items..."
                        className="pl-10 h-12 text-base"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>
            <div className="p-4">
                {searchQuery ? (
                    <p className="text-sm text-muted-foreground">
                        Searching for "{searchQuery}"...
                    </p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Popular searches:</p>
                        <div className="flex flex-wrap gap-2">
                            {['Pizza', 'Burger', 'Chicken', 'Salad', 'Dessert'].map((term) => (
                                <Button 
                                    key={term}
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => onSearchChange(term)}
                                >
                                    {term}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// Enhanced Mobile Menu Item Component
const MobileMenuItem = React.memo(function MobileMenuItem({ 
    item, 
    onAddToCart, 
    currencySymbol,
    tenantId
}: {
    item: LocalMenuItem;
    onAddToCart: (item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => void;
    currencySymbol: string;
    tenantId: string;
}) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [variants, setVariants] = React.useState<MenuVariant[]>([]);
    const [loadingVariants, setLoadingVariants] = React.useState(false);
    const [selectedVariant, setSelectedVariant] = React.useState<MenuVariant | null>(null);

    // Load variants for this item
    React.useEffect(() => {
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

    const handleQuickAdd = (e: React.MouseEvent) => {
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
    };

    const handleVariantSelect = (variant: MenuVariant, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening dialog
        setSelectedVariant(variant);
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-gray-100/50 hover:border-gray-200/80 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/50 cursor-pointer overflow-hidden"
                  onClick={() => setIsDialogOpen(true)}>
                <div className="p-3">
                    <div className="flex gap-3">
                        {/* Content - Left Side */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm leading-tight text-gray-900 mb-1.5 line-clamp-2">
                                {item.name}
                            </h4>
                            {item.description && (
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mb-2">
                                    {item.description}
                                </p>
                            )}
                            
                            {/* Dietary Characteristics Display */}
                            <div className="mb-2">
                                <DietaryCharacteristicsDisplay
                                    menuItemId={item.id}
                                    tenantId={tenantId}
                                    size="sm"
                                    className="mb-1"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between pt-0.5">
                                {/* Price Variants Display */}
                                {loadingVariants ? (
                                    <div className="flex items-center gap-1">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                                        <span className="text-xs text-muted-foreground">Loading...</span>
                                    </div>
                                ) : variants.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {variants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                onClick={(e) => handleVariantSelect(variant, e)}
                                                className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${
                                                    selectedVariant?.id === variant.id
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                <span className="font-medium">{variant.name}</span>
                                                <span className="ml-1 font-semibold">{currencySymbol}{Number(variant.price).toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-base font-bold text-gray-900">
                                        {currencySymbol}{item.price.toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Image with Smart Add Button - Right Side */}
                        <div className="relative flex-shrink-0">
                            {item.image && item.image.length > 0 && !item.image.includes('placehold.co') ? (
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'cover',
                                                objectPosition: 'center'
                                            }}
                                        />
                                    </div>
                                    {/* Compact Floating Add Button */}
                                    <div className="absolute -bottom-1.5 -right-1.5">
                                        <Button
                                            size="icon"
                                            onClick={handleQuickAdd}
                                            className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-white"
                                            aria-label={`Add ${item.name} to cart`}
                                        >
                                            <Plus className="h-5 w-5 text-white" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* Compact standalone add button when no image - no placeholder box */
                                <Button
                                    size="icon"
                                    onClick={handleQuickAdd}
                                    className="h-9 w-9 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                                    aria-label={`Add ${item.name} to cart`}
                                >
                                    <Plus className="h-5 w-5 text-white" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <MenuItemDialog 
                item={item} 
                isOpen={isDialogOpen} 
                onClose={() => setIsDialogOpen(false)} 
                onAddToCart={onAddToCart}
                currencySymbol={currencySymbol}
            />
        </>
    );
});

// Cover Image Section Component
const CoverImageSection = React.memo(function CoverImageSection() {
    const { restaurantSettings } = useTenantData();
    
    if (!restaurantSettings?.coverImage) {
        return null;
    }

    return (
        <div className="relative w-full h-32 sm:h-48 md:h-64 mb-4 overflow-hidden">
            <Image
                src={restaurantSettings.coverImage}
                alt={restaurantSettings.name || 'Restaurant Cover'}
                fill
                className="object-cover"
                data-ai-hint={restaurantSettings.coverImageHint}
                priority
            />
            {/* Optional overlay for better text readability if needed */}
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Optional restaurant info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
                <div className="container mx-auto">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
                        {restaurantSettings.name}
                    </h2>
                    {restaurantSettings.description && (
                        <p className="text-sm sm:text-base text-white/90 max-w-2xl">
                            {restaurantSettings.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
});

// Main Tenant Customer Interface Component
function TenantCustomerInterface() {
    // Performance monitoring
    usePerformanceMonitor('TenantCustomerInterface');
    
    const { getMenuWithCategoriesForCustomer, restaurantSettings, isLoading, createOrder } = useTenantData();
    const { tenantData } = useTenant();
    const { toast } = useToast();
    const router = useRouter();
    
    const [order, setOrder] = React.useState<OrderItem[]>([]);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
    
    // Debounce search query to prevent excessive filtering
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    
    const [paymentConfig, setPaymentConfig] = React.useState<{
        configured: boolean;
        activeGateway: string | null;
        gatewayName: string;
        stripeMode?: string;
        globalPaymentsEnvironment?: string;
    } | null>(null);
    
    const [stripePublishableKey, setStripePublishableKey] = React.useState<string>('');

    // Check for shop cart data on component mount
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('from') === 'shop') {
            const shopCartData = localStorage.getItem('shop-cart');
            const shopCartTenant = localStorage.getItem('shop-cart-tenant');
            
            if (shopCartData && shopCartTenant === tenantData?.slug) {
                try {
                    const shopCart = JSON.parse(shopCartData);
                    
                    // Convert shop cart items to order items
                    const orderItems: OrderItem[] = shopCart.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        specialInstructions: '',
                        selectedAddons: [],
                        categoryId: item.category_id,
                        image: item.image_url || '',
                        description: item.description || ''
                    }));
                    
                    setOrder(orderItems);
                    
                    // Clean up localStorage
                    localStorage.removeItem('shop-cart');
                    localStorage.removeItem('shop-cart-tenant');
                    
                    // Remove the URL parameter
                    window.history.replaceState({}, '', window.location.pathname);
                    
                    toast({
                        title: "Cart imported",
                        description: `${shopCart.length} items imported from shop`,
                    });
                } catch (error) {
                    console.error('Error importing shop cart:', error);
                    localStorage.removeItem('shop-cart');
                    localStorage.removeItem('shop-cart-tenant');
                }
            }
        }
    }, [tenantData?.slug, toast]);

    React.useEffect(() => {
    // Clear session storage if clearSession parameter is present (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clearSession') === 'true') {
      console.log('🧹 Clearing session storage for testing');
      sessionStorage.clear();
      // Remove the parameter from URL
      urlParams.delete('clearSession');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Fetch payment configuration
    React.useEffect(() => {
        const fetchPaymentConfig = async () => {
            if (!tenantData?.slug) return;
            
            try {
                console.log('🔧 Fetching payment config for:', tenantData.slug);
                const response = await fetch(`/api/tenant/${tenantData.slug}/payment-config?t=${Date.now()}`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                const config = await response.json();
                console.log('🔧 Payment config received:', config);
                setPaymentConfig(config);
                
                // If Stripe is the active gateway, get the publishable key
                if (config.configured && config.activeGateway === 'stripe') {
                    try {
                        const stripeResponse = await fetch(`/api/tenant/${tenantData.slug}/stripe-config`);
                        if (stripeResponse.ok) {
                            const stripeConfig = await stripeResponse.json();
                            if (stripeConfig.publishableKey) {
                                setStripePublishableKey(stripeConfig.publishableKey);
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching Stripe config:', error);
                    }
                }
            } catch (error) {
                console.error('Error fetching payment config:', error);
                setPaymentConfig({
                    configured: false,
                    activeGateway: null,
                    gatewayName: ''
                });
            }
        };
        
        fetchPaymentConfig();
    }, [tenantData?.slug]);

    // Get restaurant status for mobile header
    const restaurantStatus = restaurantSettings?.openingHours ? 
        getRestaurantStatus(restaurantSettings.openingHours) : 
        { isOpen: true, message: 'Open' };

    // Process menu data to match customer page structure
    const menuItems = getMenuWithCategoriesForCustomer();
    
    // Group items by categories and handle sub-categories
    const menuData = React.useMemo(() => {
        const categoriesMap = new Map<string, {
            category: Category;
            items: LocalMenuItem[];
            subCategories: { category: Category; items: LocalMenuItem[] }[];
        }>();

        menuItems.forEach(({ category, items }) => {
            if (!categoriesMap.has(category.id)) {
                categoriesMap.set(category.id, {
                    category,
                    items: [],
                    subCategories: []
                });
            }
            
            const categoryData = categoriesMap.get(category.id)!;
            categoryData.items.push(...items);
        });

        return Array.from(categoriesMap.values());
    }, [menuItems]);

    // Filter menu data based on search
    const filteredMenuData = React.useMemo(() => {
        if (!searchQuery) return menuData;
        
        return menuData.map(categoryData => ({
            ...categoryData,
            items: categoryData.items.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            ),
            subCategories: categoryData.subCategories.map(subCat => ({
                ...subCat,
                items: subCat.items.filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter(subCat => subCat.items.length > 0)
        })).filter(categoryData => categoryData.items.length > 0 || categoryData.subCategories.length > 0);
    }, [menuData, searchQuery]);

    const currencySymbol = getCurrencySymbol(restaurantSettings?.currency);

    const handleAddToCart = React.useCallback((item: LocalMenuItem, quantity: number, instructions: string, selectedAddons?: SelectedAddon[]) => {
        // Check if the same item with identical instructions and addons already exists
        const existingItemIndex = order.findIndex(orderItem => 
            orderItem.id === item.id &&
            orderItem.specialInstructions === instructions &&
            JSON.stringify(orderItem.selectedAddons) === JSON.stringify(selectedAddons || [])
        );

        if (existingItemIndex !== -1) {
            // Item already exists with same configuration - just increase quantity
            setOrder(prev => prev.map((orderItem, index) => 
                index === existingItemIndex 
                    ? { ...orderItem, quantity: orderItem.quantity + quantity }
                    : orderItem
            ));
            
            const totalQuantity = order[existingItemIndex].quantity + quantity;
            toast({
                title: 'Updated Cart',
                description: `${item.name} quantity updated to ${totalQuantity}.`,
            });
        } else {
            // New item or different configuration - create new entry
            const addonPrice = calculateSelectedAddonPrice(selectedAddons || []);
            const orderItem: OrderItem = {
                orderItemId: `${item.id}-${Date.now()}`,
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                image: item.image,
                categoryId: item.categoryId,
                available: item.available || true,
                selectedAddons: selectedAddons || [],
                quantity,
                specialInstructions: instructions,
                basePrice: item.price,
                addonPrice: addonPrice,
                finalPrice: item.price + addonPrice,
                
                // Optional fields
                imageHint: item.imageHint,
                characteristics: item.characteristics,
                nutrition: item.nutrition,
            };

            setOrder(prev => [...prev, orderItem]);
            
            toast({
                title: 'Added to Cart',
                description: `${quantity}x ${item.name} added to your order.`,
            });
        }
    }, [order, toast]);

    const handleUpdateQuantity = React.useCallback((orderItemId: string, quantity: number) => {
        if (quantity <= 0) {
            setOrder(prev => prev.filter(item => item.orderItemId !== orderItemId));
            return;
        }
        
        setOrder(prev => prev.map(item => 
            item.orderItemId === orderItemId ? { ...item, quantity } : item
        ));
    }, []);

    const handleRemoveFromOrder = React.useCallback((orderItemId: string) => {
        setOrder(prev => prev.filter(item => item.orderItemId !== orderItemId));
    }, []);

    const handleClearOrder = React.useCallback(() => {
        setOrder([]);
    }, []);

    // Initialize the super optimized place order handler
    const handlePlaceOrder = React.useMemo(() => {
        return createSuperOptimizedPlaceOrderHandler({
            toast,
            createOrder,
            clearOrder: handleClearOrder,
            TenantVoucherService,
            calculateSelectedAddonPrice
        });
    }, [toast, createOrder, handleClearOrder]);

    // Memoize calculated values for better performance
    const orderTotal = React.useMemo(() => 
        order.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0),
        [order]
    );

    const totalItems = React.useMemo(() => 
        order.reduce((sum, item) => sum + item.quantity, 0),
        [order]
    );

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading menu...</p>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden lg:block">
                    <CustomerHeader router={router} tenantData={tenantData} />
                    <CoverImageSection />
                </div>

                {/* Mobile Cover Image */}
                {restaurantSettings?.coverImage && (
                    <div className="lg:hidden relative w-full h-48 sm:h-56 overflow-hidden">
                        <Image
                            src={restaurantSettings.coverImage}
                            alt={restaurantSettings.name || 'Restaurant Cover'}
                            fill
                            className="object-cover"
                            data-ai-hint={restaurantSettings.coverImageHint}
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        
                        {/* Modern Mobile Restaurant Info Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                            <div className="flex items-end justify-between">
                                <div className="flex-1">
                                    <h1 className="font-bold text-2xl text-white mb-1">{restaurantSettings?.name || 'Restaurant'}</h1>
                                    <p className="text-sm text-white/90 mb-3">{restaurantSettings?.description || 'Order online'}</p>
                                    <div className="flex items-center space-x-3">
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 ${
                                            restaurantStatus.isOpen 
                                                ? 'bg-green-500/20 text-green-100 border border-green-400/30' 
                                                : 'bg-red-500/20 text-red-100 border border-red-400/30'
                                        }`}>
                                            <div className={`h-1.5 w-1.5 rounded-full ${restaurantStatus.isOpen ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                            <span>{restaurantStatus.isOpen ? 'Open Now' : 'Closed'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Mobile App-like Header - Only show when no cover image */}
                {!restaurantSettings?.coverImage && (
                    <div className="lg:hidden bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100/80 backdrop-blur-md">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex-1">
                                <h1 className="font-bold text-xl text-gray-900">{restaurantSettings?.name || 'Restaurant'}</h1>
                                <p className="text-sm text-gray-500">{restaurantSettings?.description || 'Order online'}</p>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 ${
                                restaurantStatus.isOpen 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                                <div className={`h-2 w-2 rounded-full ${restaurantStatus.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span>{restaurantStatus.isOpen ? 'Open' : 'Closed'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* All-device Menu Categories Nav - Always Sticky */}
                <MenuNav 
                    categories={menuData.map(data => data.category)}
                    activeCategory={activeCategory}
                    onCategorySelect={setActiveCategory}
                />
                
                <div className="container mx-auto px-0 sm:px-4 py-0 sm:py-6">
                    {/* Modern Mobile App Layout */}
                    <div className="lg:hidden min-h-screen bg-gradient-to-b from-gray-50/50 via-white to-gray-50/30">
                        {/* Mobile Menu with modern app-like design */}
                        <div className="space-y-3 pb-32 px-4 pt-3">
                            {filteredMenuData.map((categoryData, index) => (
                                <div 
                                    key={categoryData.category.id} 
                                    className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden transform transition-all duration-500 hover:scale-[1.01] hover:shadow-lg"
                                    style={{
                                        animationDelay: `${index * 100}ms`,
                                        animation: 'fadeInUp 0.6s ease-out forwards'
                                    }}
                                >
                                    <div id={`cat-${categoryData.category.id}`} className="bg-gradient-to-r from-primary/8 via-primary/5 to-transparent px-5 py-3 border-b border-gray-50">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-1.5 w-10 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full shadow-sm"></div>
                                            <h2 className="text-base font-bold text-gray-900 tracking-tight">{categoryData.category.name}</h2>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-3">
                                        {categoryData.items?.filter(item => 
                                            searchQuery === '' || 
                                            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).map((item, itemIndex) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    animationDelay: `${(index * 100) + (itemIndex * 50)}ms`,
                                                    animation: 'fadeInUp 0.4s ease-out forwards'
                                                }}
                                            >
                                                <MobileMenuItem
                                                    item={item}
                                                    onAddToCart={handleAddToCart}
                                                    currencySymbol={currencySymbol}
                                                    tenantId={tenantData?.slug || ''}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Floating Cart Button */}
                        <FloatingCartButton 
                            totalItems={totalItems}
                            totalAmount={orderTotal}
                            currencySymbol={currencySymbol}
                            onClick={() => {
                                // Toggle cart view or navigate to cart
                                const cartElement = document.getElementById('mobile-cart');
                                if (cartElement) {
                                    cartElement.classList.toggle('translate-y-full');
                                }
                            }}
                        />

                        {/* Mobile Bottom Navigation */}
                        <MobileBottomNav 
                            totalItems={totalItems}
                            onCartClick={() => {
                                const cartElement = document.getElementById('mobile-cart');
                                if (cartElement) {
                                    cartElement.classList.remove('translate-y-full');
                                }
                            }}
                            onSearchClick={() => {
                                // Scroll to top to focus on search
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                // Focus search input after scroll
                                setTimeout(() => {
                                    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                                    if (searchInput) {
                                        searchInput.focus();
                                    }
                                }, 300);
                            }}
                            router={router}
                            tenantSlug={tenantData?.slug}
                        />

                        {/* Enhanced Mobile Cart - Full Screen Overlay */}
                        <div id="mobile-cart" className="fixed inset-0 bg-white transform translate-y-full transition-transform duration-300 z-50 flex flex-col">
                            {/* Modern Cart Header */}
                            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
                                <button
                                    onClick={() => {
                                        const cartElement = document.getElementById('mobile-cart');
                                        if (cartElement) {
                                            cartElement.classList.add('translate-y-full');
                                        }
                                    }}
                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h2 className="text-lg font-semibold text-gray-900">Your Order</h2>
                                {order.length > 0 && (
                                    <button
                                        onClick={handleClearOrder}
                                        className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                                {order.length === 0 && <div className="w-10"></div>}
                            </div>
                            
                            {/* Scrollable Cart Content */}
                            <div className="flex-1 overflow-y-auto bg-gray-50/30">
                                {order.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                                        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                                            <ShoppingBasket className="h-12 w-12 text-gray-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h3>
                                        <p className="text-gray-500 mb-8 leading-relaxed">Add delicious items from our menu to get started</p>
                                        <Button 
                                            onClick={() => {
                                                const cartElement = document.getElementById('mobile-cart');
                                                if (cartElement) {
                                                    cartElement.classList.add('translate-y-full');
                                                }
                                            }}
                                            className="w-full max-w-xs h-12 text-base font-semibold rounded-xl"
                                        >
                                            Browse Menu
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="pb-6">
                                        {/* Cart Items Section */}
                                        <div className="bg-white rounded-t-3xl mt-4 mx-4 shadow-sm border border-gray-100">
                                            <div className="p-4 border-b border-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBasket className="h-5 w-5 text-primary" />
                                                    <h3 className="font-semibold text-gray-900">Cart ({order.length})</h3>
                                                </div>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {order.map((item) => (
                                                    <div key={item.orderItemId} className="p-4 border-b border-gray-50 last:border-b-0">
                                                        <div className="flex gap-3">
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.name}</h4>
                                                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                                    <div className="text-xs text-gray-600 mb-2">
                                                                        <p className="font-medium">Extra Options:</p>
                                                                        {item.selectedAddons.map((addonGroup, groupIndex) => (
                                                                            <div key={groupIndex} className="ml-2">
                                                                                <span className="font-medium">{addonGroup.groupName}:</span>
                                                                                {addonGroup.options.map((option, optionIndex) => (
                                                                                    <div key={optionIndex} className="ml-2">
                                                                                        {option.quantity > 1 ? `${option.quantity}x ` : ''}{option.optionId}
                                                                                        {option.totalPrice > 0 && ` (+${currencySymbol}${option.totalPrice.toFixed(2)})`}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {item.specialInstructions && (
                                                                    <p className="text-xs text-gray-600 mb-2">
                                                                        <span className="font-medium">Note:</span> {item.specialInstructions}
                                                                    </p>
                                                                )}
                                                                <p className="font-bold text-primary text-sm">
                                                                    {currencySymbol}{((item.price + (calculateSelectedAddonPrice(item.selectedAddons) || 0)) * item.quantity).toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.orderItemId, item.quantity - 1)}
                                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <MinusCircle className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                                <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                                                                <button
                                                                    onClick={() => handleUpdateQuantity(item.orderItemId, item.quantity + 1)}
                                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <PlusCircle className="h-4 w-4 text-gray-600" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveFromOrder(item.orderItemId)}
                                                                    className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors ml-2"
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Order Options - Use the OrderSummary component for the lower section */}
                                        <div className="px-4 mt-4">
                                            <OrderSummary
                                                order={order}
                                                updateQuantity={handleUpdateQuantity}
                                                removeFromOrder={handleRemoveFromOrder}
                                                clearOrder={handleClearOrder}
                                                currencySymbol={currencySymbol}
                                                router={router}
                                                hideCartItems={true}
                                                paymentConfig={paymentConfig}
                                                stripePublishableKey={stripePublishableKey}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Layout: Side by side with sticky cart */}
                    <div className="hidden lg:grid lg:grid-cols-4 gap-8">
                        {/* Left side: Menu */}
                        <div className="lg:col-span-3">
                            <MenuSection
                                menuData={filteredMenuData}
                                onAddToCart={handleAddToCart}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                currencySymbol={currencySymbol}
                                tenantId={tenantData?.id || ''}
                            />
                        </div>
                        {/* Right sidebar: Sticky Cart */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-[60px] space-y-4">
                                <OrderSummary
                                    order={order}
                                    updateQuantity={handleUpdateQuantity}
                                    removeFromOrder={handleRemoveFromOrder}
                                    clearOrder={handleClearOrder}
                                    currencySymbol={currencySymbol}
                                    router={router}
                                    paymentConfig={paymentConfig}
                                    stripePublishableKey={stripePublishableKey}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer - Powered By Link */}
            <footer className="w-full py-6 mt-12 bg-gray-50/50 border-t border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-xs text-gray-400">
                        Powered by -{' '}
                        <a 
                            href="https://orderweb.co.uk/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-600 transition-colors duration-200"
                        >
                            Order Web
                        </a>
                    </p>
                </div>
            </footer>
        </TooltipProvider>
    );
}

// Export memoized component for better performance
export default memo(TenantCustomerInterface);
