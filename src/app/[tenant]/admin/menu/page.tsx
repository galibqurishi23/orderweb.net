'use client';

import React, { useState, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { 
  ChefHat, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Package, 
  Tag,
  Image as ImageIcon,
  List,
  CheckCircle,
  XCircle,
  Upload,
  X,
  Settings,
  Layers,
  Copy,
  FileText,
  PlusCircle,
  Utensils
} from 'lucide-react';
import { useTenantData } from '@/context/TenantDataContext';
import { useTenant } from '@/context/TenantContext';
import type { MenuItem, MenuCategory } from '@/lib/menu-types';
import type { AddonGroup, AddonOption } from '@/lib/addon-types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { SortableMenuItemsTable } from '@/components/admin/SortableMenuItemsTable';
import { SortableCategoriesTable } from '@/components/admin/SortableCategoriesTable';
import ComponentSelector from '@/components/admin/ComponentSelector';
import MealDealsManager from '@/components/admin/MealDealsManager';
import PriceVariantsManager from '@/components/admin/PriceVariantsManager';
import DietaryCharacteristicsSelector from '@/components/admin/DietaryCharacteristicsSelector';

export default function TenantMenuPage() {
  const pathname = usePathname();
  const tenantSlug = pathname.split('/')[1]; // Extract tenant from /tenant/admin/menu
  const { tenantData } = useTenant();
  
  const { 
    menuItems, 
    categories, 
    saveMenuItem, 
    deleteMenuItem, 
    saveCategory, 
    deleteCategory, 
    restaurantSettings,
    isLoading,
    refreshData,
    updateCategoriesOrder,
    updateMenuItemsOrder
  } = useTenantData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(restaurantSettings?.currency || 'GBP');
  }, [restaurantSettings?.currency]);

  const [itemForm, setItemForm] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    image: '',
    imageHint: '',
    available: true,
    categoryId: '',
    addons: [], // Add this to initial state
    characteristics: [],
    nutrition: undefined,
    isFeatured: false,
    // VAT Management Fields - NO DEFAULT VALUES, FORCE ADMIN TO CHOOSE
    vatRate: undefined, // No default - admin must choose
    vatType: 'simple',
    isVatExempt: undefined, // No default - will be set based on VAT rate
    vatNotes: ''
  });

  // Add separate state for VAT rate as string - NO DEFAULT VALUE
  const [vatRateString, setVatRateString] = useState<string>("");

  // Sync vatRateString with itemForm.vatRate only when editing an existing item
  React.useEffect(() => {
    if (editingItem && itemForm.vatRate !== undefined && itemForm.vatRate !== null) {
      setVatRateString(itemForm.vatRate.toFixed(2));
    }
  }, [editingItem, itemForm.vatRate]);

  const [selectedCharacteristicIds, setSelectedCharacteristicIds] = useState<number[]>([]);

  // Component Management State for Mixed Items
  const [itemComponents, setItemComponents] = useState<any[]>([]);
  const [mixedItemVAT, setMixedItemVAT] = useState<{
    totalVAT: number;
    breakdown: {
      hotFoodVAT: number;
      coldFoodVAT: number;
      alcoholVAT: number;
      softDrinkVAT: number;
      otherVAT: number;
    };
  } | null>(null);

  const [categoryForm, setCategoryForm] = useState<Partial<MenuCategory>>({
    name: '',
    description: '',
    active: true,
    parentId: undefined
  });

  // Handler functions for menu items
  const setEditingMenuItem = (item: MenuItem | null) => {
    if (item) {
      console.log('📝 Loading item for editing:', {
        name: item.name,
        originalVatRate: item.vatRate,
        originalIsVatExempt: item.isVatExempt,
        originalVatType: item.vatType
      });
      
      setItemForm({
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        imageHint: item.imageHint,
        available: item.available,
        categoryId: item.categoryId,
        addons: item.addons || [],
        characteristics: item.characteristics || [],
        nutrition: item.nutrition,
        // VAT Management Fields
        vatRate: item.vatRate ?? null, // Use nullish coalescing to preserve 0 values, no default
        vatType: item.vatType || 'simple',
        isVatExempt: item.isVatExempt ?? false, // Use nullish coalescing to preserve exact boolean values
        vatNotes: item.vatNotes || ''
      });
      
      // Set VAT rate string for the buttons
      const finalVatRate = item.vatRate ?? null;
      setVatRateString(finalVatRate !== null ? finalVatRate.toFixed(2) : "");
      
      console.log('✅ Loaded item with VAT settings:', {
        formVatRate: finalVatRate,
        formIsVatExempt: item.isVatExempt ?? false,
        vatRateString: finalVatRate !== null ? finalVatRate.toFixed(2) : "unset"
      });
      
      // Extract characteristic IDs for the selector
      const characteristicIds = (item.characteristics || []).map(c => 
        typeof c === 'number' ? c : parseInt(c.id) || 0
      ).filter(id => id > 0);
      setSelectedCharacteristicIds(characteristicIds);
      
      // Load components for mixed items
      if (item.vatType === 'mixed' && (item as any).components) {
        console.log('🧩 Loading components for mixed item:', (item as any).components);
        setItemComponents((item as any).components || []);
        setMixedItemVAT((item as any).mixedItemVAT || null);
      } else {
        setItemComponents([]);
        setMixedItemVAT(null);
      }
      
      setEditingItem(item);
      setIsItemDialogOpen(true);
    }
  };

  const setViewingMenuItem = (item: MenuItem | null) => {
    // For now, just use the edit function
    setEditingMenuItem(item);
  };

  const handleMenuItemReorder = async (itemIds: string[], categoryId?: string) => {
    // Optimistic update - immediately update the UI
    updateMenuItemsOrder(itemIds, categoryId);

    try {
      const response = await fetch(`/api/tenant/menu/items/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, categoryId, tenantId: tenantSlug })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder items');
      }

      toast({
        title: "Items Reordered",
        description: "Menu items have been reordered successfully.",
      });
    } catch (error) {
      console.error('Error reordering items:', error);
      // If API fails, revert by refreshing data from server
      await refreshData();
      toast({
        title: "Error",
        description: "Failed to reorder menu items.",
        variant: "destructive"
      });
    }
  };

  const reorderCategories = async (categoryIds: string[]) => {
    // Optimistic update - immediately update the UI
    updateCategoriesOrder(categoryIds);

    try {
      const response = await fetch(`/api/tenant/menu/categories/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds, tenantId: tenantSlug })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder categories');
      }

      toast({
        title: "Categories Reordered",
        description: "Categories have been reordered successfully.",
      });
    } catch (error) {
      console.error('Error reordering categories:', error);
      // If API fails, revert by refreshing data from server
      await refreshData();
      toast({
        title: "Error",
        description: "Failed to reorder categories.",
        variant: "destructive"
      });
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = menuItems || [];

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'uncategorized') {
        filtered = filtered.filter(item => !item.categoryId);
      } else {
        filtered = filtered.filter(item => item.categoryId === selectedCategory);
      }
    }

    // Filter by search query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(lowercasedQuery) ||
        item.description?.toLowerCase().includes(lowercasedQuery)
      );
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price - b.price;
        case 'category':
          const categoryA = categories?.find(c => c.id === a.categoryId)?.name || '';
          const categoryB = categories?.find(c => c.id === b.categoryId)?.name || '';
          return categoryA.localeCompare(categoryB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [menuItems, selectedCategory, searchQuery, sortBy, categories]);

  // Get hierarchical categories display
  const getHierarchicalCategories = () => {
    const parentCategories = categories?.filter(cat => !cat.parentId) || [];
    return parentCategories.map(parent => ({
      ...parent,
      subcategories: categories?.filter(cat => cat.parentId === parent.id) || []
    }));
  };

  // Get filtered categories (excluding self and children when editing)
  const getFilteredCategories = (excludeId?: string) => {
    return categories?.filter(cat => cat.id !== excludeId) || [];
  };

  // Image upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setItemForm({ ...itemForm, image: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setItemForm({ ...itemForm, image: '' });
  };

  // Simple Add-on handlers
  const addSimpleAddon = () => {
    console.log('➕ Adding new addon to itemForm');
    const newAddon = {
      id: `addon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      price: 0
    };
    console.log('New addon created:', newAddon);
    
    const currentAddons = itemForm.addons || [];
    const updatedAddons = [...currentAddons, newAddon];
    
    console.log('Addons before:', currentAddons.length, 'after:', updatedAddons.length);
    
    setItemForm({
      ...itemForm,
      addons: updatedAddons
    });
    
    console.log('✅ itemForm updated with new addon');
  };

  const removeSimpleAddon = (addonId: string) => {
    console.log('🗑️ Removing addon:', addonId);
    const currentAddons = itemForm.addons || [];
    const filteredAddons = currentAddons.filter(addon => addon.id !== addonId);
    
    console.log('Addons before:', currentAddons.length, 'after:', filteredAddons.length);
    
    setItemForm({
      ...itemForm,
      addons: filteredAddons
    });
  };

  const updateSimpleAddon = (addonId: string, field: string, value: any) => {
    console.log('✏️ Updating addon:', addonId, field, '=', value);
    const updatedAddons = itemForm.addons?.map(addon => 
      addon.id === addonId ? { ...addon, [field]: value } : addon
    );
    
    console.log('Updated addons:', updatedAddons?.length);
    
    setItemForm({
      ...itemForm,
      addons: updatedAddons
    });
  };

  // Form reset functions
  const resetItemForm = () => {
    setItemForm({
      name: '',
      description: '',
      price: 0,
      image: '',
      imageHint: '',
      available: true,
      categoryId: '',
      addons: [],
      characteristics: [],
      nutrition: undefined,
      // VAT Management Fields - NO DEFAULTS, FORCE ADMIN TO CHOOSE
      vatRate: undefined, // No default - admin must choose
      vatType: 'simple',
      isVatExempt: undefined, // No default - will be set based on VAT rate
      vatNotes: ''
    });
    setVatRateString(""); // No default - admin must choose
    setSelectedCharacteristicIds([]);
    setItemComponents([]);
    setMixedItemVAT(null);
    setEditingItem(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      active: true,
      parentId: undefined
    });
    setEditingCategory(null);
  };

  // Handler functions
  const handleSaveItem = async () => {
    if (!itemForm.name || itemForm.price === undefined || itemForm.price < 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please provide a valid name and price", 
        variant: "destructive" 
      });
      return;
    }

    // VAT Rate validation - MUST be selected
    if (itemForm.vatRate === undefined || vatRateString === "") {
      toast({ 
        title: "VAT Rate Required", 
        description: "Please select a VAT rate (0% or 20%) for this item", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const itemToSave: MenuItem = {
        id: editingItem?.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: tenantSlug,
        name: itemForm.name!,
        description: itemForm.description || '',
        price: Number(itemForm.price),
        image: itemForm.image || '',
        imageHint: itemForm.imageHint || '',
        available: itemForm.available ?? true,
        categoryId: itemForm.categoryId || '',
        addons: itemForm.addons || [],
        characteristics: selectedCharacteristicIds.map(id => ({ id: id.toString(), name: '', icon: '', color: '' })),
        nutrition: itemForm.nutrition,
        isFeatured: itemForm.isFeatured || false,
        preparationTime: itemForm.preparationTime || 0,
        tags: itemForm.tags,
        // VAT Management Fields
        vatRate: itemForm.vatType === 'mixed' && mixedItemVAT ? mixedItemVAT.totalVAT : (itemForm.vatRate ?? null),
        vatType: itemForm.vatType || 'simple',
        isVatExempt: itemForm.isVatExempt || false,
        vatNotes: itemForm.vatType === 'mixed' 
          ? `Mixed item with ${itemComponents.length} components. Hot food VAT: £${mixedItemVAT?.breakdown.hotFoodVAT.toFixed(2) || '0.00'}, Cold food VAT: £${mixedItemVAT?.breakdown.coldFoodVAT.toFixed(2) || '0.00'}.`
          : (itemForm.vatNotes || '')
      };

      // Add component data for mixed items
      if (itemForm.vatType === 'mixed' && itemComponents.length > 0) {
        (itemToSave as any).components = itemComponents;
        (itemToSave as any).mixedItemVAT = mixedItemVAT;
      }

      // Add the characteristic IDs as a separate property for the backend to process
      (itemToSave as any).characteristics = selectedCharacteristicIds;

      console.log('💾 Saving item with VAT data:', {
        name: itemToSave.name,
        vatRate: itemToSave.vatRate,
        vatType: itemToSave.vatType,
        isVatExempt: itemToSave.isVatExempt,
        formVatRate: itemForm.vatRate,
        vatRateString: vatRateString
      });

      await saveMenuItem(itemToSave);
      toast({ 
        title: "Success", 
        description: `Menu item ${editingItem ? 'updated' : 'created'} successfully`,
        variant: "default"
      });
      setIsItemDialogOpen(false);
      resetItemForm();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save menu item. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name) {
      toast({ 
        title: "Validation Error", 
        description: "Category name is required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const categoryToSave: MenuCategory = {
        id: editingCategory?.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: tenantSlug,
        name: categoryForm.name!,
        description: categoryForm.description || '',
        active: categoryForm.active ?? true,
        displayOrder: categoryForm.displayOrder || 0,
        parentId: categoryForm.parentId,
        imageUrl: categoryForm.imageUrl,
        icon: categoryForm.icon,
        color: categoryForm.color
      };

      await saveCategory(categoryToSave);
      toast({ 
        title: "Success", 
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
        variant: "default"
      });
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save category. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleEditItem = (item: MenuItem) => {
    console.log('🔍 Admin handleEditItem called with:', {
      itemName: item.name,
      itemId: item.id,
      itemAddons: item.addons,
      addonCount: item.addons?.length || 0,
      addonDetails: item.addons?.map(a => ({ name: a.name, price: a.price }))
    });
    
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      imageHint: item.imageHint,
      available: item.available,
      categoryId: item.categoryId,
      addons: item.addons,
      characteristics: item.characteristics,
      nutrition: item.nutrition,
      preparationTime: item.preparationTime,
      tags: item.tags
    });
    
    console.log('✅ itemForm after edit setup:', {
      formAddons: item.addons,
      formAddonCount: item.addons?.length || 0
    });
    
    setIsItemDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      active: category.active,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
      icon: category.icon,
      color: category.color
    });
    setIsCategoryDialogOpen(true);
  };

  const handleDeleteItem = async (item: MenuItem) => {
    try {
      await deleteMenuItem(item.id);
      toast({ 
        title: "Success", 
        description: "Menu item deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete menu item", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteCategory = async (category: MenuCategory) => {
    try {
      await deleteCategory(category.id);
      toast({ 
        title: "Success", 
        description: "Category deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete category", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gray-50 rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center shadow-sm">
              <ChefHat className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800 tracking-tight">Menu Management</h1>
              <p className="text-gray-600 text-lg font-medium mt-1">
                Manage your restaurant's menu items and categories with professional tools
              </p>
            </div>
          </div>
          
          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Total Items</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{menuItems?.length || 0}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Categories</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{categories?.length || 0}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm text-gray-600 font-medium">Available</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">{menuItems?.filter(item => item.available).length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-50 border border-gray-200 rounded-lg p-1">
          <TabsTrigger value="items" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium">
            <Package className="w-4 h-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium">
            <Tag className="w-4 h-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="meal-deals" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm font-medium">
            <Utensils className="w-4 h-4" />
            Meal Deals
          </TabsTrigger>
        </TabsList>

        {/* Menu Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Menu Items</CardTitle>
                  <CardDescription className="text-gray-600">Manage your food items, set menus, and add-ons</CardDescription>
                </div>
                
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        placeholder="Search items..."
                        className="pl-10 w-64 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-52 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 rounded-lg shadow-lg">
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        {getHierarchicalCategories().map(parent => (
                          <div key={parent.id}>
                            <SelectItem value={parent.id}>
                              {parent.name}
                            </SelectItem>
                            {parent.subcategories.map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>
                                └ {sub.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Add Button */}
                  <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetItemForm} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                              id="name"
                              value={itemForm.name}
                              onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                              placeholder="Item name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="price">Price ({currencySymbol}) *</Label>
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={itemForm.price}
                              onChange={(e) => setItemForm({...itemForm, price: parseFloat(e.target.value) || 0})}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={itemForm.description}
                            onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                            placeholder="Describe your item..."
                            rows={3}
                          />
                        </div>
                        
                        {/* Image Upload and Category */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Image Upload
                            </Label>
                            <div className="space-y-2">
                              {itemForm.image ? (
                                <div className="relative">
                                  <img
                                    src={itemForm.image}
                                    alt="Preview"
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-2 right-2"
                                    onClick={removeImage}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                                  <div className="text-center">
                                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">No image uploaded</p>
                                  </div>
                                </div>
                              )}
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={itemForm.categoryId || "uncategorized"} 
                              onValueChange={(value) => setItemForm({
                                ...itemForm, 
                                categoryId: value === "uncategorized" ? "" : value
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="uncategorized">No Category</SelectItem>
                                {getHierarchicalCategories().map(parent => (
                                  <div key={parent.id}>
                                    <SelectItem value={parent.id}>
                                      {parent.name}
                                    </SelectItem>
                                    {parent.subcategories.map(sub => (
                                      <SelectItem key={sub.id} value={sub.id}>
                                        └ {sub.name}
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        {/* Simple Add-ons Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Add-ons (Optional)</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addSimpleAddon}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Add-on
                            </Button>
                          </div>
                          
                          {itemForm.addons?.map((addon, index) => (
                            <div key={addon.id} className="border rounded-lg p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Add-on {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSimpleAddon(addon.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Add-on Name</Label>
                                  <Input
                                    value={addon.name || ''}
                                    onChange={(e) => updateSimpleAddon(addon.id, 'name', e.target.value)}
                                    placeholder="e.g., Extra Cheese"
                                    className="h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Price ({currencySymbol})</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={addon.price || 0}
                                    onChange={(e) => updateSimpleAddon(addon.id, 'price', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {(!itemForm.addons || itemForm.addons.length === 0) && (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No add-ons yet. Click "Add Add-on" to create simple add-ons with name and price.
                            </div>
                          )}
                        </div>
                        
                        {/* Dietary Characteristics Section */}
                        <div className="space-y-4">
                          <DietaryCharacteristicsSelector
                            selectedCharacteristics={selectedCharacteristicIds}
                            onSelectionChange={setSelectedCharacteristicIds}
                            tenantId={tenantSlug}
                          />
                        </div>
                        
                        {/* Price Variants Section */}
                        {editingItem && (
                          <div className="space-y-4">
                            <PriceVariantsManager
                              menuItemId={editingItem.id}
                              tenantId={tenantData?.id || ''}
                              currencySymbol={currencySymbol}
                            />
                          </div>
                        )}
                        
                        {/* VAT Management Section */}
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold">VAT Configuration</h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="vatRate">VAT Rate (%) *Required*</Label>
                              {vatRateString === "" && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-yellow-600">⚠️</span>
                                    <span className="text-yellow-800 font-medium">Please select a VAT rate for this item</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('� 0% VAT button clicked');
                                    setVatRateString("0.00");
                                    setItemForm(prev => ({
                                      ...prev,
                                      vatRate: 0,
                                      isVatExempt: true
                                    }));
                                    console.log('✅ Set to 0% VAT (Exempt)');
                                  }}
                                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                                    vatRateString === "0.00" 
                                      ? 'bg-green-50 border-green-500 text-green-700 shadow-md' 
                                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="text-lg font-bold">0%</div>
                                    <div className="text-xs">Zero-rated VAT</div>
                                    {vatRateString === "0.00" && <div className="text-xs mt-1 text-green-600">✓ Selected</div>}
                                  </div>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    console.log('� 20% VAT button clicked');
                                    setVatRateString("20.00");
                                    setItemForm(prev => ({
                                      ...prev,
                                      vatRate: 20,
                                      isVatExempt: false
                                    }));
                                    console.log('✅ Set to 20% VAT (Standard)');
                                  }}
                                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                                    vatRateString === "20.00" 
                                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' 
                                      : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="text-lg font-bold">20%</div>
                                    <div className="text-xs">Standard VAT</div>
                                    {vatRateString === "20.00" && <div className="text-xs mt-1 text-blue-600">✓ Selected</div>}
                                  </div>
                                </button>
                              </div>
                              <div className="text-xs space-y-1">
                                <p className="text-gray-600">
                                  <strong>Selected:</strong> {
                                    vatRateString === "0.00" ? "0% (Zero-rated VAT)" : 
                                    vatRateString === "20.00" ? "20% (Standard VAT)" : 
                                    "❌ No VAT rate selected"
                                  }
                                </p>
                                <p className="text-gray-500">
                                  Form VAT Rate: {itemForm.vatRate !== undefined ? `${itemForm.vatRate}%` : "Not set"} {
                                    itemForm.isVatExempt === true ? '(VAT Exempt)' : 
                                    itemForm.isVatExempt === false ? '(VAT Applied)' : 
                                    '(Status unknown)'
                                  }
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="vatType">VAT Type</Label>
                              <Select 
                                value={itemForm.vatType || "simple"} 
                                onValueChange={(value) => setItemForm({
                                  ...itemForm, 
                                  vatType: value as 'simple' | 'mixed'
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select VAT type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="simple">Simple Item (Single VAT Rate)</SelectItem>
                                  <SelectItem value="mixed">Mixed Item (Component-based VAT)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="vatNotes">How to Use It (Your Biryani Example)</Label>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-sm text-blue-800 space-y-1">
                                <div>• Don't select 0%/20% VAT buttons → Select "Mixed Item (Component-based VAT)" → Toggle ON Components</div>
                                <div>• Component 1: "Chicken Biryani (Hot)" £15.00, Hot Food ≥60°C (20% VAT)</div>
                                <div>• Component 2: "Raita (Cold Yogurt)" £5.00, Cold Food &lt;60°C (0% VAT)</div>
                                <div className="font-medium text-blue-900">📊 Result: £20.00 total with £3.00 VAT (15% effective rate)</div>
                              </div>
                            </div>
                          </div>
                          
                          {itemForm.vatRate === 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <span className="text-yellow-600 text-sm">⚠️</span>
                                <div className="text-sm text-yellow-800">
                                  <strong>Zero-rated VAT:</strong> Ensure this item qualifies for 0% VAT (e.g., cold food, basic groceries). 
                                  Hot food typically requires 20% VAT.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Mixed Item Component Management */}
                        {itemForm.vatType === 'mixed' && (
                          <div className="space-y-4 border-t pt-4">
                            <ComponentSelector
                              menuItemId={itemForm.name ? `item_${itemForm.name.replace(/\s+/g, '_').toLowerCase()}` : undefined}
                              totalPrice={Number(itemForm.price) || 0}
                              onComponentsChange={setItemComponents}
                              onVATChange={setMixedItemVAT}
                              initialComponents={itemComponents}
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="available"
                            checked={itemForm.available}
                            onCheckedChange={(checked) => setItemForm({...itemForm, available: checked})}
                          />
                          <Label htmlFor="available" className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Available for orders
                          </Label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveItem} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                          {editingItem ? 'Update Item' : 'Create Item'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {filteredAndSortedItems.length > 0 ? (
                  <SortableMenuItemsTable
                    items={filteredAndSortedItems}
                    categories={categories || []}
                    currency={restaurantSettings?.currency || 'USD'}
                    onEdit={setEditingMenuItem}
                    onDelete={(item) => deleteMenuItem(item.id)}
                    onView={setViewingMenuItem}
                    onReorder={handleMenuItemReorder}
                    selectedCategory={selectedCategory}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package className="w-12 h-12" />
                            <div>No menu items yet. Create your first item!</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Categories
                </CardTitle>
                <CardDescription>Organize your menu with categories and sub-categories</CardDescription>
              </div>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetCategoryForm} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5" />
                      {editingCategory ? 'Edit Category' : 'Add New Category'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryName">Name *</Label>
                      <Input
                        id="categoryName"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                        placeholder="Category name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryDescription">Description</Label>
                      <Textarea
                        id="categoryDescription"
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                        placeholder="Category description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentCategory">Parent Category</Label>
                      <Select
                        value={categoryForm.parentId || "none"}
                        onValueChange={(value) => setCategoryForm({
                          ...categoryForm,
                          parentId: value === "none" ? undefined : value
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              No Parent (Main Category)
                            </div>
                          </SelectItem>
                          {getFilteredCategories(editingCategory?.id).filter(cat => !cat.parentId).map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="categoryActive"
                        checked={categoryForm.active}
                        onCheckedChange={(checked) => setCategoryForm({...categoryForm, active: checked})}
                      />
                      <Label htmlFor="categoryActive" className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Active category
                      </Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCategory} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {categories && categories.length > 0 ? (
                  <SortableCategoriesTable
                    categories={categories}
                    menuItems={menuItems || []}
                    onEdit={handleEditCategory}
                    onDelete={handleDeleteCategory}
                    onReorder={reorderCategories}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Items Count</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Tag className="w-12 h-12" />
                            <div>No categories yet. Create your first category!</div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meal Deals Tab */}
        <TabsContent value="meal-deals" className="space-y-6">
          <MealDealsManager tenantId={tenantSlug} tenantUuid={tenantData?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
