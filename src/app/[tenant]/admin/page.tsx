'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useTenant } from '@/context/TenantContext';
import AdminLogo from '@/components/icons/admin-logo';

export default function TenantAdminLoginPage({ 
  params 
}: { 
  params: { tenant: string }
}) {
  // For Next.js 14, params are synchronous
  const resolvedParams = params;
  const router = useRouter();
  const { tenantData, isLoading: isTenantLoading } = useTenant();
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Get tenant slug from resolved params (Next.js 15 fix)
    setTenantSlug(resolvedParams.tenant);

    // DISABLED: Auto-redirect check to prevent loops
    // Only check auth after explicit login attempt
    console.log('Login page loaded for tenant:', resolvedParams.tenant);
  }, [resolvedParams.tenant]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          tenantSlug
        }),
      });

      const result = await response.json();
      
      console.log('🔐 Login response:', result);
      console.log('🍪 Cookies after login:', document.cookie);

      if (result.success) {
        console.log('✅ Login successful, redirecting to dashboard...');
        // Set a flag to indicate successful login
        sessionStorage.setItem('justLoggedIn', 'true');
        // Successful login, redirect to dashboard
        router.push(`/${tenantSlug}/admin/dashboard?from=login`);
      } else {
        console.log('❌ Login failed:', result.error);
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  if (isTenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Restaurant Not Found</h2>
              <p className="text-gray-600">The restaurant "{tenantSlug}" does not exist.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AdminLogo />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {tenantData.name}
          </CardTitle>
          <p className="text-gray-600">Admin Portal</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@restaurant.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="pl-10"
                  required
                  disabled={isLogging}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="pl-10 pr-10"
                  required
                  disabled={isLogging}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLogging}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive" className="border-red-300 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800 font-medium">
                  ❌ {error}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLogging}
            >
              {isLogging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In to Admin Panel'
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Authorized restaurant administrators only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
