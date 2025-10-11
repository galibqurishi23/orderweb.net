import { Suspense } from 'react';
import LicenseActivation from '@/components/tenant/LicenseActivation';

interface PageProps {
  params: {
    tenant: string;
  };
}

export default function LicenseActivationPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">License Activation</h1>
          <p className="text-gray-600">
            Activate your OrderWeb license to start using the platform
          </p>
        </div>
        
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <LicenseActivation 
            tenantSlug={params.tenant}
            onActivationSuccess={() => {
              // Redirect to dashboard after successful activation
              window.location.href = `/${params.tenant}`;
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
