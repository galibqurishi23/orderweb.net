import mysql, { Pool } from 'mysql2/promise';

// Pool cache for tenant databases
const tenantPools: Map<string, Pool> = new Map();

// Create tenant-specific database connection
export function getTenantDatabase(tenantSlug: string): Pool {
  const dbName = `dinedesk_${tenantSlug}`;
  
  // Check if we already have a pool for this tenant
  if (tenantPools.has(dbName)) {
    return tenantPools.get(dbName)!;
  }

  // Create new pool for this tenant
  const tenantPool = mysql.createPool({
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.DATABASE_PORT) || 3306,
    user: process.env.DB_USER || process.env.DATABASE_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: dbName,
    
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 10,
    multipleStatements: true,
    charset: 'utf8mb4',
    
    // Performance optimizations
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    
    // Connection optimization
    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
  });

  // Cache the pool
  tenantPools.set(dbName, tenantPool);
  
  console.log(`✅ Created database connection pool for tenant: ${tenantSlug} (${dbName})`);
  
  return tenantPool;
}

// Get tenant database name from slug
export function getTenantDatabaseName(tenantSlug: string): string {
  return `dinedesk_${tenantSlug}`;
}

// Close all tenant database connections (for cleanup)
export async function closeAllTenantConnections(): Promise<void> {
  for (const [dbName, pool] of tenantPools.entries()) {
    try {
      await pool.end();
      console.log(`✅ Closed connection pool for: ${dbName}`);
    } catch (error) {
      console.error(`❌ Error closing connection pool for ${dbName}:`, error);
    }
  }
  tenantPools.clear();
}