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

        // Get tenant data (similar to TenantDataContext)
        const [tenantRows] = await connection.execute(
            'SELECT * FROM tenants WHERE slug = ?',
            [tenant]
        ) as any;

        if (!Array.isArray(tenantRows) || tenantRows.length === 0) {
            await connection.end();
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const tenantData = tenantRows[0];

        // Get tenant settings  
        const [settingsRows] = await connection.execute(
            'SELECT * FROM tenant_settings WHERE tenant_id = ?',
            [tenantData.id]
        ) as any;

        await connection.end();

        let tenantSettings = {};
        if (Array.isArray(settingsRows) && settingsRows.length > 0) {
            tenantSettings = JSON.parse(settingsRows[0].settings_json);
        }

        // Simulate the context loading logic
        const paymentSettings = (tenantSettings as any)?.paymentSettings || {};
        
        // Default payment settings
        const defaultPaymentSettings = {
            cash: { enabled: true },
            stripe: { enabled: false, apiKey: '', apiSecret: '' },
            globalPayments: { enabled: false, merchantId: '', apiSecret: '' },
            worldpay: { enabled: false, username: '', password: '', merchantId: '', environment: 'sandbox' }
        };

        const finalPaymentSettings = {
            ...defaultPaymentSettings,
            ...paymentSettings
        };

        return NextResponse.json({
            tenantData: {
                name: tenantData.name,
                slug: tenantData.slug,
                settings: tenantSettings
            },
            paymentSettings: paymentSettings,
            defaultPaymentSettings: defaultPaymentSettings,
            finalPaymentSettings: finalPaymentSettings,
            cashEnabled: finalPaymentSettings.cash?.enabled,
            debug: {
                settingsRowsLength: settingsRows.length,
                hasSettings: !!tenantSettings,
                paymentSettingsKeys: Object.keys(paymentSettings)
            }
        });

    } catch (error) {
        console.error('Debug context error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
