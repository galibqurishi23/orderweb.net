'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    CheckCircle, 
    Gift, 
    Mail, 
    Phone, 
    MapPin, 
    Clock, 
    CreditCard,
    Package,
    ArrowLeft,
    Download,
    Share2,
    Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderDetails {
    orderNumber: string;
    paymentIntentId: string;
    total: number;
    items: any[];
    customerInfo: any;
    deliveryType: string;
    deliverySpeed?: string;
    giftCards?: any[];
    estimatedTime?: string;
}

export default function ShopOrderConfirmationPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const tenant = params.tenant as string;
    const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [shopSettings, setShopSettings] = useState<any>(null);

    useEffect(() => {
        // Get order details from URL parameters or localStorage
        const orderNumber = searchParams.get('orderNumber');
        const paymentIntentId = searchParams.get('paymentIntentId');
        const total = searchParams.get('total');
        
        if (orderNumber && paymentIntentId && total) {
            // Create order details from URL params
            const details: OrderDetails = {
                orderNumber,
                paymentIntentId,
                total: parseFloat(total),
                items: JSON.parse(searchParams.get('items') || '[]'),
                customerInfo: JSON.parse(searchParams.get('customerInfo') || '{}'),
                deliveryType: searchParams.get('deliveryType') || 'collection',
                deliverySpeed: searchParams.get('deliverySpeed') || undefined,
                giftCards: JSON.parse(searchParams.get('giftCards') || '[]'),
                estimatedTime: searchParams.get('estimatedTime') || undefined
            };
            setOrderDetails(details);
        } else {
            // Try to get from localStorage as fallback
            const storedOrder = localStorage.getItem('lastShopOrder');
            if (storedOrder) {
                setOrderDetails(JSON.parse(storedOrder));
                // Clear from localStorage after retrieving
                localStorage.removeItem('lastShopOrder');
            }
        }
        
        // Load shop settings for styling
        loadShopSettings();
        setLoading(false);
    }, [tenant]);

    const loadShopSettings = async () => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/settings`);
            if (response.ok) {
                const settings = await response.json();
                setShopSettings(settings);
            }
        } catch (error) {
            console.error('Error loading shop settings:', error);
        }
    };

    const getEstimatedDeliveryTime = () => {
        if (!orderDetails) return '';
        
        const now = new Date();
        let minutes = 0;
        
        if (orderDetails.deliveryType === 'delivery') {
            minutes = orderDetails.deliverySpeed === 'express' ? 25 : 50;
            const deliveryTime = new Date(now.getTime() + minutes * 60000);
            return deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (orderDetails.deliveryType === 'collection') {
            return 'Ready for collection';
        } else {
            return 'Instant (Digital)';
        }
    };

    const getDeliveryIcon = () => {
        switch (orderDetails?.deliveryType) {
            case 'delivery': return <MapPin className="w-5 h-5" />;
            case 'collection': return <Package className="w-5 h-5" />;
            case 'email': return <Mail className="w-5 h-5" />;
            default: return <Package className="w-5 h-5" />;
        }
    };

    const copyOrderNumber = () => {
        if (orderDetails?.orderNumber) {
            navigator.clipboard.writeText(orderDetails.orderNumber);
            toast({
                title: "Copied!",
                description: "Order number copied to clipboard",
            });
        }
    };

    const shareOrder = async () => {
        if (navigator.share && orderDetails) {
            try {
                await navigator.share({
                    title: 'Order Confirmation',
                    text: `Order ${orderDetails.orderNumber} confirmed - £${orderDetails.total.toFixed(2)}`,
                    url: window.location.href
                });
            } catch (error) {
                // Fallback to copy
                copyOrderNumber();
            }
        } else {
            copyOrderNumber();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading confirmation...</p>
                </div>
            </div>
        );
    }

    if (!orderDetails) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center p-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                        <p className="text-gray-600 mb-6">We couldn't find your order details.</p>
                        <Button onClick={() => router.push(`/${tenant}/shop`)} className="w-full">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Shop
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const buttonColor = shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#059669';

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                    <p className="text-lg text-gray-600">Thank you for your purchase</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Order Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Order Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Order Details</span>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={copyOrderNumber}
                                        >
                                            <Copy className="w-4 h-4 mr-1" />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={shareOrder}
                                        >
                                            <Share2 className="w-4 h-4 mr-1" />
                                            Share
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Order Number */}
                                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div>
                                            <p className="text-sm font-medium text-green-800">Order Number</p>
                                            <p className="text-lg font-bold text-green-900">{orderDetails.orderNumber}</p>
                                        </div>
                                        <Badge variant="default" className="bg-green-600">
                                            Confirmed
                                        </Badge>
                                    </div>

                                    {/* Items */}
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Items Ordered</h3>
                                        <div className="space-y-3">
                                            {orderDetails.items.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        {item.name.toLowerCase().includes('gift card') ? (
                                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                                <Gift className="w-5 h-5 text-purple-600" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-gray-900">{item.name}</p>
                                                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-semibold text-gray-900">
                                                        £{(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Total */}
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-lg font-semibold text-gray-900">Total Paid</p>
                                            <p className="text-2xl font-bold" style={{ color: buttonColor }}>
                                                £{orderDetails.total.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Delivery Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    {getDeliveryIcon()}
                                    <span className="ml-2">
                                        {orderDetails.deliveryType === 'delivery' ? 'Delivery' :
                                         orderDetails.deliveryType === 'collection' ? 'Collection' : 'Email Delivery'}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {orderDetails.deliveryType === 'delivery' && (
                                        <>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Delivery Address</p>
                                                <p className="text-sm text-gray-600">
                                                    {orderDetails.customerInfo.flatNumber && `${orderDetails.customerInfo.flatNumber}, `}
                                                    {orderDetails.customerInfo.houseNumber} {orderDetails.customerInfo.roadName}<br />
                                                    {orderDetails.customerInfo.city}<br />
                                                    {orderDetails.customerInfo.postcode}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Speed</p>
                                                <Badge variant={orderDetails.deliverySpeed === 'express' ? 'default' : 'secondary'}>
                                                    {orderDetails.deliverySpeed === 'express' ? 'Express' : 'Normal'}
                                                </Badge>
                                            </div>
                                        </>
                                    )}

                                    {orderDetails.deliveryType !== 'delivery' && (
                                        <div className="flex items-center space-x-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    {orderDetails.deliveryType === 'email' ? 'Status' : 'Status'}
                                                </p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {getEstimatedDeliveryTime()}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Customer Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Name</p>
                                            <p className="text-sm text-gray-900">
                                                {orderDetails.customerInfo.recipientName || orderDetails.customerInfo.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Email</p>
                                            <p className="text-sm text-gray-900">
                                                {orderDetails.customerInfo.recipientEmail || orderDetails.customerInfo.email}
                                            </p>
                                        </div>
                                    </div>

                                    {(orderDetails.customerInfo.recipientPhone || orderDetails.customerInfo.phone) && (
                                        <div className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Phone</p>
                                                <p className="text-sm text-gray-900">
                                                    {orderDetails.customerInfo.recipientPhone || orderDetails.customerInfo.phone}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Status</span>
                                        <Badge className="bg-green-600">Paid</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Method</span>
                                        <span className="text-sm font-medium">Card</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Reference</span>
                                        <span className="text-xs font-mono text-gray-500">
                                            {orderDetails.paymentIntentId.substring(0, 12)}...
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button 
                                onClick={() => router.push(`/${tenant}/shop`)} 
                                className="w-full"
                                style={{ backgroundColor: buttonColor }}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Continue Shopping
                            </Button>

                            <Button 
                                variant="outline" 
                                onClick={() => window.print()}
                                className="w-full"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Print Confirmation
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
