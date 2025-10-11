import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// Function to ensure shop_settings table exists
async function ensureShopSettingsTable() {
    try {
        // Check if table exists
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shop_settings'
        `) as any[];

        if (tables.length === 0) {
            // Create the table
            await db.query(`
                CREATE TABLE shop_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(255) NOT NULL,
                    cover_image_url VARCHAR(500) DEFAULT NULL,
                    logo_url VARCHAR(500) DEFAULT NULL,
                    display_name VARCHAR(255) DEFAULT NULL,
                    description TEXT DEFAULT NULL,
                    front_color VARCHAR(7) DEFAULT '#3b82f6',
                    card_background VARCHAR(7) DEFAULT '#ffffff',
                    border_color VARCHAR(7) DEFAULT '#e5e7eb',
                    color_theme VARCHAR(20) DEFAULT 'blue',
                    gift_card_background_color VARCHAR(7) DEFAULT '#dbeafe',
                    gift_card_border_color VARCHAR(7) DEFAULT '#3b82f6',
                    gift_card_button_color VARCHAR(7) DEFAULT '#1d4ed8',
                    gift_card_text_color VARCHAR(7) DEFAULT '#1f2937',
                    delivery_normal_fee DECIMAL(10,2) DEFAULT 2.50,
                    delivery_express_fee DECIMAL(10,2) DEFAULT 4.50,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_tenant (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            console.log('Created shop_settings table');
        } else {
            // Check if all required columns exist
            const [columns] = await db.query('DESCRIBE shop_settings') as any[];
            const currentColumns = columns.map((col: any) => col.Field);
            
            const requiredColumns = [
                'cover_image_url', 'logo_url', 'display_name', 'description',
                'front_color', 'card_background', 'border_color', 'color_theme',
                'gift_card_background_color', 'gift_card_border_color', 'gift_card_button_color', 'gift_card_text_color',
                'delivery_normal_fee', 'delivery_express_fee'
            ];

            for (const column of requiredColumns) {
                if (!currentColumns.includes(column)) {
                    let defaultValue = 'NULL';
                    let dataType = 'VARCHAR(500)';
                    
                    // Set appropriate defaults and types for color columns
                    if (column === 'front_color') { defaultValue = "'#3b82f6'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'card_background') { defaultValue = "'#ffffff'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'border_color') { defaultValue = "'#e5e7eb'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'color_theme') { defaultValue = "'blue'"; dataType = 'VARCHAR(20)'; }
                    if (column === 'gift_card_background_color') { defaultValue = "'#dbeafe'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'gift_card_border_color') { defaultValue = "'#3b82f6'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'gift_card_button_color') { defaultValue = "'#1d4ed8'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'gift_card_text_color') { defaultValue = "'#1f2937'"; dataType = 'VARCHAR(7)'; }
                    if (column === 'delivery_normal_fee') { defaultValue = "2.50"; dataType = 'DECIMAL(10,2)'; }
                    if (column === 'delivery_express_fee') { defaultValue = "4.50"; dataType = 'DECIMAL(10,2)'; }
                    if (column === 'description') { dataType = 'TEXT'; }
                    
                    await db.query(`
                        ALTER TABLE shop_settings 
                        ADD COLUMN ${column} ${dataType} DEFAULT ${defaultValue}
                    `);
                    console.log(`Added column: ${column}`);
                }
            }
        }
    } catch (error) {
        console.error('Error ensuring shop_settings table:', error);
        throw error;
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const { tenant } = params;
        
        // Ensure table exists before querying
        await ensureShopSettingsTable();
        
        // Try to get existing settings
        const [rows] = await db.query(
            'SELECT * FROM shop_settings WHERE tenant_id = ?',
            [tenant]
        ) as any[];
        
        if (rows.length > 0) {
            const settings = rows[0];
            // Convert empty strings to null for proper frontend handling
            if (settings.display_name === '') settings.display_name = null;
            if (settings.description === '') settings.description = null;
            return NextResponse.json(settings);
        } else {
            // Return default settings with color scheme
            return NextResponse.json({
                tenant_id: tenant,
                cover_image_url: null,
                logo_url: null,
                display_name: null,
                description: null,
                front_color: '#3b82f6',
                button_color: '#10b981',
                button_border_color: '#10b981',
                background_color: '#ffffff',
                card_background: '#ffffff',
                border_color: '#e5e7eb',
                color_theme: 'blue',
                gift_card_background_color: '#dbeafe',
                gift_card_border_color: '#3b82f6',
                gift_card_button_color: '#1d4ed8',
                gift_card_text_color: '#1f2937',
                delivery_normal_fee: 2.50,
                delivery_express_fee: 4.50
            });
        }
    } catch (error) {
        console.error('Error fetching shop settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch shop settings' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const { tenant } = params;
        
        // Ensure table exists before updating
        await ensureShopSettingsTable();
        
        let cover_image_url: string | null = null;
        let logo_url: string | null = null;
        let display_name: string | null = null;
        let description: string | null = null;
        let front_color: string | null = null;
        let card_background: string | null = null;
        let border_color: string | null = null;
        let color_theme: string | null = null;
        let gift_card_background_color: string | null = null;
        let gift_card_border_color: string | null = null;
        let gift_card_button_color: string | null = null;
        let gift_card_text_color: string | null = null;
        let delivery_normal_fee: number | null = null;
        let delivery_express_fee: number | null = null;
        // Check if shop settings already exist FIRST to get current values
        const [existingRows] = await db.query(
            'SELECT * FROM shop_settings WHERE tenant_id = ?',
            [tenant]
        ) as any[];
        
        const existingSettings = existingRows.length > 0 ? existingRows[0] : null;
        
        // Check if request contains FormData (file upload)
        const contentType = request.headers.get('content-type');
        
        if (contentType?.includes('multipart/form-data')) {
            // Handle file upload
            const formData = await request.formData();
            const coverImageFile = formData.get('cover_image') as File;
            const logoImageFile = formData.get('logo_image') as File;
            const removeLogo = formData.get('remove_logo') as string;
            display_name = formData.get('display_name') as string;
            description = formData.get('description') as string;
            
            // Convert empty strings to null for proper fallback logic
            if (display_name && !display_name.trim()) display_name = null;
            if (description && !description.trim()) description = null;
            
            // Extract color settings from form data
            front_color = formData.get('front_color') as string;
            card_background = formData.get('card_background') as string;
            border_color = formData.get('border_color') as string;
            color_theme = formData.get('color_theme') as string;
            gift_card_background_color = formData.get('gift_card_background_color') as string;
            gift_card_border_color = formData.get('gift_card_border_color') as string;
            gift_card_button_color = formData.get('gift_card_button_color') as string;
            gift_card_text_color = formData.get('gift_card_text_color') as string;
            
            // Extract delivery fee settings from form data
            const deliveryNormalFeeStr = formData.get('delivery_normal_fee') as string;
            const deliveryExpressFeeStr = formData.get('delivery_express_fee') as string;
            delivery_normal_fee = deliveryNormalFeeStr ? parseFloat(deliveryNormalFeeStr) : null;
            delivery_express_fee = deliveryExpressFeeStr ? parseFloat(deliveryExpressFeeStr) : null;
            
            // Handle logo removal
            if (removeLogo === 'true') {
                logo_url = '';
            } else if (!logoImageFile || logoImageFile.size === 0) {
                // If no new logo file and not removing, preserve existing logo
                logo_url = existingSettings?.logo_url || '';
            }
            
            // If no new cover image file, preserve existing cover image
            if (!coverImageFile || coverImageFile.size === 0) {
                cover_image_url = existingSettings?.cover_image_url || '';
            }
            
            const fs = require('fs');
            const path = require('path');
            
            if (coverImageFile && coverImageFile.size > 0) {
                // Create uploads directory if it doesn't exist
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'shop-covers');
                
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                
                // Generate unique filename
                const timestamp = Date.now();
                const extension = coverImageFile.name.split('.').pop();
                const filename = `${tenant}-cover-${timestamp}.${extension}`;
                const filepath = path.join(uploadsDir, filename);
                
                // Save file
                const bytes = await coverImageFile.arrayBuffer();
                const buffer = Buffer.from(bytes);
                fs.writeFileSync(filepath, buffer);
                
                // Set the URL for database
                cover_image_url = `/uploads/shop-covers/${filename}`;
            }

            if (logoImageFile && logoImageFile.size > 0) {
                // Create uploads directory if it doesn't exist
                const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
                
                if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                }
                
                // Generate unique filename
                const timestamp = Date.now();
                const extension = logoImageFile.name.split('.').pop();
                const filename = `${tenant}-logo-${timestamp}.${extension}`;
                const filepath = path.join(uploadsDir, filename);
                
                // Save file
                const bytes = await logoImageFile.arrayBuffer();
                const buffer = Buffer.from(bytes);
                fs.writeFileSync(filepath, buffer);
                
                // Set the URL for database
                logo_url = `/uploads/logos/${filename}`;
            }
        } else {
            // Handle JSON request (backward compatibility)
            const body = await request.json();
            cover_image_url = body.cover_image_url || existingSettings?.cover_image_url || '';
            logo_url = body.logo_url || existingSettings?.logo_url || '';
            display_name = body.display_name;
            description = body.description;
            front_color = body.front_color;
            card_background = body.card_background;
            border_color = body.border_color;
            color_theme = body.color_theme;
            gift_card_background_color = body.gift_card_background_color;
            gift_card_border_color = body.gift_card_border_color;
            gift_card_button_color = body.gift_card_button_color;
            gift_card_text_color = body.gift_card_text_color;
            delivery_normal_fee = body.delivery_normal_fee;
            delivery_express_fee = body.delivery_express_fee;
            
            // Convert empty strings to null for proper fallback logic
            if (display_name && !display_name.trim()) display_name = null;
            if (description && !description.trim()) description = null;
        }
        
        // Check if shop settings already exist
        if (existingSettings) {
            await db.query(
                `UPDATE shop_settings SET 
                 cover_image_url = ?, 
                 logo_url = ?, 
                 display_name = ?, 
                 description = ?,
                 front_color = ?, 
                 card_background = ?, 
                 border_color = ?, 
                 color_theme = ?,
                 gift_card_background_color = ?,
                 gift_card_border_color = ?,
                 gift_card_button_color = ?,
                 gift_card_text_color = ?,
                 delivery_normal_fee = ?,
                 delivery_express_fee = ?
                 WHERE tenant_id = ?`,
                [
                    cover_image_url, 
                    logo_url, 
                    display_name, 
                    description,
                    front_color, 
                    card_background, 
                    border_color, 
                    color_theme,
                    gift_card_background_color,
                    gift_card_border_color,
                    gift_card_button_color,
                    gift_card_text_color,
                    delivery_normal_fee,
                    delivery_express_fee,
                    tenant
                ]
            );
        } else {
            // Insert new settings
            await db.query(
                `INSERT INTO shop_settings (
                 tenant_id, 
                 cover_image_url, 
                 logo_url, 
                 display_name, 
                 description,
                 front_color, 
                 card_background, 
                 border_color, 
                 color_theme,
                 gift_card_background_color,
                 gift_card_border_color,
                 gift_card_button_color,
                 gift_card_text_color,
                 delivery_normal_fee,
                 delivery_express_fee
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenant, 
                    cover_image_url, 
                    logo_url, 
                    display_name, 
                    description,
                    front_color, 
                    card_background, 
                    border_color, 
                    color_theme,
                    gift_card_background_color,
                    gift_card_border_color,
                    gift_card_button_color,
                    gift_card_text_color,
                    delivery_normal_fee,
                    delivery_express_fee
                ]
            );
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating shop settings:', error);
        return NextResponse.json(
            { error: 'Failed to update shop settings' },
            { status: 500 }
        );
    }
}
