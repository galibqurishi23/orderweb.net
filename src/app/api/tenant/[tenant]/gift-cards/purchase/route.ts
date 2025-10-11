import { NextRequest, NextResponse } from 'next/server';
import { createGiftCard, createGiftCardOrder, getGiftCardSettings } from '@/lib/gift-card-service';
import { EmailConfirmationService } from '@/lib/email-confirmation-service';
import { broadcastGiftCardPurchase } from '@/lib/websocket-broadcaster';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        const body = await request.json();
        
        const {
            card_type,
            amount,
            customer_name,
            customer_email,
            customer_phone,
            recipient_name,
            recipient_email,
            recipient_address,
            personal_message
        } = body;

        // Validate required fields
        if (!card_type || !amount || !customer_name || !customer_email) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get gift card settings for validation
        const settings = await getGiftCardSettings(tenant);
        if (!settings) {
            return NextResponse.json(
                { error: 'Gift card settings not configured' },
                { status: 400 }
            );
        }

        // Validate amount
        if (amount < settings.min_custom_amount || amount > settings.max_custom_amount) {
            return NextResponse.json(
                { error: `Amount must be between £${settings.min_custom_amount} and £${settings.max_custom_amount}` },
                { status: 400 }
            );
        }

        // Validate card type specific requirements
        if (card_type === 'digital' && !recipient_email) {
            return NextResponse.json(
                { error: 'Recipient email required for digital gift cards' },
                { status: 400 }
            );
        }

        if (card_type === 'physical' && !recipient_address) {
            return NextResponse.json(
                { error: 'Delivery address required for physical gift cards' },
                { status: 400 }
            );
        }

        // Create gift card
        const giftCard = await createGiftCard(tenant, {
            card_type,
            amount,
            expiry_months: settings.default_expiry_months
        });

        // Create order
        const order = await createGiftCardOrder(tenant, {
            gift_card_id: giftCard.id,
            customer_name,
            customer_email,
            customer_phone,
            recipient_name: recipient_name || customer_name,
            recipient_email: card_type === 'digital' ? recipient_email : customer_email,
            recipient_address: card_type === 'physical' ? recipient_address : null,
            personal_message,
            order_amount: amount,
            payment_status: 'pending',
            delivery_status: 'pending'
        });

        // Send gift card email notification
        try {
            console.log('🎁 Sending gift card confirmation email...');
            
            const emailRecipient = card_type === 'digital' ? recipient_email : customer_email;
            const giftCardData = {
                CUSTOMER_NAME: customer_name,
                RECIPIENT_NAME: recipient_name || customer_name,
                GIFT_CARD_CODE: giftCard.card_number,
                GIFT_CARD_AMOUNT: `£${amount.toFixed(2)}`,
                PURCHASE_DATE: new Date().toLocaleDateString(),
                PERSONAL_MESSAGE: personal_message || '',
                RESTAURANT_NAME: 'Kitchen Restaurant' // This should be fetched from tenant data
            };

            console.log('📧 Gift card data being sent to email service:', giftCardData);

            // TODO: Implement sendGiftCardEmail method in EmailConfirmationService
            // const emailResult = await EmailConfirmationService.sendGiftCardEmail(
            //     tenant,
            //     emailRecipient,
            //     giftCardData
            // );

            // console.log('📨 Email service result:', emailResult);

            // if (emailResult.success) {
            //     console.log('✅ Gift card email sent successfully to:', emailRecipient);
            // } else {
            //     console.error('❌ Failed to send gift card email:', emailResult.message);
            // }
        } catch (emailError) {
            console.error('❌ Error sending gift card email:', emailError);
            // Don't fail the order if email fails
        }

        // WebSocket broadcast for real-time POS notification
        try {
            await broadcastGiftCardPurchase(tenant, {
                cardNumber: giftCard.card_number,
                balance: amount,
                purchasedBy: customer_name,
                recipientName: recipient_name || customer_name,
                recipientEmail: card_type === 'digital' ? recipient_email : customer_email,
                expiryDate: giftCard.expiry_date,
                createdAt: new Date().toISOString()
            });
            console.log('✅ WebSocket broadcast sent for gift card purchase:', giftCard.card_number);
        } catch (wsError) {
            console.error('⚠️ Error broadcasting gift card purchase via WebSocket:', wsError);
        }

        // For demo purposes, return success. In production, integrate with your payment system
        return NextResponse.json({
            success: true,
            order_id: order.id,
            gift_card_number: giftCard.card_number,
            amount: amount,
            message: 'Gift card order created successfully',
            // In production, return payment URL from your payment processor
            payment_url: `/api/tenant/${tenant}/payments/process?order_id=${order.id}`
        });

    } catch (error) {
        console.error('Error creating gift card order:', error);
        return NextResponse.json(
            { error: 'Failed to create gift card order' },
            { status: 500 }
        );
    }
}
