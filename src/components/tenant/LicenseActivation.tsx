'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LicenseActivationProps {
  tenantSlug: string;
  onActivationSuccess?: () => void;
}

export default function LicenseActivation({ tenantSlug, onActivationSuccess }: LicenseActivationProps) {
  const [activationKey, setActivationKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activatedLicense, setActivatedLicense] = useState<any>(null);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationKey.trim()) {
      setError('Please enter an activation key');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/super-admin/licenses/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activationKey: activationKey.trim().toUpperCase(),
          tenantSlug: tenantSlug
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        setActivatedLicense(result.license);
        setActivationKey('');
        
        if (onActivationSuccess) {
          onActivationSuccess();
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatActivationKey = (value: string) => {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // Format as XXXX-XXXX-XXXX-XXXX
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    
    // Limit to 19 characters (4-4-4-4 + 3 dashes)
    return formatted.substring(0, 19);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Activate Your License</CardTitle>
          <p className="text-sm text-gray-600">
            Enter the activation key provided by OrderWeb Ltd to activate your restaurant license.
          </p>
        </CardHeader>
        
        <CardContent>
          {/* Success Message */}
          {success && activatedLicense && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-semibold">{success}</p>
                  <div className="text-sm">
                    <p>License Key: <code className="bg-white px-1 py-0.5 rounded text-xs">{activatedLicense.license_key}</code></p>
                    <p>Expires: {new Date(activatedLicense.expiration_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Activation Form */}
          {!success && (
            <form onSubmit={handleActivation} className="space-y-4">
              <div>
                <Label htmlFor="activationKey">Activation Key</Label>
                <Input
                  id="activationKey"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={activationKey}
                  onChange={(e) => setActivationKey(formatActivationKey(e.target.value))}
                  disabled={loading}
                  className="font-mono text-center text-lg tracking-wider"
                  maxLength={19}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 16-character activation key (format: XXXX-XXXX-XXXX-XXXX)
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading || activationKey.replace(/-/g, '').length !== 16}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Activate License
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">How to activate:</h4>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Contact OrderWeb Ltd to purchase a license</li>
              <li>2. You will receive a unique activation key</li>
              <li>3. Enter the activation key above and click activate</li>
              <li>4. Your license will be active immediately</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardContent className="pt-6 text-center">
          <h4 className="font-medium mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600 mb-3">
            Contact OrderWeb Ltd for license purchase or support
          </p>
          <div className="space-y-1 text-sm">
            <p>Email: <a href="mailto:support@orderweb.com" className="text-primary hover:underline">support@orderweb.com</a></p>
            <p>Phone: <a href="tel:+1234567890" className="text-primary hover:underline">+1 (234) 567-890</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
