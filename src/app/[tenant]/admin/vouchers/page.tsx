'use client';

import React, { useState, useMemo } from 'react';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { Tag, Plus, Edit, Trash2, Save, X, Check, Ban } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import type { Voucher } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Percent, Banknote } from 'lucide-react';


const VoucherCard = ({ voucher, onEdit, onDelete, onToggle, currencySymbol }: { voucher: Voucher; onEdit: (v: Voucher) => void; onDelete: (id: string) => void; onToggle: (id: string) => void; currencySymbol: string; }) => {
    const isExpired = new Date(voucher.expiryDate) < new Date();
    const status = isExpired ? 'Expired' : voucher.active ? 'Active' : 'Inactive';

    return (
        <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <span className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            {voucher.type === 'percentage' ? <Percent className="w-6 h-6 text-primary" /> : <Banknote className="w-6 h-6 text-primary" />}
                        </span>
                        <div>
                            <CardTitle className="font-mono text-xl">{voucher.code}</CardTitle>
                            <CardDescription>{voucher.type === 'percentage' ? `${voucher.value}% off` : `${currencySymbol}${voucher.value.toFixed(2)} off`}</CardDescription>
                        </div>
                    </div>
                     <Badge variant={status === 'Active' ? 'default' : 'destructive'}>{status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Min. Order</span>
                    <span className="font-semibold">{currencySymbol}{voucher.minOrder.toFixed(2)}</span>
                </div>
                 {voucher.maxDiscount && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Max Discount</span>
                        <span className="font-semibold">{currencySymbol}{voucher.maxDiscount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-semibold">{voucher.usedCount} / {voucher.usageLimit || '∞'}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expires on</span>
                    <span className="font-semibold">{new Date(voucher.expiryDate).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                    })}</span>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <div className="flex w-full gap-2">
                     <Button variant="outline" size="icon" onClick={() => onEdit(voucher)} className="flex-grow"><Edit className="w-4 h-4" /></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="flex-grow text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Voucher?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the <strong>{voucher.code}</strong> voucher. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(voucher.id)} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700">Delete Voucher</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
                 <Button variant="secondary" className="w-full" onClick={() => onToggle(voucher.id)} disabled={isExpired}>
                    {voucher.active ? <Ban className="w-4 h-4 mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                    {voucher.active ? 'Deactivate' : 'Activate'}
                </Button>
            </CardFooter>
        </Card>
    );
};

const VoucherFormDialog = ({ isOpen, onClose, onSave, voucher, currencySymbol }: { isOpen: boolean; onClose: () => void; onSave: (v: Voucher) => void; voucher: Partial<Voucher> | null; currencySymbol: string; }) => {
    const [formData, setFormData] = useState<Partial<Voucher> | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        if (isOpen && voucher) {
            setFormData({ ...voucher, expiryDate: new Date(voucher.expiryDate!) });
        } else if (isOpen) {
            setFormData({
                id: `voucher-${Date.now()}`,
                code: '',
                type: 'percentage',
                value: 10,
                minOrder: 0,
                active: true,
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                usedCount: 0
            });
        }
    }, [isOpen, voucher]);

    if (!isOpen || !formData) return null;

    const handleSaveClick = async () => {
        if (!formData.code || !formData.value || !formData.expiryDate) {
            toast({ variant: 'destructive', title: "Validation Error", description: "Voucher code, value, and expiry date are required." });
            return;
        }
        await onSave(formData as Voucher);
        onClose();
    };
    
    const setFieldValue = (field: keyof Voucher, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{voucher ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
                    <DialogDescription>Create and configure discount codes for your customers.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="code">Voucher Code</Label>
                        <Input id="code" value={formData.code} onChange={e => setFieldValue('code', e.target.value.toUpperCase())} placeholder="e.g., WELCOME10" />
                    </div>

                    <div>
                        <Label>Discount Type</Label>
                         <RadioGroup defaultValue={formData.type} onValueChange={(v: 'percentage' | 'amount') => setFieldValue('type', v)} className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                                <RadioGroupItem value="percentage" id="r-percentage" className="peer sr-only" />
                                <Label htmlFor="r-percentage" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                    <Percent className="mb-3 h-6 w-6" />
                                    Percentage
                                </Label>
                            </div>

                            <div>
                                <RadioGroupItem value="amount" id="r-amount" className="peer sr-only" />
                                <Label htmlFor="r-amount" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                    <Banknote className="mb-3 h-6 w-6" />
                                    Fixed Amount
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="value">Value ({formData.type === 'percentage' ? '%' : currencySymbol})</Label>
                            <Input id="value" type="number" value={formData.value} onChange={e => setFieldValue('value', parseFloat(e.target.value) || 0)} />
                        </div>
                        <div>
                            <Label htmlFor="minOrder">Min. Order ({currencySymbol})</Label>
                            <Input id="minOrder" type="number" value={formData.minOrder} onChange={e => setFieldValue('minOrder', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    
                    {formData.type === 'percentage' && (
                         <div>
                            <Label htmlFor="maxDiscount">Max Discount ({currencySymbol}) (Optional)</Label>
                            <Input id="maxDiscount" type="number" value={formData.maxDiscount || ''} onChange={e => setFieldValue('maxDiscount', e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="No limit" />
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input id="expiryDate" type="date" value={new Date(formData.expiryDate!).toISOString().split('T')[0]} onChange={e => setFieldValue('expiryDate', new Date(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="usageLimit">Usage Limit (Optional)</Label>
                            <Input id="usageLimit" type="number" value={formData.usageLimit || ''} onChange={e => setFieldValue('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)} placeholder="Unlimited" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveClick}><Save className="w-4 h-4 mr-2" />Save Voucher</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function VouchersPage() {
    const { tenantData, vouchers, refreshVouchers } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { toast } = useToast();

    // Load vouchers when component mounts
    React.useEffect(() => {
        const loadVouchers = async () => {
            if (tenantData?.id) {
                await refreshVouchers();
                setLoading(false);
            }
        };
        loadVouchers();
    }, [tenantData?.id, refreshVouchers]);

    // Restaurant settings from tenantData
    const restaurantSettings = {
        currency: tenantData?.currency || 'GBP',
        timezone: tenantData?.timezone || 'Europe/London'
    };

    // Save voucher function
    const saveVoucher = async (voucher: Voucher) => {
        try {
            const response = await fetch('/api/tenant/vouchers', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify(voucher)
            });
            
            if (response.ok) {
                await refreshVouchers();
                toast({
                    title: "Success",
                    description: `Voucher ${voucher.id ? 'updated' : 'created'} successfully`,
                });
            }
        } catch (error) {
            console.error('Failed to save voucher:', error);
            toast({
                title: "Error",
                description: "Failed to save voucher",
                variant: "destructive",
            });
        }
    };

    // Delete voucher function
    const deleteVoucher = async (voucherId: string) => {
        try {
            const response = await fetch('/api/tenant/vouchers', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify({ id: voucherId })
            });
            
            if (response.ok) {
                await refreshVouchers();
                toast({
                    title: "Success",
                    description: "Voucher deleted successfully",
                });
            }
        } catch (error) {
            console.error('Failed to delete voucher:', error);
            toast({
                title: "Error",
                description: "Failed to delete voucher",
                variant: "destructive",
            });
        }
    };

    // Toggle voucher status function
    const toggleVoucherStatus = async (voucherId: string) => {
        try {
            const response = await fetch('/api/tenant/vouchers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify({ id: voucherId, action: 'toggle' })
            });
            
            if (response.ok) {
                await refreshVouchers();
                toast({
                    title: "Success",
                    description: "Voucher status updated",
                });
            }
        } catch (error) {
            console.error('Failed to toggle voucher status:', error);
            toast({
                title: "Error",
                description: "Failed to update voucher status",
                variant: "destructive",
            });
        }
    };

    // Delete all vouchers function
    const deleteAllVouchers = async () => {
        try {
            const response = await fetch('/api/tenant/vouchers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData?.id || ''
                },
                body: JSON.stringify({ action: 'deleteAll' })
            });
            
            if (response.ok) {
                await refreshVouchers();
                toast({
                    title: "Success",
                    description: "All vouchers deleted successfully",
                });
            }
        } catch (error) {
            console.error('Failed to delete all vouchers:', error);
            toast({
                title: "Error",
                description: "Failed to delete all vouchers",
                variant: "destructive",
            });
        }
    };

    const currencySymbol = useMemo(() => {
        return getCurrencySymbol(restaurantSettings.currency);
    }, [restaurantSettings.currency]);

    const handleAddNew = () => {
        setEditingVoucher(null);
        setIsFormOpen(true);
    };

    const handleEdit = (voucher: Voucher) => {
        setEditingVoucher(voucher);
        setIsFormOpen(true);
    };
    
    const handleDelete = async (voucherId: string) => {
        await deleteVoucher(voucherId);
        toast({ title: "Voucher Deleted", description: "The voucher has been removed." });
    };

    const handleSave = async (voucherData: Voucher) => {
        const isNew = voucherData.id.startsWith('voucher-');
        await saveVoucher(voucherData);
        toast({ title: isNew ? "Voucher Added" : "Voucher Updated", description: `The "${voucherData.code}" voucher has been saved.`});
        setIsFormOpen(false);
        setEditingVoucher(null);
    };
    
    const handleToggleStatus = async (voucherId: string) => {
        await toggleVoucherStatus(voucherId);
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-4">
                            <Tag className="w-8 h-8" />
                            <span className="text-2xl font-bold">Voucher Management</span>
                        </CardTitle>
                        <CardDescription>Create and manage discounts and promotions.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {vouchers.length > 0 && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">
                                        <Trash2 className="w-4 h-4 mr-2"/>
                                        Delete All
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete All Vouchers?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete all {vouchers.length} voucher(s). This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={deleteAllVouchers} 
                                            className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                                        >
                                            Delete All Vouchers
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button onClick={handleAddNew}>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add Voucher
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {vouchers.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vouchers.map(voucher => (
                        <VoucherCard 
                            key={voucher.id}
                            voucher={voucher}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggle={handleToggleStatus}
                            currencySymbol={currencySymbol}
                        />
                    ))}
                </div>
            ) : (
                 <Card className="text-center py-16">
                    <CardContent>
                        <Tag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold mb-2">No Vouchers Found</h3>
                        <p className="text-muted-foreground text-lg mb-6">Click "Add Voucher" to create your first promotion.</p>
                        <Button onClick={handleAddNew}>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add New Voucher
                        </Button>
                    </CardContent>
                </Card>
            )}

            <VoucherFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                voucher={editingVoucher}
                currencySymbol={currencySymbol}
            />
        </div>
    );
}
