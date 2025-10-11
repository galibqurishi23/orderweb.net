/**
 * Advanced Caching Service for OrderWeb
 * Provides in-memory and Redis-compatible caching
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
  created: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize = 1000, cleanupIntervalMs = 300000) { // 5 minutes cleanup
    this.maxSize = maxSize;
    
    // Periodic cleanup of expired items
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, value: T, ttlSeconds = 300): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, {
      value,
      expiry,
      created: Date.now()
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${keysToDelete.length} expired items`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      items: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        size: JSON.stringify(item.value).length,
        created: new Date(item.created).toISOString(),
        expiry: new Date(item.expiry).toISOString(),
        expired: Date.now() > item.expiry
      }))
    };
  }

  // Method for pattern-based cache invalidation
  deleteByPattern(pattern: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      count++;
    });
    
    return count;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Cache instances for different data types
export const menuCache = new MemoryCache(500, 600000);
export const tenantCache = new MemoryCache(100, 1800000);
export const sessionCache = new MemoryCache(200, 900000);
export const settingsCache = new MemoryCache(50, 3600000);

export const CacheKeys = {
  tenant: (id: string) => `tenant:${id}`,
  tenantBySlug: (slug: string) => `tenant:slug:${slug}`,
  menuItems: (tenantId: string) => `menu:items:${tenantId}`,
  menuItemById: (tenantId: string, itemId: string) => `menu:item:${tenantId}:${itemId}`,
  categories: (tenantId: string) => `menu:categories:${tenantId}`,
  categoryById: (tenantId: string, categoryId: string) => `menu:category:${tenantId}:${categoryId}`,
  menuWithCategories: (tenantId: string) => `menu:full:${tenantId}`,
  menuStats: (tenantId: string) => `menu:stats:${tenantId}`,
  tenantSettings: (tenantId: string) => `settings:tenant:${tenantId}`,
  globalSettings: () => 'settings:global',
  customerAuth: (customerId: string) => `auth:customer:${customerId}`,
  customerProfile: (customerId: string) => `profile:customer:${customerId}`,
  addons: (tenantId: string) => `addons:${tenantId}`
} as const;

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: MemoryCache,
  ttlSeconds: number = 300
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const value = await fetcher();
    cache.set(key, value, ttlSeconds);
    return value;
  } catch (error) {
    console.error(`Cache-aside fetch failed for key: ${key}`, error);
    throw error;
  }
}

export function invalidatePatternCache(cache: MemoryCache, pattern: string): number {
  return cache.deleteByPattern(pattern);
}

export function clearCache(cache: MemoryCache): void {
  cache.clear();
}
