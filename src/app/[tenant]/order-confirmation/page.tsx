'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin, 
  ShoppingBag, 
  ArrowLeft, 
  Package,
  Calendar,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTenant } from '@/context/TenantContext';
import { TenantDataProvider, useTenantData } from '@/context/TenantDataContext';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as TenantZoneService from '@/lib/tenant-zone-service';
import { useToast } from '@/hooks/use-toast';

interface OrderConfirmationData {
  orderId: string;
  orderNumber: string;
  orderType: 'delivery' | 'collection' | 'advance';
  total: number;
  customerName: string;
  postcode?: string;
  advanceFulfillmentType?: 'delivery' | 'collection';
  scheduledTime?: Date;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

function OrderConfirmationContent({ tenant }: { tenant: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantData } = useTenant();
  const { restaurantSettings } = useTenantData();
  const { toast } = useToast();
  
  const [orderData, setOrderData] = useState<OrderConfirmationData | null>(null);
  const [actualDeliveryTime, setActualDeliveryTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for live tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get order data from URL params
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');
    const orderType = searchParams.get('orderType') as 'delivery' | 'collection' | 'advance';
    const total = parseFloat(searchParams.get('total') || '0');
    const customerName = searchParams.get('customerName') || '';
    const postcode = searchParams.get('postcode') || undefined;
    const advanceFulfillmentType = searchParams.get('advanceFulfillmentType') as 'delivery' | 'collection' | undefined;
    const scheduledTime = searchParams.get('scheduledTime');

    if (orderId && orderNumber && orderType) {
      setOrderData({
        orderId,
        orderNumber,
        orderType,
        total,
        customerName,
        postcode,
        advanceFulfillmentType,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
        items: [] // You can pass item details if needed
      });
    } else {
      // If no order data, redirect to home
      router.push(`/${tenantData?.slug || ''}`);
    }
  }, [searchParams, router, tenantData]);

  // Fetch zone-specific delivery time for delivery orders
  useEffect(() => {
    const fetchDeliveryTime = async () => {
      if (orderData && tenantData?.id && orderData.postcode) {
        // Check if it's a delivery order (direct delivery or advance delivery)
        const isDeliveryOrder = orderData.orderType === 'delivery' || 
                              (orderData.orderType === 'advance' && orderData.advanceFulfillmentType === 'delivery');
        
        if (isDeliveryOrder) {
          try {
            const zoneDeliveryTime = await TenantZoneService.getDeliveryTime(tenantData.id, orderData.postcode);
            setActualDeliveryTime(zoneDeliveryTime);
          } catch (error) {
            console.error('Error fetching zone delivery time:', error);
            // Fall back to default delivery time
            setActualDeliveryTime(restaurantSettings?.deliveryTimeSettings?.deliveryTimeMinutes || 45);
          }
        }
      } else if (orderData && (orderData.orderType === 'delivery' || 
                             (orderData.orderType === 'advance' && orderData.advanceFulfillmentType === 'delivery'))) {
        // No postcode available, use default delivery time
        setActualDeliveryTime(restaurantSettings?.deliveryTimeSettings?.deliveryTimeMinutes || 45);
      }
    };

    fetchDeliveryTime();
  }, [orderData, tenantData?.id, restaurantSettings?.deliveryTimeSettings?.deliveryTimeMinutes]);

  const handleRedirectToShop = () => {
    router.push(`/${tenantData?.slug || ''}`);
  };

  const copyOrderNumber = async () => {
    if (orderData?.orderNumber) {
      try {
        await navigator.clipboard.writeText(orderData.orderNumber);
        toast({
          title: "Copied!",
          description: "Order number copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Could not copy order number",
          variant: "destructive",
        });
      }
    }
  };

