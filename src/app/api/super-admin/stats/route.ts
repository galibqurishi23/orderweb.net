import { NextRequest, NextResponse } from 'next/server';
import { getPlatformStats } from '@/lib/tenant-service';

export async function GET() {
  try {
    const stats = await getPlatformStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch platform statistics' },
      { status: 500 }
    );
  }
}
