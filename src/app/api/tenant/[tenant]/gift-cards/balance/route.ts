import { NextRequest, NextResponse } from 'next/server';
import { getGiftCard } from '@/lib/gift-card-service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
    const { tenant } = params;
        const { searchParams } = new URL(request.url);
        const cardNumber = searchParams.get('card_number');

        if (!cardNumber) {
            return NextResponse.json(
                { error: 'Card number is required' },
                { status: 400 }
            );
        }

        const card = await getGiftCard(tenant, cardNumber);
        
        if (!card) {
            return NextResponse.json(
                { error: 'Gift card not found' },
                { status: 404 }
            );
        }

        // Return only safe information for balance check
        return NextResponse.json({
            card_number: card.card_number,
            remaining_balance: card.remaining_balance,
            status: card.status,
            expiry_date: card.expiry_date
        });
    } catch (error) {
        console.error('Error checking gift card balance:', error);
        return NextResponse.json(
            { error: 'Failed to check balance' },
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
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json(
                { error: 'Gift card code is required' },
                { status: 400 }
            );
        }

        const card = await getGiftCard(tenant, code.toUpperCase());
        
        if (!card) {
            return NextResponse.json(
                { error: 'Gift card not found' },
                { status: 404 }
            );
        }

        // Check if expired (12 months from creation)
        let isExpired = false;
        let daysLeft = null;
        
        if (card.expiry_date) {
            const expiryDate = new Date(card.expiry_date);
            const today = new Date();
            isExpired = today > expiryDate;
            
            if (!isExpired) {
                const timeDiff = expiryDate.getTime() - today.getTime();
                daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
            }
        }

        // Return balance information with expiry details
        return NextResponse.json({
            balance: isExpired ? 0 : parseFloat(card.remaining_balance.toString()),
            status: isExpired ? 'expired' : card.status,
            card_number: card.card_number,
            expiry_date: card.expiry_date,
            days_left: daysLeft,
            is_expired: isExpired
        });
    } catch (error) {
        console.error('Error checking gift card balance:', error);
        return NextResponse.json(
            { error: 'Failed to check balance' },
            { status: 500 }
        );
    }
}
