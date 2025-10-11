import { NextRequest, NextResponse } from 'next/server';
import { getShopItems, createShopItem, updateShopItem, deleteShopItem } from '@/lib/shop-service';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const params = await context.params;
        const tenant = params.tenant;
        const { searchParams } = new URL(request.url);
        
        const categoryId = searchParams.get('category');
        const featured = searchParams.get('featured') === 'true';
        const active = searchParams.get('active') !== 'false'; // default to true
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
        
        const items = await getShopItems(tenant, {
            categoryId: categoryId || undefined,
            featured: searchParams.has('featured') ? featured : undefined,
            active: searchParams.has('active') ? active : undefined,
            limit,
            offset
        });
        
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching shop items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
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
        const tenant = params.tenant;
        
        // Check content type to determine how to parse the request
        const contentType = request.headers.get('content-type');
        let body: any;
        let imageFile: File | null = null;
        let galleryFiles: File[] = [];
        
        if (contentType?.includes('multipart/form-data')) {
            // Handle FormData with potential file upload
            const formData = await request.formData();
            body = {};
            
            // Extract all form fields
            for (const [key, value] of formData.entries()) {
                if (key === 'image' && value instanceof File) {
                    imageFile = value;
                } else if (key.startsWith('gallery_image_') && value instanceof File) {
                    galleryFiles.push(value);
                } else if (key === 'gallery_images') {
                    // Parse existing gallery images JSON
                    try {
                        body[key] = JSON.parse(value.toString());
                    } catch {
                        body[key] = [];
                    }
                } else {
                    body[key] = value.toString();
                }
            }
            
            // Convert string numbers back to numbers
            if (body.price) body.price = parseFloat(body.price);
            if (body.stock_quantity) body.stock_quantity = parseInt(body.stock_quantity);
            if (body.is_featured) body.is_featured = body.is_featured === 'true';
            if (body.is_active) body.is_active = body.is_active === 'true';
            if (body.track_inventory) body.track_inventory = body.track_inventory === 'true';
        } else {
            // Handle JSON request
            body = await request.json();
        }
        
        if (!body.name || !body.category_id || !body.price) {
            return NextResponse.json(
                { error: 'Name, category, and price are required' },
                { status: 400 }
            );
        }
        
        // Handle image upload if present
        if (imageFile) {
            // Create a unique filename
            const fileExtension = imageFile.name.split('.').pop();
            const fileName = `shop-item-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
            
            // Save the file to public/uploads/shop-items/
            const uploadDir = 'public/uploads/shop-items';
            const filePath = `${uploadDir}/${fileName}`;
            
            try {
                // Ensure directory exists
                const fs = require('fs');
                const path = require('path');
                
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                
                // Convert File to Buffer
                const bytes = await imageFile.arrayBuffer();
                const buffer = Buffer.from(bytes);
                
                // Write file
                fs.writeFileSync(filePath, buffer);
                
                body.image_url = `/uploads/shop-items/${fileName}`;
            } catch (fileError) {
                console.error('Error saving file:', fileError);
                // Continue without image if file save fails
                body.image_url = null;
            }
        }

        // Handle gallery image uploads
        if (galleryFiles.length > 0) {
            const uploadedGalleryUrls: string[] = [];
            const uploadDir = 'public/uploads/shop-items';
            
            try {
                const fs = require('fs');
                
                // Ensure directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                
                // Upload each gallery image
                for (const file of galleryFiles) {
                    try {
                        const fileExtension = file.name.split('.').pop();
                        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
                        const filePath = `${uploadDir}/${fileName}`;
                        
                        // Convert File to Buffer
                        const bytes = await file.arrayBuffer();
                        const buffer = Buffer.from(bytes);
                        
                        // Write file
                        fs.writeFileSync(filePath, buffer);
                        
                        uploadedGalleryUrls.push(`/uploads/shop-items/${fileName}`);
                    } catch (fileError) {
                        console.error('Error saving gallery file:', fileError);
                        // Continue with other files if one fails
                    }
                }
                
                // Merge with existing gallery images (preserving non-data URLs)
                const existingGalleryImages = Array.isArray(body.gallery_images) ? body.gallery_images : [];
                const validExistingImages = existingGalleryImages.filter((url: string) => 
                    typeof url === 'string' && !url.startsWith('data:')
                );
                
                body.gallery_images = [...validExistingImages, ...uploadedGalleryUrls];
            } catch (galleryError) {
                console.error('Error processing gallery images:', galleryError);
                // Continue without gallery images if processing fails
            }
        }
        
        const item = await createShopItem(tenant, body);
        
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error('Error creating shop item:', error);
        return NextResponse.json(
            { error: 'Failed to create item' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        
        if (!id) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }
        
        const item = await updateShopItem(id, updateData);
        
        return NextResponse.json(item);
    } catch (error) {
        console.error('Error updating shop item:', error);
        return NextResponse.json(
            { error: 'Failed to update item' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ tenant: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json(
                { error: 'Item ID is required' },
                { status: 400 }
            );
        }
        
        await deleteShopItem(id);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting shop item:', error);
        return NextResponse.json(
            { error: 'Failed to delete item' },
            { status: 500 }
        );
    }
}
