'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Gift, CreditCard, Plus, Settings, Eye, PoundSterling, Users, TrendingUp, Search, RefreshCw, ExternalLink, ImageIcon, Package, ShoppingBag, Tag as TagIcon, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GiftCard {
    id: string;
    card_number: string;
    card_type: 'digital' | 'physical';
    amount: number;
    remaining_balance: number;
    status: 'active' | 'redeemed' | 'expired' | 'cancelled';
    expiry_date: string;
    created_at: string;
}

interface GiftCardOrder {
    id: string;
    order_date: string;
    customer_name: string;
    customer_email: string;
    card_number: string;
    order_amount: number;
    payment_status: 'pending' | 'completed' | 'failed';
    delivery_status: 'pending' | 'sent' | 'delivered';
}

interface GiftCardSettings {
    fixed_amounts: string[];
    allow_custom_amount: boolean;
    min_custom_amount: number;
    max_custom_amount: number;
    default_expiry_months: number;
    terms_and_conditions: string;
    display_name?: string;
    cover_image_url?: string;
}

interface ShopCategory {
    id: string;
    name: string;
    description: string;
    image_url?: string;
    is_active: boolean;
}

interface ShopItem {
    id: string;
    category_id: string;
    category_name: string;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    type: 'physical' | 'digital' | 'gift_card';
    is_featured: boolean;
    is_active: boolean;
    stock_quantity: number;
    track_inventory: boolean;
}

