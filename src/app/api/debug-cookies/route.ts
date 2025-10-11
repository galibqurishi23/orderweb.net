import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('admin-session');
    
    let parsedSession = null;
    if (sessionCookie) {
      try {
        parsedSession = JSON.parse(sessionCookie.value);
      } catch (e) {
        parsedSession = { error: 'Failed to parse session' };
      }
    }
    
    return NextResponse.json({
      hasCookie: !!sessionCookie,
      cookieValue: sessionCookie?.value || null,
      parsedSession,
      allCookies: cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      hasCookie: false
    });
  }
}