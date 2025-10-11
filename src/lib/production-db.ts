/**
 * Production-Level Database Connection Pool with Health Monitoring
 * Enhanced connection management, monitoring, and error handling
 */

import mysql from 'mysql2/promise';
// import { logger } from './email-logger'; // TODO: Create email logger for production

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit?: number;
  maxIdle?: number;
  idleTimeout?: number;
  timeout?: number;
  acquireTimeout?: number;
  ssl?: string;
  charset?: string;
  timezone?: string;
}

interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  queuedRequests: number;
  totalQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  uptime: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export class ProductionDatabaseManager {
  private static instance: ProductionDatabaseManager;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;
  private metrics: ConnectionPoolMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private connectionAttempts = 0;
  private lastConnectionAttempt = 0;
  private isShuttingDown = false;

  private constructor() {
    this.config = this.getConfigFromEnvironment();
    this.metrics = this.initializeMetrics();
    this.initializePool();
    this.startHealthChecking();
  }

  public static getInstance(): ProductionDatabaseManager {
    if (!ProductionDatabaseManager.instance) {
      ProductionDatabaseManager.instance = new ProductionDatabaseManager();
    }
    return ProductionDatabaseManager.instance;
  }

  private getConfigFromEnvironment(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dinedesk_db',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'), // Increased for better performance
      maxIdle: parseInt(process.env.DB_MAX_IDLE || '10'),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600000'), // 10 minutes
      timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      ssl: process.env.DB_SSL || 'false',
      charset: 'utf8mb4',
      timezone: '+00:00'
    };
  }

  private initializeMetrics(): ConnectionPoolMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      queuedRequests: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      uptime: Date.now(),
      lastHealthCheck: new Date(),
      isHealthy: false
    };
  }

  private async initializePool(): Promise<void> {
    try {
      console.log('Initializing database connection pool', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        connectionLimit: this.config.connectionLimit
      });

      const poolConfig: mysql.PoolOptions = {
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: this.config.connectionLimit || 20,
        queueLimit: 0,
        charset: this.config.charset || 'utf8mb4',
        timezone: this.config.timezone || '+00:00',
        multipleStatements: false,
        // Performance optimizations
        dateStrings: false,
        supportBigNumbers: true,
        bigNumberStrings: false,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };

      // Handle SSL configuration properly
      if (this.config.ssl === 'true') {
        poolConfig.ssl = { rejectUnauthorized: false };
      }

      this.pool = mysql.createPool(poolConfig);

      // Set up event listeners
      this.setupEventListeners();

      // Test initial connection
      await this.testConnection();
      
      this.metrics.isHealthy = true;
      this.connectionAttempts = 0;
      
      console.log('Database connection pool initialized successfully');

    } catch (error) {
      this.connectionAttempts++;
      this.lastConnectionAttempt = Date.now();
      
      console.error('Failed to initialize database connection pool', {}, error as Error, {
        attempt: this.connectionAttempts,
        config: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database
        }
      });

      // Retry logic with exponential backoff
      if (this.connectionAttempts < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, this.connectionAttempts - 1);
        console.log(`Retrying database connection in ${delay}ms`, {}, { attempt: this.connectionAttempts });
        
        setTimeout(() => {
          this.initializePool();
        }, delay);
      } else {
        console.error('Max database connection retries exceeded', {}, undefined, {
          maxRetries: this.MAX_RETRIES,
          attempts: this.connectionAttempts
        });
        throw new Error('Failed to establish database connection after maximum retries');
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.pool) return;

    this.pool.on('connection', (connection) => {
      this.metrics.totalConnections++;
      console.log('New database connection established', {}, { connectionId: connection.threadId });
    });

    this.pool.on('release', (connection) => {
      console.log('Database connection released', {}, { connectionId: connection.threadId });
    });

    this.pool.on('enqueue', () => {
      this.metrics.queuedRequests++;
      console.log('Database query queued due to connection limit');
    });

        // Note: mysql2 pool doesn't have error event in the same way
    // Error handling is done through connection attempts and queries
    // We'll implement error handling through getConnection() method instead
  }

  private async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.ping();
      console.log('Database connection test successful');
    } finally {
      connection.release();
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log('Database health checking started', {}, {
      interval: this.HEALTH_CHECK_INTERVAL
    });
  }

  private async performHealthCheck(): Promise<void> {
    if (this.isShuttingDown || !this.pool) return;

    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.testConnection();
      
      // Test a simple query
      const [rows] = await this.pool.execute('SELECT 1 as test');
      
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      this.updatePoolMetrics();
      this.metrics.lastHealthCheck = new Date();
      this.metrics.isHealthy = true;
      
      
      console.log('Database health check passed', {}, { responseTime });

      // Alert if response time is high
      if (responseTime > 5000) { // 5 seconds
        console.warn('Database response time is high', {}, { responseTime });
      }

    } catch (error) {
      this.metrics.isHealthy = false;
      this.metrics.failedQueries++;
      
      console.error('Database health check failed', {}, error as Error);
      
      // Try to reconnect if health check fails
      if (this.connectionAttempts === 0) {
        this.connectionAttempts = 1;
        setTimeout(() => {
          this.initializePool();
        }, this.RETRY_DELAY);
      }
    }
  }

  private updatePoolMetrics(): void {
    if (!this.pool) return;

    // Note: mysql2 doesn't expose pool statistics directly
    // In a production environment, you might want to use a connection pool
    // that provides better metrics or implement custom tracking
    this.metrics.uptime = Date.now() - this.metrics.uptime;
  }

  // Public methods for database operations
  public async execute(query: string, params: any[] = []): Promise<any> {
    if (!this.pool) {
      throw new Error('Database connection not available');
    }

    const startTime = Date.now();
    
    try {
      this.metrics.totalQueries++;
      
      console.log('Executing database query', {}, {
        query: query.substring(0, 100),
        paramCount: params.length
      });

      const result = await this.pool.execute(query, params);
      
      const queryTime = Date.now() - startTime;
      this.updateAverageQueryTime(queryTime);
      
      console.log('Database query completed', {}, {
        queryTime,
        affectedRows: Array.isArray(result[0]) ? result[0].length : 0
      });

      return result;

    } catch (error) {
      this.metrics.failedQueries++;
      const queryTime = Date.now() - startTime;
      
      console.error('Database query failed', {}, error as Error, {
        query: query.substring(0, 100),
        queryTime,
        paramCount: params.length
      });

      // Check if error indicates connection issue
      if (this.isConnectionError(error as Error)) {
        this.metrics.isHealthy = false;
        console.warn('Database connection issue detected', {}, { error: (error as Error).message });
      }

      throw error;
    }
  }

  public async query(sql: string, params: any[] = []): Promise<any> {
    return this.execute(sql, params);
  }

  public async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('Database connection not available');
    }

    try {
      const connection = await this.pool.getConnection();
      console.log('Database connection acquired from pool');
      return connection;
    } catch (error) {
      this.metrics.failedQueries++;
      console.error('Failed to acquire database connection', {}, error as Error);
      throw error;
    }
  }

  public async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log('Database transaction started');
      
      const result = await callback(connection);
      
      await connection.commit();
      console.log('Database transaction committed');
      
      return result;

    } catch (error) {
      await connection.rollback();
      console.error('Database transaction rolled back', {}, error as Error);
      throw error;
    } finally {
      connection.release();
    }
  }

  private updateAverageQueryTime(queryTime: number): void {
    const totalTime = this.metrics.averageQueryTime * (this.metrics.totalQueries - 1);
    this.metrics.averageQueryTime = (totalTime + queryTime) / this.metrics.totalQueries;
  }

  private isConnectionError(error: Error): boolean {
    const connectionErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'PROTOCOL_CONNECTION_LOST',
      'ER_CON_COUNT_ERROR'
    ];

    return connectionErrorCodes.some(code => error.message.includes(code));
  }

  // Public getters for monitoring
  public getMetrics(): ConnectionPoolMetrics {
    return { ...this.metrics };
  }

  public isHealthy(): boolean {
    return this.metrics.isHealthy && this.pool !== null;
  }

  public getConnectionCount(): number {
    return this.metrics.totalConnections;
  }

  public getUptime(): number {
    return Date.now() - this.metrics.uptime;
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    console.log('Starting database connection pool shutdown');

    // Stop health checking
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close pool
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        console.log('Database connection pool closed successfully');
      } catch (error) {
        console.error('Error closing database connection pool', {}, error as Error);
      }
    }
  }

  // Database schema validation
  public async validateSchema(): Promise<boolean> {
    try {
      const requiredTables = [
        'tenants',
        'tenant_email_settings',
        'tenant_email_branding',
        'email_queue',
        'email_logs',
        'smtp_failure_logs',
        'super_admin_notifications'
      ];

      for (const table of requiredTables) {
        const [rows] = await this.execute(
          'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
          [this.config.database, table]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const count = (rows[0] as any).count;
          if (count === 0) {
            console.error('Required database table missing', {}, undefined, { table });
            return false;
          }
        }
      }

      console.log('Database schema validation passed');
      return true;

    } catch (error) {
      console.error('Database schema validation failed', {}, error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const productionDb = ProductionDatabaseManager.getInstance();

// Export for backward compatibility
export default productionDb;

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');
  await productionDb.shutdown();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, starting graceful shutdown');
  await productionDb.shutdown();
});
