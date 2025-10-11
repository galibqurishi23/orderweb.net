import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing database connection...');
    console.log('Environment variables:');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PORT:', process.env.DB_PORT || 3306);
    
    // Try to execute a simple query
    const [rows] = await db.execute('SELECT 1 as test, NOW() as current_time');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      result: rows,
      config: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
      }
    });

  } catch (error: any) {
    console.error('Database connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown database error',
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      config: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
      }
    }, { status: 500 });
  }
}
