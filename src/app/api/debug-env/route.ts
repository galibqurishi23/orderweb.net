import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Return presence and length of secrets without revealing values
    const envInfo = {
      JWT_SECRET_present: !!process.env.JWT_SECRET,
      JWT_SECRET_length: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
      JWT_REFRESH_SECRET_present: !!process.env.JWT_REFRESH_SECRET,
      JWT_REFRESH_SECRET_length: process.env.JWT_REFRESH_SECRET ? process.env.JWT_REFRESH_SECRET.length : 0,
      NEXTAUTH_SECRET_present: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0
    };

    return NextResponse.json({ envInfo });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'unknown' });
  }
}
