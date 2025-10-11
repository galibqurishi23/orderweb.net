import { NextRequest, NextResponse } from 'next/server';
import {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getMenuItems,
    getMenuItemById,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getMenuWithCategories,
    getMenuStats,
    reorderCategories,
    reorderMenuItems
} from '@/lib/new-menu-service';
import { getTenantBySlug } from '@/lib/tenant-service';
import { MenuApiResponse } from '@/lib/menu-types';
import { menuCache, CacheKeys, cacheAside, invalidatePatternCache } from '@/lib/cache-service';
import { API_CACHE } from '@/lib/performance-config';

// Helper function to get tenant ID from request
function getTenantId(request: NextRequest): string | null {
    const { searchParams } = new URL(request.url);
    return searchParams.get('tenantId');
}

// Helper function to get tenant UUID from slug
async function getTenantUUID(tenantSlug: string): Promise<string | null> {
    try {
        const tenant = await getTenantBySlug(tenantSlug);
        return tenant?.id || null;
    } catch (error) {
        console.error('Error getting tenant UUID:', error);
        return null;
    }
}

// Helper function to create error response
function createErrorResponse(message: string, status: number = 400): NextResponse {
    return NextResponse.json({
        success: false,
        error: message
    } as MenuApiResponse<never>, { status });
}

// Helper function to create success response
function createSuccessResponse<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
        success: true,
        data,
        message
    } as MenuApiResponse<T>);
}

