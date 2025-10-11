import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  
  return NextResponse.json({
    cookieHeader,
    decoded: cookieHeader ? decodeURIComponent(cookieHeader) : 'No cookies'
  });
}