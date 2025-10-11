'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { TenantDataProvider } from '@/context/TenantDataContext';
import { useTenant } from '@/context/TenantContext';
import PaymentPage from '@/components/PaymentPage';

function PaymentContent({ tenant }: { tenant: string }) {
  const { tenantData, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading payment...</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant "{tenant}" does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <TenantDataProvider>
      <PaymentPage />
    </TenantDataProvider>
  );
}

export default function Payment() {
  const params = useParams();
  const tenant = params.tenant as string;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading payment...</p>
        </div>
      </div>
    }>
      <PaymentContent tenant={tenant} />
    </Suspense>
  );
}
