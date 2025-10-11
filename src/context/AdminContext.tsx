'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';

// Minimal admin context that doesn't interfere with customer authentication
interface AdminContextType {
  tenantId: string | null;
  tenantSlug: string | null;
  tenantData: any | null;
  refreshTenantData: () => Promise<void>;
  vouchers: any[];
  deliveryZones: any[];
  refreshVouchers: () => Promise<void>;
  refreshDeliveryZones: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  tenantId: null,
  tenantSlug: null,
  tenantData: null,
  refreshTenantData: async () => {},
  vouchers: [],
  deliveryZones: [],
  refreshVouchers: async () => {},
  refreshDeliveryZones: async () => {},
});

export const AdminProvider = ({ 
  children, 
  tenantSlug 
}: { 
  children: ReactNode;
  tenantSlug: string;
}) => {
  const [tenantData, setTenantData] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<any[]>([]);

  const refreshTenantData = useCallback(async () => {
    try {
      console.log(`🔄 Fetching tenant data for slug: ${tenantSlug}`);
      const response = await fetch(`/api/tenant/info?slug=${tenantSlug}&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Tenant data loaded:`, data);
        setTenantData(data);
      } else {
        console.error(`❌ Failed to fetch tenant data: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch tenant data:', error);
    }
  }, [tenantSlug]);

  const refreshVouchers = useCallback(async () => {
    try {
      if (!tenantData?.id) return;
      
      const response = await fetch('/api/tenant/vouchers', {
        headers: {
          'X-Tenant-ID': tenantData.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVouchers(data);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    }
  }, [tenantData?.id]);

  const refreshDeliveryZones = useCallback(async () => {
    try {
      if (!tenantData?.id) {
        console.log('⏳ Waiting for tenant data to load delivery zones...');
        return;
      }

      console.log(`🔄 Fetching delivery zones for tenant: ${tenantData.id}`);
      
      const response = await fetch('/api/tenant/zones', {
        headers: {
          'X-Tenant-ID': tenantData.id
        }
      });
      
      console.log(`📡 Zones API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Delivery zones loaded:`, data);
        console.log(`📊 Found ${data.length} delivery zones`);
        setDeliveryZones(data);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to fetch delivery zones: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch delivery zones:', error);
    }
  }, [tenantData?.id]);

  // Auto-load tenant data when component mounts
  useEffect(() => {
    refreshTenantData();
  }, [refreshTenantData]);

  // Load vouchers and zones when tenant data is available
  useEffect(() => {
    if (tenantData?.id) {
      console.log(`🔄 Auto-loading vouchers and zones for tenant: ${tenantData.id}`);
      refreshVouchers();
      refreshDeliveryZones();
    }
  }, [tenantData?.id, refreshVouchers, refreshDeliveryZones]);

  const contextValue: AdminContextType = {
    tenantId: tenantData?.id || null,
    tenantSlug,
    tenantData,
    refreshTenantData,
    vouchers,
    deliveryZones,
    refreshVouchers,
    refreshDeliveryZones,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