export default function AdminGiftCardsPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
    const [orders, setOrders] = useState<GiftCardOrder[]>([]);
    const [settings, setSettings] = useState<GiftCardSettings | null>(null);
    const [stats, setStats] = useState<any>({});

    // Shop state
    const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
    const [shopItems, setShopItems] = useState<ShopItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Form states
    const [createCardOpen, setCreateCardOpen] = useState(false);
    const [redeemCardOpen, setRedeemCardOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    
    // Shop form states
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [createItemOpen, setCreateItemOpen] = useState(false);
    const [editItemOpen, setEditItemOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [coverImageOpen, setCoverImageOpen] = useState(false);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [coverImagePreview, setCoverImagePreview] = useState<string>('');
    const [uploadingCover, setUploadingCover] = useState(false);
    const [shopNameOpen, setShopNameOpen] = useState(false);
    const [shopName, setShopName] = useState<string>('');
    const [currentShopSettings, setCurrentShopSettings] = useState<any>(null);

    // Create card form
    const [cardType, setCardType] = useState<'digital' | 'physical'>('digital');
    const [cardAmount, setCardAmount] = useState<string>('');
    const [expiryMonths, setExpiryMonths] = useState<string>('12');

    // Redeem form
    const [redeemCardNumber, setRedeemCardNumber] = useState('');
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemDescription, setRedeemDescription] = useState('');

    // Shop form data
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        description: '',
        image_url: ''
    });
    
    const [itemFormData, setItemFormData] = useState({
        category_id: '',
        name: '',
        description: '',
        price: '',
        image_url: '',
        type: 'physical' as 'physical' | 'digital' | 'gift_card',
        stock_quantity: '',
        track_inventory: true,
        is_featured: false,
        is_active: true
    });

    // Search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, [tenant]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cardsRes, ordersRes, settingsRes, statsRes, categoriesRes, itemsRes, shopSettingsRes] = await Promise.all([
                fetch(`/api/tenant/${tenant}/admin/gift-cards`),
                fetch(`/api/tenant/${tenant}/admin/gift-cards/orders`),
                fetch(`/api/tenant/${tenant}/gift-cards/settings`),
                fetch(`/api/tenant/${tenant}/admin/gift-cards/stats`),
                fetch(`/api/tenant/${tenant}/admin/shop/categories`),
                fetch(`/api/tenant/${tenant}/admin/shop/items`),
                fetch(`/api/tenant/${tenant}/admin/shop/settings`)
            ]);

            if (cardsRes.ok) {
                const cardsData = await cardsRes.json();
                setGiftCards(cardsData);
            }

            if (ordersRes.ok) {
                const ordersData = await ordersRes.json();
                setOrders(ordersData);
            }

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                setSettings(settingsData);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                setShopCategories(categoriesData);
            }

            if (itemsRes.ok) {
                const itemsData = await itemsRes.json();
                setShopItems(itemsData);
            }

            if (shopSettingsRes.ok) {
                const shopSettingsData = await shopSettingsRes.json();
                setCurrentShopSettings(shopSettingsData);
                setShopName(shopSettingsData.display_name || '');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Shop management functions
    const createCategory = async () => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryFormData)
            });

            if (response.ok) {
                toast({
                    title: "Category Created",
                    description: "Shop category has been created successfully"
                });
                setCreateCategoryOpen(false);
                setCategoryFormData({ name: '', description: '', image_url: '' });
                fetchData();
            } else {
                throw new Error('Failed to create category');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create category",
                variant: "destructive"
            });
        }
    };

    const deleteCategory = async (categoryId: string) => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/categories/${categoryId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast({
                    title: "Category Deleted",
                    description: "Shop category has been deleted successfully"
                });
                fetchData();
            } else {
                throw new Error('Failed to delete category');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete category",
                variant: "destructive"
            });
        }
    };

    const createShopItem = async () => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...itemFormData,
                    price: parseFloat(itemFormData.price),
                    stock_quantity: parseInt(itemFormData.stock_quantity)
                })
            });

            if (response.ok) {
                toast({
                    title: "Item Created",
                    description: "Shop item has been created successfully"
                });
                setCreateItemOpen(false);
                setItemFormData({
                    category_id: '',
                    name: '',
                    description: '',
                    price: '',
                    image_url: '',
                    type: 'physical',
                    is_featured: false,
                    is_active: true,
                    stock_quantity: '',
                    track_inventory: true
                });
                fetchData();
            } else {
                throw new Error('Failed to create item');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create item",
                variant: "destructive"
            });
        }
    };

    const updateShopItem = async () => {
        if (!editingItem) return;
        
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/items/${editingItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...itemFormData,
                    price: parseFloat(itemFormData.price),
                    stock_quantity: parseInt(itemFormData.stock_quantity)
                })
            });

            if (response.ok) {
                toast({
                    title: "Item Updated",
                    description: "Shop item has been updated successfully"
                });
                setEditItemOpen(false);
                setEditingItem(null);
                fetchData();
            } else {
                throw new Error('Failed to update item');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update item",
                variant: "destructive"
            });
        }
    };

    const deleteShopItem = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/items/${itemId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast({
                    title: "Item Deleted",
                    description: "Shop item has been deleted successfully"
                });
                fetchData();
            } else {
                throw new Error('Failed to delete item');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete item",
                variant: "destructive"
            });
        }
    };

    const openEditItem = (item: ShopItem) => {
        setEditingItem(item);
        setItemFormData({
            category_id: item.category_id,
            name: item.name,
            description: item.description,
            price: item.price.toString(),
            image_url: item.image_url || '',
            type: item.type,
            is_featured: item.is_featured,
            is_active: item.is_active,
            stock_quantity: item.stock_quantity.toString(),
            track_inventory: item.track_inventory
        });
        setEditItemOpen(true);
    };

    // Gift card functions
    const handleCreateCard = async () => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/gift-cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_type: cardType,
                    amount: parseFloat(cardAmount),
                    expiry_months: parseInt(expiryMonths)
                })
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Gift card created successfully"
                });
                setCreateCardOpen(false);
                setCardAmount('');
                fetchData();
            } else {
                throw new Error('Failed to create gift card');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create gift card",
                variant: "destructive"
            });
        }
    };

    const handleRedeemCard = async () => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/gift-cards/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    card_number: redeemCardNumber,
                    amount: parseFloat(redeemAmount),
                    description: redeemDescription
                })
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Gift card redeemed successfully"
                });
                setRedeemCardOpen(false);
                setRedeemCardNumber('');
                setRedeemAmount('');
                setRedeemDescription('');
                fetchData();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to redeem gift card');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to redeem gift card",
                variant: "destructive"
            });
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, updates: any) => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/gift-cards/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Order status updated"
                });
                fetchData();
            } else {
                throw new Error('Failed to update order');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update order status",
                variant: "destructive"
            });
        }
    };

    const handleDeleteGiftCard = async (cardId: string) => {
        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/gift-cards/${cardId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Gift card deleted successfully"
                });
                fetchData();
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to delete gift card",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete gift card",
                variant: "destructive"
            });
        }
    };

    // Cover image upload functions
    const handleCoverImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCoverImageFile(file);
            
            // Create preview URL
            const reader = new FileReader();
            reader.onload = (e) => {
                setCoverImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const updateCoverImage = async () => {
        if (!coverImageFile) {
            toast({
                title: "No File Selected",
                description: "Please select an image file to upload",
                variant: "destructive"
            });
            return;
        }

        setUploadingCover(true);
        
        try {
            const formData = new FormData();
            formData.append('cover_image', coverImageFile);
            formData.append('display_name', 'Shop Cover Image');

            const response = await fetch(`/api/tenant/${tenant}/admin/shop/settings`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Shop cover image updated successfully"
                });
                setCoverImageOpen(false);
                setCoverImageFile(null);
                setCoverImagePreview('');
                fetchData();
            } else {
                throw new Error('Failed to update cover image');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update cover image",
                variant: "destructive"
            });
        } finally {
            setUploadingCover(false);
        }
    };

    const updateShopName = async () => {
        if (!shopName.trim()) {
            toast({
                title: "Invalid Input",
                description: "Please enter a shop name",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`/api/tenant/${tenant}/admin/shop/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: shopName.trim()
                })
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Shop name updated successfully"
                });
                setShopNameOpen(false);
                fetchData();
            } else {
                throw new Error('Failed to update shop name');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update shop name",
                variant: "destructive"
            });
        }
    };

    const filteredCards = giftCards.filter(card => {
        const matchesSearch = card.card_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const filteredOrders = orders.filter((order) => {
        return order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
               order.card_number.toLowerCase().includes(searchTerm.toLowerCase());
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shop & Gift Cards</h1>
                    <p className="text-muted-foreground">Manage gift cards, orders, and settings</p>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" asChild>
                        <a href={`/${tenant}/shop`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Shop
                        </a>
                    </Button>
                    
                    <Dialog open={shopNameOpen} onOpenChange={setShopNameOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Settings className="mr-2 h-4 w-4" />
                                Shop Name
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Update Shop Name</DialogTitle>
                                <DialogDescription>Set the display name for your shop</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="shop-name">Shop Display Name</Label>
                                    <Input
                                        id="shop-name"
                                        value={shopName}
                                        onChange={(e) => setShopName(e.target.value)}
                                        placeholder="Enter shop name..."
                                        className="mt-1"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        This name will be displayed on your shop landing page
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setShopNameOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={updateShopName}>
                                        Update Name
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog open={coverImageOpen} onOpenChange={setCoverImageOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Shop Cover
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Update Shop Cover Image</DialogTitle>
                                <DialogDescription>Set a cover image for your shop page</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="cover-image-file">Select Cover Image</Label>
                                    <Input
                                        id="cover-image-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverImageSelect}
                                        className="cursor-pointer"
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Choose an image file (JPG, PNG, GIF) for your shop cover
                                    </p>
                                </div>
                                {coverImagePreview && (
                                    <div>
                                        <Label>Preview</Label>
                                        <div className="mt-2">
                                            <img 
                                                src={coverImagePreview} 
                                                alt="Cover preview" 
                                                className="w-full h-32 object-cover rounded-lg border"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                    setCoverImageOpen(false);
                                    setCoverImageFile(null);
                                    setCoverImagePreview('');
                                }}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={updateCoverImage}
                                    disabled={!coverImageFile || uploadingCover}
                                >
                                    {uploadingCover ? 'Uploading...' : 'Upload Cover Image'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog open={createCardOpen} onOpenChange={setCreateCardOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Gift Card
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Gift Card</DialogTitle>
                                <DialogDescription>Generate a new gift card for customers</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Card Type</Label>
                                    <Select value={cardType} onValueChange={(value: 'digital' | 'physical') => setCardType(value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="digital">Digital</SelectItem>
                                            <SelectItem value="physical">Physical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="card-amount">Amount (£)</Label>
                                    <Input
                                        id="card-amount"
                                        type="number"
                                        step="0.01"
                                        value={cardAmount}
                                        onChange={(e) => setCardAmount(e.target.value)}
                                        placeholder="50.00"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expiry-months">Expiry (months)</Label>
                                    <Input
                                        id="expiry-months"
                                        type="number"
                                        value={expiryMonths}
                                        onChange={(e) => setExpiryMonths(e.target.value)}
                                        placeholder="12"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateCardOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateCard}>Create Card</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">£{stats.total_revenue || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Gift cards & shop sales
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Gift Cards</CardTitle>
                        <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active_cards || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently in circulation
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shop Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{shopItems.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Products available
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Categories</CardTitle>
                        <TagIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{shopCategories.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Product categories
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="shop">Shop Items</TabsTrigger>
                    <TabsTrigger value="gift-cards">Gift Cards</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Orders</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {orders.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{order.customer_name}</p>
                                                <p className="text-sm text-muted-foreground">£{order.order_amount}</p>
                                            </div>
                                            <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                                                {order.payment_status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Products</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {shopItems.slice(0, 5).map((item) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{item.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    £{Number(item.price).toFixed(2)}
                                                </p>
                                            </div>
                                            <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="shop" className="space-y-4">
                    {/* Shop Categories Management */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center space-x-2">
                                        <TagIcon className="h-5 w-5" />
                                        <span>Categories</span>
                                    </CardTitle>
                                    <CardDescription>Manage shop categories</CardDescription>
                                </div>
                                <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Category
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create Category</DialogTitle>
                                            <DialogDescription>Add a new shop category</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="category-name">Name</Label>
                                                <Input
                                                    id="category-name"
                                                    value={categoryFormData.name}
                                                    onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                                                    placeholder="Category name"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="category-description">Description</Label>
                                                <Textarea
                                                    id="category-description"
                                                    value={categoryFormData.description}
                                                    onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                                                    placeholder="Category description"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="category-image">Image URL</Label>
                                                <Input
                                                    id="category-image"
                                                    value={categoryFormData.image_url}
                                                    onChange={(e) => setCategoryFormData({...categoryFormData, image_url: e.target.value})}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setCreateCategoryOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button onClick={createCategory}>Create</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {shopCategories.map((category) => (
                                    <Card key={category.id} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{category.name}</h4>
                                                <p className="text-sm text-gray-600">{category.description}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant={category.is_active ? 'default' : 'secondary'}>
                                                    {category.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => deleteCategory(category.id)}
                                                                className="bg-red-600 hover:bg-red-700"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shop Items Management */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Package className="h-5 w-5" />
                                        <span>Shop Items</span>
                                    </CardTitle>
                                    <CardDescription>Manage shop products and items</CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Filter by category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {shopCategories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Item
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Create Shop Item</DialogTitle>
                                                <DialogDescription>Add a new item to your shop</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="item-name">Name</Label>
                                                    <Input
                                                        id="item-name"
                                                        value={itemFormData.name}
                                                        onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                                                        placeholder="Item name"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="item-category">Category</Label>
                                                    <Select 
                                                        value={itemFormData.category_id} 
                                                        onValueChange={(value) => setItemFormData({...itemFormData, category_id: value})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {shopCategories.map((category) => (
                                                                <SelectItem key={category.id} value={category.id}>
                                                                    {category.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="item-price">Price (£)</Label>
                                                    <Input
                                                        id="item-price"
                                                        type="number"
                                                        step="0.01"
                                                        value={itemFormData.price}
                                                        onChange={(e) => setItemFormData({...itemFormData, price: e.target.value})}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="item-type">Type</Label>
                                                    <Select 
                                                        value={itemFormData.type} 
                                                        onValueChange={(value: 'physical' | 'digital' | 'gift_card') => setItemFormData({...itemFormData, type: value})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="physical">Physical</SelectItem>
                                                            <SelectItem value="digital">Digital</SelectItem>
                                                            <SelectItem value="gift_card">Gift Card</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label htmlFor="item-description">Description</Label>
                                                    <Textarea
                                                        id="item-description"
                                                        value={itemFormData.description}
                                                        onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                                                        placeholder="Detailed description"
                                                        rows={3}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="item-image">Image URL</Label>
                                                    <Input
                                                        id="item-image"
                                                        value={itemFormData.image_url}
                                                        onChange={(e) => setItemFormData({...itemFormData, image_url: e.target.value})}
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="item-stock">Stock Quantity</Label>
                                                    <Input
                                                        id="item-stock"
                                                        type="number"
                                                        value={itemFormData.stock_quantity}
                                                        onChange={(e) => setItemFormData({...itemFormData, stock_quantity: e.target.value})}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={itemFormData.is_featured}
                                                        onCheckedChange={(checked) => setItemFormData({...itemFormData, is_featured: checked})}
                                                    />
                                                    <Label>Featured Item</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={itemFormData.is_active}
                                                        onCheckedChange={(checked) => setItemFormData({...itemFormData, is_active: checked})}
                                                    />
                                                    <Label>Active</Label>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setCreateItemOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={createShopItem}>Create Item</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shopItems
                                        .filter(item => selectedCategory === 'all' || item.category_id === selectedCategory)
                                        .map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.category_name}</TableCell>
                                            <TableCell>£{Number(item.price).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.type}</Badge>
                                            </TableCell>
                                            <TableCell>{item.track_inventory ? item.stock_quantity : 'Unlimited'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                                        {item.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {item.is_featured && <Badge variant="outline">Featured</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => openEditItem(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => deleteShopItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Edit Item Dialog */}
                    <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Shop Item</DialogTitle>
                                <DialogDescription>Update item details</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-item-name">Name</Label>
                                    <Input
                                        id="edit-item-name"
                                        value={itemFormData.name}
                                        onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                                        placeholder="Item name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-category">Category</Label>
                                    <Select 
                                        value={itemFormData.category_id} 
                                        onValueChange={(value) => setItemFormData({...itemFormData, category_id: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shopCategories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-price">Price (£)</Label>
                                    <Input
                                        id="edit-item-price"
                                        type="number"
                                        step="0.01"
                                        value={itemFormData.price}
                                        onChange={(e) => setItemFormData({...itemFormData, price: e.target.value})}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-type">Type</Label>
                                    <Select 
                                        value={itemFormData.type} 
                                        onValueChange={(value: 'physical' | 'digital' | 'gift_card') => setItemFormData({...itemFormData, type: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="physical">Physical</SelectItem>
                                            <SelectItem value="digital">Digital</SelectItem>
                                            <SelectItem value="gift_card">Gift Card</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="edit-item-description">Description</Label>
                                    <Textarea
                                        id="edit-item-description"
                                        value={itemFormData.description}
                                        onChange={(e) => setItemFormData({...itemFormData, description: e.target.value})}
                                        placeholder="Detailed description"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-image">Image URL</Label>
                                    <Input
                                        id="edit-item-image"
                                        value={itemFormData.image_url}
                                        onChange={(e) => setItemFormData({...itemFormData, image_url: e.target.value})}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-stock">Stock Quantity</Label>
                                    <Input
                                        id="edit-item-stock"
                                        type="number"
                                        value={itemFormData.stock_quantity}
                                        onChange={(e) => setItemFormData({...itemFormData, stock_quantity: e.target.value})}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={itemFormData.is_featured}
                                        onCheckedChange={(checked) => setItemFormData({...itemFormData, is_featured: checked})}
                                    />
                                    <Label>Featured Item</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={itemFormData.is_active}
                                        onCheckedChange={(checked) => setItemFormData({...itemFormData, is_active: checked})}
                                    />
                                    <Label>Active</Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditItemOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={updateShopItem}>Update Item</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="gift-cards" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Gift Cards</CardTitle>
                                    <CardDescription>
                                        Manage digital gift cards and vouchers
                                    </CardDescription>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            placeholder="Search cards..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-64"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="redeemed">Redeemed</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Dialog open={redeemCardOpen} onOpenChange={setRedeemCardOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline">
                                                <CreditCard className="h-4 w-4 mr-2" />
                                                Redeem Card
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Redeem Gift Card</DialogTitle>
                                                <DialogDescription>Process a gift card redemption</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="redeem-card-number">Card Number</Label>
                                                    <Input
                                                        id="redeem-card-number"
                                                        value={redeemCardNumber}
                                                        onChange={(e) => setRedeemCardNumber(e.target.value)}
                                                        placeholder="GC-XXXX-XXXX"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="redeem-amount">Amount to Redeem (£)</Label>
                                                    <Input
                                                        id="redeem-amount"
                                                        type="number"
                                                        step="0.01"
                                                        value={redeemAmount}
                                                        onChange={(e) => setRedeemAmount(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="redeem-description">Description</Label>
                                                    <Textarea
                                                        id="redeem-description"
                                                        value={redeemDescription}
                                                        onChange={(e) => setRedeemDescription(e.target.value)}
                                                        placeholder="Redemption description..."
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setRedeemCardOpen(false)}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleRedeemCard}>Redeem</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Card Number</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Expiry Date</TableHead>
                                            <TableHead className="w-[120px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCards.map((card) => (
                                            <TableRow key={card.id}>
                                                <TableCell className="font-medium font-mono text-sm">{card.card_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{card.card_type}</Badge>
                                                </TableCell>
                                                <TableCell>£{card.amount}</TableCell>
                                                <TableCell>£{card.remaining_balance}</TableCell>
                                                <TableCell>
                                                    <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                                                        {card.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'No expiry'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="sm" title="View Details">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    title="Delete Gift Card"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Gift Card</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete gift card {card.card_number}? 
                                                                        This action cannot be undone. Gift cards with remaining balance or recent transactions cannot be deleted.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleDeleteGiftCard(card.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gift Card Orders</CardTitle>
                            <CardDescription>
                                View and manage gift card orders and delivery status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Card Number</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Delivery</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                {new Date(order.order_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{order.customer_name}</p>
                                                    <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">{order.card_number}</TableCell>
                                            <TableCell>£{order.order_amount}</TableCell>
                                            <TableCell>
                                                <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                                                    {order.payment_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={order.delivery_status}
                                                    onValueChange={(value) => handleUpdateOrderStatus(order.id, { delivery_status: value })}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="sent">Sent</SelectItem>
                                                        <SelectItem value="delivered">Delivered</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
