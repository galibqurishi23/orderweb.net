import { NextRequest, NextResponse } from 'next/server';
import { getGiftCard } from '@/lib/gift-card-service';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const body = await request.json();
        
        const { card_number } = body;

        if (!card_number) {
            return NextResponse.json(
                { error: 'Gift card number is required' },
                { status: 400 }
            );
        }

        const gift_card = await getGiftCard(tenant, card_number);

        if (!gift_card) {
            return NextResponse.json(
                { error: 'Gift card not found' },
                { status: 404 }
            );
        }

        // Return gift card details for lookup
        return NextResponse.json({
            success: true,
            gift_card: {
                card_number: gift_card.card_number,
                balance: gift_card.remaining_balance,
                status: gift_card.status,
                card_type: gift_card.card_type,
                created_at: gift_card.created_at,
                expiry_date: gift_card.expiry_date
            }
        });
    } catch (error) {
        console.error('Error looking up gift card:', error);
        return NextResponse.json(
            { error: 'Failed to lookup gift card' },
            { status: 500 }
        );
    }
}
