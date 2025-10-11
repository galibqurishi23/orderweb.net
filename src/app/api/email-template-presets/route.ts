import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM email_template_presets ORDER BY name'
    );

    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching email template presets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch email template presets' },
      { status: 500 }
    );
  }
}
