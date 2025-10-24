'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Phone, User, Plus, Minus, Star, History, Settings, Gift, CreditCard } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { useTenant } from '@/context/TenantContext'
import { redeemGiftCard } from '@/lib/gift-card-service'

interface Customer {
  phone: string
  displayPhone: string
  loyaltyCardNumber: string
  customerName: string
  email: string
  pointsBalance: number
  totalPointsEarned: number
  totalPointsRedeemed: number
  tierLevel: string
  nextTierPoints: number
  isActive: number
  joinedDate: string
  lastOrderDate: string | null
  totalOrders: number
  totalSpent: string
}

interface Transaction {
  id: number
  customer_id: number
  points_change: number
  transaction_type: 'earned' | 'redeemed' | 'manual'
  description: string
  created_at: string
  order_value?: number
}

interface LoyaltySettings {
  points_per_pound: number
  min_points_redeem: number
  max_points_redeem_percent: number
}

export default function PhoneLoyaltyPOS() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    points_per_pound: 1,
    min_points_redeem: 100,
    max_points_redeem_percent: 50
  })
  const [loading, setLoading] = useState(false)
  const { tenantData } = useTenant()
  const [searchMode, setSearchMode] = useState<'search' | 'create'>('search')
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: ''
  })
  const [pointsToAdd, setPointsToAdd] = useState('')
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [orderValue, setOrderValue] = useState('')
  
  // Gift card states
  const [giftCardNumber, setGiftCardNumber] = useState('')
  const [giftCardAmount, setGiftCardAmount] = useState('')
  const [giftCardDescription, setGiftCardDescription] = useState('')
  const [showGiftCardSection, setShowGiftCardSection] = useState(false)
  const [giftCardBalance, setGiftCardBalance] = useState<string>('')

  // Load loyalty settings on component mount
  useEffect(() => {
    loadLoyaltySettings()
  }, [])

  const loadLoyaltySettings = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/settings')
      if (response.ok) {
        const settings = await response.json()
        setLoyaltySettings(settings)
      }
    } catch (error) {
      console.error('Error loading loyalty settings:', error)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '')
    return cleaned
  }

  const searchCustomer = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      })
      return
    }

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: "Tenant information not loaded",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const cleanPhone = formatPhoneNumber(phoneNumber)
      const response = await fetch(`/api/loyalty/phone-lookup?phone=${cleanPhone}&tenantId=${tenantData.id}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.customer) {
          setCustomer(data.customer)
          setTransactions(data.transactions || [])
          setSearchMode('search')
          toast({
            title: "Customer Found",
            description: `Welcome back, ${data.customer.customerName}!`,
          })
        } else {
          setCustomer(null)
          setTransactions([])
          setSearchMode('create')
          toast({
            title: "New Customer",
            description: "Customer not found. Please create a new account.",
          })
        }
      } else if (response.status === 404) {
        setCustomer(null)
        setTransactions([])
        setSearchMode('create')
        toast({
          title: "New Customer",
          description: "Customer not found. Please create a new account.",
        })
      } else {
        throw new Error('Search failed')
      }
    } catch (error) {
      console.error('Error searching customer:', error)
      toast({
        title: "Error",
        description: "Failed to search customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const cleanPhone = formatPhoneNumber(phoneNumber)
      const response = await fetch('/api/loyalty/phone-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: newCustomerData.name,
          email: newCustomerData.email
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        setTransactions([])
        setSearchMode('search')
        setNewCustomerData({ name: '', email: '' })
        toast({
          title: "Success",
          description: "Customer account created successfully!",
        })
      } else {
        throw new Error('Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addPoints = async () => {
    if (!customer || !pointsToAdd.trim()) return

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: "Tenant information not loaded",
        variant: "destructive",
      })
      return
    }

    const points = parseInt(pointsToAdd)
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of points",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/loyalty/phone-lookup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          action: 'add',
          points: points,
          tenantId: tenantData.id,
          reason: `POS Manual Addition - Order Value: £${orderValue || '0'}`
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh customer data after adding points
        await searchCustomer()
        
        setPointsToAdd('')
        setOrderValue('')
        
        toast({
          title: "✅ Points Added Successfully",
          description: `Added ${points} points. New balance: ${data.customer?.pointsBalance || customer.pointsBalance + points} points`,
        })
      } else {
        throw new Error(data.error || 'Failed to add points')
      }
    } catch (error: any) {
      console.error('Error adding points:', error)
      toast({
        title: "❌ Error Adding Points",
        description: error.message || "Failed to add points. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const redeemPoints = async () => {
    if (!customer || !pointsToRedeem.trim()) return

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: "Tenant information not loaded",
        variant: "destructive",
      })
      return
    }

    const points = parseInt(pointsToRedeem)
    if (isNaN(points) || points <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of points",
        variant: "destructive",
      })
      return
    }

    if (points > customer.pointsBalance) {
      toast({
        title: "Error",
        description: "Insufficient points balance",
        variant: "destructive",
      })
      return
    }

    if (points < loyaltySettings.min_points_redeem) {
      toast({
        title: "Error",
        description: `Minimum ${loyaltySettings.min_points_redeem} points required for redemption`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/loyalty/phone-lookup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          action: 'redeem',
          points: points,
          tenantId: tenantData.id,
          reason: `POS Points Redemption`
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh customer data after redeeming points
        await searchCustomer()
        
        setPointsToRedeem('')
        
        toast({
          title: "✅ Points Redeemed Successfully",
          description: `Redeemed ${points} points. New balance: ${data.customer?.pointsBalance || customer.pointsBalance - points} points`,
        })
      } else {
        throw new Error(data.error || 'Failed to redeem points')
      }
    } catch (error: any) {
      console.error('Error redeeming points:', error)
      toast({
        title: "❌ Error Redeeming Points",
        description: error.message || "Failed to redeem points. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const redeemGiftCardHandler = async () => {
    // If we don't have a customer, require one first
    if (!customer) {
      toast({
        title: "Error",
        description: "Please search for a customer first",
        variant: "destructive",
      })
      return
    }

    if (!giftCardNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter gift card number",
        variant: "destructive",
      })
      return
    }

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: "Tenant information not loaded",
        variant: "destructive",
      })
      return
    }

    // If showing the form, process the redemption
    if (showGiftCardSection) {
      if (!giftCardAmount.trim()) {
        toast({
          title: "Error",
          description: "Please enter redemption amount",
          variant: "destructive",
        })
        return
      }

      const amount = parseFloat(giftCardAmount)
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount",
          variant: "destructive",
        })
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/tenant/${tenantData.id}/admin/gift-cards/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: giftCardNumber.trim(),
            amount: amount,
            description: giftCardDescription.trim() || `POS Gift Card Redemption - Customer: ${customer.customerName}`
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setGiftCardNumber('')
          setGiftCardAmount('')
          setGiftCardDescription('')
          setShowGiftCardSection(false)
          toast({
            title: "Success",
            description: `Gift card redeemed successfully! £${amount.toFixed(2)} has been applied.`,
          })
        } else {
          throw new Error(data.error || 'Failed to redeem gift card')
        }
      } catch (error) {
        console.error('Error redeeming gift card:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to redeem gift card. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    } else {
      // First step: lookup the gift card to verify it exists
      setLoading(true)
      try {
        const response = await fetch(`/api/tenant/${tenantData.id}/admin/gift-cards/lookup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: giftCardNumber.trim()
          })
        })

        const data = await response.json()

        if (response.ok && data.success && data.gift_card) {
          setShowGiftCardSection(true)
          toast({
            title: "Gift Card Found",
            description: `Balance: £${data.gift_card.balance}. Enter amount to redeem.`,
          })
        } else {
          throw new Error(data.error || 'Gift card not found')
        }
      } catch (error) {
        console.error('Error looking up gift card:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Gift card not found. Please check the code.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Standalone gift card lookup function
  const lookupGiftCard = async () => {
    if (!giftCardNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a gift card code",
        variant: "destructive",
      })
      return
    }

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: `Tenant information not loaded. Current tenant: ${tenantData?.id || 'undefined'}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // TEMPORARY: Hardcode tenant for debugging
      const actualTenant = 'kitchen'
      
      // Use the same lookup API as the Shop page
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9002'
      const url = `${baseUrl}/api/tenant/${actualTenant}/admin/gift-cards/lookup`
      const payload = {
        card_number: giftCardNumber.trim()
      }

      console.log('=== DEBUGGING GIFT CARD LOOKUP ===')
      console.log('Request URL:', url)
      console.log('Request payload:', payload)
      console.log('Browser user agent:', navigator.userAgent)
      console.log('Current location:', window.location.href)

      let response
      try {
        console.log('=== STARTING FETCH ===')
        response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        console.log('=== FETCH COMPLETED ===')
        console.log('Response object:', response)
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      } catch (fetchError) {
        console.error('=== FETCH FAILED ===', fetchError)
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
      }

      console.log('=== PARSING RESPONSE ===')
      let data
      try {
        const responseText = await response.text()
        console.log('Raw response text:', responseText)
        data = JSON.parse(responseText)
        console.log('Parsed JSON:', data)
      } catch (parseError) {
        console.error('=== JSON PARSE ERROR ===', parseError)
        throw new Error('Invalid response format from server')
      }

      if (!response.ok) {
        console.error('HTTP error:', response.status, data)
        throw new Error(data?.error || `Server error (${response.status})`)
      }

      // Lookup API returns data with success and gift_card properties (same as Shop page)
      if (data.success && data.gift_card) {
        setShowGiftCardSection(true)
        setGiftCardBalance(data.gift_card.balance)
        toast({
          title: "Gift Card Found ✅",
          description: `Balance: £${data.gift_card.balance} | Status: ${data.gift_card.status} | Type: ${data.gift_card.card_type}`,
        })
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('Gift card not found')
      }
    } catch (error) {
      console.error('Gift card lookup error:', error)
      toast({
        title: "Lookup Failed",
        description: error instanceof Error ? error.message : "Gift card not found. Please check the code.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Standalone gift card redemption function
  const standaloneRedeemGiftCard = async () => {
    if (!giftCardNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a gift card number",
        variant: "destructive",
      })
      return
    }

    if (!giftCardAmount.trim()) {
      toast({
        title: "Error",
        description: "Please enter an amount to redeem",
        variant: "destructive",
      })
      return
    }

    if (!tenantData?.id) {
      toast({
        title: "Error",
        description: "Tenant information not loaded",
        variant: "destructive",
      })
      return
    }

    const amount = parseFloat(giftCardAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Get tenant from URL as fallback
      const urlPath = typeof window !== 'undefined' ? window.location.pathname : ''
      const urlTenant = urlPath.split('/')[1]
      const actualTenant = tenantData?.id || urlTenant || 'kitchen'
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9002'
      const url = `${baseUrl}/api/tenant/${actualTenant}/admin/gift-cards/redeem`
      const payload = {
        card_number: giftCardNumber.trim(),
        amount: amount,
        description: giftCardDescription.trim() || 'POS Gift Card Redemption'
      }

      console.log('Gift card redemption request:', { url, payload, tenantId: actualTenant })

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      console.log('Redemption response status:', response.status, 'OK:', response.ok)

      let data
      try {
        data = await response.json()
        console.log('Redemption response data:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        throw new Error('Invalid response format from server')
      }

      if (!response.ok) {
        console.error('HTTP error:', response.status, data)
        throw new Error(data?.error || `Server error (${response.status})`)
      }

      if (response.ok && data.success) {
        // Clear form and close section
        setGiftCardNumber('')
        setGiftCardAmount('')
        setGiftCardDescription('')
        setShowGiftCardSection(false)
        setGiftCardBalance('')
        
        toast({
          title: "Success",
          description: "Gift card redeemed successfully",
        })
      } else {
        throw new Error(data?.error || 'Failed to redeem gift card')
      }
    } catch (error) {
      console.error('Gift card redemption error:', error)
      toast({
        title: "Redemption Failed",
        description: error instanceof Error ? error.message : "Failed to redeem gift card. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setPhoneNumber('')
    setCustomer(null)
    setTransactions([])
    setSearchMode('search')
    setNewCustomerData({ name: '', email: '' })
    setPointsToAdd('')
    setPointsToRedeem('')
    setOrderValue('')
    // Clear gift card fields
    setGiftCardNumber('')
    setGiftCardAmount('')
    setGiftCardDescription('')
    setShowGiftCardSection(false)
    setGiftCardBalance('')
  }

  const calculatePointsFromOrder = (value: string) => {
    const orderAmount = parseFloat(value)
    if (!isNaN(orderAmount) && orderAmount > 0) {
      return Math.floor(orderAmount * loyaltySettings.points_per_pound)
    }
    return 0
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Loyalty POS</h1>
          <p className="text-muted-foreground">Manage customer loyalty points with phone lookup</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            <Settings className="w-4 h-4 mr-1" />
            {loyaltySettings.points_per_pound} point per £1
          </Badge>
        </div>
      </div>

      {/* Phone Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Customer Lookup
          </CardTitle>
          <CardDescription>
            Enter customer phone number to find existing account or create new one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={searchCustomer} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Searching...' : 'Search'}
              </Button>
              {(customer || searchMode === 'create') && (
                <Button variant="outline" onClick={clearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standalone Gift Card Redemption Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Gift Card Redemption
          </CardTitle>
          <CardDescription>
            Redeem gift cards independently - no customer lookup required
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gift Card Code</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter gift card code"
                value={giftCardNumber}
                onChange={(e) => setGiftCardNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !showGiftCardSection && lookupGiftCard()}
              />
              <Button onClick={lookupGiftCard} disabled={loading || !giftCardNumber}>
                <CreditCard className="w-4 h-4 mr-2" />
                {showGiftCardSection ? 'Lookup Again' : 'Lookup'}
              </Button>
            </div>
          </div>

          {/* Gift Card Details Form */}
          {showGiftCardSection && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              {/* Gift Card Balance Display */}
              {giftCardBalance && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Current Balance:</span>
                    <span className="text-lg font-bold text-green-900">£{giftCardBalance}</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="standaloneGiftCardAmount">Amount to Redeem (£)</Label>
                  <Input
                    id="standaloneGiftCardAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={giftCardAmount}
                    onChange={(e) => setGiftCardAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="standaloneGiftCardDescription">Description (Optional)</Label>
                  <Input
                    id="standaloneGiftCardDescription"
                    placeholder="Transaction description"
                    value={giftCardDescription}
                    onChange={(e) => setGiftCardDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowGiftCardSection(false);
                    setGiftCardAmount('');
                    setGiftCardDescription('');
                    setGiftCardBalance('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={standaloneRedeemGiftCard} 
                  disabled={loading || !giftCardAmount || parseFloat(giftCardAmount) <= 0}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Redeem Gift Card
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create New Customer Section */}
      {searchMode === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Create New Customer
            </CardTitle>
            <CardDescription>
              Phone: {phoneNumber}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <Button onClick={createCustomer} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Create Customer Account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Customer Details Section */}
      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Details
                </div>
                <Badge variant="secondary" className="text-lg">
                  <Star className="w-4 h-4 mr-1" />
                  {customer.pointsBalance} points
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-lg">{customer.customerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-lg">{customer.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-lg">{customer.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Spent</Label>
                  <p className="text-lg">£{customer.totalSpent && !isNaN(parseFloat(customer.totalSpent)) ? parseFloat(customer.totalSpent).toFixed(2) : '0.00'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Member Since</Label>
                  <p className="text-lg">{new Date(customer.joinedDate).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Management */}
          <Card>
            <CardHeader>
              <CardTitle>Points Management</CardTitle>
              <CardDescription>
                Add or redeem loyalty points for this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Points */}
              <div className="space-y-2">
                <Label>Add Points</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Order value (£)"
                    value={orderValue}
                    onChange={(e) => {
                      setOrderValue(e.target.value)
                      const calculatedPoints = calculatePointsFromOrder(e.target.value)
                      setPointsToAdd(calculatedPoints.toString())
                    }}
                  />
                  <Input
                    placeholder="Points to add"
                    value={pointsToAdd}
                    onChange={(e) => setPointsToAdd(e.target.value)}
                  />
                  <Button onClick={addPoints} disabled={loading}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {orderValue && (
                  <p className="text-sm text-muted-foreground">
                    £{orderValue} = {calculatePointsFromOrder(orderValue)} points
                  </p>
                )}
              </div>

              <Separator />

              {/* Redeem Points */}
              <div className="space-y-2">
                <Label>Redeem Points</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Points to redeem"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(e.target.value)}
                  />
                  <Button onClick={redeemPoints} disabled={loading}>
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Min: {loyaltySettings.min_points_redeem} points | Available: {customer.pointsBalance} points
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gift Card Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Gift Card Management
              </CardTitle>
              <CardDescription>
                Redeem gift cards for this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Gift Card Code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter gift card code"
                    value={giftCardNumber}
                    onChange={(e) => setGiftCardNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && redeemGiftCardHandler()}
                  />
                  <Button onClick={redeemGiftCardHandler} disabled={loading || !giftCardNumber}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Redeem
                  </Button>
                </div>
              </div>

              {/* Gift Card Details Form */}
              {showGiftCardSection && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="giftCardAmount">Amount to Redeem (£)</Label>
                      <Input
                        id="giftCardAmount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={giftCardAmount}
                        onChange={(e) => setGiftCardAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="giftCardDescription">Description (Optional)</Label>
                      <Input
                        id="giftCardDescription"
                        placeholder="Order description"
                        value={giftCardDescription}
                        onChange={(e) => setGiftCardDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowGiftCardSection(false);
                        setGiftCardAmount('');
                        setGiftCardDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={redeemGiftCardHandler} 
                      disabled={loading || !giftCardAmount || parseFloat(giftCardAmount) <= 0}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Confirm Redemption
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      {customer && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Recent loyalty point transactions for {customer.customerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()}
                      {transaction.order_value && ` • Order: £${transaction.order_value.toFixed(2)}`}
                    </p>
                  </div>
                  <Badge variant={transaction.points_change > 0 ? "default" : "secondary"}>
                    {transaction.points_change > 0 ? '+' : ''}{transaction.points_change} points
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Info */}
      {!customer && searchMode === 'search' && (
        <Alert>
          <AlertDescription>
            Enter a customer's phone number above to search for their loyalty account or create a new one.
            The system automatically tracks points based on order values: {loyaltySettings.points_per_pound} point per £1 spent.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