  const getEstimatedReadyTime = () => {
    if (!orderData) return null;
    
    const now = new Date();
    let estimatedTime: Date;
    
    if (orderData.orderType === 'advance' && orderData.scheduledTime) {
      estimatedTime = orderData.scheduledTime;
    } else {
      const timeToAdd = orderData.orderType === 'delivery' 
        ? (actualDeliveryTime || 45) 
        : (restaurantSettings?.collectionTimeSettings?.collectionTimeMinutes || 30);
      estimatedTime = new Date(now.getTime() + timeToAdd * 60000);
    }
    
    return estimatedTime;
  };

  const getTimeRemaining = () => {
    const readyTime = getEstimatedReadyTime();
    if (!readyTime) return null;
    
    const now = new Date();
    const diffMs = readyTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return { expired: true };
    
    const diffMins = Math.ceil(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    return { hours, minutes, expired: false };
  };

  const getOrderMessage = () => {
    if (!orderData) return '';

    const collectionTime = restaurantSettings?.collectionTimeSettings?.collectionTimeMinutes || 30;
    const deliveryTime = actualDeliveryTime || restaurantSettings?.deliveryTimeSettings?.deliveryTimeMinutes || 45;
    const timeRemaining = getTimeRemaining();

    switch (orderData.orderType) {
      case 'collection':
        if (timeRemaining?.expired) {
          return `Your order is ready for collection! Please visit us at your earliest convenience.`;
        }
        return `Your order will be ready for collection in approximately ${collectionTime} minutes.`;
        
      case 'delivery':
        if (timeRemaining?.expired) {
          return `Your delivery should arrive shortly! Our driver is on the way.`;
        }
        return `Your order will be delivered in approximately ${deliveryTime} minutes.`;
        
      case 'advance':
        if (orderData.scheduledTime) {
          const scheduledDate = orderData.scheduledTime.toLocaleDateString();
          const scheduledTime = orderData.scheduledTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          const isToday = orderData.scheduledTime.toDateString() === new Date().toDateString();
          const dayText = isToday ? 'today' : `on ${scheduledDate}`;
          
          if (orderData.advanceFulfillmentType === 'delivery') {
            return `Your advance order is scheduled for delivery ${dayText} at ${scheduledTime}. We'll prepare it fresh and deliver within ${deliveryTime} minutes of the scheduled time.`;
          } else {
            return `Your advance order is scheduled for collection ${dayText} at ${scheduledTime}. Please arrive ${collectionTime} minutes after the scheduled time.`;
          }
        }
        return 'Your advance order has been confirmed and will be prepared at the scheduled time.';
        
      default:
        return 'Thank you for your order! We\'ll have it ready soon.';
    }
  };

  const getOrderIcon = () => {
    const iconClass = "w-12 h-12";
    
    switch (orderData?.orderType) {
      case 'collection':
        return <MapPin className={`${iconClass} text-emerald-500`} />;
      case 'delivery':
        return <Truck className={`${iconClass} text-blue-500`} />;
      case 'advance':
        if (orderData.advanceFulfillmentType === 'delivery') {
          return (
            <div className="relative">
              <Truck className={`${iconClass} text-purple-500`} />
              <Clock className="w-4 h-4 text-purple-600 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          );
        } else {
          return (
            <div className="relative">
              <MapPin className={`${iconClass} text-purple-500`} />
              <Clock className="w-4 h-4 text-purple-600 absolute -top-1 -right-1 bg-white rounded-full" />
            </div>
          );
        }
      default:
        return <Package className={`${iconClass} text-slate-500`} />;
    }
  };

  const getOrderTypeInfo = () => {
    switch (orderData?.orderType) {
      case 'collection':
        return {
          label: 'Collection Order',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          description: 'Ready for pickup'
        };
      case 'delivery':
        return {
          label: 'Delivery Order',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Coming to you'
        };
      case 'advance':
        if (orderData.advanceFulfillmentType === 'delivery') {
          return {
            label: 'Advance Delivery',
            color: 'bg-purple-100 text-purple-800 border-purple-200',
            description: 'Scheduled delivery'
          };
        } else {
          return {
            label: 'Advance Collection',
            color: 'bg-purple-100 text-purple-800 border-purple-200',
            description: 'Scheduled pickup'
          };
        }
      default:
        return {
          label: 'Order',
          color: 'bg-slate-100 text-slate-800 border-slate-200',
          description: 'Processing'
        };
    }
  };

  const currencySymbol = getCurrencySymbol(restaurantSettings?.currency || 'GBP');
  const orderTypeInfo = getOrderTypeInfo();
  const timeRemaining = getTimeRemaining();

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section with Order Success */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Confirmed!</h1>
          <p className="text-slate-600 text-lg">We've received your order and we're getting it ready</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Order Details - Left Column (Full width on mobile) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Order Info Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/70 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      {getOrderIcon()}
                      <div>
                        <Badge className={`${orderTypeInfo.color} border font-medium px-3 py-1 text-sm`}>
                          {orderTypeInfo.label}
                        </Badge>
                        <p className="text-slate-600 text-sm mt-1">{orderTypeInfo.description}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-slate-500">Order #</span>
                        <span className="font-mono font-bold text-slate-900">{orderData.orderNumber}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyOrderNumber}
                          className="h-8 w-8 p-0 hover:bg-slate-100"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-slate-900 mb-2">Hello {orderData.customerName}!</h3>
                    <p className="text-slate-700 leading-relaxed">
                      {getOrderMessage()}
                    </p>
                  </div>

                  {/* Time Tracking */}
                  {timeRemaining && !timeRemaining.expired && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Estimated ready time</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-900">
                            {(timeRemaining.hours || 0) > 0 && `${timeRemaining.hours}h `}
                            {timeRemaining.minutes}m
                          </div>
                          <div className="text-sm text-blue-600">remaining</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scheduled Time for Advance Orders */}
                  {orderData.orderType === 'advance' && orderData.scheduledTime && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Scheduled for</span>
                      </div>
                      <div className="text-lg font-semibold text-purple-900">
                        {orderData.scheduledTime.toLocaleDateString()} at {orderData.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <Button
                onClick={handleRedirectToShop}
                className="h-12 bg-primary hover:bg-primary/90 text-white font-medium transition-all order-1"
                size="lg"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Order Again
              </Button>
              <Button
                onClick={() => router.push(`/${tenantData?.slug || ''}`)}
                variant="outline"
                className="h-12 border-slate-300 hover:bg-slate-50 font-medium transition-all order-2 sm:order-1"
                size="lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Menu
              </Button>
            </motion.div>
          </div>

          {/* Order Summary - Right Column (Full width on mobile) */}
          <div className="space-y-6">
            
            {/* Order Summary Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/70 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-700">Total Amount</span>
                      <span className="text-2xl font-bold text-slate-900">
                        {currencySymbol}{orderData.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Order ID</span>
                      <span className="font-mono">{orderData.orderId.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Placed at</span>
                      <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>

        {/* Floating Background Elements */}
        <AnimatePresence>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="fixed w-2 h-2 bg-blue-200 rounded-full opacity-30 pointer-events-none"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
                y: typeof window !== 'undefined' ? window.innerHeight : 600,
                scale: 0,
              }}
              animate={{
                y: -100,
                scale: [0, 1, 0],
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 4 + Math.random() * 2,
                delay: i * 0.3,
                repeat: Infinity,
                repeatDelay: 8,
              }}
            />
          ))}
        </AnimatePresence>
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

export default function OrderConfirmationPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  
  const { tenantData, isLoading } = useTenant();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant "{tenant}" does not exist.</p>
        </div>
      </div>
    );
  }
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading order confirmation...</p>
        </div>
      </div>
    }>
      <TenantDataProvider>
        <OrderConfirmationContent tenant={tenant} />
      </TenantDataProvider>
    </Suspense>
  );
}
