'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParams, useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerLoginPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/customer/auth/login' : '/api/customer/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          name: isLogin ? undefined : `${formData.firstName} ${formData.lastName}`.trim(),
          tenantId: params.tenant
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: isLogin ? "Logged in successfully!" : "Account created successfully!"
        });
        router.push(`/${params.tenant}/customer/dashboard`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? 'Customer Login' : 'Create Account'}
            </CardTitle>
            <p className="text-gray-600">
              {isLogin 
                ? 'Access your account to view orders and loyalty points'
                : 'Join us to track your orders and earn loyalty rewards'
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      required={!isLogin}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Surname</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      required={!isLogin}
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    placeholder="john@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+44 7123 456789"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-sm text-gray-600 mt-1">
                    Password must be at least 8 characters long
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? (
                  'Please wait...'
                ) : (
                  <>
                    {isLogin ? <LogIn className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-orange-600 hover:text-orange-700 text-sm"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="font-medium">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="font-medium">Sign in</span></>
                )}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => router.push(`/${params.tenant}`)}
                className="text-sm"
              >
                ← Back to Menu
              </Button>
            </div>

            {/* Demo Customer Info */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 text-sm mb-2">Demo Customer Login</h4>
              <div className="text-xs text-blue-800 space-y-1">
                <div><strong>Email:</strong> demo.customer@orderweb.com</div>
                <div><strong>Password:</strong> demo123456</div>
                <div><strong>Phone:</strong> +44 7890 123456</div>
                <div className="text-orange-600 font-medium">Gold tier • 2,550+ points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
