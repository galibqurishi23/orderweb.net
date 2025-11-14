import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  let connection;
  try {
    // Create completely fresh connection bypassing the pool
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'dinedesk_db',
    });
    
    // Show which database we're connected to
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, NOW() as query_time');
    
    const [rows] = await connection.execute(
      `SELECT 
        id,
        activation_key,
        license_key,
        duration_days,
        expiration_date,
        created_at,
        notes
       FROM pending_license_activations 
       ORDER BY created_at DESC`
    );
    
    const response = NextResponse.json({
      database_info: dbInfo,
      message: 'Direct DB connection (bypassing pool)',
      count: (rows as any[]).length,
      data: rows,
      timestamp: new Date().toISOString()
    });
    
    // Prevent any caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('Direct DB test error:', error);
    return NextResponse.json(
      { error: 'Failed to test direct DB connection', details: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}