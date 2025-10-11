import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dinedesk_db',
    port: parseInt(process.env.DB_PORT || '3306'),
};

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const { code } = await request.json();
        
        if (!code || !code.trim()) {
            return NextResponse.json(
                { error: 'Gift card code is required' },
                { status: 400 }
            );
        }

        const connection = await mysql.createConnection(dbConfig);

        try {
            // Check if gift card exists and get its balance
            const [rows] = await connection.execute(
                `SELECT gc.*, 
                        COALESCE(gc.amount, 0) - COALESCE(SUM(gct.amount_used), 0) as balance
                 FROM gift_cards gc
                 LEFT JOIN gift_card_transactions gct ON gc.code = gct.gift_card_code
                 WHERE gc.code = ? AND gc.tenant_id = ? AND gc.is_active = 1
                 GROUP BY gc.code`,
                [code.trim().toUpperCase(), params.tenant]
            );

            if (!rows || (rows as any[]).length === 0) {
                return NextResponse.json(
                    { error: 'Gift card not found or invalid' },
                    { status: 404 }
                );
            }

            const giftCard = (rows as any[])[0];
            const balance = parseFloat(giftCard.balance) || 0;

            // If balance is 0 or negative, mark as inactive and delete after 24 hours
            if (balance <= 0) {
                await connection.execute(
                    'UPDATE gift_cards SET is_active = 0, updated_at = NOW() WHERE code = ?',
                    [code.trim().toUpperCase()]
                );

                // Schedule deletion (you might want to implement this as a separate cleanup job)
                setTimeout(async () => {
                    try {
                        const cleanupConnection = await mysql.createConnection(dbConfig);
                        await cleanupConnection.execute(
                            'DELETE FROM gift_cards WHERE code = ? AND is_active = 0',
                            [code.trim().toUpperCase()]
                        );
                        await cleanupConnection.execute(
                            'DELETE FROM gift_card_transactions WHERE gift_card_code = ?',
                            [code.trim().toUpperCase()]
                        );
                        await cleanupConnection.end();
                    } catch (error) {
                        console.error('Error cleaning up gift card:', error);
                    }
                }, 24 * 60 * 60 * 1000); // 24 hours
            }

            return NextResponse.json({
                code: giftCard.code,
                balance: Math.max(0, balance), // Ensure balance is never negative
                original_amount: parseFloat(giftCard.amount),
                created_at: giftCard.created_at,
                expires_at: giftCard.expires_at
            });

        } finally {
            await connection.end();
        }

    } catch (error) {
        console.error('Gift card balance check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
