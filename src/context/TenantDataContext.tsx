'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import type { 
    Order, RestaurantSettings, Customer, Address, OrderStatus,
    OpeningHours, OpeningHoursPerDay, Voucher, DeliveryZone, Printer
} from '@/lib/types';
import { MenuCategory, MenuItem, MealDeal } from '@/lib/menu-types';
import * as TenantCustomerService from '@/lib/tenant-customer-service';
import * as TenantOrderService from '@/lib/tenant-order-service';
import { getTenantSettingsAction } from '@/lib/server-actions';
import { defaultRestaurantSettings } from '@/lib/defaultRestaurantSettings';
import { useTenant } from './TenantContext';

// Helper functions to fetch vouchers and delivery zones via API
const fetchTenantVouchers = async (tenantId: string): Promise<Voucher[]> => {
    const response = await fetch(`/api/tenant/vouchers`, {
        headers: {
            'X-Tenant-ID': tenantId
        }
    });
    
    if (!response.ok) return [];
    return response.json();
};

const fetchTenantDeliveryZones = async (tenantId: string): Promise<DeliveryZone[]> => {
    const response = await fetch(`/api/tenant/zones`, {
        headers: {
            'X-Tenant-ID': tenantId
        }
    });
    
    if (!response.ok) return [];
    return response.json();
};

const fetchTenantPrinters = async (tenantId: string): Promise<Printer[]> => {
    // For now, return empty array since printers might not be implemented yet
    // This can be updated when printer API is implemented
    return [];
};

