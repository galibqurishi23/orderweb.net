'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MenuCategory, MenuItem, MenuWithCategories, MenuStats, MenuApiResponse } from '@/lib/menu-types';

// Context type definition
interface MenuContextType {
    // Data
    categories: MenuCategory[];
    menuItems: MenuItem[];
    menuWithCategories: MenuWithCategories[];
    stats: MenuStats | null;
    
    // Loading states
    isLoading: boolean;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    
    // Error states
    error: string | null;
    
    // Category operations
    createCategory: (categoryData: Omit<MenuCategory, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Promise<MenuCategory>;
    updateCategory: (categoryData: Partial<MenuCategory> & { id: string }) => Promise<MenuCategory>;
    deleteCategory: (categoryId: string) => Promise<void>;
    getCategoryById: (categoryId: string) => MenuCategory | null;
    
    // Menu item operations
    createMenuItem: (itemData: Omit<MenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Promise<MenuItem>;
    updateMenuItem: (itemData: Partial<MenuItem> & { id: string }) => Promise<MenuItem>;
    deleteMenuItem: (itemId: string) => Promise<void>;
    getMenuItemById: (itemId: string) => MenuItem | null;
    
    // Utility functions
    refreshData: () => Promise<void>;
    clearError: () => void;
}

// Create context
const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Provider component
export function MenuProvider({ 
    children, 
    tenantId 
}: { 
    children: React.ReactNode;
    tenantId: string;
}) {
    // State management
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [menuWithCategories, setMenuWithCategories] = useState<MenuWithCategories[]>([]);
    const [stats, setStats] = useState<MenuStats | null>(null);
    
    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Error state
    const [error, setError] = useState<string | null>(null);

    // Helper function to handle API calls
    const handleApiCall = async <T,>(
        apiCall: () => Promise<Response>,
        loadingStateSetter?: (loading: boolean) => void
    ): Promise<T> => {
        try {
            setError(null);
            if (loadingStateSetter) loadingStateSetter(true);

            const response = await apiCall();
            const result: MenuApiResponse<T> = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Operation failed');
            }

            return result.data as T;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            throw err;
        } finally {
            if (loadingStateSetter) loadingStateSetter(false);
        }
    };

    // Data fetching functions
    const fetchCategories = useCallback(async () => {
        const data = await handleApiCall<MenuCategory[]>(() => 
            fetch(`/api/menu?tenantId=${tenantId}&action=categories`)
        );
        setCategories(data);
    }, [tenantId]);

    const fetchMenuItems = useCallback(async () => {
        const data = await handleApiCall<MenuItem[]>(() => 
            fetch(`/api/menu?tenantId=${tenantId}&action=menu-items`)
        );
        setMenuItems(data);
    }, [tenantId]);

    const fetchMenuWithCategories = useCallback(async () => {
        const data = await handleApiCall<MenuWithCategories[]>(() => 
            fetch(`/api/menu?tenantId=${tenantId}&action=menu`)
        );
        setMenuWithCategories(data);
    }, [tenantId]);

    const fetchStats = useCallback(async () => {
        const data = await handleApiCall<MenuStats>(() => 
            fetch(`/api/menu?tenantId=${tenantId}&action=stats`)
        );
        setStats(data);
    }, [tenantId]);

    // Refresh all data
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchCategories(),
                fetchMenuItems(),
                fetchMenuWithCategories(),
                fetchStats()
            ]);
        } catch (err) {
            console.error('Error refreshing data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchCategories, fetchMenuItems, fetchMenuWithCategories, fetchStats]);

    // Category operations
    const createCategory = useCallback(async (categoryData: Omit<MenuCategory, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
        const newCategory = await handleApiCall<MenuCategory>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=create-category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            }),
            setIsCreating
        );
        
        // Optimistically update local state
        setCategories(prev => [...prev, newCategory]);
        
        // Refresh related data
        await fetchMenuWithCategories();
        await fetchStats();
        
        return newCategory;
    }, [tenantId, fetchMenuWithCategories, fetchStats]);

    const updateCategory = useCallback(async (categoryData: Partial<MenuCategory> & { id: string }) => {
        const updatedCategory = await handleApiCall<MenuCategory>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=update-category`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            }),
            setIsUpdating
        );
        
        // Optimistically update local state
        setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
        
        // Refresh related data
        await fetchMenuWithCategories();
        
        return updatedCategory;
    }, [tenantId, fetchMenuWithCategories]);

    const deleteCategory = useCallback(async (categoryId: string) => {
        await handleApiCall<null>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=delete-category&id=${categoryId}`, {
                method: 'DELETE'
            }),
            setIsDeleting
        );
        
        // Optimistically update local state
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        
        // Refresh related data
        await fetchMenuItems();
        await fetchMenuWithCategories();
        await fetchStats();
    }, [tenantId, fetchMenuItems, fetchMenuWithCategories, fetchStats]);

    const getCategoryById = useCallback((categoryId: string) => {
        return categories.find(cat => cat.id === categoryId) || null;
    }, [categories]);

    // Menu item operations
    const createMenuItem = useCallback(async (itemData: Omit<MenuItem, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
        const newMenuItem = await handleApiCall<MenuItem>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=create-menu-item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            }),
            setIsCreating
        );
        
        // Optimistically update local state
        setMenuItems(prev => [...prev, newMenuItem]);
        
        // Refresh related data
        await fetchMenuWithCategories();
        await fetchStats();
        
        return newMenuItem;
    }, [tenantId, fetchMenuWithCategories, fetchStats]);

    const updateMenuItem = useCallback(async (itemData: Partial<MenuItem> & { id: string }) => {
        const updatedMenuItem = await handleApiCall<MenuItem>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=update-menu-item`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            }),
            setIsUpdating
        );
        
        // Optimistically update local state
        setMenuItems(prev => prev.map(item => item.id === updatedMenuItem.id ? updatedMenuItem : item));
        
        // Refresh related data
        await fetchMenuWithCategories();
        await fetchStats();
        
        return updatedMenuItem;
    }, [tenantId, fetchMenuWithCategories, fetchStats]);

    const deleteMenuItem = useCallback(async (itemId: string) => {
        await handleApiCall<null>(
            () => fetch(`/api/menu?tenantId=${tenantId}&action=delete-menu-item&id=${itemId}`, {
                method: 'DELETE'
            }),
            setIsDeleting
        );
        
        // Optimistically update local state
        setMenuItems(prev => prev.filter(item => item.id !== itemId));
        
        // Refresh related data
        await fetchMenuWithCategories();
        await fetchStats();
    }, [tenantId, fetchMenuWithCategories, fetchStats]);

    const getMenuItemById = useCallback((itemId: string) => {
        return menuItems.find(item => item.id === itemId) || null;
    }, [menuItems]);

    // Utility functions
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Initial data load
    useEffect(() => {
        if (tenantId) {
            refreshData();
        }
    }, [tenantId, refreshData]);

    // Context value
    const contextValue: MenuContextType = {
        // Data
        categories,
        menuItems,
        menuWithCategories,
        stats,
        
        // Loading states
        isLoading,
        isCreating,
        isUpdating,
        isDeleting,
        
        // Error state
        error,
        
        // Category operations
        createCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
        
        // Menu item operations
        createMenuItem,
        updateMenuItem,
        deleteMenuItem,
        getMenuItemById,
        
        // Utility functions
        refreshData,
        clearError
    };

    return (
        <MenuContext.Provider value={contextValue}>
            {children}
        </MenuContext.Provider>
    );
}

// Custom hook to use the menu context
export function useMenu() {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenu must be used within a MenuProvider');
    }
    return context;
}

// Hook for category-specific operations
export function useCategories() {
    const context = useMenu();
    return {
        categories: context.categories,
        isLoading: context.isLoading,
        error: context.error,
        createCategory: context.createCategory,
        updateCategory: context.updateCategory,
        deleteCategory: context.deleteCategory,
        getCategoryById: context.getCategoryById,
        clearError: context.clearError
    };
}

// Hook for menu item-specific operations
export function useMenuItems() {
    const context = useMenu();
    return {
        menuItems: context.menuItems,
        isLoading: context.isLoading,
        error: context.error,
        createMenuItem: context.createMenuItem,
        updateMenuItem: context.updateMenuItem,
        deleteMenuItem: context.deleteMenuItem,
        getMenuItemById: context.getMenuItemById,
        clearError: context.clearError
    };
}

// Hook for combined menu data
export function useMenuWithCategories() {
    const context = useMenu();
    return {
        menuWithCategories: context.menuWithCategories,
        isLoading: context.isLoading,
        error: context.error,
        refreshData: context.refreshData,
        clearError: context.clearError
    };
}

// Hook for menu statistics
export function useMenuStats() {
    const context = useMenu();
    return {
        stats: context.stats,
        isLoading: context.isLoading,
        error: context.error,
        refreshData: context.refreshData,
        clearError: context.clearError
    };
}
