'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { 
  BarChart3, 
  Calendar as CalendarIcon, 
  Download, 
  Banknote, 
  ShoppingBag, 
  FileText,
  Globe,
  Store,
  Receipt,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useAdmin } from '@/context/AdminContext';
import type { Order } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HMRCVATCalculator, VATSummary } from '@/lib/hmrc-vat-calculator';
import { OrderVATCalculator } from '@/lib/order-vat-calculator';

type ReportType = 'online' | 'in_restaurant' | 'total';

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
  averagePrice: number;
  orderCount: number;
}

interface HMRCReportData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  vatSummary: VATSummary;
  orders: Order[];
  topItemsByQuantity: TopItem[];
  topItemsByRevenue: TopItem[];
}

export default function HMRCReportsPage() {
  const { tenantData } = useAdmin();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<DateRange | undefined>();
  const [activeReport, setActiveReport] = useState<ReportType>('total');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const { toast } = useToast();

  // Restaurant settings from tenantData
  const restaurantSettings = {
    currency: tenantData?.currency || 'GBP',
    timezone: tenantData?.timezone || 'Europe/London'
  };

  // Fetch orders for reports
  useEffect(() => {
    async function fetchOrders() {
      if (!tenantData?.id) return;
      
      try {
        setLoading(true);
        console.log('Fetching orders for tenant:', tenantData.id);
        const response = await fetch(`/api/tenant/orders?tenantId=${tenantData.id}`);
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Fetched orders result:', result);
          
          if (result.success) {
            // Add default orderSource for existing orders that don't have it
            const ordersWithSource = (result.data || []).map((order: any) => ({
              ...order,
              orderSource: order.orderSource || 'online' // Default to online for existing orders
            }));
            console.log('Processed orders count:', ordersWithSource.length);
            
            // DEBUG: Log sample order data to check VAT info
            const sampleOrder = ordersWithSource.find((o: any) => o.orderNumber === 'KIT-4263');
            if (sampleOrder) {
              console.log('🔍 SAMPLE ORDER KIT-4263 DATA:', {
                orderNumber: sampleOrder.orderNumber,
                total: sampleOrder.total,
                itemsCount: sampleOrder.items?.length,
                firstItem: sampleOrder.items?.[0],
                allItems: sampleOrder.items?.map((item: any) => ({
                  name: item.menuItem?.name,
                  price: item.finalPrice,
                  vatRate: item.menuItem?.vatRate,
                  isVatExempt: item.menuItem?.isVatExempt,
                  fullMenuItem: item.menuItem
                }))
              });
            }
            
            setAllOrders(ordersWithSource);
          } else {
            console.error('Failed to fetch orders:', result.error);
          }
        } else {
          console.error('HTTP error:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch orders for HMRC reports:', error);
        toast({
          title: "Error",
          description: "Failed to load order data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [tenantData?.id, toast]);

  // Set default date range to last 7 days
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    setDate({
      from: sevenDaysAgo,
      to: today,
    });
  }, []);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(restaurantSettings.currency);
  }, [restaurantSettings.currency]);

  // Filter orders based on date range
  const filteredOrders = useMemo(() => {
    if (!date?.from || !allOrders) {
      console.log('No date range or orders:', { dateFrom: date?.from, ordersCount: allOrders?.length });
      return [];
    }
    const toDate = date.to ? new Date(date.to) : new Date(date.from);
    toDate.setHours(23, 59, 59, 999);
    
    const filtered = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= date.from! && orderDate <= toDate;
    });
    
    console.log('Filtered orders:', {
      totalOrders: allOrders.length,
      filteredCount: filtered.length,
      dateRange: { from: date.from, to: toDate }
    });
    
    return filtered;
  }, [date, allOrders]);

  // Calculate top items from orders
  const calculateTopItems = (orders: Order[]): { byQuantity: TopItem[], byRevenue: TopItem[] } => {
    const itemStats = new Map<string, {
      quantity: number;
      revenue: number;
      orderCount: number;
    }>();

    orders.forEach(order => {
      order.items?.forEach(item => {
        const itemName = item.menuItem?.name || 'Unknown Item';
        const existing = itemStats.get(itemName) || {
          quantity: 0,
          revenue: 0,
          orderCount: 0
        };
        
        const itemQuantity = item.quantity || 1;
        const itemPrice = parseFloat(item.finalPrice?.toString() || '0') || 0;
        
        existing.quantity += itemQuantity;
        existing.revenue += itemPrice;
        existing.orderCount += 1;
        
        itemStats.set(itemName, existing);
      });
    });

    const topItems: TopItem[] = Array.from(itemStats.entries()).map(([name, stats]) => ({
      name,
      quantity: stats.quantity,
      revenue: stats.revenue,
      averagePrice: stats.revenue / stats.quantity,
      orderCount: stats.orderCount
    }));

    const topByQuantity = [...topItems]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20);

    const topByRevenue = [...topItems]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    return { byQuantity: topByQuantity, byRevenue: topByRevenue };
  };

  // Generate report data based on report type
  const generateReportData = (orders: Order[]): HMRCReportData => {
    if (orders.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        vatSummary: { totalNet: 0, totalVAT: 0, totalGross: 0, standardRateVAT: 0, zeroRateVAT: 0 },
        orders: [],
        topItemsByQuantity: [],
        topItemsByRevenue: []
      };
    }

    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total?.toString() || '0') || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate VAT summary using our enhanced calculator
    let totalNetAmount = 0;
    let totalVATAmount = 0;
    let totalGrossAmount = 0;
    let standardRateVAT = 0;
    let zeroRateVAT = 0;
    
    orders.forEach(order => {
      const grossAmount = parseFloat(order.total?.toString() || '0') || 0;
      
      // Use the VAT calculation that comes from the backend API
      // The getTenantOrders function already calculates VAT using OrderVATCalculator
      let orderVATAmount = 0;
      
      // Debug logging for order KIT-4263
      if (order.orderNumber === 'KIT-4263') {
        console.log(`🔍 USING BACKEND VAT CALC for KIT-4263:`, {
          orderNumber: order.orderNumber,
          total: grossAmount,
          vatInfo: order.vatInfo,
          hasVatInfo: !!order.vatInfo
        });
      }
      
      // Check if the backend provided calculated VAT info
      if (order.vatInfo && typeof order.vatInfo.totalVAT === 'number') {
        // Use the calculated VAT from backend
        orderVATAmount = order.vatInfo.totalVAT;
        
        if (order.orderNumber === 'KIT-4263') {
          console.log(`✅ Using backend calculated VAT: £${orderVATAmount.toFixed(2)}`);
        }
      } else {
        // Fallback: manually calculate if backend didn't provide VAT info
        console.log(`⚠️ No backend VAT calculation for order ${order.orderNumber}, calculating manually`);
        
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            const itemTotal = parseFloat(item.finalPrice?.toString() || '0') || 0;
            const itemVatRate = item.menuItem?.vatRate ?? null;
            const itemIsVatExempt = item.menuItem?.isVatExempt || false;
            
            if (itemIsVatExempt || itemVatRate === 0) {
              // 0% VAT item
              orderVATAmount += 0;
            } else if (itemVatRate !== null && itemVatRate > 0) {
              // Use correct VAT calculation for VAT-inclusive prices
              // VAT = (Price × VAT Rate) / (100 + VAT Rate)
              const itemVAT = (itemTotal * itemVatRate) / (100 + itemVatRate);
              orderVATAmount += itemVAT;
            }
          });
        }
      }
      
      const netAmount = grossAmount - orderVATAmount;
      totalNetAmount += netAmount;
      totalVATAmount += orderVATAmount;
      totalGrossAmount += grossAmount;
      
      // Classify VAT for breakdown
      if (orderVATAmount > 0) {
        standardRateVAT += orderVATAmount;
      } else {
        zeroRateVAT += 0;
      }
      
      if (order.orderNumber === 'KIT-4263') {
        console.log(`🔍 KIT-4263 Final: Gross £${grossAmount}, VAT £${orderVATAmount.toFixed(2)}, Net £${netAmount.toFixed(2)}`);
      }
    });
    
    const vatSummary: VATSummary = {
      totalNet: totalNetAmount,
      totalVAT: totalVATAmount,
      totalGross: totalGrossAmount,
      standardRateVAT: standardRateVAT,
      zeroRateVAT: zeroRateVAT
    };

    const topItems = calculateTopItems(orders);

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      vatSummary,
      orders,
      topItemsByQuantity: topItems.byQuantity,
      topItemsByRevenue: topItems.byRevenue
    };
  };

  // Filter orders by source
  const getFilteredOrdersBySource = (source: ReportType) => {
    switch (source) {
      case 'online':
        return filteredOrders.filter(order => order.orderSource === 'online');
      case 'in_restaurant':
        return filteredOrders.filter(order => order.orderSource === 'in_restaurant');
      case 'total':
      default:
        return filteredOrders;
    }
  };

  // Filter orders with search functionality
  const searchFilteredOrders = useMemo(() => {
    const currentOrders = getFilteredOrdersBySource(activeReport);
    
    if (!searchTerm) return currentOrders;
    
    return currentOrders.filter(order => 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredOrders, activeReport, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(searchFilteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = searchFilteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when search term or active report changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeReport]);

  // Calculate breakdown data for online and in-restaurant orders (for Total tab)
  const onlineOrdersData = useMemo(() => {
    const onlineOrders = filteredOrders.filter(order => order.orderSource === 'online');
    return generateReportData(onlineOrders);
  }, [filteredOrders]);

  const inRestaurantOrdersData = useMemo(() => {
    const inRestaurantOrders = filteredOrders.filter(order => order.orderSource === 'in_restaurant');
    return generateReportData(inRestaurantOrders);
  }, [filteredOrders]);

  const reportData = useMemo(() => {
    return generateReportData(getFilteredOrdersBySource(activeReport));
  }, [filteredOrders, activeReport]);

  // Quick date filters
  const setQuickDate = (type: string) => {
    const today = new Date();
    switch (type) {
      case 'today':
        setDate({ from: today, to: today });
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        setDate({ from: weekStart, to: today });
        break;
      case 'month':
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        setDate({ from: monthStart, to: today });
        break;
      case '6month':
        const sixMonthStart = new Date(today);
        sixMonthStart.setMonth(today.getMonth() - 6);
        setDate({ from: sixMonthStart, to: today });
        break;
      case '1year':
        const yearStart = new Date(today);
        yearStart.setFullYear(today.getFullYear() - 1);
        setDate({ from: yearStart, to: today });
        break;
    }
  };

  // Download HMRC-compliant CSV
  const downloadHMRCCSV = (reportType: ReportType) => {
    const orders = getFilteredOrdersBySource(reportType);
    
    if (orders.length === 0) {
      toast({ 
        variant: 'destructive', 
        title: 'No Data', 
        description: `No ${reportType === 'total' ? '' : reportType + ' '}orders to export in the selected date range.` 
      });
      return;
    }

    const headers = HMRCVATCalculator.getHMRCCSVHeaders();
    const csvRows = [
      headers.join(','),
      ...orders.map(order => HMRCVATCalculator.orderToHMRCCSVRow(order).map(cell => 
        // Escape commas in text fields
        typeof cell === 'string' && cell.includes(',') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','))
    ];

    // Add summary row
    const vatSummary = HMRCVATCalculator.calculateBulkVAT(
      orders.map(order => ({ total: parseFloat(order.total?.toString() || '0') || 0 }))
    );
    
    csvRows.push(''); // Empty row
    csvRows.push('SUMMARY');
    csvRows.push(`Total Orders,${orders.length}`);
    csvRows.push(`Total Net,£${vatSummary.totalNet.toFixed(2)}`);
    csvRows.push(`Total VAT,£${vatSummary.totalVAT.toFixed(2)}`);
    csvRows.push(`Total Gross,£${vatSummary.totalGross.toFixed(2)}`);

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    
    const reportTypeLabel = reportType === 'total' ? 'all' : reportType.replace('_', '-');
    const dateLabel = format(date?.from || new Date(), 'yyyy-MM-dd');
    a.setAttribute('download', `hmrc-${reportTypeLabel}-orders-${dateLabel}.csv`);
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({ 
      title: 'HMRC Report Downloaded', 
      description: `${reportType === 'total' ? 'Complete' : reportType.replace('_', ' ')} orders report downloaded successfully.` 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading HMRC reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-4">
              <span className="w-8 h-8 text-blue-600 text-2xl font-bold">£</span>
              <span className="text-2xl font-bold">Business Reports</span>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Professional sales reports with VAT breakdown for Smart compliance and business tax submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {/* Refresh Button */}
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-2"
            >
              🔄 Refresh Data
            </Button>
            
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[300px] justify-start text-left font-normal border-2",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd MMM yyyy")} - {format(date.to, "dd MMM yyyy")}
                      </>
                    ) : (
                      format(date.from, "dd MMM yyyy")
                    )
                  ) : (
                    <span>Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b bg-gray-50">
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setQuickDate('today')}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDate('week')}>
                      Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDate('month')}>
                      Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDate('6month')}>
                      6 Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDate('1year')}>
                      1 Year
                    </Button>
                  </div>
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      {/* Report Type Tabs */}
      <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as ReportType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="online" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Online Orders
          </TabsTrigger>
          <TabsTrigger value="in_restaurant" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            In-Restaurant Orders
          </TabsTrigger>
          <TabsTrigger value="total" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Total Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeReport} className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <span className="text-lg font-bold text-muted-foreground">£</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {currencySymbol}{reportData.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Gross amount including VAT
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.totalOrders}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeReport === 'total' ? 'All orders' : `${activeReport.replace('_', ' ')} orders`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <span className="text-lg font-bold text-muted-foreground">£</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {currencySymbol}{reportData.vatSummary.totalNet.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue excluding VAT
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">VAT Amount</CardTitle>
                <span className="text-lg font-bold text-muted-foreground">£</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {currencySymbol}{reportData.vatSummary.totalVAT.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  VAT @ 20% standard rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* VAT Breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Breakdown Summary
              </CardTitle>
              <Button 
                onClick={() => downloadHMRCCSV(activeReport)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Net Sales (excluding VAT):</span>
                    <span className="font-bold text-lg">{currencySymbol}{reportData.vatSummary.totalNet.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">VAT @ Standard Rate (20%):</span>
                    <span className="font-bold text-lg text-red-600">+{currencySymbol}{reportData.vatSummary.standardRateVAT.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="font-medium">Total VAT:</span>
                    <span className="font-bold text-lg text-green-600">{currencySymbol}{reportData.vatSummary.totalVAT.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="font-medium">Gross Sales (including VAT):</span>
                    <span className="font-bold text-lg text-blue-600">{currencySymbol}{reportData.vatSummary.totalGross.toFixed(2)}</span>
                  </div>
                  
                  {/* Order Source Breakdown - Only show in Total Orders tab */}
                  {activeReport === 'total' && (
                    <>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded border-l-4 border-purple-500">
                        <span className="font-medium">Online Orders Total:</span>
                        <span className="font-bold text-lg text-purple-600">
                          {currencySymbol}{onlineOrdersData.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded border-l-4 border-orange-500">
                        <span className="font-medium">In-Restaurant Orders Total:</span>
                        <span className="font-bold text-lg text-orange-600">
                          {currencySymbol}{inRestaurantOrdersData.totalRevenue.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Items Analytics */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Items by Quantity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Top 20 Items by Quantity
                </CardTitle>
                <CardDescription>Most ordered items by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.topItemsByQuantity.slice(0, 10).map((item, index) => {
                    const maxQuantity = reportData.topItemsByQuantity[0]?.quantity || 1;
                    const percentage = (item.quantity / maxQuantity) * 100;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm truncate max-w-[200px]" title={item.name}>
                            #{index + 1} {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600">{item.quantity}</span>
                            <span className="text-xs text-gray-500">qty</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{item.orderCount} orders</span>
                          <span>{currencySymbol}{item.averagePrice.toFixed(2)} avg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {reportData.topItemsByQuantity.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const csvContent = "Item Name,Quantity Sold,Revenue,Average Price,Order Count\n" +
                          reportData.topItemsByQuantity.map(item => 
                            `"${item.name}",${item.quantity},${item.revenue.toFixed(2)},${item.averagePrice.toFixed(2)},${item.orderCount}`
                          ).join("\n");
                        
                        const blob = new Blob([csvContent], { type: "text/csv" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `top-items-by-quantity-${activeReport}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Full List
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Items by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Top 20 Items by Revenue
                </CardTitle>
                <CardDescription>Highest earning items by total revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.topItemsByRevenue.slice(0, 10).map((item, index) => {
                    const maxRevenue = reportData.topItemsByRevenue[0]?.revenue || 1;
                    const percentage = (item.revenue / maxRevenue) * 100;
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm truncate max-w-[200px]" title={item.name}>
                            #{index + 1} {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-600">
                              {currencySymbol}{item.revenue.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{item.quantity} sold</span>
                          <span>{currencySymbol}{item.averagePrice.toFixed(2)} avg</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {reportData.topItemsByRevenue.length > 10 && (
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const csvContent = "Item Name,Revenue,Quantity Sold,Average Price,Order Count\n" +
                          reportData.topItemsByRevenue.map(item => 
                            `"${item.name}",${item.revenue.toFixed(2)},${item.quantity},${item.averagePrice.toFixed(2)},${item.orderCount}`
                          ).join("\n");
                        
                        const blob = new Blob([csvContent], { type: "text/csv" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `top-items-by-revenue-${activeReport}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Full List
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>
                    Detailed {activeReport === 'total' ? 'All' : activeReport.replace('_', ' ')} Orders Report
                  </CardTitle>
                  <CardDescription>
                    Complete order listing with corrected VAT breakdown for HMRC compliance. Menu prices shown as net amounts (VAT exclusive) with VAT added separately.
                  </CardDescription>
                </div>
                
                {/* Smart Search */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">
                        Net Amount
                        <div className="text-xs text-muted-foreground font-normal">
                          (VAT Exclusive)
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        VAT Amount
                        <div className="text-xs text-muted-foreground font-normal">
                          (Dynamic Rate)
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        Gross Amount
                        <div className="text-xs text-muted-foreground font-normal">
                          (VAT Inclusive)
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.length > 0 ? (
                      paginatedOrders.map(order => {
                        // Use VAT calculation from backend API (OrderVATCalculator)
                        const grossAmount = parseFloat(order.total?.toString() || '0') || 0;
                        
                        let vatAmount = 0;
                        
                        // Check if backend provided calculated VAT info
                        if (order.vatInfo && typeof order.vatInfo.totalVAT === 'number') {
                          // Use the calculated VAT from backend
                          vatAmount = order.vatInfo.totalVAT;
                        } else {
                          // Fallback: manually calculate if backend didn't provide VAT info
                          if (order.items && order.items.length > 0) {
                            order.items.forEach(item => {
                              const itemTotal = parseFloat(item.finalPrice?.toString() || '0') || 0;
                              const itemVatRate = item.menuItem?.vatRate ?? null;
                              const itemIsVatExempt = item.menuItem?.isVatExempt || false;
                              
                              if (itemIsVatExempt || itemVatRate === 0) {
                                // 0% VAT item
                                vatAmount += 0;
                              } else if (itemVatRate !== null && itemVatRate > 0) {
                                // Use correct VAT calculation for VAT-inclusive prices
                                // VAT = (Price × VAT Rate) / (100 + VAT Rate)
                                const itemVAT = (itemTotal * itemVatRate) / (100 + itemVatRate);
                                vatAmount += itemVAT;
                              }
                            });
                          }
                        }
                        
                        const netAmount = grossAmount - vatAmount;
                        
                        // Debug logging for specific orders
                        if (order.orderNumber === 'KIT-4263') {
                          console.log(`🔍 Detailed Table BACKEND VAT KIT-4263:`, {
                            orderNumber: order.orderNumber,
                            grossAmount,
                            backendVatAmount: order.vatInfo?.totalVAT,
                            calculatedVatAmount: vatAmount,
                            netAmount,
                            hasVatInfo: !!order.vatInfo
                          });
                        }
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell>{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                order.orderSource === 'online' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {order.orderSource === 'online' ? 'Online' : 'In-Restaurant'}
                              </span>
                            </TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{netAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-red-600">{currencySymbol}{vatAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">{currencySymbol}{grossAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {searchTerm ? 
                            `No orders found matching "${searchTerm}"` : 
                            `No ${activeReport === 'total' ? '' : activeReport.replace('_', ' ') + ' '}orders found for the selected period.`
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {searchFilteredOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, searchFilteredOrders.length)} of {searchFilteredOrders.length} orders
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        if (totalPages <= 5) {
                          return (
                            <Button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="w-10"
                            >
                              {page}
                            </Button>
                          );
                        } else {
                          // Show smart pagination with ellipsis for large page counts
                          const showPage = 
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 2 && page <= currentPage + 2);
                          
                          if (showPage) {
                            return (
                              <Button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                className="w-10"
                              >
                                {page}
                              </Button>
                            );
                          } else if (page === 2 && currentPage > 4) {
                            return <span key="ellipsis1" className="px-2">...</span>;
                          } else if (page === totalPages - 1 && currentPage < totalPages - 3) {
                            return <span key="ellipsis2" className="px-2">...</span>;
                          }
                          return null;
                        }
                      })}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
