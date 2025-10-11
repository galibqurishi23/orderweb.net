import { NextRequest, NextResponse } from 'next/server';
import { redeemGiftCard } from '@/lib/gift-card-service';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const body = await request.json();
        
        const { card_number, amount, description } = body;

        if (!card_number || !amount) {
            return NextResponse.json(
                { error: 'Card number and amount are required' },
                { status: 400 }
            );
        }

        const success = await redeemGiftCard(tenant, card_number, amount, description);
        
        if (!success) {
            return NextResponse.json(
                { error: 'Invalid card number, insufficient balance, or card not active' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, message: 'Gift card redeemed successfully' });
    } catch (error) {
        console.error('Error redeeming gift card:', error);
        return NextResponse.json(
            { error: 'Failed to redeem gift card' },
            { status: 500 }
        );
    }
}
