import { NextRequest, NextResponse } from 'next/server';
import { getShopCategories, createShopCategory, updateShopCategory } from '@/lib/shop-service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const tenant = params.tenant;
        const categories = await getShopCategories(tenant);
        
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching shop categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const tenant = params.tenant;
        const body = await request.json();
        
        if (!body.name) {
            return NextResponse.json(
                { error: 'Category name is required' },
                { status: 400 }
            );
        }
        
        const category = await createShopCategory(tenant, body);
        
        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error('Error creating shop category:', error);
        return NextResponse.json(
            { error: 'Failed to create category' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        
        if (!id) {
            return NextResponse.json(
                { error: 'Category ID is required' },
                { status: 400 }
            );
        }
        
        const category = await updateShopCategory(id, updateData);
        
        return NextResponse.json(category);
    } catch (error) {
        console.error('Error updating shop category:', error);
        return NextResponse.json(
            { error: 'Failed to update category' },
            { status: 500 }
        );
    }
}
