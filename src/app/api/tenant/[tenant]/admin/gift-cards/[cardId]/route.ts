import { NextRequest, NextResponse } from 'next/server';
import { deleteGiftCard } from '@/lib/gift-card-service';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ tenant: string; cardId: string }> }
) {
    try {
        const params = await context.params;
    const { tenant, cardId } = params;
        const url = new URL(request.url);
        const forceDelete = url.searchParams.get('force') === 'true';

        if (!tenant || !cardId) {
            return NextResponse.json(
                { error: 'Missing tenant or card ID' },
                { status: 400 }
            );
        }

        const result = await deleteGiftCard(tenant, cardId, forceDelete);

        if (result.success) {
            return NextResponse.json(
                { message: result.message },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { error: result.message },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error in gift card DELETE API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
