import { NextRequest, NextResponse } from 'next/server';
import { getTenantGiftCards, createGiftCard } from '@/lib/gift-card-service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const cards = await getTenantGiftCards(tenant, status || undefined);
        return NextResponse.json(cards);
    } catch (error) {
        console.error('Error fetching gift cards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gift cards' },
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
    const { tenant } = params;
        const body = await request.json();
        
        const { card_type, amount, expiry_months } = body;

        if (!card_type || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const card = await createGiftCard(tenant, {
            card_type,
            amount,
            expiry_months
        });

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error creating gift card:', error);
        return NextResponse.json(
            { error: 'Failed to create gift card' },
            { status: 500 }
        );
    }
}
