import { NextRequest, NextResponse } from 'next/server';

// This endpoint is deprecated - redirect to new menu API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  // Redirect to new menu API
  const newUrl = new URL('/api/menu', request.url);
  newUrl.searchParams.set('tenantId', tenantId || '');
  newUrl.searchParams.set('action', 'menu');
  
  return NextResponse.redirect(newUrl);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  
  try {
    const { type, data } = await request.json();
    
    // Redirect to new menu API
    const newUrl = new URL('/api/menu', request.url);
    newUrl.searchParams.set('tenantId', tenantId || '');
    
    if (type === 'menuItem') {
      newUrl.searchParams.set('action', 'create-menu-item');
    } else if (type === 'category') {
      newUrl.searchParams.set('action', 'create-category');
    }
    
    // Forward the request to the new API
    const response = await fetch(newUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  
  // Redirect to new menu API
  const newUrl = new URL('/api/menu', request.url);
  newUrl.searchParams.set('tenantId', tenantId || '');
  newUrl.searchParams.set('id', id || '');
  
  if (type === 'menuItem') {
    newUrl.searchParams.set('action', 'delete-menu-item');
  } else if (type === 'category') {
    newUrl.searchParams.set('action', 'delete-category');
  }
  
  // Forward the request to the new API
  const response = await fetch(newUrl.toString(), {
    method: 'DELETE'
  });
  
  return response;
}
