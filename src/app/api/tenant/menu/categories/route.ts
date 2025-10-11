import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug) {
      return NextResponse.json({ success: false, error: 'Tenant slug not found' }, { status: 400 });
    }
    
    console.log('Categories API - Using tenant slug:', tenantSlug);
    
    // Redirect to main menu API with tenant slug
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=categories`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug) {
      return NextResponse.json({ success: false, error: 'Tenant slug not found' }, { status: 400 });
    }
    
    // Remove tenantId from body if it exists and use slug instead
    const { tenantId, ...categoryData } = body;
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=create-category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug) {
      return NextResponse.json({ success: false, error: 'Tenant slug not found' }, { status: 400 });
    }
    
    // Remove tenantId from body if it exists and use slug instead
    const { tenantId, ...categoryData } = body;
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=update-category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('id');
    
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug || !categoryId) {
      return NextResponse.json({ success: false, error: 'Tenant slug and category ID are required' }, { status: 400 });
    }
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=delete-category&id=${categoryId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
