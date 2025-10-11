'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MenuVariantsService, type MenuVariant, type CreateVariantData, type UpdateVariantData } from '@/lib/menu-variants-service';

interface PriceVariantsManagerProps {
  menuItemId: string;
  tenantId: string;
  currencySymbol: string;
}

interface VariantFormData {
  name: string;
  description: string;
  price: number;
  active: boolean;
}

const defaultFormData: VariantFormData = {
  name: '',
  description: '',
  price: 0,
  active: true
};

export default function PriceVariantsManager({ menuItemId, tenantId, currencySymbol }: PriceVariantsManagerProps) {
  const [variants, setVariants] = useState<MenuVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<MenuVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>(defaultFormData);
  const { toast } = useToast();

  useEffect(() => {
    if (menuItemId) {
      fetchVariants();
    }
  }, [menuItemId]);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const data = await MenuVariantsService.getVariants(menuItemId);
      setVariants(data);
    } catch (error) {
      console.error('Error fetching variants:', error);
      toast({
        title: "Error",
        description: "Failed to load price variants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Variant name is required",
        variant: "destructive"
      });
      return;
    }

    if (formData.price < 0) {
      toast({
        title: "Error",
        description: "Price cannot be negative",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      if (editingVariant) {
        // Update existing variant
        const updateData: UpdateVariantData = {
          id: editingVariant.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          active: formData.active
        };
        
        await MenuVariantsService.updateVariant(updateData);
        toast({
          title: "Success",
          description: "Price variant updated successfully"
        });
      } else {
        // Create new variant
        const createData: CreateVariantData = {
          menuItemId,
          tenantId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          displayOrder: variants.length + 1
        };
        
        await MenuVariantsService.createVariant(createData);
        toast({
          title: "Success",
          description: "Price variant created successfully"
        });
      }
      
      await fetchVariants();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast({
        title: "Error",
        description: "Failed to save price variant",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (variant: MenuVariant) => {
    setEditingVariant(variant);
    setFormData({
      name: variant.name,
      description: variant.description || '',
      price: variant.price,
      active: variant.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Are you sure you want to delete this price variant?')) {
      return;
    }

    try {
      setLoading(true);
      await MenuVariantsService.deleteVariant(variantId);
      toast({
        title: "Success",
        description: "Price variant deleted successfully"
      });
      await fetchVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast({
        title: "Error",
        description: "Failed to delete price variant",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVariant(null);
    setFormData(defaultFormData);
  };

  const handleOpenDialog = () => {
    setEditingVariant(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  if (loading && variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading Price Variants...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price Variants</CardTitle>
            <CardDescription>
              Create different size/portion options with different prices for this item
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingVariant ? 'Edit Price Variant' : 'Create Price Variant'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingVariant ? 'Update the variant details' : 'Add a new size or portion option'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="variant-name">Name *</Label>
                    <Input
                      id="variant-name"
                      placeholder="e.g. Small, Large, Family Size"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="variant-description">Description</Label>
                    <Textarea
                      id="variant-description"
                      placeholder="e.g. Perfect for sharing, Single serving"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="variant-price">Price ({currencySymbol}) *</Label>
                    <Input
                      id="variant-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="variant-active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    />
                    <Label htmlFor="variant-active">Active</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingVariant ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No price variants yet.</p>
            <p className="text-sm">Create variants to offer different sizes or portions of this item.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="cursor-grab text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variant.name}</span>
                    <span className="text-lg font-semibold text-primary">
                      {currencySymbol}{Number(variant.price).toFixed(2)}
                    </span>
                    {!variant.active && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {variant.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {variant.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(variant)}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(variant.id)}
                    disabled={loading}
                    className="text-red-600 bg-red-50 border-red-300 hover:text-white hover:bg-red-600 hover:border-red-600 transition-colors shadow-sm"
                  >
                    <Trash2 className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
