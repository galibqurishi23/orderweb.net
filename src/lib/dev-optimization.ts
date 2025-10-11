/**
 * Development Performance Optimization Utilities
 * Helps reduce compilation time during development
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Cache for lazy components to avoid re-creating them
const lazyComponentCache = new Map<string, LazyExoticComponent<any>>();

/**
 * Enhanced lazy loading with caching for development
 */
export function fastLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  key: string
): LazyExoticComponent<T> {
  if (process.env.NODE_ENV === 'development') {
    // Use cache in development to speed up hot reloads
    if (lazyComponentCache.has(key)) {
      return lazyComponentCache.get(key) as LazyExoticComponent<T>;
    }
    
    const component = lazy(factory);
    lazyComponentCache.set(key, component);
    return component;
  }
  
  // Normal lazy loading for production
  return lazy(factory);
}

/**
 * Preload a component in development for faster subsequent loads
 */
export function preloadComponent(factory: () => Promise<{ default: ComponentType<any> }>) {
  if (process.env.NODE_ENV === 'development') {
    // Preload in development for faster navigation
    setTimeout(() => {
      factory().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }
}

/**
 * Development-only component wrapper to skip heavy operations
 */
export function devOptimized<P>(
  Component: ComponentType<P>,
  fallback?: ComponentType<P>
): ComponentType<P> {
  if (process.env.NODE_ENV === 'development' && fallback) {
    return fallback;
  }
  return Component;
}

/**
 * Conditional import for heavy dependencies
 */
export async function conditionalImport<T>(
  importFn: () => Promise<T>,
  condition: boolean = true
): Promise<T | null> {
  if (!condition) return null;
  
  try {
    return await importFn();
  } catch (error) {
    console.warn('Conditional import failed:', error);
    return null;
  }
}

/**
 * Bundle size analyzer helper for development
 */
export function logBundleInfo(componentName: string, moduleCount?: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [Bundle] ${componentName}${moduleCount ? ` (${moduleCount} modules)` : ''}`);
  }
}

export default {
  fastLazy,
  preloadComponent,
  devOptimized,
  conditionalImport,
  logBundleInfo,
};