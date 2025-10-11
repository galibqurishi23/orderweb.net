import { NextRequest, NextResponse } from 'next/server';
import { getShopItems } from '@/lib/shop-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        const { searchParams } = new URL(request.url);
        
        const categoryId = searchParams.get('category');
        const featured = searchParams.get('featured') === 'true';
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
        
        const items = await getShopItems(tenant, {
            categoryId: categoryId || undefined,
            featured: searchParams.has('featured') ? featured : undefined,
            active: true, // only show active items to customers
            limit,
            offset
        });
        
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching shop items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}
