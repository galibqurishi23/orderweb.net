import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Check pool status
    const poolStatus = pool.getPoolStatus();
    
    // Test basic database connectivity
    let dbConnected = false;
    let dbError = null;
    
    try {
      await pool.query('SELECT 1 as test');
      dbConnected = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        error: dbError
      },
      connectionPool: {
        ...poolStatus,
        status: poolStatus ? 'Available' : 'Unavailable',
        health: poolStatus && poolStatus.freeConnections > 0 ? 'Healthy' : 'Warning'
      },
      recommendations: {
        ...(!dbConnected && { database: 'Check database credentials and server status' }),
        ...(poolStatus && poolStatus.freeConnections === 0 && { 
          connections: 'Connection pool exhausted. Consider restarting the application.' 
        }),
        ...(poolStatus && poolStatus.connectionQueue > 10 && {
          queue: 'High connection queue detected. Monitor for connection leaks.'
        })
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
