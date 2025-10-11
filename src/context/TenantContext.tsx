'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface TenantContextType {
  tenantSlug: string | null;
  tenantData: TenantData | null;
  isLoading: boolean;
  error: string | null; // Add error state
  contextType: 'admin' | 'customer' | 'super-admin' | null;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'pending' | 'inactive';
  plan: 'basic' | 'premium' | 'enterprise';
  settings: {
    logo?: string;
    primaryColor?: string;
    currency?: string;
    timezone?: string;
  };
}

const TenantContext = createContext<TenantContextType>({
  tenantSlug: null,
  tenantData: null,
  isLoading: true,
  error: null, // Default error state
  contextType: null
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add error state
  const [contextType, setContextType] = useState<'admin' | 'customer' | 'super-admin' | null>(null);

  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if we're in super-admin
    if (segments[0] === 'super-admin') {
      setContextType('super-admin');
      setTenantSlug(null);
      setTenantData(null);
      setIsLoading(false);
      return;
    }
    
    // Check for tenant-specific routes
    if (segments.length >= 1) {
      const potentialTenant = segments[0];
      
      // Skip special routes that aren't tenants
      const specialRoutes = ['admin', 'customer', 'super-admin', 'api'];
      if (specialRoutes.includes(potentialTenant)) {
        setTenantSlug(null);
        setTenantData(null);
        setContextType(null);
        setIsLoading(false);
        return;
      }
      
      // Fetch tenant data from API
      setIsLoading(true);
      setTenantSlug(potentialTenant);
      
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      fetch(`/api/tenant/info?slug=${potentialTenant}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error || `Tenant not found: ${response.statusText}`);
            });
          }
          return response.json();
        })
        .then(data => {
          setTenantData(data);
          setError(null);
        })
        .catch(err => {
          console.error('Failed to fetch tenant data:', err);
          setError(err.message);
          setTenantData(null);
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Determine context type based on path
      if (segments.includes('admin')) {
        setContextType('admin');
      } else {
        setContextType('customer');
      }
    } else {
      setIsLoading(false);
    }
  }, [pathname]);

  return (
    <TenantContext.Provider value={{ tenantSlug, tenantData, isLoading, error, contextType }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Helper hook for tenant-aware routing
export function useTenantRouter() {
  const { tenantSlug } = useTenant();
  
  const getAdminPath = (path: string = '') => {
    if (!tenantSlug) return '/super-admin' + (path ? `/${path}` : '');
    return `/${tenantSlug}/admin` + (path ? `/${path}` : '');
  };
  
  const getCustomerPath = (path: string = '') => {
    if (!tenantSlug) return '/super-admin' + (path ? `/${path}` : '');
    return `/${tenantSlug}` + (path ? `/${path}` : '');
  };
  
  return {
    getAdminPath,
    getCustomerPath
  };
}
