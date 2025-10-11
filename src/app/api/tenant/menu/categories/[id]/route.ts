import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params; // Await params in Next.js 15
    
    // Extract tenant slug from the referer URL
    const referer = request.headers.get('referer');
    if (!referer) {
      return NextResponse.json({ success: false, error: 'Referer required' }, { status: 400 });
    }
    
    // Extract tenant slug from URL like http://localhost:9002/kitchen/admin/menu
    const url = new URL(referer);
    const pathParts = url.pathname.split('/');
    const tenantSlug = pathParts[1]; // /kitchen/admin/menu -> kitchen
    
    if (!tenantSlug || !id) {
      return NextResponse.json({ success: false, error: 'Tenant slug and category ID are required' }, { status: 400 });
    }
    
    console.log('Delete Category API - Using tenant slug:', tenantSlug, 'Category ID:', id);
    
    // Redirect to main menu API
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/menu?tenantId=${tenantSlug}&action=delete-category&id=${id}`, {
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
