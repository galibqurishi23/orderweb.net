'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { KitchenDisplayScreen } from '@/components/kitchen-display/KitchenDisplayScreen';
import { DisplaySelector } from '@/components/kitchen-display/DisplaySelector';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface KitchenDisplay {
  id: string;
  displayName: string;
  theme: 'light' | 'dark' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
  layoutConfig: any;
  soundAlerts: boolean;
  refreshIntervalSeconds: number;
}

export default function KitchenDisplayPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenant as string;
  
  const [displays, setDisplays] = useState<KitchenDisplay[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<KitchenDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [licenseWarning, setLicenseWarning] = useState<string | null>(null);

  useEffect(() => {
    checkLicenseAndLoadDisplays();
  }, [tenantId]);

  const checkLicenseAndLoadDisplays = async () => {
    try {
      setLoading(true);
      
      // First check license status
      const licenseResponse = await fetch(`/api/tenant/${tenantId}/license-check`);
      if (licenseResponse.ok) {
        const licenseData = await licenseResponse.json();
        
        if (!licenseData.isValid && licenseData.status !== 'grace_period' && licenseData.status !== 'expiring_soon') {
          // License is expired or invalid - redirect to license required page
          router.push(`/${tenantId}/license-required?status=${licenseData.status}&message=${encodeURIComponent(licenseData.message || 'Please call OrderWeb for new license')}`);
          return;
        }
        
        // Show warning for grace period or expiring soon
        if (licenseData.status === 'grace_period' || licenseData.status === 'expiring_soon') {
          setLicenseWarning(licenseData.message);
        }
      }
      
      // License is valid or in grace period - load displays
      await loadDisplays();
      
    } catch (error) {
      console.error('Error checking license:', error);
      setError('Failed to verify license status');
      setLoading(false);
    }
  };

  const loadDisplays = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/kitchen-display?tenant=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setDisplays(data.displays);
        // Auto-select first display if available
        if (data.displays.length > 0 && !selectedDisplay) {
          setSelectedDisplay(data.displays[0]);
        }
      } else {
        setError('Failed to load kitchen displays');
      }
    } catch (err) {
      setError('Error loading displays');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert className="max-w-md w-full">
          <AlertDescription className="text-center">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (displays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Alert className="max-w-md w-full">
          <AlertDescription className="text-center">
            No kitchen displays configured. Please contact your administrator to set up kitchen displays.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!selectedDisplay) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-md">
          <DisplaySelector 
            displays={displays}
            onSelect={setSelectedDisplay}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {licenseWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{licenseWarning}</p>
            </div>
          </div>
        </div>
      )}
      
      <KitchenDisplayScreen 
        display={selectedDisplay}
        tenantId={tenantId}
        onBack={() => setSelectedDisplay(null)}
      />
    </div>
  );
}
