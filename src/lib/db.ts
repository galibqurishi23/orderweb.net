// Production Database Configuration for Oracle Linux
// Simple and robust database setup with clear environment variable requirements

import mysql, { RowDataPacket } from 'mysql2/promise';

// Production-optimized database configuration
const createDatabaseConfig = () => {
  // Validate required environment variables with fallbacks for development
  const config: mysql.PoolOptions = {
    // Primary database variables (supports both DB_ and DATABASE_ prefixes)
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.DATABASE_PORT) || 3306,
    user: process.env.DB_USER || process.env.DATABASE_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || 'dinedesk_db',
    
    // Production-optimized pool settings with better connection management
    waitForConnections: true,
    connectionLimit: process.env.NODE_ENV === 'production' ? 10 : 5,
    queueLimit: 20,
    multipleStatements: true,
    
    // Character set and collation
    charset: 'utf8mb4',
    
    // Performance optimizations
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    
    // Connection optimization
    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
  };

  // Add SSL configuration if enabled
  if (process.env.DB_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: false
    };
  }

  return config;
};

// Create database pool
let mysqlPool: mysql.Pool | null = null;

// Only create pool on server side
if (typeof window === 'undefined') {
  try {
    const config = createDatabaseConfig();
    mysqlPool = mysql.createPool(config);
    
    // Test connection and auto-initialize on startup
    const testConnection = async () => {
      try {
        if (mysqlPool) {
          const connection = await mysqlPool.getConnection();
          console.log('✅ Database connection established successfully');
          
          // Test if database is initialized
          try {
            await connection.execute('SELECT 1 FROM super_admin_users LIMIT 1');
            console.log('✅ Database tables verified and ready');
          } catch (tableError) {
            console.log('⚠️  Database not initialized. Run setup to initialize.');
            
            // Auto-initialize in development
            if (process.env.NODE_ENV === 'development') {
              try {
                const { default: DatabaseSetup } = await import('./database-setup');
                const setup = new DatabaseSetup();
                const success = await setup.setupDatabase();
                
                if (success) {
                  console.log('✅ Database auto-initialization completed');
                } else {
                  console.error('❌ Database auto-initialization failed');
                  console.error('💡 Please run: npm run setup');
                }
              } catch (setupError) {
                console.error('❌ Database setup import failed:', setupError);
                console.error('💡 Please run: npm run setup');
              }
            }
          }
          
          connection.release();
        }
      } catch (error) {
        console.error('❌ Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Please verify your database configuration:');
        console.error('- Check .env.production file exists and has correct values');
        console.error('- Verify MySQL/MariaDB is running and accessible');
        console.error('- Ensure database user has proper permissions');
      }
    };

    // Only test connection in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      testConnection();
    }
  } catch (configError) {
    console.error('❌ Database configuration error:', configError instanceof Error ? configError.message : 'Unknown error');
    console.error('Please check your environment variables in .env.production');
  }
}

// Unified database interface with enhanced error handling
const db = {
  async execute(sql: string, params?: any[]) {
    if (!mysqlPool) {
      throw new Error('Database pool not initialized. Check your environment configuration.');
    }
    
    try {
      return await mysqlPool.execute(sql, params || []);
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  },
  
  async query<T extends RowDataPacket[]>(sql: string, params?: any[]) {
    if (!mysqlPool) {
      throw new Error('Database pool not initialized. Check your environment configuration.');
    }
    
    try {
      return await mysqlPool.query<T>(sql, params || []);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },
  
  async getConnection() {
    if (!mysqlPool) {
      throw new Error('Database pool not initialized. Check your environment configuration.');
    }
    
    try {
      return await mysqlPool.getConnection();
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  },

  // Safe connection management with automatic cleanup
  async withConnection<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    if (!mysqlPool) {
      throw new Error('Database pool not initialized. Check your environment configuration.');
    }
    
    const connection = await mysqlPool.getConnection();
    try {
      return await callback(connection);
    } finally {
      connection.release();
    }
  },

  // Health check method for monitoring
  async healthCheck() {
    if (!mysqlPool) {
      return { status: 'error', message: 'Database pool not initialized' };
    }
    
    try {
      const connection = await mysqlPool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Pool status monitoring for production debugging
  getPoolStatus() {
    if (!mysqlPool) return null;
    
    const pool = mysqlPool as any;
    return {
      allConnections: pool._allConnections?.length || 0,
      freeConnections: pool._freeConnections?.length || 0,
      connectionQueue: pool._connectionQueue?.length || 0,
      acquiringConnections: pool._acquiringConnections?.length || 0
    };
  }
};

export default db;
