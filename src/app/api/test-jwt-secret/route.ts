import { NextResponse } from 'next/server';

export async function GET() {
  const jwtSecret = process.env.JWT_SECRET;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  
  return NextResponse.json({
    JWT_SECRET_SET: !!jwtSecret,
    JWT_SECRET_VALUE: jwtSecret ? jwtSecret.substring(0, 20) + '...' : 'NOT SET',
    NEXTAUTH_SECRET_SET: !!nextAuthSecret,
    NEXTAUTH_SECRET_VALUE: nextAuthSecret ? nextAuthSecret.substring(0, 20) + '...' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  });
}
