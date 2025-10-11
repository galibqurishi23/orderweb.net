'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Gift, 
  Star, 
  TrendingUp, 
  Users, 
  Save,
  AlertCircle,
  CheckCircle,
  Phone,
  Award,
  CreditCard,
  Percent,
  PoundSterling
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoyaltySettings {
  id: string;
  tenant_id: string;
  program_name: string;
  is_active: boolean;
  earn_rate_type: 'percentage' | 'fixed' | 'pound';
  earn_rate_value: number;
  min_order_for_points: number;
  points_expire_days: number;
  bronze_min_points: number;
  silver_min_points: number;
  gold_min_points: number;
  platinum_min_points: number;
  diamond_min_points: number;
  welcome_bonus_points: number;
  birthday_bonus_points: number;
  referral_bonus_points: number;
  redemption_minimum: number;
  redemption_increment: number;
  point_value_pounds: number;
  max_redeem_per_order_percent: number;
  restaurant_name: string;
  currency: string;
}

export default function LoyaltyPointsAdmin() {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<Partial<LoyaltySettings>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setFormData(data.settings);
      } else {
        setError(data.error || 'Failed to load settings');
      }
    } catch (err) {
      setError('Failed to load loyalty settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/loyalty/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programName: formData.program_name,
          isActive: formData.is_active,
          earnRateType: formData.earn_rate_type,
          earnRateValue: formData.earn_rate_value,
          minOrderForPoints: formData.min_order_for_points,
          pointsExpireDays: formData.points_expire_days,
          silverMinPoints: formData.silver_min_points,
          goldMinPoints: formData.gold_min_points,
          platinumMinPoints: formData.platinum_min_points,
          diamondMinPoints: formData.diamond_min_points,
          welcomeBonusPoints: formData.welcome_bonus_points,
          birthdayBonusPoints: formData.birthday_bonus_points,
          referralBonusPoints: formData.referral_bonus_points,
          redemptionMinimum: formData.redemption_minimum,
          redemptionIncrement: formData.redemption_increment,
          pointValuePounds: formData.point_value_pounds,
          maxRedeemPerOrderPercent: formData.max_redeem_per_order_percent
        })
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        setFormData(data.settings);
        toast({
          title: "Settings Updated",
          description: "Loyalty program settings have been saved successfully.",
        });
      } else {
        setError(data.error || 'Failed to save settings');
        toast({
          title: "Error",
          description: data.error || 'Failed to save settings',
          variant: "destructive",
        });
      }
    } catch (err) {
      setError('Failed to save loyalty settings');
      toast({
        title: "Error",
        description: 'Failed to save loyalty settings',
        variant: "destructive",
      });
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePointsExample = (orderAmount: number) => {
    if (!formData.earn_rate_type || !formData.earn_rate_value) return 0;
    
    switch (formData.earn_rate_type) {
      case 'percentage':
        return Math.floor(orderAmount * (formData.earn_rate_value / 100));
      case 'fixed':
        return formData.earn_rate_value;
      case 'pound':
        return Math.floor(orderAmount / formData.earn_rate_value);
      default:
        return Math.floor(orderAmount);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading loyalty settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="w-8 h-8 text-blue-600" />
            Loyalty Points Management
          </h1>
          <p className="text-gray-600 mt-1">
            Configure your phone-based loyalty program settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={settings?.is_active ? 'default' : 'secondary'}>
            {settings?.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Button 
            onClick={saveSettings} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="earning" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="earning">Earning Rules</TabsTrigger>
          <TabsTrigger value="tiers">Tier System</TabsTrigger>
          <TabsTrigger value="redemption">Redemption</TabsTrigger>
          <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
        </TabsList>

        {/* Earning Rules Tab */}
        <TabsContent value="earning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Points Earning Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program Status */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Program Status</Label>
                  <p className="text-sm text-gray-600">Enable or disable the loyalty program</p>
                </div>
                <Switch
                  checked={formData.is_active || false}
                  onCheckedChange={(checked) => updateFormData('is_active', checked)}
                />
              </div>

              {/* Program Name */}
              <div className="space-y-2">
                <Label htmlFor="programName">Program Name</Label>
                <Input
                  id="programName"
                  value={formData.program_name || ''}
                  onChange={(e) => updateFormData('program_name', e.target.value)}
                  placeholder="e.g., Tikka Loyalty Program"
                />
              </div>

              {/* Earning Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Earning Method</Label>
                  <Select
                    value={formData.earn_rate_type || 'percentage'}
                    onValueChange={(value) => updateFormData('earn_rate_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4" />
                          Percentage of order value
                        </div>
                      </SelectItem>
                      <SelectItem value="pound">
                        <div className="flex items-center gap-2">
                          <PoundSterling className="w-4 h-4" />
                          Points per pound spent
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4" />
                          Fixed points per order
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Earning Rate Value</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.earn_rate_value || ''}
                      onChange={(e) => updateFormData('earn_rate_value', parseFloat(e.target.value) || 0)}
                      placeholder="1.00"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      {formData.earn_rate_type === 'percentage' && '%'}
                      {formData.earn_rate_type === 'pound' && 'pts/£'}
                      {formData.earn_rate_type === 'fixed' && 'pts'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimum Order */}
              <div className="space-y-2">
                <Label>Minimum Order for Points</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_order_for_points || ''}
                    onChange={(e) => updateFormData('min_order_for_points', parseFloat(e.target.value) || 0)}
                    placeholder="5.00"
                  />
                  <div className="space-y-2">
                    <Label>Points Expiry (Days)</Label>
                    <Input
                      type="number"
                      value={formData.points_expire_days || ''}
                      onChange={(e) => updateFormData('points_expire_days', parseInt(e.target.value) || 365)}
                      placeholder="365"
                    />
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-gray-900">Points Calculation Examples:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">£10 Order</p>
                    <p className="text-green-600 font-semibold">
                      {calculatePointsExample(10)} points
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">£25 Order</p>
                    <p className="text-green-600 font-semibold">
                      {calculatePointsExample(25)} points
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">£50 Order</p>
                    <p className="text-green-600 font-semibold">
                      {calculatePointsExample(50)} points
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tier System Tab */}
        <TabsContent value="tiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Customer Tier System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Bronze Tier */}
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🥉</span>
                    <h4 className="font-semibold text-orange-800">Bronze</h4>
                  </div>
                  <Label className="text-xs">Starting Points</Label>
                  <Input
                    type="number"
                    value={formData.bronze_min_points || 0}
                    onChange={(e) => updateFormData('bronze_min_points', parseInt(e.target.value) || 0)}
                    className="mt-1 text-sm"
                    disabled
                  />
                </div>

                {/* Silver Tier */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🥈</span>
                    <h4 className="font-semibold text-gray-800">Silver</h4>
                  </div>
                  <Label className="text-xs">Minimum Points</Label>
                  <Input
                    type="number"
                    value={formData.silver_min_points || ''}
                    onChange={(e) => updateFormData('silver_min_points', parseInt(e.target.value) || 500)}
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Gold Tier */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🥇</span>
                    <h4 className="font-semibold text-yellow-800">Gold</h4>
                  </div>
                  <Label className="text-xs">Minimum Points</Label>
                  <Input
                    type="number"
                    value={formData.gold_min_points || ''}
                    onChange={(e) => updateFormData('gold_min_points', parseInt(e.target.value) || 1500)}
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Platinum Tier */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🏆</span>
                    <h4 className="font-semibold text-blue-800">Platinum</h4>
                  </div>
                  <Label className="text-xs">Minimum Points</Label>
                  <Input
                    type="number"
                    value={formData.platinum_min_points || ''}
                    onChange={(e) => updateFormData('platinum_min_points', parseInt(e.target.value) || 3000)}
                    className="mt-1 text-sm"
                  />
                </div>

                {/* Diamond Tier */}
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">💎</span>
                    <h4 className="font-semibold text-purple-800">Diamond</h4>
                  </div>
                  <Label className="text-xs">Minimum Points</Label>
                  <Input
                    type="number"
                    value={formData.diamond_min_points || ''}
                    onChange={(e) => updateFormData('diamond_min_points', parseInt(e.target.value) || 5000)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  Customer tiers are automatically upgraded when they reach the minimum points threshold. 
                  Higher tiers can access exclusive rewards and benefits.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redemption Tab */}
        <TabsContent value="redemption" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Redemption Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Point Value (£ per point)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.point_value_pounds || ''}
                      onChange={(e) => updateFormData('point_value_pounds', parseFloat(e.target.value) || 0.01)}
                      placeholder="0.01"
                    />
                    <p className="text-xs text-gray-600">
                      How much each point is worth in pounds (e.g., 0.01 = 1 point = 1p)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Redemption</Label>
                    <Input
                      type="number"
                      value={formData.redemption_minimum || ''}
                      onChange={(e) => updateFormData('redemption_minimum', parseInt(e.target.value) || 100)}
                      placeholder="100"
                    />
                    <p className="text-xs text-gray-600">
                      Minimum points required for redemption
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Redemption Increment</Label>
                    <Input
                      type="number"
                      value={formData.redemption_increment || ''}
                      onChange={(e) => updateFormData('redemption_increment', parseInt(e.target.value) || 50)}
                      placeholder="50"
                    />
                    <p className="text-xs text-gray-600">
                      Points must be redeemed in multiples of this amount
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Redemption per Order (%)</Label>
                    <Input
                      type="number"
                      value={formData.max_redeem_per_order_percent || ''}
                      onChange={(e) => updateFormData('max_redeem_per_order_percent', parseInt(e.target.value) || 50)}
                      placeholder="50"
                    />
                    <p className="text-xs text-gray-600">
                      Maximum percentage of order value that can be paid with points
                    </p>
                  </div>
                </div>
              </div>

              {/* Redemption Examples */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Redemption Examples:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">100 Points</p>
                    <p className="text-blue-600 font-semibold">
                      £{((formData.point_value_pounds || 0.01) * 100).toFixed(2)} value
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">500 Points</p>
                    <p className="text-blue-600 font-semibold">
                      £{((formData.point_value_pounds || 0.01) * 500).toFixed(2)} value
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium">1000 Points</p>
                    <p className="text-blue-600 font-semibold">
                      £{((formData.point_value_pounds || 0.01) * 1000).toFixed(2)} value
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonuses Tab */}
        <TabsContent value="bonuses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Bonus Points Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎉</span>
                    <h4 className="font-semibold text-green-800">Welcome Bonus</h4>
                  </div>
                  <Label className="text-sm">Points for new members</Label>
                  <Input
                    type="number"
                    value={formData.welcome_bonus_points || ''}
                    onChange={(e) => updateFormData('welcome_bonus_points', parseInt(e.target.value) || 100)}
                    className="mt-2"
                    placeholder="100"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎂</span>
                    <h4 className="font-semibold text-blue-800">Birthday Bonus</h4>
                  </div>
                  <Label className="text-sm">Annual birthday points</Label>
                  <Input
                    type="number"
                    value={formData.birthday_bonus_points || ''}
                    onChange={(e) => updateFormData('birthday_bonus_points', parseInt(e.target.value) || 200)}
                    className="mt-2"
                    placeholder="200"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">👥</span>
                    <h4 className="font-semibold text-purple-800">Referral Bonus</h4>
                  </div>
                  <Label className="text-sm">Points for referrals</Label>
                  <Input
                    type="number"
                    value={formData.referral_bonus_points || ''}
                    onChange={(e) => updateFormData('referral_bonus_points', parseInt(e.target.value) || 300)}
                    className="mt-2"
                    placeholder="300"
                  />
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Bonus points are automatically awarded when customers join the program, on their birthday 
                  (if date provided), and when they successfully refer new customers.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Access Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.open(`/${window.location.pathname.split('/')[1]}/admin/phone-loyalty-pos`, '_blank')}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <Phone className="w-6 h-6" />
              <span className="text-sm">Phone Loyalty POS</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/${window.location.pathname.split('/')[1]}/admin/customers`, '_blank')}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Customer Management</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`/${window.location.pathname.split('/')[1]}/admin/reports`, '_blank')}
              className="h-auto p-4 flex flex-col gap-2"
            >
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Loyalty Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
