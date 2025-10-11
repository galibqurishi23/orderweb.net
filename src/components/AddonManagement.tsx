'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Edit, Trash2, Settings, Eye, EyeOff, 
  Package, Tag, DollarSign, Users, BarChart3,
  Copy, Upload, Download, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  AddonGroup, AddonOption, CreateAddonGroupRequest, UpdateAddonGroupRequest,
  CreateAddonOptionRequest, UpdateAddonOptionRequest, AddonStats
} from '@/lib/addon-types';
import * as AddonService from '@/lib/addon-service';

interface AddonManagementProps {
  tenantId: string;
}

export default function AddonManagement({ tenantId }: AddonManagementProps) {
  const { toast } = useToast();
  
  // State
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [stats, setStats] = useState<AddonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<AddonGroup | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroup | null>(null);
  const [editingOption, setEditingOption] = useState<AddonOption | null>(null);
  const [selectedGroupForOption, setSelectedGroupForOption] = useState<string>('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [groupForm, setGroupForm] = useState<CreateAddonGroupRequest>({
    name: '',
    description: '',
    category: 'extras',
    type: 'multiple',
    required: false,
    minSelections: 0,
    maxSelections: 10,
    displayOrder: 0,
    active: true,
    options: []
  });

  const [optionForm, setOptionForm] = useState<CreateAddonOptionRequest>({
    addonGroupId: '',
    name: '',
    price: 0,
    available: true,
    description: ''
  });

  // Load data
  useEffect(() => {
    loadAddonGroups();
    loadStats();
  }, [tenantId]);

  const loadAddonGroups = async () => {
    try {
      setLoading(true);
      const groups = await AddonService.getAllAddonGroupsForTenant(tenantId);
      setAddonGroups(groups);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load addon groups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const addonStats = await AddonService.getAddonStats(tenantId);
      setStats(addonStats);
    } catch (error) {
      console.error('Failed to load addon stats:', error);
    }
  };

  // Filter addon groups
  const filteredGroups = addonGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || group.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && group.active) ||
                         (statusFilter === 'inactive' && !group.active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Reset forms
  const resetGroupForm = () => {
    setGroupForm({
      name: '',
      description: '',
      category: 'extras',
      type: 'multiple',
      required: false,
      minSelections: 0,
      maxSelections: 10,
      displayOrder: 0,
      active: true,
      options: []
    });
    setEditingGroup(null);
  };

  const resetOptionForm = () => {
    setOptionForm({
      addonGroupId: selectedGroupForOption,
      name: '',
      price: 0,
      available: true,
      description: ''
    });
    setEditingOption(null);
  };

  // Group operations
  const handleSaveGroup = async () => {
    try {
      if (editingGroup) {
        await AddonService.updateAddonGroup(tenantId, {
          id: editingGroup.id,
          ...groupForm
        });
        toast({
          title: 'Success',
          description: 'Addon group updated successfully'
        });
      } else {
        await AddonService.createAddonGroup(tenantId, groupForm);
        toast({
          title: 'Success',
          description: 'Addon group created successfully'
        });
      }
      
      setIsGroupDialogOpen(false);
      resetGroupForm();
      loadAddonGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save addon group',
        variant: 'destructive'
      });
    }
  };

  const handleEditGroup = (group: AddonGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      category: group.category,
      type: group.type,
      required: group.required,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      displayOrder: group.displayOrder,
      active: group.active,
      conditionalVisibility: group.conditionalVisibility,
      displayStyle: group.displayStyle,
      allowCustomInput: group.allowCustomInput,
      options: group.options.map(opt => ({
        name: opt.name,
        price: opt.price,
        available: opt.available,
        description: opt.description
      }))
    });
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await AddonService.deleteAddonGroup(tenantId, groupId);
      toast({
        title: 'Success',
        description: 'Addon group deleted successfully'
      });
      loadAddonGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete addon group',
        variant: 'destructive'
      });
    }
  };

  // Option operations
  const handleSaveOption = async () => {
    try {
      if (editingOption) {
        await AddonService.updateAddonOption(tenantId, {
          id: editingOption.id,
          ...optionForm
        });
        toast({
          title: 'Success',
          description: 'Addon option updated successfully'
        });
      } else {
        await AddonService.createAddonOption(tenantId, optionForm);
        toast({
          title: 'Success',
          description: 'Addon option created successfully'
        });
      }
      
      setIsOptionDialogOpen(false);
      resetOptionForm();
      loadAddonGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save addon option',
        variant: 'destructive'
      });
    }
  };

  const handleEditOption = (option: AddonOption, groupId: string) => {
    setEditingOption(option);
    setSelectedGroupForOption(groupId);
    setOptionForm({
      addonGroupId: groupId,
      name: option.name,
      price: option.price,
      available: option.available,
      description: option.description || '',
      imageUrl: option.imageUrl,
      nutritionInfo: option.nutritionInfo,
      quantityPricing: option.quantityPricing
    });
    setIsOptionDialogOpen(true);
  };

  const handleDeleteOption = async (optionId: string) => {
    try {
      await AddonService.deleteAddonOption(tenantId, optionId);
      toast({
        title: 'Success',
        description: 'Addon option deleted successfully'
      });
      loadAddonGroups();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete addon option',
        variant: 'destructive'
      });
    }
  };

  const addOptionToGroupForm = () => {
    setGroupForm(prev => ({
      ...prev,
      options: [...prev.options, { name: '', price: 0, available: true }]
    }));
  };

  const removeOptionFromGroupForm = (index: number) => {
    setGroupForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateGroupFormOption = (index: number, field: string, value: any) => {
    setGroupForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading addon groups...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Groups</p>
                <p className="text-2xl font-bold">{stats.totalGroups}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Tag className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Options</p>
                <p className="text-2xl font-bold">{stats.totalOptions}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Required Groups</p>
                <p className="text-2xl font-bold">{stats.requiredGroups}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold">${stats.avgPricePerOption.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Addon Management
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetGroupForm} className="bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 border border-blue-200 hover:border-blue-300">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Group
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingGroup ? 'Edit Addon Group' : 'Create New Addon Group'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-name">Group Name *</Label>
                        <Input
                          id="group-name"
                          value={groupForm.name}
                          onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Pizza Toppings"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="group-category">Category</Label>
                        <Select 
                          value={groupForm.category} 
                          onValueChange={(value: any) => setGroupForm(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="toppings">Toppings</SelectItem>
                            <SelectItem value="sauces">Sauces</SelectItem>
                            <SelectItem value="sides">Sides</SelectItem>
                            <SelectItem value="drinks">Drinks</SelectItem>
                            <SelectItem value="extras">Extras</SelectItem>
                            <SelectItem value="size">Size</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="group-description">Description</Label>
                      <Textarea
                        id="group-description"
                        value={groupForm.description}
                        onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description for this addon group"
                        rows={2}
                      />
                    </div>

                    {/* Selection Settings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-type">Selection Type</Label>
                        <Select 
                          value={groupForm.type} 
                          onValueChange={(value: any) => setGroupForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single Choice (Radio)</SelectItem>
                            <SelectItem value="multiple">Multiple Choice (Checkbox)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-selections">Min Selections</Label>
                        <Input
                          id="min-selections"
                          type="number"
                          min="0"
                          value={groupForm.minSelections}
                          onChange={(e) => setGroupForm(prev => ({ ...prev, minSelections: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max-selections">Max Selections</Label>
                        <Input
                          id="max-selections"
                          type="number"
                          min="1"
                          value={groupForm.maxSelections}
                          onChange={(e) => setGroupForm(prev => ({ ...prev, maxSelections: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="required"
                          checked={groupForm.required}
                          onCheckedChange={(checked) => setGroupForm(prev => ({ ...prev, required: checked }))}
                        />
                        <Label htmlFor="required">Required Selection</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={groupForm.active}
                          onCheckedChange={(checked) => setGroupForm(prev => ({ ...prev, active: checked }))}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </div>

                    {/* Options Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Options</Label>
                        <Button type="button" variant="outline" onClick={addOptionToGroupForm}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Option
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {groupForm.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Input
                              placeholder="Option name"
                              value={option.name}
                              onChange={(e) => updateGroupFormOption(index, 'name', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="Price"
                              type="number"
                              step="0.01"
                              value={option.price}
                              onChange={(e) => updateGroupFormOption(index, 'price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOptionFromGroupForm(index)}
                              className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveGroup}>
                        {editingGroup ? 'Update Group' : 'Create Group'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Input
              placeholder="Search addon groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="toppings">Toppings</SelectItem>
                <SelectItem value="sauces">Sauces</SelectItem>
                <SelectItem value="sides">Sides</SelectItem>
                <SelectItem value="drinks">Drinks</SelectItem>
                <SelectItem value="extras">Extras</SelectItem>
                <SelectItem value="size">Size</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Addon Groups Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-sm text-muted-foreground">{group.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {group.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.type === 'single' ? 'default' : 'secondary'}>
                          {group.type === 'single' ? 'Single' : 'Multiple'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {group.options.length} option{group.options.length !== 1 ? 's' : ''}
                          <div className="text-xs text-muted-foreground">
                            {group.minSelections}-{group.maxSelections} selections
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.required ? 'destructive' : 'secondary'}>
                          {group.required ? 'Required' : 'Optional'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.active ? 'default' : 'secondary'}>
                          {group.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGroup(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Addon Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{group.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                                >
                                  Delete Group
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-12 w-12" />
                        <div>
                          {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                            ? "No addon groups found matching your criteria" 
                            : "No addon groups yet. Create your first addon group!"
                          }
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
