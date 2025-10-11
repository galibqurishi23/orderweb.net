import { NextRequest, NextResponse } from 'next/server';
import { deleteShopCategory } from '@/lib/shop-service';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ tenant: string; categoryId: string }> }
) {
    try {
        const params = await context.params;
    const { tenant, categoryId } = params;
        
        if (!categoryId) {
            return NextResponse.json(
                { error: 'Category ID is required' },
                { status: 400 }
            );
        }
        
        await deleteShopCategory(categoryId);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shop category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
