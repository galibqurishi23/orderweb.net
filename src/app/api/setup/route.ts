import { NextRequest, NextResponse } from 'next/server';
import DatabaseSetup from '@/lib/database-setup';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Starting database initialization...');
        
        const setup = new DatabaseSetup();
        const success = await setup.setupDatabase();
        
        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Database setup completed successfully!',
                timestamp: new Date().toISOString(),
                superAdminAccess: '/super-admin',
                healthCheck: '/api/health'
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Database setup failed. Please check your environment variables.',
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Database setup error:', error);
        
        return NextResponse.json({
            success: false,
            message: 'Database setup failed with error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Database Setup API',
        usage: 'Send POST request to this endpoint to initialize the database',
        requiredEnvVars: [
            'DB_HOST or DATABASE_HOST',
            'DB_USER or DATABASE_USER', 
            'DB_PASSWORD or DATABASE_PASSWORD',
            'DB_NAME or DATABASE_NAME (optional, defaults to dinedesk_db)',
            'DB_PORT or DATABASE_PORT (optional, defaults to 3306)'
        ],
        optionalEnvVars: [
            'SUPER_ADMIN_EMAIL (defaults to admin@dinedesk.com)',
            'SUPER_ADMIN_PASSWORD (defaults to admin123456)'
        ]
    });
}
