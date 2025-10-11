import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  console.log('Raw cookie header:', cookieHeader);
  
  if (!cookieHeader) {
    return NextResponse.json({ error: 'No cookies' });
  }
  
  // Parse cookies manually
  const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      try {
        acc[name] = {
          raw: value,
          decoded: decodeURIComponent(value)
        };
      } catch (e) {
        acc[name] = { raw: value, error: 'decode failed' };
      }
    }
    return acc;
  }, {});
  
  return NextResponse.json({ cookies });
}