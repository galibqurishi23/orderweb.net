'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useParams, useRouter } from 'next/navigation';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, LogOut, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('password');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/customer/sessions', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/customer/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully"
        });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to change password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/customer/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Session revoked successfully"
        });
        await fetchSessions();
      } else {
        throw new Error('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: "Error",
        description: "Failed to revoke session",
        variant: "destructive"
      });
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/customer/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        router.push(`/${params.tenant}`);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const logoutAllDevices = async () => {
    try {
      const response = await fetch('/api/customer/sessions/revoke-all', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Logged out from all devices"
        });
        router.push(`/${params.tenant}`);
      } else {
        throw new Error('Failed to logout from all devices');
      }
    } catch (error) {
      console.error('Error logging out from all devices:', error);
      toast({
        title: "Error",
        description: "Failed to logout from all devices",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${params.tenant}/customer/dashboard`)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-blue-800">Account Settings</h1>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('password')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Change Password
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sessions'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Sessions
              </button>
              <button
                onClick={() => setActiveTab('danger')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'danger'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Danger Zone
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'password' && (
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Lock className="h-5 w-5 text-blue-600" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 bg-white">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={changePassword}
                disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sessions' && (
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Shield className="h-5 w-5 text-green-600" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">Current Session</div>
                      <div className="text-sm text-green-700">This device (active now)</div>
                    </div>
                  </div>
                </div>

                {sessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Other Sessions</h4>
                    {sessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{session.device || 'Unknown Device'}</div>
                          <div className="text-sm text-gray-600">
                            Last active: {new Date(session.lastActive).toLocaleString()}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-green-200">
                  <Button
                    variant="outline"
                    onClick={logoutAllDevices}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout from All Devices
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'danger' && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Logout from All Devices</h4>
                <p className="text-sm text-red-700 mb-4">
                  This will log you out from all devices and revoke all active sessions. You'll need to log in again.
                </p>
                <Button
                  variant="outline"
                  onClick={logoutAllDevices}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout Everywhere
                </Button>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Account Deactivation</h4>
                <p className="text-sm text-red-700 mb-4">
                  Need help with your account? Contact customer support for assistance.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/${params.tenant}/contact`)}
                  className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                >
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer - Developed By Link */}
      <footer className="hidden lg:block fixed bottom-4 right-4 z-50">
        <p className="text-xs text-gray-500">
          Developed By -{' '}
          <a 
            href="https://orderweb.co.uk/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-primary transition-colors duration-200"
          >
            Order Web
          </a>
        </p>
      </footer>
    </div>
  );
}
