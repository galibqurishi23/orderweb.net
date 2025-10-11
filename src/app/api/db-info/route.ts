import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Get database connection info
    const [dbInfo] = await pool.query(`SELECT DATABASE() as current_database, VERSION() as version`);
    
    // Get list of tables in current database
    const [tables] = await pool.query(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `);
    
    const dbInfoRecord = (dbInfo as any[])[0];
    
    return NextResponse.json({
      connection: {
        database: dbInfoRecord.current_database,
        version: dbInfoRecord.version
      },
      environment: {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        NODE_ENV: process.env.NODE_ENV
      },
      tables: tables,
      tableCount: (tables as any[]).length
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