// ==================== GET OPERATIONS ====================

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const tenantSlug = getTenantId(request);
        if (!tenantSlug) {
            return createErrorResponse('Tenant ID is required', 400);
        }

        // Convert tenant slug to UUID for database operations
        const tenantUUID = await getTenantUUID(tenantSlug);
        if (!tenantUUID) {
            return createErrorResponse('Tenant not found', 404);
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'menu';
        const id = searchParams.get('id');

        switch (action) {
            case 'categories':
                if (id) {
                    const cacheKey = CacheKeys.categoryById(tenantUUID, id);
                    const category = await cacheAside(
                        cacheKey,
                        () => getCategoryById(tenantUUID, id),
                        menuCache,
                        API_CACHE.MENU_CATEGORIES
                    );
                    if (!category) {
                        return createErrorResponse('Category not found', 404);
                    }
                    return createSuccessResponse(category);
                } else {
                    const cacheKey = CacheKeys.categories(tenantUUID);
                    const categories = await cacheAside(
                        cacheKey,
                        () => getCategories(tenantUUID),
                        menuCache,
                        API_CACHE.MENU_CATEGORIES
                    );
                    return createSuccessResponse(categories);
                }

            case 'menu-items':
                if (id) {
                    const cacheKey = CacheKeys.menuItemById(tenantUUID, id);
                    const menuItem = await cacheAside(
                        cacheKey,
                        () => getMenuItemById(tenantUUID, id),
                        menuCache,
                        API_CACHE.MENU_ITEMS
                    );
                    if (!menuItem) {
                        return createErrorResponse('Menu item not found', 404);
                    }
                    return createSuccessResponse(menuItem);
                } else {
                    const cacheKey = CacheKeys.menuItems(tenantUUID);
                    const menuItems = await cacheAside(
                        cacheKey,
                        () => getMenuItems(tenantUUID),
                        menuCache,
                        API_CACHE.MENU_ITEMS
                    );
                    return createSuccessResponse(menuItems);
                }

            case 'menu':
                const cacheKey = CacheKeys.menuWithCategories(tenantUUID);
                const menuData = await cacheAside(
                    cacheKey,
                    () => getMenuWithCategories(tenantUUID),
                    menuCache,
                    API_CACHE.MENU_FULL
                );
                return createSuccessResponse(menuData);

            case 'stats':
                const statsKey = CacheKeys.menuStats(tenantUUID);
                const stats = await cacheAside(
                    statsKey,
                    () => getMenuStats(tenantUUID),
                    menuCache,
                    API_CACHE.MENU_STATS
                );
                return createSuccessResponse(stats);

            default:
                return createErrorResponse('Invalid action specified', 400);
        }
    } catch (error) {
        console.error('Error in GET /api/menu:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

// ==================== POST OPERATIONS (CREATE) ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const tenantSlug = getTenantId(request);
        if (!tenantSlug) {
            return createErrorResponse('Tenant ID is required', 400);
        }

        // Convert tenant slug to UUID for database operations
        const tenantUUID = await getTenantUUID(tenantSlug);
        if (!tenantUUID) {
            return createErrorResponse('Tenant not found', 404);
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        
        if (!action) {
            return createErrorResponse('Action is required', 400);
        }

        const requestBody = await request.json();
        
        console.log('🔍 API /menu POST - Request details:', {
            tenantSlug,
            tenantUUID,
            action,
            itemName: requestBody.name,
            hasAddons: !!(requestBody as any).addons && (requestBody as any).addons.length > 0,
            addonsCount: (requestBody as any).addons?.length || 0,
            itemData: {
                id: requestBody.id,
                name: requestBody.name,
                price: requestBody.price,
                categoryId: requestBody.categoryId
            }
        });

        switch (action) {
            case 'create-category':
                const newCategory = await createCategory(tenantUUID, requestBody);
                return createSuccessResponse(newCategory, 'Category created successfully');

            case 'create-menu-item':
                console.log('📝 Creating menu item with data:', requestBody);
                try {
                    const newMenuItem = await createMenuItem(tenantUUID, requestBody);
                    console.log('✅ Menu item created successfully:', newMenuItem.id);
                    return createSuccessResponse(newMenuItem, 'Menu item created successfully');
                } catch (createError) {
                    console.error('❌ Error creating menu item:', {
                        error: createError,
                        tenantUUID,
                        requestBody,
                        errorMessage: createError instanceof Error ? createError.message : 'Unknown error'
                    });
                    throw createError; // Re-throw so the outer catch can handle it
                }

            default:
                return createErrorResponse('Invalid action specified', 400);
        }
    } catch (error) {
        console.error('Error in POST /api/menu:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

// ==================== PUT OPERATIONS (UPDATE) ====================

export async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
        const tenantSlug = getTenantId(request);
        if (!tenantSlug) {
            return createErrorResponse('Tenant ID is required', 400);
        }

        // Convert tenant slug to UUID for database operations
        const tenantUUID = await getTenantUUID(tenantSlug);
        if (!tenantUUID) {
            return createErrorResponse('Tenant not found', 404);
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        
        if (!action) {
            return createErrorResponse('Action is required', 400);
        }

        const requestBody = await request.json();

        switch (action) {
            case 'update-category':
                const updatedCategory = await updateCategory(tenantUUID, requestBody);
                return createSuccessResponse(updatedCategory, 'Category updated successfully');

            case 'update-menu-item':
                const updatedMenuItem = await updateMenuItem(tenantUUID, requestBody);
                return createSuccessResponse(updatedMenuItem, 'Menu item updated successfully');

            case 'reorder_categories':
                const { categoryIds } = requestBody;
                await reorderCategories(tenantUUID, categoryIds);
                return createSuccessResponse(null, 'Categories reordered successfully');

            case 'reorder_items':
                const { itemIds, categoryId } = requestBody;
                await reorderMenuItems(tenantUUID, itemIds, categoryId);
                return createSuccessResponse(null, 'Menu items reordered successfully');

            default:
                return createErrorResponse('Invalid action specified', 400);
        }
    } catch (error) {
        console.error('Error in PUT /api/menu:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}

// ==================== DELETE OPERATIONS ====================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    try {
        const tenantSlug = getTenantId(request);
        if (!tenantSlug) {
            return createErrorResponse('Tenant ID is required', 400);
        }

        // Convert tenant slug to UUID for database operations
        const tenantUUID = await getTenantUUID(tenantSlug);
        if (!tenantUUID) {
            return createErrorResponse('Tenant not found', 404);
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const id = searchParams.get('id');
        
        if (!action) {
            return createErrorResponse('Action is required', 400);
        }

        if (!id) {
            return createErrorResponse('ID is required', 400);
        }

        switch (action) {
            case 'delete-category':
                await deleteCategory(tenantUUID, id);
                return createSuccessResponse(null, 'Category deleted successfully');

            case 'delete-menu-item':
                await deleteMenuItem(tenantUUID, id);
                return createSuccessResponse(null, 'Menu item deleted successfully');

            default:
                return createErrorResponse('Invalid action specified', 400);
        }
    } catch (error) {
        console.error('Error in DELETE /api/menu:', error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Internal server error',
            500
        );
    }
}
