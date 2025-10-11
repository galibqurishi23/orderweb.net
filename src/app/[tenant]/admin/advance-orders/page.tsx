'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { Clock, Calendar, Printer, Eye, CreditCard, Wallet, Gift } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';
import { useAdmin } from '@/context/AdminContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useReactToPrint } from 'react-to-print';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdvanceOrdersPage() {
  const { tenantData } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const componentToPrintRef = useRef(null);

  // Restaurant settings from tenantData
  const restaurantSettings = {
    currency: tenantData?.currency || 'GBP',
    timezone: tenantData?.timezone || 'Europe/London'
  };

  // Fetch advance orders from API
  useEffect(() => {
    async function fetchAdvanceOrders() {
      if (!tenantData?.id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/tenant/orders?tenantId=${tenantData.id}&type=advance`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setOrders(result.data || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch advance orders:', error);
        toast({
          title: "Error",
          description: "Failed to load advance orders",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAdvanceOrders();
  }, [tenantData?.id, toast]);

  // Update order status
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await fetch(`/api/tenant/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
        toast({
          title: "Success",
          description: `Order status updated to ${status}`,
        });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(restaurantSettings.currency);
  }, [restaurantSettings.currency]);

  const advanceOrders = useMemo(() => {
    return orders.filter(order => order.orderType === 'advance');
  }, [orders]);

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
        return 'default';
      case 'preparing':
        return 'default';
      case 'ready':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const sortedOrders = useMemo(() => {
    return [...advanceOrders].sort((a, b) => {
      const aTime = new Date(a.scheduledTime || a.createdAt).getTime();
      const bTime = new Date(b.scheduledTime || b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [advanceOrders]);

  // Print functionality
  const handlePrint = () => {
    window.print();
    toast({ 
      title: "Print request sent",
      description: "Order details are being printed"
    });
  };

  // Print individual order
  const printOrder = (order: Order) => {
    setSelectedOrder(order);
    // Use timeout to ensure dialog content is rendered before printing
    setTimeout(() => {
      window.print();
      toast({ 
        title: "Print request sent",
        description: `Order ${order.orderNumber} is being printed`
      });
    }, 100);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Advance Orders</h1>
        <Badge variant="outline" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {advanceOrders.length} advance orders
        </Badge>
      </div>

      {advanceOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No advance orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Advance Orders</CardTitle>
            <CardDescription>
              Manage scheduled orders for future dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customerName}</span>
                          <span className="text-sm text-muted-foreground">{order.customerPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {isClient && order.scheduledTime ? format(order.scheduledTime, 'PPp') : 'N/A'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {isClient && order.scheduledTime ? format(order.scheduledTime, 'EEEE') : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.paymentMethod === 'cash' && (
                            <>
                              <Wallet className="w-4 h-4 text-green-600" />
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                Cash
                              </Badge>
                            </>
                          )}
                          {order.paymentMethod === 'card' && (
                            <>
                              <CreditCard className="w-4 h-4 text-blue-600" />
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                                Card
                              </Badge>
                            </>
                          )}
                          {order.paymentMethod === 'voucher' && (
                            <>
                              <Gift className="w-4 h-4 text-purple-600" />
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                                Voucher
                              </Badge>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="capitalize">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {currencySymbol}{(parseFloat(String(order.total)) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printOrder(order)}
                            title="Print Order"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog for Printing */}
      <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          {selectedOrder && (
            <>
              <div ref={componentToPrintRef} className="flex-grow overflow-y-auto p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle>Advance Order Details: {selectedOrder.orderNumber}</DialogTitle>
                  <DialogDescription>
                    Scheduled for: {isClient && selectedOrder.scheduledTime ? format(selectedOrder.scheduledTime, 'PPpp') : '...'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Order Details</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between"><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedOrder.status)} className="capitalize font-semibold rounded-full">{selectedOrder.status}</Badge></div>
                        <div className="flex justify-between"><strong>Type:</strong> <Badge variant="outline" className="capitalize">Advance Order</Badge></div>
                        <div className="flex justify-between"><strong>Scheduled Time:</strong> 
                          <span>{isClient && selectedOrder.scheduledTime ? format(selectedOrder.scheduledTime, 'PPp') : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between"><strong>Payment Method:</strong> 
                          <div className="flex items-center gap-2">
                            {selectedOrder.paymentMethod === 'cash' && (
                              <>
                                <Wallet className="w-4 h-4 text-green-600" />
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Cash</Badge>
                              </>
                            )}
                            {selectedOrder.paymentMethod === 'card' && (
                              <>
                                <CreditCard className="w-4 h-4 text-blue-600" />
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Card</Badge>
                              </>
                            )}
                            {selectedOrder.paymentMethod === 'voucher' && (
                              <>
                                <Gift className="w-4 h-4 text-purple-600" />
                                <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">Voucher</Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between"><strong>Voucher:</strong> <span>{selectedOrder.voucherCode || 'N/A'}</span></div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Customer Information</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between"><strong>Name:</strong> {selectedOrder.customerName}</div>
                        <div className="flex justify-between"><strong>Phone:</strong> {selectedOrder.customerPhone}</div>
                        <div className="flex justify-between"><strong>Email:</strong> {selectedOrder.customerEmail}</div>
                        {selectedOrder.address && <div className="flex justify-between"><strong>Address:</strong> {selectedOrder.address}</div>}
                      </CardContent>
                    </Card>
                    {/* Special Instructions Card */}
                    {selectedOrder.specialInstructions && (
                      <Card className="md:col-span-2">
                        <CardHeader><CardTitle className="text-lg">Special Instructions</CardTitle></CardHeader>
                        <CardContent className="text-sm">
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <p className="text-yellow-800">{selectedOrder.specialInstructions}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Order Items</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedOrder.items.map(item => (
                          <div key={item.id} className="text-sm p-3 bg-muted/50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold">{item.quantity}x {item.menuItem.name}</div>
                                {item.selectedAddons.length > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    + {item.selectedAddons.map(addon => `${addon.groupName} (${currencySymbol}${addon.totalPrice.toFixed(2)})`).join(', ')}
                                  </div>
                                )}
                                {item.specialInstructions && (
                                  <div className="text-xs text-muted-foreground italic">Note: {item.specialInstructions}</div>
                                )}
                              </div>
                              <div className="font-semibold">
                                {currencySymbol}{((parseFloat(String(item.menuItem.price || '0')) + item.selectedAddons.reduce((sum, addon) => sum + addon.totalPrice, 0)) * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Payment Summary</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between"><span>Subtotal</span><span>{currencySymbol}{parseFloat(String(selectedOrder.subtotal || '0')).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Delivery Fee</span><span>{currencySymbol}{parseFloat(String(selectedOrder.deliveryFee || '0')).toFixed(2)}</span></div>
                      {parseFloat(String(selectedOrder.discount || '0')) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({selectedOrder.voucherCode})</span>
                          <span>-{currencySymbol}{parseFloat(String(selectedOrder.discount || '0')).toFixed(2)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{currencySymbol}{parseFloat(String(selectedOrder.total || '0')).toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4"/>
                  Print Order
                </Button>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
