'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import StripePaymentProvider from '@/components/payments/StripePaymentProvider';
import { 
    ShoppingCart, 
    Plus, 
    Minus, 
    X, 
    Package, 
    Star, 
    User, 
    Truck, 
    Store,
    Mail,
    Phone,
    ChevronLeft,
    ChevronRight,
    Gift,
    Clock,
    Zap
} from 'lucide-react';

// Types
interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    gallery_images?: string[];
    category_id?: string;
    category?: string;
    is_featured?: boolean;
}

interface CartItem extends ShopItem {
    quantity: number;
}

interface TenantInfo {
    id: string;
    name: string;
    description?: string;
    logo_url?: string;
    phone?: string;
}

interface ShopSettings {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    text_color?: string;
    card_background?: string;
    border_color?: string;
    cover_image_url?: string;
    display_name?: string;
    description?: string;
    logo_url?: string;
    // Gift Card Color Scheme
    gift_card_background_color?: string;
    gift_card_border_color?: string;
    gift_card_button_color?: string;
    gift_card_text_color?: string;
    // Delivery Settings
    delivery_normal_fee?: number;
    delivery_express_fee?: number;
}

interface Category {
    id: string;
    name: string;
}

export default function ShopPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const tenant = params.tenant as string;

    // Utility functions for unified color styling - defined inside component
    const getUnifiedButtonColorLocal = (): string => {
        return shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626';
    };

    const getUnifiedBorderColorLocal = (): string => {
        return shopSettings?.gift_card_border_color || shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626';
    };

    const getButtonStyleLocal = () => ({
        backgroundColor: getUnifiedButtonColorLocal(),
        borderColor: getUnifiedBorderColorLocal()
    });

    // Core state
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [items, setItems] = useState<ShopItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [showCart, setShowCart] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentStep, setCurrentStep] = useState<'cart' | 'customer-info' | 'delivery' | 'payment'>('cart');

    // Dialog states
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    // Order states
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderDetails, setOrderDetails] = useState<any>(null);

    // Header scroll animation state
    const [headerScrolled, setHeaderScrolled] = useState(false);

    // Gift card states
    const [customGiftCardAmount, setCustomGiftCardAmount] = useState<string>('');
    const [selectedGiftCard, setSelectedGiftCard] = useState<number | null>(null);
    const [showBalanceCheck, setShowBalanceCheck] = useState(false);
    const [giftCardCode, setGiftCardCode] = useState<string>('');
    const [giftCardInfo, setGiftCardInfo] = useState<{
        balance: number;
        expiryDate: string;
        cardNumber: string;
        status: string;
    } | null>(null);
    const [checkingBalance, setCheckingBalance] = useState(false);
    const [balanceError, setBalanceError] = useState<string | null>(null);

    // Personal message states
    const [showPersonalMessage, setShowPersonalMessage] = useState(false);
    const [personalMessage, setPersonalMessage] = useState({
        to: '',
        from: '',
        message: ''
    });

    // Customer info and delivery states
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        email: '',
        phone: '',
        houseNumber: '',
        roadName: '',
        city: '',
        postcode: '',
        deliveryInstructions: '',
        recipientName: '',
        recipientEmail: '',
        recipientPhone: '',
        doorName: '',
        flatNumber: ''
    });
    const [deliveryType, setDeliveryType] = useState<'collection' | 'delivery' | 'email'>('collection');
    const [deliverySpeed, setDeliverySpeed] = useState<'normal' | 'express' | null>(null);

    // Payment states
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [showStripePayment, setShowStripePayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Load tenant data
    useEffect(() => {
        const loadTenantData = async () => {
            try {
                // Load tenant info
                const tenantResponse = await fetch(`/api/tenant/${tenant}/info`);
                if (tenantResponse.ok) {
                    const tenantResponseData = await tenantResponse.json();
                    setTenantInfo(tenantResponseData.data || tenantResponseData);
                }

                // Load shop settings
                const settingsResponse = await fetch(`/api/tenant/${tenant}/admin/shop/settings`);
                if (settingsResponse.ok) {
                    const settingsData = await settingsResponse.json();
                    setShopSettings(settingsData);
                }

                // Load items
                const itemsResponse = await fetch(`/api/tenant/${tenant}/admin/shop/items`);
                if (itemsResponse.ok) {
                    const itemsData = await itemsResponse.json();
                    console.log('Items data:', itemsData); // Debug log
                    setItems(itemsData);
                }

                // Load categories
                const categoriesResponse = await fetch(`/api/tenant/${tenant}/admin/shop/categories`);
                if (categoriesResponse.ok) {
                    const categoriesData = await categoriesResponse.json();
                    setCategories(categoriesData);
                }

                setLoading(false);
            } catch (error) {
                console.error('Error loading tenant data:', error);
                setError('Failed to load shop data');
                setLoading(false);
            }
        };

        if (tenant) {
            loadTenantData();
        }
    }, [tenant]);

    // Header scroll animation effect
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const shouldShowScrolled = scrollTop > 50;
            
            if (shouldShowScrolled !== headerScrolled) {
                setHeaderScrolled(shouldShowScrolled);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Check initial scroll position
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [headerScrolled]);

    // Helper functions
    const getBackgroundStyle = (): React.CSSProperties => {
        const primaryColor = shopSettings?.primary_color || '#f3f4f6';
        const secondaryColor = shopSettings?.secondary_color || '#e5e7eb';
        
        return {
            background: `linear-gradient(135deg, ${primaryColor}10 0%, ${secondaryColor}05 100%)`,
            minHeight: '100vh'
        };
    };

    const getButtonStyle = (): React.CSSProperties => {
        // Use gift_card_button_color as the primary button color for all buttons
        const primaryColor = shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#661c0a';
        const secondaryColor = shopSettings?.gift_card_border_color || shopSettings?.secondary_color || '#812d09';
        
        return { 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            color: 'white',
            boxShadow: `${primaryColor}4d 0px 20px 40px, ${secondaryColor}33 0px 8px 16px`,
            border: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '12px',
        };
    };

    // Header animation styles
    const getHeaderStyle = (): React.CSSProperties => {
        const baseStyle = {
            backgroundColor: shopSettings?.card_background || '#ffffff',
            borderColor: shopSettings?.border_color || '#e5e7eb',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'sticky' as const,
            top: 0,
            zIndex: 50,
        };

        if (headerScrolled) {
            // Use gift card button color for header shadow
            const shadowColor = shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#000000';
            return {
                ...baseStyle,
                backgroundColor: `${shopSettings?.card_background || '#ffffff'}f0`,
                backdropFilter: 'blur(10px)',
                borderColor: shopSettings?.border_color || '#e5e7eb',
                boxShadow: `0 4px 20px ${shadowColor}15`,
                transform: 'translateY(0)',
            };
        }

        return baseStyle;
    };

    // Centralized button color function - ALL buttons use gift card button color
    const getUnifiedButtonColor = (): string => {
        return shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626';
    };

    const getUnifiedBorderColor = (): string => {
        return shopSettings?.gift_card_border_color || shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626';
    };

    const getHeaderContentStyle = (): React.CSSProperties => {
        return {
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: headerScrolled ? 'scale(0.95)' : 'scale(1)',
            height: headerScrolled ? '84px' : '96px', // Smart size: 1.5x from original 56px/64px
        };
    };

    const getLogoStyle = (): React.CSSProperties => {
        return {
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: headerScrolled ? 'scale(0.85)' : 'scale(1)',
            height: headerScrolled ? '60px' : '72px', // Smart size: 1.5x from original 40px/48px
            width: headerScrolled ? '60px' : '72px', // Smart size: 1.5x from original 40px/48px
        };
    };

    const getTitleStyle = (): React.CSSProperties => {
        return {
            color: shopSettings?.text_color || '#1f2937',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: headerScrolled ? '1.65rem' : '1.875rem', // Smart size: 1.5x from original 1.1rem/1.25rem
            opacity: headerScrolled ? 0.9 : 1,
        };
    };

    const handleCustomerInfoChange = (field: string, value: string) => {
        setCustomerInfo(prev => ({ ...prev, [field]: value }));
    };

    const handlePersonalMessageChange = (field: string, value: string) => {
        setPersonalMessage(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addToCart = (item: ShopItem) => {
        setCart(prev => {
            const existingItem = prev.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                return prev.map(cartItem =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        
        toast({
            title: "Added to cart",
            description: `${item.name} added to your cart`,
        });
    };

    const addGiftCardToCart = (amount: number) => {
        const giftCardItem: ShopItem = {
            id: `gift-card-${amount}`,
            name: `Gift Card - £${amount}`,
            description: `Digital gift card worth £${amount}`,
            price: amount,
            image_url: '',
            is_featured: false
        };

        setCart(prev => {
            const existingGiftCard = prev.find(cartItem => cartItem.id === giftCardItem.id);
            if (existingGiftCard) {
                return prev.map(cartItem =>
                    cartItem.id === giftCardItem.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...prev, { ...giftCardItem, quantity: 1 }];
        });

        // Visual feedback
        setSelectedGiftCard(amount);
        setTimeout(() => setSelectedGiftCard(null), 800);

        toast({
            title: "Gift Card Added!",
            description: `£${amount} gift card added to your cart`,
        });
    };

    const addCustomGiftCardToCart = () => {
        const amount = parseFloat(customGiftCardAmount);
        if (amount >= 5 && amount <= 500) {
            addGiftCardToCart(amount);
            setCustomGiftCardAmount('');
        }
    };

    const checkGiftCardBalance = async () => {
        if (!giftCardCode.trim()) {
            setBalanceError('Please enter a gift card code');
            return;
        }

        setCheckingBalance(true);
        setBalanceError(null);
        setGiftCardInfo(null);

        try {
            const response = await fetch(`/api/tenant/${tenant}/gift-cards/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: giftCardCode.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setGiftCardInfo({
                    balance: data.balance,
                    expiryDate: data.expiryDate || 'No expiry',
                    cardNumber: data.cardNumber || giftCardCode.trim(),
                    status: data.status || 'Active'
                });
                toast({
                    title: "Gift Card Found",
                    description: `Balance: £${data.balance.toFixed(2)}`,
                });
            } else {
                setBalanceError(data.error || 'Gift card not found');
                toast({
                    title: "Error",
                    description: data.error || 'Gift card not found',
                    variant: "destructive"
                });
            }
        } catch (error) {
            setBalanceError('Unable to check balance. Please try again.');
            toast({
                title: "Error",
                description: 'Unable to check balance. Please try again.',
                variant: "destructive"
            });
        } finally {
            setCheckingBalance(false);
        }
    };

    const handleBalanceCheckClose = () => {
        setShowBalanceCheck(false);
        setGiftCardCode('');
        setGiftCardInfo(null);
        setBalanceError(null);
    };

    // Payment handler functions
    const handlePaymentSuccess = async (paymentIntentId: string) => {
        setPaymentSuccess(true);
        setShowStripePayment(false);
        setPaymentLoading(false);
        setOrderSuccess(true);
        setCheckoutOpen(false);
        
        // Generate order number
        const orderNumber = `SHOP-${Date.now()}`;
        
        try {
            // Process gift cards in the cart
            const giftCards = cart.filter(item => 
                item.category === 'gift-cards' || 
                item.name.toLowerCase().includes('gift card')
            );
            
            // Create gift card orders and send emails
            for (const giftCard of giftCards) {
                for (let i = 0; i < giftCard.quantity; i++) {
                    console.log('🎁 Creating gift card order:', giftCard.name);
                    
                    const giftCardData = {
                        amount: giftCard.price,
                        card_type: 'digital',
                        customer_name: customerInfo.name || customerInfo.recipientName,
                        customer_email: customerInfo.email || customerInfo.recipientEmail,
                        customer_phone: customerInfo.phone || customerInfo.recipientPhone,
                        recipient_name: customerInfo.recipientName || customerInfo.name,
                        recipient_email: customerInfo.recipientEmail || customerInfo.email,
                        personal_message: personalMessage.message || 'Thank you for your purchase!'
                    };

                    const response = await fetch(`/api/tenant/${tenant}/gift-cards/purchase`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(giftCardData)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log('✅ Gift card order created and email sent:', result.gift_card_number);
                    } else {
                        console.error('❌ Failed to create gift card order');
                    }
                }
            }
            
            // Create shop order for non-gift-card items
            const regularItems = cart.filter(item => 
                item.category !== 'gift-cards' && 
                !item.name.toLowerCase().includes('gift card')
            );
            
            if (regularItems.length > 0) {
                const shopOrderData = {
                    cart: regularItems, // Fixed: changed from 'items' to 'cart' to match API expectation
                    customerInfo,
                    orderType: deliveryType,
                    deliverySpeed: deliverySpeed,
                    paymentIntentId,
                    total: regularItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                };
                
                const shopOrderResponse = await fetch(`/api/tenant/${tenant}/shop/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(shopOrderData)
                });
                
                if (shopOrderResponse.ok) {
                    const shopResult = await shopOrderResponse.json();
                    console.log('✅ Shop order created:', shopResult.order_number);
                } else {
                    const errorData = await shopOrderResponse.json().catch(() => ({}));
                    console.error('❌ Failed to create shop order:', {
                        status: shopOrderResponse.status,
                        statusText: shopOrderResponse.statusText,
                        error: errorData
                    });
                }
            }
            
        } catch (error) {
            console.error('Error processing orders after payment:', error);
            // Don't fail the payment success, but log the error
        }
        
        // Clear cart
        setCart([]);
        
        toast({
            title: "Payment Successful!",
            description: "Your order has been placed successfully. Redirecting to confirmation...",
        });

        // Prepare order confirmation data
        const confirmationData = {
            orderNumber,
            paymentIntentId,
            total: getTotalPrice(),
            items: cart,
            customerInfo,
            deliveryType,
            deliverySpeed,
            giftCards: cart.filter(item => 
                item.category === 'gift-cards' || 
                item.name.toLowerCase().includes('gift card')
            ),
            estimatedTime: deliveryType === 'delivery' 
                ? (deliverySpeed === 'express' ? '25 minutes' : '50 minutes')
                : deliveryType === 'collection' 
                ? '15 minutes' 
                : 'Instant'
        };

        // Store in localStorage as fallback
        localStorage.setItem('lastShopOrder', JSON.stringify(confirmationData));

        // Redirect to confirmation page with URL parameters
        const searchParams = new URLSearchParams({
            orderNumber,
            paymentIntentId,
            total: getTotalPrice().toString(),
            items: JSON.stringify(cart),
            customerInfo: JSON.stringify(customerInfo),
            deliveryType,
            deliverySpeed: deliverySpeed || '',
            giftCards: JSON.stringify(confirmationData.giftCards),
            estimatedTime: confirmationData.estimatedTime
        });

        router.push(`/${tenant}/shop/order-confirmation?${searchParams.toString()}`);
    };

    const handlePaymentError = (error: string) => {
        setPaymentError(error);
        setPaymentLoading(false);
        toast({
            title: "Payment Failed",
            description: error,
            variant: "destructive"
        });
    };

    const handlePaymentCancel = () => {
        setShowStripePayment(false);
        setPaymentLoading(false);
        setPaymentError(null);
    };

    const startPayment = async () => {
        setPaymentLoading(true);
        setPaymentError(null);
        
        try {
            // Check if Stripe is configured before proceeding
            const configResponse = await fetch(`/api/tenant/${tenant}/payments/stripe`);
            if (!configResponse.ok) {
                throw new Error('Failed to load payment configuration');
            }
            
            const config = await configResponse.json();
            if (!config.configured || !config.publishableKey) {
                throw new Error('Payment system not configured. Please contact the restaurant administrator.');
            }
            
            setShowStripePayment(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment system error';
            setPaymentError(errorMessage);
            setPaymentLoading(false);
            toast({
                title: "Payment Unavailable",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    const updateCartQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }

        setCart(prev => 
            prev.map(item => 
                item.id === itemId ? { ...item, quantity } : item
            )
        );
    };

    // Helper function to safely parse delivery fees
    const getDeliveryFee = (feeValue: string | number | undefined, defaultValue: number): number => {
        if (typeof feeValue === 'string') {
            return parseFloat(feeValue) || defaultValue;
        }
        return feeValue || defaultValue;
    };

    const getTotalPrice = () => {
        const itemsTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        let deliveryFee = 0;
        
        if (deliveryType === 'delivery' && deliverySpeed) {
            if (deliverySpeed === 'normal') {
                deliveryFee = getDeliveryFee(shopSettings?.delivery_normal_fee, 2.50);
            } else if (deliverySpeed === 'express') {
                deliveryFee = getDeliveryFee(shopSettings?.delivery_express_fee, 4.50);
            }
        }
        
        return itemsTotal + deliveryFee;
    };

    // Get filtered items
    const filteredItems = items.filter(item => {
        const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
        const matchesSearch = !searchTerm || 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Simple image gallery component for product images
    const ProductImageGallery = ({ images, className }: { images: string[], className?: string }) => {
        const [currentIndex, setCurrentIndex] = useState(0);
        
        if (!images || images.length === 0) {
            return (
                <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
                    <Package className="w-16 h-16 text-gray-400" />
                </div>
            );
        }

        return (
            <div className={`relative ${className}`}>
                <img 
                    src={images[currentIndex]} 
                    alt="Product" 
                    className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : images.length - 1)}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentIndex(prev => prev < images.length - 1 ? prev + 1 : 0)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                            {currentIndex + 1} / {images.length}
                        </div>
                    </>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
                    <p className="mt-4 text-gray-600">Loading shop...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 text-xl">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* CSS Animations */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
                
                @keyframes bounce {
                    0%, 20%, 53%, 80%, 100% {
                        transform: translate3d(0,0,0);
                    }
                    40%, 43% {
                        transform: translate3d(0,-15px,0);
                    }
                    70% {
                        transform: translate3d(0,-7px,0);
                    }
                    90% {
                        transform: translate3d(0,-2px,0);
                    }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .fade-in-up {
                    animation: fadeInUp 0.6s ease-out;
                }
            `}</style>
            
            <div className="min-h-screen" style={getBackgroundStyle()}>
            {/* Animated Header */}
            <header 
                className="border-b" 
                style={getHeaderStyle()}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div 
                        className="flex items-center"
                        style={getHeaderContentStyle()}
                    >
                        {/* Dynamic Layout based on available content - ONLY from shopSettings */}
                        {/* If both logo and name exist in shopSettings, use 3-column layout */}
                        {shopSettings?.logo_url && shopSettings?.display_name ? (
                            <>
                                {/* Left: Restaurant Name */}
                                <div className="flex-1">
                                    <h1 
                                        className="font-bold" 
                                        style={getTitleStyle()}
                                    >
                                        {shopSettings.display_name}
                                    </h1>
                                    {shopSettings?.description && (
                                        <p 
                                            className="text-sm text-gray-600"
                                            style={{
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                opacity: headerScrolled ? 0.7 : 1,
                                                fontSize: headerScrolled ? '1.2rem' : '1.3125rem' // Smart size: 1.5x from original 0.8rem/0.875rem
                                            }}
                                        >
                                            {shopSettings.description}
                                        </p>
                                    )}
                                </div>

                                {/* Center: Logo */}
                                <div className="flex-shrink-0 mx-8">
                                    <div className="relative overflow-hidden rounded-full">
                                        <img 
                                            src={shopSettings.logo_url} 
                                            alt={`${shopSettings.display_name} logo`}
                                            className="object-contain"
                                            style={getLogoStyle()}
                                        />
                                        {headerScrolled && (
                                            <div 
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                    background: `radial-gradient(circle, ${shopSettings?.primary_color || '#3b82f6'}20 0%, transparent 70%)`,
                                                    animation: 'pulse 2s infinite'
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Right: Cart Button */}
                                <div className="flex-1 flex justify-end">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowCart(true)}
                                        className="relative"
                                        style={{
                                            ...getButtonStyleLocal(),
                                            transform: headerScrolled ? 'scale(0.95)' : 'scale(1)',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <ShoppingCart className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                                        <span style={{
                                            transition: 'all 0.4s ease',
                                            fontSize: headerScrolled ? '0.875rem' : '1rem', // Smaller: reduced from 1.275rem/1.5rem
                                            color: 'white' // White text color
                                        }}>
                                            {cart.length} • £{getTotalPrice().toFixed(2)}
                                        </span>
                                        {cart.length > 0 && (
                                            <Badge 
                                                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                                                style={{ 
                                                    backgroundColor: shopSettings?.accent_color || '#f97316',
                                                    transform: headerScrolled ? 'scale(0.9)' : 'scale(1)',
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    animation: cart.length > 0 ? 'bounce 1s' : 'none'
                                                }}
                                            >
                                                {cart.reduce((total, item) => total + item.quantity, 0)}
                                            </Badge>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (shopSettings?.logo_url || shopSettings?.display_name) ? (
                            /* If only name or only logo exists in shopSettings, use 2-column layout */
                            <>
                                {/* Left: Name or Logo */}
                                <div className="flex-1 flex items-center">
                                    {shopSettings?.logo_url && (
                                        <div className="flex-shrink-0 mr-4">
                                            <div className="relative overflow-hidden rounded-full">
                                                <img 
                                                    src={shopSettings.logo_url} 
                                                    alt="Restaurant logo"
                                                    className="object-contain"
                                                    style={getLogoStyle()}
                                                />
                                                {headerScrolled && (
                                                    <div 
                                                        className="absolute inset-0 rounded-full"
                                                        style={{
                                                            background: `radial-gradient(circle, ${shopSettings?.primary_color || '#3b82f6'}20 0%, transparent 70%)`,
                                                            animation: 'pulse 2s infinite'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {shopSettings?.display_name && (
                                        <div>
                                            <h1 
                                                className="font-bold" 
                                                style={getTitleStyle()}
                                            >
                                                {shopSettings.display_name}
                                            </h1>
                                            {shopSettings?.description && (
                                                <p 
                                                    className="text-sm text-gray-600"
                                                    style={{
                                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        opacity: headerScrolled ? 0.7 : 1,
                                                        fontSize: headerScrolled ? '1.2rem' : '1.3125rem' // Smart size: 1.5x from original 0.8rem/0.875rem
                                                    }}
                                                >
                                                    {shopSettings.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Cart Button */}
                                <div className="flex justify-end">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setShowCart(true)}
                                        className="relative"
                                        style={{
                                            ...getButtonStyleLocal(),
                                            transform: headerScrolled ? 'scale(0.95)' : 'scale(1)',
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <ShoppingCart className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                                        <span style={{
                                            transition: 'all 0.4s ease',
                                            fontSize: headerScrolled ? '0.875rem' : '1rem', // Smaller: reduced from 1.275rem/1.5rem
                                            color: 'white' // White text color
                                        }}>
                                            {cart.length} • £{getTotalPrice().toFixed(2)}
                                        </span>
                                        {cart.length > 0 && (
                                            <Badge 
                                                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                                                style={{ 
                                                    backgroundColor: shopSettings?.accent_color || '#f97316',
                                                    transform: headerScrolled ? 'scale(0.9)' : 'scale(1)',
                                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    animation: cart.length > 0 ? 'bounce 1s' : 'none'
                                                }}
                                            >
                                                {cart.reduce((total, item) => total + item.quantity, 0)}
                                            </Badge>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            /* If no shopSettings data, show only cart button */
                            <div className="w-full flex justify-end">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setShowCart(true)}
                                    className="relative"
                                    style={{
                                        ...getButtonStyleLocal(),
                                        transform: headerScrolled ? 'scale(0.95)' : 'scale(1)',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    <ShoppingCart className="w-4 h-4 mr-2" style={{ color: 'white' }} />
                                    <span style={{
                                        transition: 'all 0.4s ease',
                                        fontSize: headerScrolled ? '0.875rem' : '1rem', // Smaller: reduced from 1.275rem/1.5rem
                                        color: 'white' // White text color
                                    }}>
                                        {cart.length} • £{getTotalPrice().toFixed(2)}
                                    </span>
                                    {cart.length > 0 && (
                                        <Badge 
                                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                                            style={{ 
                                                backgroundColor: shopSettings?.accent_color || '#f97316',
                                                transform: headerScrolled ? 'scale(0.9)' : 'scale(1)',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                animation: cart.length > 0 ? 'bounce 1s' : 'none'
                                            }}
                                        >
                                            {cart.reduce((total, item) => total + item.quantity, 0)}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Cover Image with Parallax Effect */}
            {shopSettings?.cover_image_url && (
                <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
                    <div 
                        className="absolute inset-0 bg-cover bg-center bg-fixed"
                        style={{
                            backgroundImage: `url(${shopSettings.cover_image_url})`,
                            transform: headerScrolled ? 'scale(1.05)' : 'scale(1)',
                            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>
            )}

            {/* Gift Cards Section */}
            <div className="bg-gray-50 py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header with Scroll Animation */}
                    <div className="text-center mb-12 fade-in-up">
                        {/* Gift Icon */}
                        <div className="flex justify-center mb-6">
                            <div 
                                className="w-16 h-16 rounded-full flex items-center justify-center transform transition-all duration-500 hover:scale-110 hover:rotate-12"
                                style={{ 
                                    backgroundColor: shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626',
                                    boxShadow: `0 10px 30px ${(shopSettings?.gift_card_button_color || shopSettings?.primary_color || '#dc2626')}40`
                                }}
                            >
                                <Gift className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        
                        {/* Title */}
                        <h2 
                            className="text-3xl font-bold mb-4 transform transition-all duration-700"
                            style={{ 
                                color: shopSettings?.text_color || '#1f2937',
                                animation: 'fadeInUp 0.8s ease-out 0.2s both'
                            }}
                        >
                            Gift Cards
                        </h2>
                        
                        {/* Description */}
                        <p 
                            className="text-lg text-gray-600 max-w-2xl mx-auto transform transition-all duration-700"
                            style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
                        >
                            Treat your loved ones to delicious flavors and memorable meals
                        </p>
                    </div>

                    {/* Unified Gift Cards Container */}
                    <div 
                        className="rounded-lg shadow-lg p-8"
                        style={{ backgroundColor: shopSettings?.gift_card_background_color || '#ffffff' }}
                    >
                        {/* Preset Gift Card Options */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[25, 50, 75, 100].map((amount, index) => (
                                <div 
                                    key={amount}
                                    className="cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                                    onClick={() => addGiftCardToCart(amount)}
                                    style={{ 
                                        animation: `fadeInUp 0.6s ease-out ${0.1 * (index + 1)}s both`
                                    }}
                                >
                                    <div 
                                        className={`bg-white rounded-lg p-6 text-center border-2 transition-all duration-300 hover:shadow-xl ${
                                            selectedGiftCard === amount ? 'border-green-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        style={{
                                            boxShadow: selectedGiftCard === amount 
                                                ? `0 10px 30px ${(shopSettings?.gift_card_button_color || '#dc2626')}30` 
                                                : undefined
                                        }}
                                    >
                                        {/* Success checkmark */}
                                        {selectedGiftCard === amount && (
                                            <div className="flex justify-center mb-2">
                                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div 
                                            className="text-2xl font-bold mb-4 transition-all duration-300"
                                            style={{ 
                                                color: shopSettings?.gift_card_text_color || shopSettings?.primary_color || '#dc2626',
                                                transform: selectedGiftCard === amount ? 'scale(1.1)' : 'scale(1)'
                                            }}
                                        >
                                            £{amount}
                                        </div>
                                        <Button 
                                            className="w-full py-2 font-semibold rounded-md text-white transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                                            style={selectedGiftCard === amount ? {
                                                backgroundColor: '#10b981',
                                                borderColor: '#10b981'
                                            } : {
                                                backgroundColor: getUnifiedButtonColorLocal(),
                                                borderColor: getUnifiedBorderColorLocal()
                                            }}
                                        >
                                            {selectedGiftCard === amount ? 'Added!' : 'Add to Cart'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Separator */}
                        <div className="relative mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-6 py-2 bg-white text-gray-600 text-base font-medium italic rounded-full shadow-sm border border-gray-100">
                                    Or choose your own amount
                                </span>
                            </div>
                        </div>

                        {/* Custom Amount Section */}
                        <div className="max-w-lg mx-auto">
                            <div 
                                className="rounded-lg p-10"
                                style={{ backgroundColor: shopSettings?.gift_card_background_color || '#f9fafb' }}
                            >
                                <h3 
                                    className="text-2xl font-bold text-center mb-3"
                                    style={{ color: shopSettings?.gift_card_text_color || shopSettings?.text_color || '#1f2937' }}
                                >
                                    Custom Amount
                                </h3>
                                <p className="text-gray-600 text-center mb-6 text-base">
                                    Enter your preferred gift card amount
                                </p>
                                
                                <div className="space-y-6">
                                    <div className="relative">
                                        <div 
                                            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold"
                                            style={{ color: shopSettings?.gift_card_text_color || shopSettings?.primary_color || '#dc2626' }}
                                        >
                                            £
                                        </div>
                                        <Input
                                            type="number"
                                            min="5"
                                            max="500"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={customGiftCardAmount}
                                            onChange={(e) => setCustomGiftCardAmount(e.target.value)}
                                            className="pl-12 pr-6 py-5 text-2xl text-center font-semibold rounded-lg border-2 focus:border-2"
                                            style={{
                                                borderColor: customGiftCardAmount && parseFloat(customGiftCardAmount) >= 5 && parseFloat(customGiftCardAmount) <= 500
                                                    ? (shopSettings?.gift_card_border_color || shopSettings?.primary_color || '#dc2626')
                                                    : '#d1d5db',
                                            }}
                                        />
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 text-center">
                                        Minimum £5 - Maximum £500
                                    </p>
                                    
                                    <Button 
                                        onClick={addCustomGiftCardToCart}
                                        className="w-full py-4 text-lg font-semibold rounded-lg text-white"
                                        disabled={!customGiftCardAmount || parseFloat(customGiftCardAmount) < 5 || parseFloat(customGiftCardAmount) > 500}
                                        style={(!customGiftCardAmount || parseFloat(customGiftCardAmount) < 5 || parseFloat(customGiftCardAmount) > 500) 
                                            ? {
                                                backgroundColor: '#9ca3af',
                                                borderColor: '#9ca3af'
                                            }
                                            : getButtonStyleLocal()
                                        }
                                    >
                                        {customGiftCardAmount && parseFloat(customGiftCardAmount) >= 5 && parseFloat(customGiftCardAmount) <= 500
                                            ? `Add £${parseFloat(customGiftCardAmount).toFixed(2)} Gift Card`
                                            : 'Enter Valid Amount'
                                        }
                                    </Button>
                                    
                                    {/* Check Balance Button */}
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <Button 
                                            onClick={() => setShowBalanceCheck(true)}
                                            variant="outline"
                                            className="w-full py-3 text-base font-medium rounded-lg border-2"
                                            style={{
                                                borderColor: getUnifiedBorderColorLocal(),
                                                color: shopSettings?.gift_card_text_color || getUnifiedButtonColorLocal(),
                                            }}
                                        >
                                            Check Gift Card Balance
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Section - Only show if items exist */}
            {items.length > 0 && (
                <div className="bg-white py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header with Animation */}
                        <div className="text-center mb-16 fade-in-up">
                            <h2 
                                className="text-4xl font-bold mb-4 transform transition-all duration-700"
                                style={{ 
                                    color: shopSettings?.text_color || '#1f2937',
                                    animation: 'fadeInUp 0.8s ease-out 0.2s both'
                                }}
                            >
                                Our Products
                            </h2>
                            <p 
                                className="text-lg text-gray-600 max-w-2xl mx-auto transform transition-all duration-700"
                                style={{ animation: 'fadeInUp 0.8s ease-out 0.4s both' }}
                            >
                                Explore our selection of premium quality products and specialty items
                            </p>
                        </div>

                        {/* Items Grid with Staggered Animation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {items.map((item: ShopItem, index: number) => (
                                <div 
                                    key={item.id}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 overflow-hidden border border-gray-100 group"
                                    style={{ 
                                        animation: `fadeInUp 0.6s ease-out ${0.1 * (index + 1)}s both`
                                    }}
                                >
                                    {/* Item Image with Hover Effects */}
                                    <div className="relative h-48 overflow-hidden">
                                        {item.image_url ? (
                                            <img 
                                                src={item.image_url} 
                                                alt={item.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={() => console.log('Image failed to load:', item.image_url)}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-300">
                                                <Package className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors duration-300" />
                                            </div>
                                        )}
                                        {item.is_featured && (
                                            <div className="absolute top-3 left-3">
                                                <div 
                                                    className="px-3 py-1 rounded-full text-xs font-semibold text-white animate-pulse"
                                                    style={{ 
                                                        backgroundColor: shopSettings?.accent_color || '#f97316',
                                                        boxShadow: `0 4px 15px ${(shopSettings?.accent_color || '#f97316')}40`
                                                    }}
                                                >
                                                    Featured
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>

                                    {/* Item Content with Hover Effects */}
                                    <div className="p-6 group-hover:bg-gray-50 transition-colors duration-300">
                                        <h3 
                                            className="text-xl font-bold mb-2 line-clamp-1 group-hover:text-opacity-90 transition-all duration-300"
                                            style={{ color: shopSettings?.text_color || '#1f2937' }}
                                        >
                                            {item.name}
                                        </h3>
                                        
                                        {item.description && (
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
                                                {item.description}
                                            </p>
                                        )}
                                        
                                        <div className="flex items-center justify-between">
                                            <div 
                                                className="text-2xl font-bold transition-all duration-300 group-hover:scale-110"
                                                style={{ color: shopSettings?.primary_color || '#dc2626' }}
                                            >
                                                £{Number(item.price).toFixed(2)}
                                            </div>
                                            
                                            <Button 
                                                onClick={() => addToCart(item)}
                                                className="px-6 py-2 font-semibold rounded-lg text-white transition-all duration-300 hover:scale-110 hover:shadow-lg transform"
                                                style={{
                                                    backgroundColor: getUnifiedButtonColorLocal(),
                                                    borderColor: getUnifiedBorderColorLocal(),
                                                    boxShadow: `0 4px 15px ${getUnifiedButtonColorLocal()}30`
                                                }}
                                            >
                                                Add to Cart
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Empty State - This won't show due to the condition above, but keeping for completeness */}
                        {items.length === 0 && (
                            <div className="text-center py-12">
                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 text-lg">No items available at the moment</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cart Dialog */}
            <Dialog open={showCart} onOpenChange={setShowCart}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Your Cart</DialogTitle>
                    </DialogHeader>
                    
                    {cart.length === 0 ? (
                        <div className="text-center py-8">
                            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Your cart is empty</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="flex items-center justify-between border-b pb-4">
                                    <div className="flex-1">
                                        <h4 className="font-semibold">{item.name}</h4>
                                        <p className="text-sm text-gray-600">£{parseFloat(String(item.price)).toFixed(2)} each</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                        >
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => removeFromCart(item.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>£{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                {deliveryType === 'delivery' && (
                                    <div className="flex justify-between">
                                        <span>Delivery:</span>
                                        <span>£2.50</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total:</span>
                                    <span>£{getTotalPrice().toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <Button
                                onClick={() => {
                                    setShowCart(false);
                                    setCheckoutOpen(true);
                                    setCurrentStep('delivery');
                                }}
                                className="w-full"
                                style={getButtonStyleLocal()}
                            >
                                Proceed to Checkout
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Checkout Dialog */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Checkout</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        {/* Customer Information Section */}
                        {currentStep === 'customer-info' && (
                            <Card className="backdrop-blur-sm bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-3 text-emerald-700">
                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                            <User className="w-5 h-5" />
                                        </div>
                                        Customer Information
                                    </CardTitle>
                                    <CardDescription className="text-emerald-600">
                                        Please provide your details for the order
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="customer-name">Full Name *</Label>
                                            <Input
                                                id="customer-name"
                                                placeholder="Your full name"
                                                value={customerInfo.name}
                                                onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
                                                className="focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="customer-phone">Phone Number</Label>
                                            <Input
                                                id="customer-phone"
                                                type="tel"
                                                placeholder="Your phone number"
                                                value={customerInfo.phone}
                                                onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
                                                className="focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="customer-email">Email Address *</Label>
                                        <Input
                                            id="customer-email"
                                            type="email"
                                            placeholder="your.email@example.com"
                                            value={customerInfo.email}
                                            onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
                                            className="focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    
                                    <div className="flex justify-between pt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCheckoutOpen(false)}
                                        >
                                            Back to Cart
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentStep('delivery')}
                                            disabled={!customerInfo.name || !customerInfo.email}
                                            style={getButtonStyleLocal()}
                                        >
                                            Continue to Delivery
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Delivery Information Section */}
                        {currentStep === 'delivery' && (
                            <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                                <CardHeader className="pb-4 bg-gray-50 border-b border-gray-100">
                                    <CardTitle className="flex items-center gap-3 text-gray-900 text-lg font-bold">
                                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                                            <Truck className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <div>
                                            <div>Delivery Information</div>
                                            <div className="text-xs font-normal text-gray-500 mt-1">Step 1 of 2</div>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 p-4">
                                    {/* Personal Message Section */}
                                    {(() => {
                                        const hasGiftCards = cart.some(item => 
                                            item.category === 'gift-cards' || 
                                            item.name.toLowerCase().includes('gift card')
                                        );
                                        
                                        if (!hasGiftCards) return null;
                                        
                                        return (
                                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <button
                                                    onClick={() => setShowPersonalMessage(true)}
                                                    className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-all duration-300"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-amber-100 rounded-lg">
                                                            <Gift className="w-5 h-5 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900">Add Personal Message</h3>
                                                            <p className="text-xs text-gray-600">Include a message with your gift card</p>
                                                        </div>
                                                    </div>
                                                    <div className="p-1 rounded-lg bg-gray-100">
                                                        <Plus className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })()}
                                    {/* Delivery Type Selection */}
                                    <div className="space-y-4">
                                        <div className="border-b border-gray-100 pb-2">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                                                Choose Delivery Method
                                            </h3>
                                        </div>
                                        
                                        {/* Check if cart has gift cards or regular items */}
                                        {(() => {
                                            const hasGiftCards = cart.some(item => 
                                                item.category === 'gift-cards' || 
                                                item.name.toLowerCase().includes('gift card')
                                            );

                                            return (
                                                <div className="space-y-3">
                                                    {/* Email Collection - Only for Gift Cards */}
                                                    {hasGiftCards && (
                                                        <button
                                                            onClick={() => setDeliveryType('email')}
                                                            className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                                                                deliveryType === 'email' 
                                                                    ? 'border-gray-800 bg-gray-50 shadow-md' 
                                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`p-2 rounded-lg shadow-sm transition-all duration-300 ${
                                                                        deliveryType === 'email' 
                                                                            ? 'bg-gray-800 text-white' 
                                                                            : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        <Mail className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">Email Collection</div>
                                                                        <div className="text-xs text-gray-600">Digital delivery to inbox</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-sm font-bold text-green-600">FREE</div>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    )}

                                                    {/* Collection - Available for all products */}
                                                    <button
                                                        onClick={() => setDeliveryType('collection')}
                                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                                                            deliveryType === 'collection' 
                                                                ? 'border-gray-800 bg-gray-50 shadow-md' 
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className={`p-2 rounded-lg shadow-sm transition-all duration-300 ${
                                                                    deliveryType === 'collection' 
                                                                        ? 'bg-gray-800 text-white' 
                                                                        : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    <Store className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900">Collection</div>
                                                                    <div className="text-xs text-gray-600">Pick up from restaurant</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-green-600">FREE</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                    
                                                    {/* Delivery Options - Available for all products */}
                                                    <button
                                                        onClick={() => setDeliveryType('delivery')}
                                                        className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-300 ${
                                                            deliveryType === 'delivery' 
                                                                ? 'border-gray-800 bg-gray-50 shadow-md' 
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-3">
                                                                <div className={`p-2 rounded-lg shadow-sm transition-all duration-300 ${
                                                                    deliveryType === 'delivery' 
                                                                        ? 'bg-gray-800 text-white' 
                                                                        : 'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    <Truck className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-900">Home Delivery</div>
                                                                    <div className="text-xs text-gray-600">To your doorstep</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs font-medium text-gray-700">Choose speed →</div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Delivery Speed Selection */}
                                    {deliveryType === 'delivery' && (
                                        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b border-gray-200">
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                                                    Select Delivery Speed
                                                </h3>
                                            </div>
                                            <div className="p-3 space-y-3">
                                                <button
                                                    onClick={() => setDeliverySpeed('normal')}
                                                    className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-300 ${
                                                        deliverySpeed === 'normal' 
                                                            ? 'border-gray-800 bg-gray-50 shadow-md' 
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-2 rounded-lg ${
                                                                deliverySpeed === 'normal' 
                                                                    ? 'bg-gray-800 text-white' 
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                <Clock className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">Normal Delivery</div>
                                                                <div className="text-xs text-gray-600">2-3 days delivery</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold text-gray-900">
                                                                £{getDeliveryFee(shopSettings?.delivery_normal_fee, 2.50).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                                
                                                <button
                                                    onClick={() => setDeliverySpeed('express')}
                                                    className={`w-full p-3 rounded-lg border-2 text-left transition-all duration-300 ${
                                                        deliverySpeed === 'express' 
                                                            ? 'border-gray-800 bg-gray-50 shadow-md' 
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-2 rounded-lg ${
                                                                deliverySpeed === 'express' 
                                                                    ? 'bg-gray-800 text-white' 
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                <Zap className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900 flex items-center gap-2">
                                                                    Express Delivery
                                                                    <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">FAST</span>
                                                                </div>
                                                                <div className="text-xs text-gray-600">Order before 3pm for Next day delivery</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold text-gray-900">
                                                                £{getDeliveryFee(shopSettings?.delivery_express_fee, 4.50).toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-gray-600">Premium option</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recipient Information for Email Collection */}
                                    {deliveryType === 'email' && (
                                        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b border-gray-200">
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                                                    Email Recipient Details
                                                </h3>
                                            </div>
                                            
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <Label htmlFor="recipient-name" className="text-sm font-bold text-gray-700 mb-1 block">Recipient's Full Name *</Label>
                                                    <Input
                                                        id="recipient-name"
                                                        placeholder="Enter recipient's full name"
                                                        value={customerInfo.recipientName}
                                                        onChange={(e) => handleCustomerInfoChange('recipientName', e.target.value)}
                                                        className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="recipient-email" className="text-sm font-bold text-gray-700 mb-1 block">Recipient's Email Address *</Label>
                                                    <Input
                                                        id="recipient-email"
                                                        type="email"
                                                        placeholder="recipient@example.com"
                                                        value={customerInfo.recipientEmail}
                                                        onChange={(e) => handleCustomerInfoChange('recipientEmail', e.target.value)}
                                                        className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    />
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-start gap-2">
                                                        <Mail className="w-4 h-4 text-gray-600 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">Digital Delivery</p>
                                                            <p className="text-xs text-gray-700">Gift card sent instantly to recipient's email</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recipient Information for Collection */}
                                    {deliveryType === 'collection' && (
                                        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b border-gray-200">
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                                                    Collection Information
                                                </h3>
                                            </div>
                                            
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <Label htmlFor="collection-name" className="text-sm font-bold text-gray-700 mb-1 block">Full Name for Collection *</Label>
                                                    <Input
                                                        id="collection-name"
                                                        placeholder="Enter name for pickup"
                                                        value={customerInfo.recipientName}
                                                        onChange={(e) => handleCustomerInfoChange('recipientName', e.target.value)}
                                                        className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="collection-email" className="text-sm font-bold text-gray-700 mb-1 block">Email Address *</Label>
                                                    <Input
                                                        id="collection-email"
                                                        type="email"
                                                        placeholder="your@example.com"
                                                        value={customerInfo.recipientEmail}
                                                        onChange={(e) => handleCustomerInfoChange('recipientEmail', e.target.value)}
                                                        className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="collection-phone" className="text-sm font-bold text-gray-700 mb-1 block">Phone Number *</Label>
                                                    <Input
                                                        id="collection-phone"
                                                        type="tel"
                                                        placeholder="Your phone number"
                                                        value={customerInfo.recipientPhone}
                                                        onChange={(e) => handleCustomerInfoChange('recipientPhone', e.target.value)}
                                                        className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                    />
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-start gap-2">
                                                        <Store className="w-4 h-4 text-gray-600 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">Pickup Information</p>
                                                            <p className="text-xs text-gray-700">We'll notify you when ready. Bring valid ID.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Address Fields for Delivery */}
                                    {deliveryType === 'delivery' && deliverySpeed && (
                                        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b border-gray-200">
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">4</span>
                                                    Delivery Details
                                                </h3>
                                            </div>
                                            
                                            <div className="p-4 space-y-4">
                                                {/* Contact Information */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">Contact Information</h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <Label htmlFor="delivery-name" className="text-sm font-bold text-gray-700 mb-1 block">Recipient's Full Name *</Label>
                                                            <Input
                                                                id="delivery-name"
                                                                placeholder="Enter recipient's full name"
                                                                value={customerInfo.recipientName}
                                                                onChange={(e) => handleCustomerInfoChange('recipientName', e.target.value)}
                                                                className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <Label htmlFor="delivery-email" className="text-sm font-bold text-gray-700 mb-1 block">Email Address *</Label>
                                                                <Input
                                                                    id="delivery-email"
                                                                    type="email"
                                                                    placeholder="recipient@example.com"
                                                                    value={customerInfo.recipientEmail}
                                                                    onChange={(e) => handleCustomerInfoChange('recipientEmail', e.target.value)}
                                                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="delivery-phone" className="text-sm font-bold text-gray-700 mb-1 block">Phone Number *</Label>
                                                                <Input
                                                                    id="delivery-phone"
                                                                    type="tel"
                                                                    placeholder="Recipient's phone number"
                                                                    value={customerInfo.recipientPhone}
                                                                    onChange={(e) => handleCustomerInfoChange('recipientPhone', e.target.value)}
                                                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Address Information */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">Delivery Address</h4>
                                                    
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <Label htmlFor="door-name" className="text-sm font-bold text-gray-700 mb-1 block">Door Name/Number</Label>
                                                                <Input
                                                                    id="door-name"
                                                                    placeholder="e.g., Red Door, Blue House, 42"
                                                                    value={customerInfo.doorName}
                                                                    onChange={(e) => handleCustomerInfoChange('doorName', e.target.value)}
                                                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="flat-number" className="text-sm font-bold text-gray-700 mb-1 block">Flat/Apartment (Optional)</Label>
                                                                <Input
                                                                    id="flat-number"
                                                                    placeholder="e.g., Flat 2B, Apt 105"
                                                                    value={customerInfo.flatNumber}
                                                                    onChange={(e) => handleCustomerInfoChange('flatNumber', e.target.value)}
                                                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="road-name" className="text-sm font-bold text-gray-700 mb-1 block">Street Address *</Label>
                                                            <Input
                                                                id="road-name"
                                                                placeholder="Enter street name and number"
                                                                value={customerInfo.roadName}
                                                                onChange={(e) => handleCustomerInfoChange('roadName', e.target.value)}
                                                                className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                            />
                                                        </div>
                                                        
                                                        <div>
                                                            <Label htmlFor="postcode" className="text-sm font-bold text-gray-700 mb-1 block">Postcode *</Label>
                                                            <Input
                                                                id="postcode"
                                                                placeholder="e.g., SW1A 1AA"
                                                                value={customerInfo.postcode}
                                                                onChange={(e) => handleCustomerInfoChange('postcode', e.target.value)}
                                                                className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-start gap-2">
                                                        <Truck className="w-4 h-4 text-gray-600 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-900">Delivery Information</p>
                                                            <p className="text-xs text-gray-700">
                                                                {deliverySpeed === 'express' 
                                                                    ? 'Express delivery: Order before 3pm for Next day delivery • We\'ll call when nearby'
                                                                    : 'Standard delivery: 2-3 days delivery • We\'ll call when nearby'
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Order Summary at Bottom */}
                                    <div className="bg-gray-50 rounded-lg p-4 mt-6 border border-gray-200">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Items Total:</span>
                                                <span className="font-semibold">£{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                            </div>
                                            
                                            {deliveryType === 'delivery' && deliverySpeed && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{deliverySpeed === 'express' ? 'Express' : 'Normal'} Delivery:</span>
                                                    <span className="font-semibold">£{(deliverySpeed === 'express' 
                                                        ? getDeliveryFee(shopSettings?.delivery_express_fee, 4.50)
                                                        : getDeliveryFee(shopSettings?.delivery_normal_fee, 2.50)
                                                    ).toFixed(2)}</span>
                                                </div>
                                            )}
                                            
                                            {(deliveryType === 'collection' || deliveryType === 'email') && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{deliveryType === 'email' ? 'Email Delivery' : 'Collection'}:</span>
                                                    <span className="font-semibold text-green-600">FREE</span>
                                                </div>
                                            )}
                                            
                                            <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                                <span className="text-gray-900">Total:</span>
                                                <span className="text-gray-900">£{getTotalPrice().toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between pt-6 mt-4 border-t border-gray-200">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setCheckoutOpen(false);
                                                setShowCart(true);
                                            }}
                                            className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 rounded-lg font-semibold transition-all duration-300"
                                        >
                                            ← Back to Cart
                                        </Button>
                                        <Button
                                            onClick={() => setCurrentStep('payment')}
                                            disabled={
                                                !deliveryType || 
                                                (deliveryType === 'email' && (!customerInfo.recipientName || !customerInfo.recipientEmail)) ||
                                                (deliveryType === 'collection' && (!customerInfo.recipientName || !customerInfo.recipientEmail || !customerInfo.recipientPhone)) ||
                                                (deliveryType === 'delivery' && (!deliverySpeed || !customerInfo.recipientName || !customerInfo.recipientEmail || !customerInfo.recipientPhone || !customerInfo.roadName || !customerInfo.postcode))
                                            }
                                            className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-500 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
                                        >
                                            Continue to Payment →
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Payment Section */}
                        {currentStep === 'payment' && !showStripePayment && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Payment</CardTitle>
                                    <CardDescription>Complete your order</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="text-center">
                                            <p className="text-lg font-semibold">Order Summary</p>
                                            
                                            {/* Order breakdown */}
                                            <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2">
                                                <div className="flex justify-between">
                                                    <span>Items Total:</span>
                                                    <span>£{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                                </div>
                                                
                                                {deliveryType === 'delivery' && deliverySpeed && (
                                                    <div className="flex justify-between">
                                                        <span>{deliverySpeed === 'express' ? 'Express' : 'Normal'} Delivery:</span>
                                                        <span>£{(deliverySpeed === 'express' 
                                                            ? getDeliveryFee(shopSettings?.delivery_express_fee, 4.50)
                                                            : getDeliveryFee(shopSettings?.delivery_normal_fee, 2.50)
                                                        ).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                
                                                {(deliveryType === 'collection' || deliveryType === 'email') && (
                                                    <div className="flex justify-between">
                                                        <span>{deliveryType === 'email' ? 'Email Delivery:' : 'Collection:'}</span>
                                                        <span>FREE</span>
                                                    </div>
                                                )}
                                                
                                                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                                                    <span>Total:</span>
                                                    <span>£{getTotalPrice().toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {paymentError && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                                <p className="text-red-600 text-sm">{paymentError}</p>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep('delivery')}
                                                className="flex-1"
                                            >
                                                ← Back to Delivery
                                            </Button>
                                            <Button
                                                onClick={startPayment}
                                                disabled={paymentLoading}
                                                className="flex-1"
                                                style={getButtonStyleLocal()}
                                            >
                                                {paymentLoading ? 'Processing...' : 'Pay with Card'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Stripe Payment Form */}
                        {currentStep === 'payment' && showStripePayment && (
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Secure Card Payment</CardTitle>
                                        <CardDescription>
                                            Complete your order of £{getTotalPrice().toFixed(2)}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                                
                                <StripePaymentProvider
                                    tenant={tenant}
                                    orderDetails={{
                                        orderId: `SHOP-${Date.now()}`,
                                        amount: getTotalPrice(),
                                        currency: 'gbp',
                                        customerEmail: customerInfo.recipientEmail || customerInfo.email,
                                        customerName: customerInfo.recipientName || customerInfo.name,
                                        description: `Shop order - ${cart.length} item(s)`
                                    }}
                                    onPaymentSuccess={handlePaymentSuccess}
                                    onPaymentError={handlePaymentError}
                                    onPaymentCancel={handlePaymentCancel}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Gift Card Balance Check Modal */}
            <Dialog open={showBalanceCheck} onOpenChange={handleBalanceCheckClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Check Gift Card Balance</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 p-4">
                        {!giftCardInfo && (
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="gift-card-code">Gift Card Code</Label>
                                        <Input
                                            id="gift-card-code"
                                            type="text"
                                            placeholder="Enter your gift card code"
                                            value={giftCardCode}
                                            onChange={(e) => {
                                                setGiftCardCode(e.target.value.toUpperCase());
                                                setBalanceError(null);
                                            }}
                                            className="mt-2 text-center font-mono text-lg tracking-wider"
                                            style={{
                                                borderColor: balanceError ? '#ef4444' : '#d1d5db',
                                            }}
                                        />
                                    </div>
                                    
                                    {balanceError && (
                                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                            <p className="text-red-800 text-sm text-center">{balanceError}</p>
                                        </div>
                                    )}
                                    
                                    <Button 
                                        onClick={checkGiftCardBalance}
                                        disabled={!giftCardCode.trim() || checkingBalance}
                                        className="w-full py-3 text-white"
                                        style={(!giftCardCode.trim() || checkingBalance) 
                                            ? {
                                                backgroundColor: '#9ca3af',
                                                borderColor: '#9ca3af'
                                            }
                                            : getButtonStyleLocal()
                                        }
                                    >
                                        {checkingBalance ? 'Checking...' : 'Check Balance'}
                                    </Button>
                                </div>
                            </>
                        )}
                        
                        {giftCardInfo && (
                            <div className="space-y-4">
                                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                                    <div className="mb-4">
                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-green-800 mb-2">Gift Card Found!</h3>
                                    </div>
                                    
                                    <div className="space-y-3 text-left">
                                        <div className="flex justify-between items-center py-2 border-b border-green-200">
                                            <span className="font-medium text-green-700">Card Number:</span>
                                            <span className="font-mono text-green-800">{giftCardInfo.cardNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-green-200">
                                            <span className="font-medium text-green-700">Balance:</span>
                                            <span className="text-xl font-bold text-green-800">£{giftCardInfo.balance.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-b border-green-200">
                                            <span className="font-medium text-green-700">Status:</span>
                                            <span className="text-green-800">{giftCardInfo.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="font-medium text-green-700">Expires:</span>
                                            <span className="text-green-800">{giftCardInfo.expiryDate}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex space-x-3">
                                    <Button 
                                        onClick={() => {
                                            setGiftCardInfo(null);
                                            setGiftCardCode('');
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Check Another
                                    </Button>
                                    <Button 
                                        onClick={handleBalanceCheckClose}
                                        className="flex-1 text-white"
                                        style={getButtonStyleLocal()}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Personal Message Popup */}
            <Dialog open={showPersonalMessage} onOpenChange={setShowPersonalMessage}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Gift className="w-5 h-5 text-amber-600" />
                            </div>
                            Personal Message
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="popup-message-to" className="text-sm font-bold text-gray-700 mb-2 block">To</Label>
                                <Input
                                    id="popup-message-to"
                                    placeholder="Recipient's name"
                                    value={personalMessage.to}
                                    onChange={(e) => handlePersonalMessageChange('to', e.target.value)}
                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>
                            <div>
                                <Label htmlFor="popup-message-from" className="text-sm font-bold text-gray-700 mb-2 block">From</Label>
                                <Input
                                    id="popup-message-from"
                                    placeholder="Your name"
                                    value={personalMessage.from}
                                    onChange={(e) => handlePersonalMessageChange('from', e.target.value)}
                                    className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="popup-message-text" className="text-sm font-bold text-gray-700 mb-2 block">Your Message</Label>
                            <Textarea
                                id="popup-message-text"
                                placeholder="Write your heartfelt message here..."
                                value={personalMessage.message}
                                onChange={(e) => handlePersonalMessageChange('message', e.target.value)}
                                className="min-h-[100px] focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none"
                                maxLength={500}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <p className="text-xs text-gray-500">
                                    {personalMessage.message.length}/500 characters
                                </p>
                            </div>
                        </div>
                        
                        {(personalMessage.to || personalMessage.from || personalMessage.message) && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h5 className="text-sm font-bold text-gray-900 mb-2">Preview:</h5>
                                <div className="space-y-2">
                                    {personalMessage.to && personalMessage.from && (
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-gray-600">To: <span className="text-gray-900">{personalMessage.to}</span></span>
                                            <span className="font-medium text-gray-600">From: <span className="text-gray-900">{personalMessage.from}</span></span>
                                        </div>
                                    )}
                                    {personalMessage.message && (
                                        <div className="bg-white rounded p-3 border-l-4 border-amber-400">
                                            <p className="text-gray-700 italic text-sm">"{personalMessage.message}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPersonalMessage(false)}
                                className="px-4 py-2"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => setShowPersonalMessage(false)}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2"
                            >
                                Save Message
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Footer */}
            <footer className="mt-16 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Help Section */}
                    {tenantInfo?.phone && (
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                Need some help?
                            </h3>
                            <a 
                                href={`tel:${tenantInfo.phone}`}
                                className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                Call us on {tenantInfo.phone}
                            </a>
                        </div>
                    )}

                    {/* Powered By Section */}
                    <div className="text-center pt-6">
                        <p className="text-xs text-gray-400">
                            Powered by - 
                            <a 
                                href="https://orderweb.co.uk/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-500 ml-1 transition-colors duration-200"
                            >
                                Order Web
                            </a>
                        </p>
                    </div>
                </div>
            </footer>

            </div>
        </>
    );
}
