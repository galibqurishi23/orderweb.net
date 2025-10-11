'use client';

import React from 'react';
import { TenantDataProvider } from '@/context/TenantDataContext';
import { useTenant } from '@/context/TenantContext';

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenantData, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">This restaurant does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <TenantDataProvider>
      {children}
    </TenantDataProvider>
  );
}
