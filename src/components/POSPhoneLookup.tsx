'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Search, User, Award, Star, Clock, Phone as PhoneIcon, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerLoyaltyData {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    customer_segment: string;
  };
  loyalty: {
    points_balance: number;
    total_points_earned: number;
    tier_level: string;
    loyalty_card_number: string;
  };
  recentTransactions: Array<{
    id: string;
    transaction_type: string;
    points_amount: number;
    description: string;
    created_at: string;
  }>;
}

interface POSPhoneLookupProps {
  tenantId: string;
  onCustomerFound?: (customerData: CustomerLoyaltyData) => void;
}

export default function POSPhoneLookup({ tenantId, onCustomerFound }: POSPhoneLookupProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerLoyaltyData | null>(null);

  const handlePhoneLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/loyalty/phone-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          tenantId: tenantId
        })
      });

      const data = await response.json();

      if (data.success && data.customer) {
        setCustomerData(data);
        onCustomerFound?.(data);
        toast({
          title: "Customer Found!",
          description: `Welcome back, ${data.customer.name}!`
        });
      } else {
        setCustomerData(null);
        toast({
          title: "Customer Not Found",
          description: "No loyalty account found for this phone number",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Phone lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: "Unable to search for customer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple formatting for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('44')) {
      return '+44 ' + cleaned.substring(2, 6) + ' ' + cleaned.substring(6);
    }
    return phone;
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold': return <Award className="h-4 w-4" />;
      case 'platinum': return <Star className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone Lookup Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Customer Loyalty Lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneLookup} className="space-y-4">
            <div>
              <Label htmlFor="phone">Customer Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="07890 123456 or +44 7890 123456"
                    className="pl-10"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Customer Information Display */}
      {customerData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Customer Found
              </div>
              <div className={`px-3 py-1 rounded-full border text-sm font-medium flex items-center gap-1 ${getTierColor(customerData.loyalty.tier_level)}`}>
                {getTierIcon(customerData.loyalty.tier_level)}
                {customerData.loyalty.tier_level.charAt(0).toUpperCase() + customerData.loyalty.tier_level.slice(1)} Member
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{customerData.customer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{customerData.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4 text-gray-500" />
                      <span>{formatPhoneNumber(customerData.customer.phone)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loyalty Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Loyalty Account</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current Points:</span>
                      <span className="font-bold text-green-600">{customerData.loyalty.points_balance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Earned:</span>
                      <span className="font-medium">{customerData.loyalty.total_points_earned.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Card Number:</span>
                      <span className="font-mono text-xs">{customerData.loyalty.loyalty_card_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            {customerData.recentTransactions && customerData.recentTransactions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-green-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  {customerData.recentTransactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                      <div>
                        <span className="font-medium">{transaction.description}</span>
                        <span className="text-gray-500 ml-2">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`font-bold ${
                        transaction.transaction_type === 'earned' || transaction.transaction_type === 'bonus' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'earned' || transaction.transaction_type === 'bonus' ? '+' : '-'}
                        {Math.abs(transaction.points_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-green-200">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCustomerData(null)}
                >
                  Clear
                </Button>
                <Button 
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    // This would typically integrate with your POS system
                    toast({
                      title: "Ready for Order",
                      description: "Customer loyalty account loaded for checkout"
                    });
                  }}
                >
                  Apply to Order
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