const fetchTenantMealDeals = async (tenantSlug: string): Promise<MealDeal[]> => {
    console.log('🔍 fetchTenantMealDeals called with tenantSlug:', tenantSlug);
    try {
        const response = await fetch(`/api/${tenantSlug}/meal-deals`);
        console.log('🔍 Meal deals API response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Failed to fetch meal deals:', response.status, response.statusText);
            throw new Error(`Failed to fetch meal deals: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🔍 Meal deals API response data:', data);
        return data || [];
    } catch (error) {
        console.error('❌ Error fetching meal deals:', error);
        return [];
    }
};

// Define the shape of the tenant data context
interface TenantDataContextType {
    orders: Order[];
    menuItems: MenuItem[];
    categories: MenuCategory[];
    mealDeals: MealDeal[];
    vouchers: Voucher[];
    deliveryZones: DeliveryZone[];
    printers: Printer[];
    restaurantSettings: RestaurantSettings; // No longer null - always provide default settings
    customers: Customer[];
    currentUser: Customer | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Handler functions to abstract away state setting logic
    createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'>) => Promise<{
        orderId: string;
        orderNumber: string;
        total: number;
        customerName: string;
        orderType: string;
        scheduledTime?: Date;
    }>;
    saveMenuItem: (item: MenuItem) => Promise<void>;
    deleteMenuItem: (itemId: string) => Promise<void>;
    saveCategory: (category: MenuCategory) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateOrderPrintStatus: (orderId: string) => Promise<void>;
    deleteOrder: (orderId: string) => Promise<void>;
    saveSettings: (settings: RestaurantSettings) => Promise<void>;
    saveVoucher: (voucher: Voucher) => Promise<void>;
    deleteVoucher: (voucherId: string) => Promise<void>;
    toggleVoucherStatus: (voucherId: string) => Promise<void>;
    saveDeliveryZone: (zone: DeliveryZone) => Promise<void>;
    deleteDeliveryZone: (zoneId: string) => Promise<void>;
    savePrinter: (printer: Printer) => Promise<void>;
    deletePrinter: (printerId: string) => Promise<void>;
    togglePrinterStatus: (printerId: string) => Promise<void>;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    updateUserDetails: (updatedDetails: Partial<Customer>) => Promise<void>;
    addAddress: (address: Omit<Address, 'id'>) => Promise<void>;
    deleteAddress: (addressId: string) => Promise<void>;
    getMenuWithCategories: () => { category: MenuCategory; items: MenuItem[] }[];
    getMenuWithCategoriesForCustomer: () => { category: any; items: any[] }[];
    refreshData: () => Promise<void>;
    updateCategoriesOrder: (categoryIds: string[]) => void;
    updateMenuItemsOrder: (itemIds: string[], categoryId?: string) => void;
}

// Create the context
const TenantDataContext = createContext<TenantDataContextType | undefined>(undefined);

// Create the provider component
export const TenantDataProvider = ({ children }: { children: ReactNode }) => {
    const { tenantData, isLoading: tenantLoading } = useTenant();
    const pathname = usePathname();
    const isAdminRoute = pathname.includes('/admin');
    
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [mealDeals, setMealDeals] = useState<MealDeal[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [currentUser, setCurrentUser] = useState<Customer | null>(null);
    const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const isAuthenticated = !!currentUser;

    const refreshData = useCallback(async () => {
        if (!tenantData?.id) return;
        
        try {
            setIsLoading(true);
            
            console.log('🔍 Starting data fetch for tenant UUID:', tenantData.id);
            console.log('🔍 Using tenant slug for API calls:', tenantData.slug);
            
            // Only fetch meal deals for now to debug the issue
            const dbMealDeals = await fetchTenantMealDeals(tenantData.slug);
            console.log('🔍 Data fetch completed - Meal deals:', dbMealDeals);
            
            // Fetch menu data using new API
            const menuResponse = await fetch(`/api/menu?tenantId=${tenantData.slug}&action=menu`);
            const menuData = await menuResponse.json();
            
            if (menuData.success) {
                const menuWithCategories = menuData.data;
                setCategories(menuWithCategories.map((item: any) => item.category));
                
                // Process menu items 
                const processedMenuItems = menuWithCategories.flatMap((categoryData: any) => 
                    categoryData.items.map((item: any) => {
                        console.log('🔍 TenantDataContext - Processing menu item:', item.name, 'with addons:', item.addons);
                        return {
                            ...item,
                            // Keep addons - don't remove them!
                            addons: item.addons || []
                        };
                    })
                );
                
                console.log('🔍 TenantDataContext refreshData - Setting processed menu items:', processedMenuItems.length);
                setMenuItems(processedMenuItems);
            }
            
            setMealDeals(dbMealDeals);
            
            // TODO: Fix other data fetching
            // setCustomers(dbCustomers);
            // setOrders(dbOrders);
            // setVouchers(dbVouchers);
            // setDeliveryZones(dbDeliveryZones);
            // setPrinters(dbPrinters);
            
            // Set restaurant settings using actual tenant settings, falling back to defaults
            const paymentSettings = (tenantData.settings as any)?.paymentSettings || {};
            console.log('🔄 Loading payment settings:', paymentSettings);
            
            const defaultSettings: RestaurantSettings = {
                ...defaultRestaurantSettings,
                ...tenantData.settings, // Use actual tenant settings
                name: tenantData.name,
                description: `Welcome to ${tenantData.name}`,
                logo: tenantData.settings.logo,
                currency: tenantData.settings.currency || 'GBP',
                theme: {
                    ...defaultRestaurantSettings.theme,
                    primary: tenantData.settings.primaryColor || defaultRestaurantSettings.theme.primary
                },
                // Ensure payment settings are properly loaded from tenant data
                paymentSettings: {
                    ...defaultRestaurantSettings.paymentSettings,
                    ...paymentSettings,
                    giftCards: {
                        enabled: paymentSettings?.giftCards?.enabled ?? defaultRestaurantSettings.paymentSettings.giftCards?.enabled ?? false
                    }
                }
            };
            
            console.log('✅ Final payment settings:', defaultSettings.paymentSettings);
            
            setRestaurantSettings(defaultSettings);
        } catch (error) {
            console.error("Failed to refresh tenant data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [tenantData?.id, tenantData?.name, tenantData?.settings]);

    useEffect(() => {
        if (tenantData?.id) {
            refreshData();
        }
    }, [refreshData, tenantData?.id]);

    // Apply tenant theme if available
    useEffect(() => {
        if (restaurantSettings?.theme) {
            const root = document.documentElement;
            root.style.setProperty('--primary', restaurantSettings.theme.primary);
            root.style.setProperty('--primary-foreground', restaurantSettings.theme.primaryForeground);
            root.style.setProperty('--background', restaurantSettings.theme.background);
            root.style.setProperty('--accent', restaurantSettings.theme.accent);
        }
    }, [restaurantSettings?.theme]);

    // Check for existing authentication on load (skip for admin routes to prevent logout calls)
    useEffect(() => {
        const checkAuth = async () => {
            if (!tenantData?.id || isAdminRoute) return;
            
            try {
                const response = await fetch('/api/customer/auth/logout', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                const result = await response.json();
                
                if (result.authenticated && result.customer) {
                    // Get customer addresses
                    const addresses = await TenantCustomerService.getTenantCustomerAddresses(tenantData.id, result.customer.id);
                    result.customer.addresses = addresses;
                    setCurrentUser(result.customer);
                }
            } catch (error) {
                console.error('Auth check error:', error);
            }
        };
        
        checkAuth();
    }, [tenantData?.id, isAdminRoute]);

    // --- Handler Functions ---
    const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'orderNumber'>) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/orders/create?tenantId=${tenantData.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Order creation failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData.error || 'Unknown error',
                details: errorData.details || 'No details available'
            });
            throw new Error(errorData.error || `Failed to create order (${response.status})`);
        }
        
        const result = await response.json();
        await refreshData();
        
        // Return order details for redirect
        return result.data;
    };

    const saveMenuItem = async (item: MenuItem) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        console.log('🔍 TenantDataContext - Saving menu item:', {
            itemId: item.id,
            itemName: item.name,
            tenantId: tenantData.id,
            hasAddons: !!(item as any).addons && (item as any).addons.length > 0,
            addonsCount: (item as any).addons?.length || 0
        });
        
        // Determine if this is an update or create based on whether the item has an ID
        // and whether we can find it in the existing items
        const isUpdate = item.id && item.id.length > 0 && menuItems?.some(existingItem => existingItem.id === item.id);
        const action = isUpdate ? 'update-menu-item' : 'create-menu-item';
        const method = isUpdate ? 'PUT' : 'POST';
        
        console.log('📡 API Request:', {
            url: `/api/menu?tenantId=${tenantData.slug}&action=${action}`,
            method,
            isUpdate,
            itemData: item
        });
        
        const response = await fetch(`/api/menu?tenantId=${tenantData.slug}&action=${action}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        
        if (!response.ok) {
            let errorData: any = {};
            try {
                errorData = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse error response as JSON:', jsonError);
                const responseText = await response.text();
                console.error('Raw response:', responseText);
                errorData = { error: responseText || 'Unknown error' };
            }
            
            console.error('❌ API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Menu item saved successfully:', {
            resultItem: result?.item || result,
            itemName: result?.item?.name || 'Unknown',
            savedVatRate: result?.item?.vatRate,
            savedIsVatExempt: result?.item?.isVatExempt
        });
        
        await refreshData();
        console.log('🔄 Data refreshed after save');
    };

    const deleteMenuItem = async (itemId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/menu?tenantId=${tenantData.slug}&action=delete-menu-item&id=${itemId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete menu item');
        }
        
        await refreshData();
    };

    const saveCategory = async (category: MenuCategory) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        // Determine if this is an update or create based on whether the category has an ID
        // and whether we can find it in the existing categories
        const isUpdate = category.id && category.id.length > 0 && categories?.some(existingCategory => existingCategory.id === category.id);
        const action = isUpdate ? 'update-category' : 'create-category';
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(`/api/menu?tenantId=${tenantData.slug}&action=${action}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(category)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save category');
        }
        
        await refreshData();
    };

    const deleteCategory = async (categoryId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/menu?tenantId=${tenantData.slug}&action=delete-category&id=${categoryId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete category');
        }
        
        await refreshData();
    };

    // Optimistic update functions for drag and drop
    const updateCategoriesOrder = (categoryIds: string[]) => {
        setCategories(prevCategories => {
            const categoryMap = new Map(prevCategories.map(cat => [cat.id, cat]));
            return categoryIds.map((id, index) => ({
                ...categoryMap.get(id)!,
                displayOrder: index + 1
            })).filter(Boolean);
        });
    };

    const updateMenuItemsOrder = (itemIds: string[], categoryId?: string) => {
        setMenuItems(prevItems => {
            return prevItems.map(item => {
                const newIndex = itemIds.indexOf(item.id);
                if (newIndex !== -1) {
                    // If item is in the reordered list, update its display order
                    return {
                        ...item,
                        displayOrder: newIndex + 1
                    };
                }
                return item;
            });
        });
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/orders/update-status?tenantId=${tenantData.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update order status');
        }
        
        await refreshData();
    };

    const updateOrderPrintStatus = async (orderId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        const order = orders.find(o => o.id === orderId);
        if (order) {
            // This would need a separate API endpoint for print status
            await TenantOrderService.updateTenantOrderPrintStatus(tenantData.id, orderId, !order.printed);
            await refreshData();
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/orders/${orderId}?tenantId=${tenantData.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Delete order API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(errorData.error || `Failed to delete order (${response.status})`);
        }
        
        await refreshData();
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        if (!tenantData?.id) return false;
        
        try {
            const response = await fetch('/api/customer/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for cookies
                body: JSON.stringify({
                    email,
                    password,
                    tenantId: tenantData.id
                })
            });

            const result = await response.json();

            if (result.success && result.customer) {
                // Get customer addresses
                const addresses = await TenantCustomerService.getTenantCustomerAddresses(tenantData.id, result.customer.id);
                result.customer.addresses = addresses;
                setCurrentUser(result.customer);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/customer/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setCurrentUser(null);
        }
    };

    const updateUserDetails = async (updatedDetails: Partial<Customer>) => {
        if (!currentUser || !tenantData?.id) return;
        
        // This would need to be implemented in the tenant customer service
        // For now, just update local state
        setCurrentUser(prev => prev ? { ...prev, ...updatedDetails } : null);
    };

    const addAddress = async (address: Omit<Address, 'id'>) => {
        if (!currentUser || !tenantData?.id) throw new Error('User not authenticated');
        
        await TenantCustomerService.addTenantCustomerAddress(tenantData.id, currentUser.id, address);
        
        // Refresh customer addresses
        const addresses = await TenantCustomerService.getTenantCustomerAddresses(tenantData.id, currentUser.id);
        setCurrentUser(prev => prev ? { ...prev, addresses } : null);
    };

    const deleteAddress = async (addressId: string) => {
        if (!currentUser || !tenantData?.id) throw new Error('User not authenticated');
        
        await TenantCustomerService.deleteTenantCustomerAddress(tenantData.id, addressId);
        
        // Refresh customer addresses
        const addresses = await TenantCustomerService.getTenantCustomerAddresses(tenantData.id, currentUser.id);
        setCurrentUser(prev => prev ? { ...prev, addresses } : null);
    };

    const getMenuWithCategories = (): { category: MenuCategory; items: MenuItem[] }[] => {
        return categories.map(category => ({
            category,
            items: menuItems.filter(item => item.categoryId === category.id)
        }));
    };

    // Transform new menu structure to old structure for customer interface compatibility
    const getMenuWithCategoriesForCustomer = (): { category: any; items: any[] }[] => {
        console.log('🔍 getMenuWithCategoriesForCustomer called');
        console.log('🔍 mealDeals count:', mealDeals.length);
        console.log('🔍 categories count:', categories.length);
        
        const menuCategories = categories.map(category => ({
            category: {
                id: category.id,
                name: category.name,
                active: category.active,
                order: category.displayOrder,
                parentId: category.parentId,
                image: category.imageUrl,
                icon: category.icon,
                color: category.color
            },
            items: menuItems.filter(item => item.categoryId === category.id).map(item => {
                const processedItem = {
                    id: item.id,
                    name: item.name,
                    description: item.description || '',
                    price: item.price,
                    image: item.image, // Fixed: use 'image' instead of 'imageUrl'
                    imageHint: item.imageHint,
                    available: item.available,
                    categoryId: item.categoryId || '',
                    addons: [],
                    characteristics: item.characteristics || [],
                    nutrition: item.nutrition || {},
                    preparationTime: item.preparationTime,
                    tags: item.tags || []
                };
                
                return processedItem;
            })
        }));

        // Add meal deals as the first category if any exist
        const activeMealDeals = mealDeals.filter(deal => deal.active);
        console.log('🎯 Active meal deals found:', activeMealDeals.length);
        console.log('🎯 All meal deals:', mealDeals);
        
        if (activeMealDeals.length > 0) {
            console.log('🎯 Creating meal deals category with deals:', activeMealDeals);
            const mealDealsCategory = {
                category: {
                    id: 'meal-deals',
                    name: 'Meal Deals',
                    active: true,
                    order: -1, // Ensure meal deals appear first
                    parentId: null,
                    image: '',
                    icon: null, // Remove the problematic icon
                    color: '#ff6b35'
                },
                items: activeMealDeals.map(deal => ({
                    id: deal.id,
                    name: deal.name,
                    description: deal.description || '',
                    price: deal.price,
                    image: deal.image || '',
                    imageHint: '',
                    available: true,
                    categoryId: 'meal-deals',
                    addons: [],
                    characteristics: [],
                    nutrition: {},
                    preparationTime: 0,
                    tags: ['meal-deal'],
                    mealDeal: true, // Special flag to identify meal deals
                    categories: deal.categories
                }))
            };
            
            console.log('🎯 Returning meal deals first');
            return [mealDealsCategory, ...menuCategories];
        }

        console.log('🎯 No active meal deals, returning regular categories');
        return menuCategories.sort((a: any, b: any) => {
            const orderA = a.category.displayOrder || 0;
            const orderB = b.category.displayOrder || 0;
            return orderA - orderB;
        });
    };

    const saveSettings = async (settings: RestaurantSettings) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantData.id
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            throw new Error('Failed to save settings');
        }

        await refreshData();
    };

    const saveVoucher = async (voucher: Voucher) => {
        if (!tenantData?.id) {
            throw new Error('No tenant selected');
        }

        try {
            // Prepare the voucher data with proper validation
            const voucherPayload = {
                id: voucher.id,
                code: voucher.code,
                type: voucher.type,
                value: Number(voucher.value),
                minOrder: Number(voucher.minOrder || 0),
                maxDiscount: voucher.maxDiscount ? Number(voucher.maxDiscount) : null,
                expiryDate: voucher.expiryDate instanceof Date ? voucher.expiryDate.toISOString() : voucher.expiryDate,
                active: Boolean(voucher.active),
                usageLimit: voucher.usageLimit ? Number(voucher.usageLimit) : null,
                usedCount: Number(voucher.usedCount || 0)
            };

            console.log('Sending voucher payload:', voucherPayload);

            const response = await fetch(`/api/tenant/vouchers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify(voucherPayload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                console.error('Response Status:', response.status);
                
                let errorMessage = 'Failed to save voucher';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    errorMessage = `Server error: ${response.status}`;
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Voucher saved successfully:', result);
            
            // Refresh the data after successful save
            await refreshData();
            
        } catch (error) {
            console.error('Save voucher error:', error);
            throw error;
        }
    };

    const deleteVoucher = async (voucherId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/vouchers`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantData.id
            },
            body: JSON.stringify({ id: voucherId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete voucher');
        }

        await refreshData();
    };

    const toggleVoucherStatus = async (voucherId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const voucher = vouchers.find(v => v.id === voucherId);
        if (voucher) {
            await saveVoucher({ ...voucher, active: !voucher.active });
        }
    };

    const saveDeliveryZone = async (zone: DeliveryZone) => {
        if (!tenantData?.id) {
            throw new Error('No tenant selected');
        }

        try {
            // Prepare the zone data with proper validation
            const zonePayload = {
                id: zone.id,
                name: zone.name?.trim(),
                type: zone.type || 'postcode',
                postcodes: Array.isArray(zone.postcodes) ? zone.postcodes : [],
                deliveryFee: Number(zone.deliveryFee || 0),
                minOrder: Number(zone.minOrder || 0),
                deliveryTime: Number(zone.deliveryTime || 30),
                collectionTime: Number(zone.collectionTime || 15)
            };

            console.log('Sending zone payload:', zonePayload);

            const response = await fetch(`/api/tenant/zones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify(zonePayload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Zone API Error Response:', errorText);
                console.error('Response Status:', response.status);
                
                let errorMessage = 'Failed to save delivery zone';
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    errorMessage = `Server error: ${response.status}`;
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Zone saved successfully:', result);
            
            // Refresh the data after successful save
            await refreshData();
            
        } catch (error) {
            console.error('Save zone error:', error);
            throw error;
        }
    };

    const deleteDeliveryZone = async (zoneId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const response = await fetch(`/api/tenant/zones`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': tenantData.id
            },
            body: JSON.stringify({ id: zoneId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete delivery zone');
        }

        await refreshData();
    };

    const savePrinter = async (printer: Printer) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        // For now, this is a placeholder since printer API might not be fully implemented
        // This can be updated when printer API is available
        console.log('Save printer:', printer);
        await refreshData();
    };

    const deletePrinter = async (printerId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        // For now, this is a placeholder since printer API might not be fully implemented
        console.log('Delete printer:', printerId);
        await refreshData();
    };

    const togglePrinterStatus = async (printerId: string) => {
        if (!tenantData?.id) throw new Error('No tenant selected');
        
        const printer = printers.find(p => p.id === printerId);
        if (printer) {
            await savePrinter({ ...printer, active: !printer.active });
        }
    };

    const contextValue: TenantDataContextType = {
        orders,
        menuItems,
        categories,
        mealDeals,
        vouchers,
        deliveryZones,
        printers,
        // Make sure we always provide a non-null restaurantSettings to avoid breaking components
        restaurantSettings: restaurantSettings || {
            ...defaultRestaurantSettings,
            openingHours: {
                monday: { ...defaultRestaurantSettings.openingHours.monday, timeMode: 'split' as 'split' },
                tuesday: { ...defaultRestaurantSettings.openingHours.tuesday, timeMode: 'split' as 'split' },
                wednesday: { ...defaultRestaurantSettings.openingHours.wednesday, timeMode: 'split' as 'split' },
                thursday: { ...defaultRestaurantSettings.openingHours.thursday, timeMode: 'split' as 'split' },
                friday: { ...defaultRestaurantSettings.openingHours.friday, timeMode: 'split' as 'split' },
                saturday: { ...defaultRestaurantSettings.openingHours.saturday, timeMode: 'split' as 'split' },
                sunday: { ...defaultRestaurantSettings.openingHours.sunday, timeMode: 'split' as 'split' }
            }
        },
        customers,
        currentUser,
        isAuthenticated,
        isLoading: isLoading || tenantLoading,
        createOrder,
        saveMenuItem,
        deleteMenuItem,
        saveCategory,
        deleteCategory,
        updateOrderStatus,
        updateOrderPrintStatus,
        deleteOrder,
        login,
        logout,
        updateUserDetails,
        addAddress,
        deleteAddress,
        getMenuWithCategories,
        getMenuWithCategoriesForCustomer,
        saveSettings,
        saveVoucher,
        deleteVoucher,
        toggleVoucherStatus,
        saveDeliveryZone,
        deleteDeliveryZone,
        savePrinter,
        deletePrinter,
        togglePrinterStatus,
        refreshData,
        updateCategoriesOrder,
        updateMenuItemsOrder,
    };

    return (
        <TenantDataContext.Provider value={contextValue}>
            {children}
        </TenantDataContext.Provider>
    );
};

// Custom hook to use the tenant data context
export const useTenantData = () => {
    const context = useContext(TenantDataContext);
    if (context === undefined) {
        throw new Error('useTenantData must be used within a TenantDataProvider');
    }
    return context;
};
