import { NextRequest, NextResponse } from 'next/server';
import { getShopCategories } from '@/lib/shop-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
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
