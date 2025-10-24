import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  
  const response = NextResponse.json({
    message: 'Test cookie set',
    timestamp: new Date().toISOString(),
    JWT_SECRET_SET: !!jwtSecret,
    JWT_SECRET_VALUE: jwtSecret ? jwtSecret.substring(0, 30) + '...' : 'NOT SET',
    NEXTAUTH_SECRET_SET: !!nextAuthSecret,
    NODE_ENV: process.env.NODE_ENV
  });
  
  response.cookies.set('test-cookie', 'test-value-' + Date.now(), {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    maxAge: 60, // 1 minute
    path: '/'
  });
  
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const testCookie = cookieStore.get('test-cookie');
    
    return NextResponse.json({
      message: 'Cookie check',
      hasCookie: !!testCookie,
      cookieValue: testCookie?.value || null,
      allCookies: cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      hasCookie: false
    });
  }
}