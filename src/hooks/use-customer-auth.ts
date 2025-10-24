import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tenant_id: string;
}

interface UseCustomerAuthResult {
  customer: Customer | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCustomerAuth(tenantId: string): UseCustomerAuthResult {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/check-auth', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.customer) {
        setCustomer(data.customer);
        setAuthenticated(true);
      } else {
        setCustomer(null);
        setAuthenticated(false);
        // Only redirect if we're on a protected page
        if (typeof window !== 'undefined' && window.location.pathname.includes('/customer/')) {
          router.push(`/${tenantId}/customer/login`);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setCustomer(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/customer/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setCustomer(null);
      setAuthenticated(false);
      router.push(`/${tenantId}`);
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect anyway
      setCustomer(null);
      setAuthenticated(false);
      router.push(`/${tenantId}`);
    }
  };

  const refresh = async () => {
    await checkAuth();
  };

  useEffect(() => {
    checkAuth();
  }, [tenantId]);

  return {
    customer,
    loading,
    authenticated,
    logout,
    refresh
  };
}