'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Plus, Edit2, Trash2, Home, Building, ArrowLeft, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  isDefault: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  county?: string;
  country: string;
  deliveryInstructions?: string;
  createdAt: string;
}

export default function CustomerAddressesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    type: 'home' as 'home' | 'work' | 'other',
    isDefault: false,
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    county: '',
    country: 'United Kingdom',
    deliveryInstructions: ''
  });

  useEffect(() => {
    fetchAddresses();
  }, [params.tenant]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/addresses', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
      } else if (response.status === 401) {
        router.push(`/${params.tenant}`);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load addresses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAddress = async () => {
    try {
      const method = editingAddress ? 'PUT' : 'POST';
      const url = editingAddress 
        ? `/api/customer/addresses/${editingAddress.id}`
        : '/api/customer/addresses';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingAddress ? "Address updated successfully" : "Address added successfully"
        });
        await fetchAddresses();
        resetForm();
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save address');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive"
      });
    }
  };

  const deleteAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/customer/addresses/${addressId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Address deleted successfully"
        });
        await fetchAddresses();
      } else {
        throw new Error('Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive"
      });
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/customer/addresses/${addressId}/set-default`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Default address updated"
        });
        await fetchAddresses();
      } else {
        throw new Error('Failed to set default address');
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      toast({
        title: "Error",
        description: "Failed to set default address",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'home',
      isDefault: false,
      addressLine1: '',
      addressLine2: '',
      city: '',
      postcode: '',
      county: '',
      country: 'United Kingdom',
      deliveryInstructions: ''
    });
    setEditingAddress(null);
  };

  const openEditDialog = (address: Address) => {
    setFormData({
      type: address.type,
      isDefault: address.isDefault,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      postcode: address.postcode,
      county: address.county || '',
      country: address.country,
      deliveryInstructions: address.deliveryInstructions || ''
    });
    setEditingAddress(address);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case 'home': return <Home className="h-4 w-4" />;
      case 'work': return <Building className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getAddressTypeColor = (type: string) => {
    switch (type) {
      case 'home': return 'bg-green-100 text-green-800 border-green-200';
      case 'work': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-32 bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-blue-800">My Addresses</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAddress ? 'Edit Address' : 'Add New Address'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Address Type</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      placeholder="Street address"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({...formData, addressLine1: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                    <Input
                      id="addressLine2"
                      placeholder="Apartment, suite, unit, building, floor, etc."
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={formData.postcode}
                        onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="county">County (Optional)</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => setFormData({...formData, county: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Ireland">Ireland</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
                    <Textarea
                      id="deliveryInstructions"
                      placeholder="Special instructions for delivery..."
                      value={formData.deliveryInstructions}
                      onChange={(e) => setFormData({...formData, deliveryInstructions: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={saveAddress} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                      {editingAddress ? 'Update Address' : 'Add Address'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300 text-gray-600 hover:bg-gray-50">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Addresses List */}
      <div className="max-w-4xl mx-auto p-4">
        {addresses.length === 0 ? (
          <Card className="text-center py-12 border-blue-200">
            <CardContent>
              <MapPin className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-blue-800 mb-2">No addresses saved</h3>
              <p className="text-blue-600 mb-4">
                Add your delivery addresses to make ordering faster and easier.
              </p>
              <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className={`hover:shadow-md transition-shadow border-blue-100 ${address.isDefault ? 'ring-2 ring-blue-200 bg-blue-50' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getAddressTypeColor(address.type)}`}>
                          {getAddressTypeIcon(address.type)}
                          {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                        </div>
                        {address.isDefault && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <Star className="h-3 w-3" />
                            Default
                          </div>
                        )}
                      </div>
                      
                      <div className="text-gray-900">
                        <div className="font-medium">{address.addressLine1}</div>
                        {address.addressLine2 && (
                          <div>{address.addressLine2}</div>
                        )}
                        <div>
                          {address.city}, {address.postcode}
                        </div>
                        {address.county && <div>{address.county}</div>}
                        <div>{address.country}</div>
                      </div>

                      {address.deliveryInstructions && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Delivery Instructions:</strong> {address.deliveryInstructions}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(address)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      {!address.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultAddress(address.id)}
                          className="border-green-200 text-green-600 hover:bg-green-50"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAddress(address.id)}
                        className="text-red-600 hover:text-white hover:bg-red-600 border-red-300 hover:border-red-600 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
