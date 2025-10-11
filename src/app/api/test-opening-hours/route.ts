import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the current restaurant settings including opening hours
    const [rows] = await pool.query('SELECT settings_json FROM restaurant_settings WHERE id = 1');
    
    if (rows && (rows as any[]).length > 0) {
      const settingsRaw = (rows as any[])[0].settings_json;
      const settings = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : settingsRaw;
      
      return NextResponse.json({
        success: true,
        openingHours: settings.openingHours || {},
        allSettings: settings
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No settings found'
      });
    }
  } catch (error) {
    console.error('Opening hours test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}