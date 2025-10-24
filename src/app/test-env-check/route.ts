import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  });
}
