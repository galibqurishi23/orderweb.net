import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        
        // Database connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'dinedesk_db',
            charset: 'utf8mb4'
        });

        // Get tenant UUID first
        const [tenantRows] = await connection.execute(
            'SELECT id FROM tenants WHERE slug = ?',
            [tenant]
        ) as any;

        if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
            await connection.end();
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const tenantId = tenantRows[0].id;

        // Get tenant settings
        const [settingsRows] = await connection.execute(
            'SELECT settings_json, stripe_publishable_key, stripe_secret_key, stripe_mode, active_payment_gateway FROM tenant_settings WHERE tenant_id = ?',
            [tenantId]
        ) as any;

        await connection.end();

        if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
            return NextResponse.json({ 
                error: 'No settings found',
                tenantId,
                debug: 'No tenant_settings row found'
            }, { status: 404 });
        }

        const settings = settingsRows[0];
        const settingsJson = JSON.parse(settings.settings_json);

        // Payment config logic (matching the API)
        const paymentConfig = {
            configured: !!(settings.active_payment_gateway && 
                          ((settings.active_payment_gateway === 'stripe' && settings.stripe_publishable_key && settings.stripe_secret_key) ||
                           (settings.active_payment_gateway === 'global_payments'))),
            activeGateway: settings.active_payment_gateway,
            gatewayName: settings.active_payment_gateway === 'stripe' ? 'Stripe' : 
                        settings.active_payment_gateway === 'global_payments' ? 'Global Payments' : '',
            stripeMode: settings.stripe_mode || 'test'
        };

        // Calculate available payment methods (matching component logic)
        const availablePaymentMethods = [];
        
        // Cash check
        if (settingsJson?.paymentSettings?.cash?.enabled) {
            availablePaymentMethods.push('cash');
        }
        
        // Card check
        const isCardPaymentEnabled = paymentConfig.configured && paymentConfig.activeGateway;
        if (isCardPaymentEnabled) {
            availablePaymentMethods.push('card');
        }

        return NextResponse.json({
            tenantId,
            paymentConfig,
            restaurantSettings: {
                cash_enabled: settingsJson?.paymentSettings?.cash?.enabled,
                stripe_enabled: settingsJson?.paymentSettings?.stripe?.enabled,
                globalPayments_enabled: settingsJson?.paymentSettings?.globalPayments?.enabled
            },
            isCardPaymentEnabled,
            availablePaymentMethods,
            debug: {
                active_payment_gateway: settings.active_payment_gateway,
                stripe_publishable_key_present: !!settings.stripe_publishable_key,
                stripe_secret_key_present: !!settings.stripe_secret_key,
                stripe_mode: settings.stripe_mode
            }
        });

    } catch (error) {
        console.error('Payment methods test error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
