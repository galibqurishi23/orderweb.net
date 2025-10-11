/**
 * Performance Optimization Configuration
 * Application-wide performance settings for OrderWeb
 */

// Database Performance Settings
export const DB_PERFORMANCE = {
  CONNECTION_LIMIT: 20,
  MAX_IDLE: 10,
  IDLE_TIMEOUT: 600000, // 10 minutes
  QUERY_TIMEOUT: 30000,  // 30 seconds
  
  // Cache settings
  QUERY_CACHE_TTL: 300,  // 5 minutes for general queries
  STATIC_CACHE_TTL: 3600, // 1 hour for static data
  SESSION_CACHE_TTL: 1800, // 30 minutes for sessions
} as const;

// API Response Caching
export const API_CACHE = {
  // Cache TTL values in seconds
  MENU_ITEMS: 3600,       // 1 hour for menu items
  MENU_CATEGORIES: 7200,  // 2 hours for categories  
  MENU_FULL: 3600,        // 1 hour for full menu
  MENU_STATS: 1800,       // 30 minutes for menu stats
  CATEGORIES: 7200,       // 2 hours for categories
  TENANT_INFO: 3600,      // 1 hour for tenant info
  SETTINGS: 1800,         // 30 minutes for settings
  LOYALTY_SETTINGS: 3600  // 1 hour for loyalty settings
} as const;

// Frontend Performance
export const UI_PERFORMANCE = {
  DEBOUNCE_DELAY: 300,    // Search input debounce
  PAGINATION_SIZE: 20,    // Items per page
  IMAGE_LAZY_LOAD: true,  // Enable lazy loading
  VIRTUAL_SCROLL_THRESHOLD: 50, // Start virtual scrolling after 50 items
} as const;

// Memory Management
export const MEMORY_LIMITS = {
  MAX_FILE_SIZE: 10485760, // 10MB for uploads
  MAX_JSON_SIZE: 1048576,  // 1MB for JSON payloads
  MAX_IMAGE_SIZE: 5242880, // 5MB for images
} as const;

// Background Job Settings
export const BACKGROUND_JOBS = {
  EMAIL_BATCH_SIZE: 100,
  CLEANUP_INTERVAL: 3600000, // 1 hour
  METRICS_COLLECTION_INTERVAL: 300000, // 5 minutes
} as const;

// Error Handling
export const ERROR_HANDLING = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,     // 1 second
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  LOGIN_ATTEMPTS_PER_HOUR: 5,
  PASSWORD_RESET_PER_HOUR: 3,
} as const;
