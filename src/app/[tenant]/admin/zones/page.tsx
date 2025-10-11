'use client';

import React, { useState, useRef, useMemo } from 'react';
import { getCurrencySymbol } from '@/lib/currency-utils';
import { MapPin, Edit, Trash2, Plus, Save, X, Upload, Clock } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { useTenant } from '@/context/TenantContext';
import type { DeliveryZone } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

const ZoneCard = ({ zone, onEdit, onDelete, currencySymbol }: { 
    zone: DeliveryZone; 
    onEdit: (zone: DeliveryZone) => void; 
    onDelete: (zoneId: string) => void; 
    currencySymbol: string; 
}) => (
    <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
            <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-3">
                        <span className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-primary" />
                        </span>
                        <div>
                            {zone.name}
                            <div className="text-sm font-normal text-muted-foreground mt-1">
                                <Badge variant="secondary" className="text-xs">
                                    Postcode Zone
                                </Badge>
                            </div>
                        </div>
                    </CardTitle>
                </div>
                <div className="flex space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(zone)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the <strong>{zone.name}</strong> delivery zone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={() => onDelete(zone.id)} 
                                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                                >
                                    Delete Zone
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow space-y-4">
            <div className="text-sm space-y-3">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className="font-semibold">
                        {zone.deliveryFee === 0 ? (
                            <span className="text-green-600">FREE</span>
                        ) : (
                            `${currencySymbol}${zone.deliveryFee.toFixed(2)}`
                        )}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Min. Order</span>
                    <span className="font-semibold">{currencySymbol}{zone.minOrder.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5"/>Delivery Time
                    </span>
                    <span className="font-semibold">{zone.deliveryTime} min</span>
                </div>
            </div>
            
            {/* Postcodes Display */}
            <div className="pt-3 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                    Postcodes ({zone.postcodes?.length || 0})
                </div>
                {zone.postcodes && zone.postcodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {zone.postcodes.slice(0, 6).map(postcode => (
                            <Badge key={postcode} variant="outline" className="text-xs font-mono">
                                {postcode}
                            </Badge>
                        ))}
                        {zone.postcodes.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                                +{zone.postcodes.length - 6} more
                            </Badge>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">No postcodes added</span>
                )}
            </div>
        </CardContent>
    </Card>
);

const ZoneFormDialog = ({ isOpen, onClose, onSave, zone, currencySymbol, allZones }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (zone: DeliveryZone) => void;
    zone?: DeliveryZone | null;
    currencySymbol: string;
    allZones: DeliveryZone[];
}) => {
    const [formData, setFormData] = useState<Partial<DeliveryZone>>({});
    const [postcodeInput, setPostcodeInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        if (isOpen && zone) {
            setFormData({ ...zone });
        } else if (isOpen) {
            setFormData({
                id: `zone-${Date.now()}`,
                name: '',
                type: 'postcode',
                postcodes: [],
                deliveryFee: 2.50,
                minOrder: 10.00,
                deliveryTime: 45,
                collectionTime: 20
            });
        }
    }, [isOpen, zone]);

    if (!isOpen || !formData) return null;

    const handlePostcodeAdd = () => {
        const newPostcode = postcodeInput.trim().toUpperCase();
        if (newPostcode && !formData.postcodes?.includes(newPostcode)) {
            setFormData({ 
                ...formData, 
                postcodes: [...(formData.postcodes || []), newPostcode] 
            });
            setPostcodeInput('');
        }
    };
    
    const handlePostcodeRemove = (pc: string) => {
        setFormData({ 
            ...formData, 
            postcodes: formData.postcodes?.filter(p => p !== pc) 
        });
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const uploadedPostcodes = text.split(/[\s,;]+/)
                    .map(pc => pc.trim().toUpperCase())
                    .filter(Boolean);
                const uniquePostcodes = [...new Set([...(formData.postcodes || []), ...uploadedPostcodes])];
                setFormData({ ...formData, postcodes: uniquePostcodes });
                toast({ 
                    title: "Postcodes uploaded", 
                    description: `${uploadedPostcodes.length} postcodes added.` 
                });
            };
            reader.readAsText(file);
        }
    };

    const handleSaveClick = () => {
        if (!formData.name?.trim()) {
            toast({ 
                title: "Validation Error", 
                description: "Zone name is required.", 
                variant: "destructive" 
            });
            return;
        }

        if (!formData.postcodes || formData.postcodes.length === 0) {
            toast({ 
                title: "Validation Error", 
                description: "At least one postcode is required.", 
                variant: "destructive" 
            });
            return;
        }

        onSave(formData as DeliveryZone);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {zone ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}
                    </DialogTitle>
                    <DialogDescription>
                        Configure delivery area using postcodes, fees, and timing settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="zoneName">Zone Name</Label>
                            <Input
                                id="zoneName"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Central London"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="deliveryFee">Delivery Fee ({currencySymbol})</Label>
                            <Input
                                id="deliveryFee"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.deliveryFee || 0}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    deliveryFee: parseFloat(e.target.value) || 0 
                                })}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="minOrder">Minimum Order ({currencySymbol})</Label>
                            <Input
                                id="minOrder"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.minOrder || 0}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    minOrder: parseFloat(e.target.value) || 0 
                                })}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="deliveryTime">Delivery Time (minutes)</Label>
                            <Input
                                id="deliveryTime"
                                type="number"
                                min="1"
                                value={formData.deliveryTime || 45}
                                onChange={(e) => setFormData({ 
                                    ...formData, 
                                    deliveryTime: parseInt(e.target.value) || 45 
                                })}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Postcode Management */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-medium">Postcode Management</Label>
                            <p className="text-sm text-muted-foreground">
                                Add postcodes manually or upload a file with postcodes separated by commas, spaces, or new lines.
                            </p>
                        </div>

                        {/* Add Postcode */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter postcode (e.g., SW1A, EC1M)"
                                value={postcodeInput}
                                onChange={(e) => setPostcodeInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostcodeAdd()}
                                className="flex-1"
                            />
                            <Button onClick={handlePostcodeAdd} disabled={!postcodeInput.trim()}>
                                Add
                            </Button>
                        </div>

                        {/* File Upload */}
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".txt,.csv"
                                className="hidden"
                            />
                            <Button 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Upload File
                            </Button>
                            <span className="text-xs text-muted-foreground self-center">
                                Accepts .txt and .csv files
                            </span>
                        </div>

                        {/* Postcodes List */}
                        <div className="border rounded-lg p-4 min-h-[100px] max-h-[200px] overflow-y-auto">
                            {!formData?.postcodes || formData.postcodes.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-8">
                                    No postcodes added yet.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {formData.postcodes.map(pc => (
                                        <div key={pc} className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
                                            <span className="font-mono">{pc}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="w-5 h-5" 
                                                onClick={() => handlePostcodeRemove(pc)}
                                            >
                                                <X className="w-3 h-3"/>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveClick}>
                        <Save className="w-4 h-4 mr-2"/>Save Zone
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function DeliveryZonesPage() {
    const { deliveryZones, refreshDeliveryZones, tenantData } = useAdmin();
    const { tenantData: tenantDataFromTenant } = useTenant();
    const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { toast } = useToast();

    // Force refresh zones when component mounts
    React.useEffect(() => {
        if (tenantData?.id) {
            refreshDeliveryZones();
        }
    }, [tenantData?.id, refreshDeliveryZones]);

    const currencySymbol = useMemo(() => {
        return getCurrencySymbol(tenantData?.settings?.currency || 'GBP');
    }, [tenantData?.settings?.currency]);

    const handleAddNew = () => {
        setEditingZone(null);
        setIsFormOpen(true);
    };

    const handleEdit = (zone: DeliveryZone) => {
        setEditingZone(zone);
        setIsFormOpen(true);
    };

    const handleDelete = async (zoneId: string) => {
        try {
            if (!tenantData?.id) {
                throw new Error('Tenant ID is required');
            }

            const response = await fetch(`/api/tenant/zones`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify({ id: zoneId }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete delivery zone');
            }

            await refreshDeliveryZones();
            toast({ 
                title: "Zone Deleted", 
                description: "The delivery zone has been removed." 
            });
        } catch (error) {
            console.error('Error deleting delivery zone:', error);
            toast({
                title: "Delete Failed",
                description: "Failed to delete delivery zone. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    const handleSave = async (zoneData: DeliveryZone) => {
        try {
            if (!tenantData?.id) {
                throw new Error('Tenant ID is required');
            }

            const isEditing = editingZone && !zoneData.id.startsWith('zone-');
            
            // For tenant zones API, we always use POST and let the backend handle create/update
            const response = await fetch('/api/tenant/zones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantData.id
                },
                body: JSON.stringify(zoneData),
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Error response:', errorData);
                throw new Error(`Failed to save delivery zone: ${response.status} ${errorData}`);
            }

            await refreshDeliveryZones();
            toast({ 
                title: isEditing ? "Zone Updated" : "Zone Added", 
                description: `The "${zoneData.name}" zone has been saved.`
            });
            setIsFormOpen(false);
            setEditingZone(null);
        } catch (error) {
            console.error('Error saving delivery zone:', error);
            toast({
                title: "Save Failed",
                description: "Failed to save delivery zone. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-4">
                            <MapPin className="w-8 h-8" />
                            <span className="text-2xl font-bold">Delivery Zones</span>
                        </CardTitle>
                        <CardDescription>
                            Manage postcode-based delivery areas, fees, and coverage. Found {deliveryZones.length} zones.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAddNew}>
                        <Plus className="w-4 h-4 mr-2"/>
                        Add New Zone
                    </Button>
                </CardHeader>
            </Card>

            {deliveryZones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {deliveryZones.map(zone => (
                        <ZoneCard 
                            key={zone.id} 
                            zone={zone} 
                            onEdit={handleEdit} 
                            onDelete={handleDelete} 
                            currencySymbol={currencySymbol} 
                        />
                    ))}
                </div>
            ) : (
                <Card className="text-center py-16">
                    <CardContent>
                        <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold mb-2">No Delivery Zones Created</h3>
                        <p className="text-muted-foreground text-lg mb-6">
                            Click "Add New Zone" to set up your first postcode-based delivery area.
                        </p>
                        <Button onClick={handleAddNew}>
                            <Plus className="w-4 h-4 mr-2"/>
                            Add New Zone
                        </Button>
                    </CardContent>
                </Card>
            )}

            <ZoneFormDialog 
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                zone={editingZone}
                currencySymbol={currencySymbol}
                allZones={deliveryZones}
            />
        </div>
    );
}
