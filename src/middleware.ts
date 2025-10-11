import { NextRequest, NextResponse } from 'next/server';

// Cache configuration for different routes
const CACHE_CONFIG = {
  // Static content - cache for 1 day
  '/api/tenant/menu': { maxAge: 86400, sMaxAge: 86400 },
  '/api/tenant/settings': { maxAge: 3600, sMaxAge: 3600 },
  
  // Dynamic content - cache for 5 minutes
  '/api/tenant/orders': { maxAge: 300, sMaxAge: 300 },
  '/api/customer/orders': { maxAge: 300, sMaxAge: 300 },
  
  // Real-time content - no cache
  '/api/tenant/orders/create': { maxAge: 0, sMaxAge: 0 },
  '/api/payments': { maxAge: 0, sMaxAge: 0 }
};

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add performance headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Add cache headers for API routes
  const pathname = request.nextUrl.pathname;
  
  // Find matching cache config
  const cacheKey = Object.keys(CACHE_CONFIG).find(key => 
    pathname.startsWith(key)
  );
  
  if (cacheKey) {
    const config = CACHE_CONFIG[cacheKey as keyof typeof CACHE_CONFIG];
    
    if (config.maxAge > 0) {
      response.headers.set(
        'Cache-Control',
        `public, max-age=${config.maxAge}, s-maxage=${config.sMaxAge}`
      );
    } else {
      response.headers.set(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      );
    }
  }
  
  // Add compression hint
  response.headers.set('Vary', 'Accept-Encoding');
  
  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};