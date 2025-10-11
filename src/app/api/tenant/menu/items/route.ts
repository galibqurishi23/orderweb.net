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
    
    console.log('Menu Items API - Using tenant slug:', tenantSlug);
    
    // Redirect to main menu API with tenant slug
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=menu-items`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu items' },
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
    const { tenantId, ...itemData } = body;
    
    // Use the menu service directly instead of making another HTTP request
    const { createMenuItem } = await import('../../../../../lib/new-menu-service');
    const newItem = await createMenuItem(tenantSlug, itemData);
    
    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create menu item' },
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
    const { tenantId, ...itemData } = body;
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=update-menu-item`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('id');
    
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug || !itemId) {
      return NextResponse.json({ success: false, error: 'Tenant slug and item ID are required' }, { status: 400 });
    }
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=delete-menu-item&id=${itemId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
