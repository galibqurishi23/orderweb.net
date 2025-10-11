'use client';

import React, { Suspense, useEffect, useState, lazy } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TenantDataProvider } from '@/context/TenantDataContext';
import { useTenant } from '@/context/TenantContext';

// Lazy load the heavy TenantCustomerInterface component
const TenantCustomerInterface = lazy(() => import('@/components/TenantCustomerInterface'));

// Loading component for better UX
const CustomerInterfaceLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading restaurant...</p>
    </div>
  </div>
);

function TenantCustomerContent({ tenant }: { tenant: string }) {
  const router = useRouter();
  const { tenantData, isLoading } = useTenant();
  const [licenseChecking, setLicenseChecking] = useState(true);
  const [licenseValid, setLicenseValid] = useState(false);

  useEffect(() => {
    checkLicense();
  }, [tenant]);

  const checkLicense = async () => {
    try {
      setLicenseChecking(true);
      
      // Check license status for this tenant
      const licenseResponse = await fetch(`/api/tenant/${tenant}/license-check`);
      if (licenseResponse.ok) {
        const licenseData = await licenseResponse.json();
        
        if (!licenseData.isValid) {
          // License is expired or invalid - redirect to license required page
          const status = licenseData.status || 'expired';
          const message = licenseData.message || 'Please contact OrderWeb Ltd for new license';
          router.push(`/${tenant}/license-required?status=${status}&message=${encodeURIComponent(message)}`);
          return;
        }
        
        setLicenseValid(true);
      } else {
        // If license check fails, redirect to license required page
        router.push(`/${tenant}/license-required?status=error&message=${encodeURIComponent('License validation failed. Please contact OrderWeb Ltd.')}`);
        return;
      }
    } catch (error) {
      console.error('License check failed:', error);
      // On error, redirect to license required page
      router.push(`/${tenant}/license-required?status=error&message=${encodeURIComponent('License validation failed. Please contact OrderWeb Ltd.')}`);
      return;
    } finally {
      setLicenseChecking(false);
    }
  };

  if (licenseChecking || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{licenseChecking ? 'Checking license...' : 'Loading restaurant...'}</p>
        </div>
      </div>
    );
  }

  if (!licenseValid) {
    return null; // Will redirect to license page
  }

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
          <p className="text-gray-600">The restaurant "{tenant}" does not exist.</p>
          <div className="mt-4">
            <a href="/super-admin" className="text-blue-600 hover:underline">
              Go to Super Admin
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TenantDataProvider>
      <Suspense fallback={<CustomerInterfaceLoading />}>
        <TenantCustomerInterface />
      </Suspense>
    </TenantDataProvider>
  );
}

export default function TenantCustomerPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading restaurant...</p>
        </div>
      </div>
    }>
      <TenantCustomerContent tenant={tenant} />
    </Suspense>
  );
}
