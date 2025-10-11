import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;
    const tenant = formData.get('tenant') as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!tenant) {
      return NextResponse.json({ error: "Tenant is required" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." 
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "File too large. Maximum size is 5MB." 
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos', tenant);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `logo-${timestamp}${extension}`;
    const filePath = path.join(uploadDir, filename);

    // Write file
    await writeFile(filePath, buffer);

    // Return public URL
    const logoUrl = `/uploads/logos/${tenant}/${filename}`;

    return NextResponse.json({
      success: true,
      logoUrl,
      filename,
      message: "Logo uploaded successfully"
    });

  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json({ 
      error: "Failed to upload logo",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
