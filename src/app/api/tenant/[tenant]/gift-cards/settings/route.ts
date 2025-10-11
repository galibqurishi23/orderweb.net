import { NextRequest, NextResponse } from 'next/server';
import { getGiftCardSettings, updateGiftCardSettings } from '@/lib/gift-card-service';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        const settings = await getGiftCardSettings(tenant);
        
        if (!settings) {
            return NextResponse.json(
                { error: 'Gift card settings not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching gift card settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ tenant: string }> }
) {
    try {
        const { tenant } = await params;
        const body = await request.json();
        
        console.log('PUT request received for tenant:', tenant);
        console.log('Request body keys:', Object.keys(body));
        
        // Validate that we have data to update
        if (!body || Object.keys(body).length === 0) {
            return NextResponse.json(
                { error: 'No data provided for update' },
                { status: 400 }
            );
        }
        
        // Special handling for cover_image_url
        if (body.cover_image_url && typeof body.cover_image_url === 'string') {
            console.log('Cover image data length:', body.cover_image_url.length);
            
            // Validate base64 format
            if (!body.cover_image_url.startsWith('data:image/')) {
                return NextResponse.json(
                    { error: 'Invalid image format. Expected base64 data URL.' },
                    { status: 400 }
                );
            }
            
            // Check size (roughly 1.5MB limit in base64)
            if (body.cover_image_url.length > 2000000) {
                return NextResponse.json(
                    { error: 'Image too large. Please use a smaller image.' },
                    { status: 400 }
                );
            }
        }
        
        const updatedSettings = await updateGiftCardSettings(tenant, body);
        
        console.log('Settings updated successfully');
        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error('Error updating gift card settings:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to update settings';
        let statusCode = 500;
        
        if (error instanceof Error) {
            errorMessage = error.message;
            
            // Check for specific database errors
            if (error.message.includes('No gift card settings found')) {
                statusCode = 404;
            } else if (error.message.includes('No valid fields to update')) {
                statusCode = 400;
            } else if (error.message.includes('Data too long')) {
                errorMessage = 'Image file is too large for database storage';
                statusCode = 400;
            }
        }
        
        return NextResponse.json(
            { 
                error: errorMessage, 
                details: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: statusCode }
        );
    }
}
