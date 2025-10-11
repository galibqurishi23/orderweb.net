import { NextRequest, NextResponse } from "next/server";
import { getTenantBySlug } from "@/lib/tenant-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant: tenantSlug } = await params;
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const data = await request.formData();
    const file: File | null = data.get('logo') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const fileName = `${tenantSlug}-logo-${timestamp}${fileExtension}`;
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public/uploads/logos');
    await mkdir(uploadsDir, { recursive: true });
    
    // Write file
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);
    
    // Return public URL
    const logoUrl = `/uploads/logos/${fileName}`;

    return NextResponse.json({ 
      success: true,
      logoUrl: logoUrl,
      message: "Logo uploaded successfully" 
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}
