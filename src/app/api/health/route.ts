import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    
    // Check if database is initialized
    let databaseInitialized = false;
    try {
      const [result] = await connection.execute('SELECT 1 as health_check FROM super_admin_users LIMIT 1');
      databaseInitialized = true;
    } catch (error) {
      // Database not initialized
      databaseInitialized = false;
    }
    
    connection.release();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        connectionTest: 'passed',
        initialized: databaseInitialized
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      },
      version: process.env.npm_package_version || '1.0.0',
      autoSetup: databaseInitialized ? 'completed' : 'available at /api/setup'
    };

    return NextResponse.json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'disconnected'
      },
      suggestion: 'Check database credentials in .env file'
    };

    return NextResponse.json(errorData, { status: 500 });
  }
}
