'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Upload, Palette, 
  Eye, EyeOff, Move, AlertCircle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DietaryCharacteristic {
  id: number;
  name: string;
  description: string;
  icon_type: 'svg' | 'png';
  svg_content?: string;
  png_path?: string;
  default_color: string;
  category: 'dietary' | 'allergen' | 'lifestyle' | 'preparation';
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const categoryLabels = {
  dietary: 'Dietary',
  allergen: 'Allergen',
  lifestyle: 'Lifestyle', 
  preparation: 'Preparation'
};

const categoryColors = {
  dietary: 'bg-green-100 text-green-800',
  allergen: 'bg-red-100 text-red-800',
  lifestyle: 'bg-blue-100 text-blue-800',
  preparation: 'bg-orange-100 text-orange-800'
};

export default function DietaryCharacteristicsManager() {
  const [characteristics, setCharacteristics] = useState<DietaryCharacteristic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_type: 'svg' as 'svg' | 'png',
    svg_content: '',
    png_file: null as File | null,
    default_color: '#22c55e',
    category: 'dietary' as 'dietary' | 'allergen' | 'lifestyle' | 'preparation',
    is_active: true,
    display_order: 0
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load characteristics
  useEffect(() => {
    loadCharacteristics();
  }, []);

  const loadCharacteristics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dietary-characteristics');
      const data = await response.json();
      
      if (data.success) {
        setCharacteristics(data.characteristics);
      } else {
        setError('Failed to load characteristics');
      }
    } catch (error) {
      setError('Error loading characteristics');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon_type: 'svg',
      svg_content: '',
      png_file: null,
      default_color: '#22c55e',
      category: 'dietary',
      is_active: true,
      display_order: 0
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (characteristic: DietaryCharacteristic) => {
    setFormData({
      name: characteristic.name,
      description: characteristic.description || '',
      icon_type: characteristic.icon_type,
      svg_content: characteristic.svg_content || '',
      png_file: null,
      default_color: characteristic.default_color,
      category: characteristic.category,
      is_active: characteristic.is_active,
      display_order: characteristic.display_order
    });
    setEditingId(characteristic.id);
    setIsDialogOpen(true);
  };

  // Handle file upload for SVG/PNG
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'image/svg+xml' || fileName.endsWith('.svg')) {
      // Handle SVG file
      const text = await file.text();
      setFormData(prev => ({
        ...prev,
        icon_type: 'svg',
        svg_content: text,
        png_file: null
      }));
    } else if (fileType.startsWith('image/') && (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))) {
      // Handle PNG/JPG file
      setFormData(prev => ({
        ...prev,
        icon_type: 'png',
        png_file: file,
        svg_content: ''
      }));
    } else {
      setError('Please upload a valid SVG or PNG/JPG file');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Simple validation
      if (!formData.name.trim()) {
        setError('Name is required');
        return;
      }

      if (formData.icon_type === 'svg' && !formData.svg_content.trim()) {
        setError('Please upload an SVG file');
        return;
      }

      if (formData.icon_type === 'png' && !editingId && !formData.png_file) {
        setError('Please upload a PNG file');
        return;
      }

      let submitData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon_type: formData.icon_type,
        default_color: formData.default_color,
        category: 'dietary', // Default to dietary category
        is_active: true, // Always active
        display_order: 0 // Auto-order
      };

      if (formData.icon_type === 'svg') {
        submitData.svg_content = formData.svg_content.trim();
      } else if (formData.icon_type === 'png' && formData.png_file) {
        // Convert PNG file to base64 for storage in database
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formData.png_file!);
        });
        
        const base64String = await base64Promise;
        submitData.png_path = base64String; // Store base64 data URL
      }

      if (editingId) {
        submitData.id = editingId;
      }

      const url = '/api/dietary-characteristics';
      const method = editingId ? 'PUT' : 'POST';
      
      console.log('🚀 Submitting dietary characteristic:', {
        method,
        url,
        data: submitData
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();
      
      console.log('📥 API Response:', {
        status: response.status,
        result
      });

      if (result.success) {
        setSuccess(editingId ? 'Characteristic updated successfully' : 'Characteristic created successfully');
        await loadCharacteristics();
        setIsDialogOpen(false);
        resetForm();
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this characteristic? This will remove it from all menu items.')) {
      return;
    }

    try {
      // Optimistically remove from UI immediately
      setCharacteristics(prev => prev.filter(char => char.id !== id));
      
      const response = await fetch(`/api/dietary-characteristics?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Characteristic deleted successfully');
        // Reload to ensure we're in sync with server
        await loadCharacteristics();
      } else {
        setError(result.error || 'Failed to delete characteristic');
        // Reload to restore the item if deletion failed
        await loadCharacteristics();
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error:', error);
      // Reload to restore the item if there was an error
      await loadCharacteristics();
    }
  };

  const handleToggleActive = async (characteristic: DietaryCharacteristic) => {
    try {
      // Optimistically update UI immediately
      setCharacteristics(prev => prev.map(char => 
        char.id === characteristic.id 
          ? { ...char, is_active: !char.is_active }
          : char
      ));
      
      const response = await fetch('/api/dietary-characteristics', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: characteristic.id,
          is_active: !characteristic.is_active
        })
      });

      const result = await response.json();

      if (result.success) {
        // Reload to ensure we're in sync with server
        await loadCharacteristics();
      } else {
        setError(result.error || 'Failed to update status');
        // Reload to restore the correct state
        await loadCharacteristics();
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error:', error);
    }
  };

  const renderIcon = (characteristic: DietaryCharacteristic, size = 24) => {
    if (characteristic.icon_type === 'svg' && characteristic.svg_content) {
      // Clean and fix SVG content to ensure proper sizing
      let cleanSvg = characteristic.svg_content.trim();
      
      // Remove any existing width/height attributes
      cleanSvg = cleanSvg.replace(/\s*width\s*=\s*["'][^"']*["']/gi, '');
      cleanSvg = cleanSvg.replace(/\s*height\s*=\s*["'][^"']*["']/gi, '');
      
      // Ensure viewBox exists, if not add a default one
      if (!cleanSvg.includes('viewBox')) {
        cleanSvg = cleanSvg.replace('<svg', '<svg viewBox="0 0 24 24"');
      }
      
      // Add proper sizing attributes
      cleanSvg = cleanSvg.replace(
        '<svg',
        `<svg width="${size}" height="${size}"`
      );
      
      return (
        <div 
          style={{ 
            width: size, 
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}
          dangerouslySetInnerHTML={{ __html: cleanSvg }}
        />
      );
    } else if (characteristic.icon_type === 'png' && characteristic.png_path) {
      // Check if it's a base64 data URL or old file path
      const isBase64 = characteristic.png_path.startsWith('data:image/');
      
      if (isBase64) {
        // Handle base64 images
        return (
          <img 
            src={characteristic.png_path} 
            alt={characteristic.name}
            style={{ 
              width: size, 
              height: size,
              objectFit: 'contain',
              flexShrink: 0
            }}
            onError={(e) => {
              console.error('Base64 image failed to load for:', characteristic.name);
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      } else {
        // Handle old file paths - show placeholder instead of broken image
        return (
          <div 
            style={{ 
              width: size, 
              height: size,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: characteristic.default_color,
              borderRadius: '4px',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              flexShrink: 0
            }}
          >
            {characteristic.name.charAt(0).toUpperCase()}
          </div>
        );
      }
    }
    return (
      <div 
        style={{ 
          width: size, 
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
        className="bg-gray-200 rounded text-xs text-gray-500"
      >
        ?
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dietary characteristics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dietary Characteristics Manager</h1>
          <p className="text-gray-600 mt-1">Manage dietary icons for all restaurants</p>
        </div>
        <Button onClick={openAddDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Characteristic
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-800">{success}</span>
          <Button variant="ghost" size="sm" onClick={() => setSuccess('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-800">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Simple Characteristics Grid - Just Icon and Name */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {characteristics.map((characteristic) => (
          <Card key={characteristic.id} className={`hover:shadow-md transition-shadow ${!characteristic.is_active ? 'opacity-50' : ''}`}>
            <CardContent className="p-6 text-center">
              {/* Icon */}
              <div className="mb-4 flex justify-center">
                {renderIcon(characteristic, 48)}
              </div>
              
              {/* Name */}
              <h3 className="font-medium text-sm text-gray-900 mb-4">
                {characteristic.name}
              </h3>
              
              {/* Simple Actions */}
              <div className="flex gap-1 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(characteristic)}
                  className="h-8 px-3"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(characteristic.id)}
                  className="h-8 px-3 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {characteristics.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">No dietary characteristics found.</p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Characteristic
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Characteristic' : 'Add New Characteristic'}
            </DialogTitle>
            <DialogDescription>
              Upload SVG or PNG icons for dietary characteristics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Vegetarian, Gluten Free"
                required
              />
            </div>

            {/* Description Field */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this characteristic"
                rows={2}
              />
            </div>

            {/* File Upload for SVG/PNG */}
            <div>
              <Label htmlFor="icon_file">Icon File (SVG or PNG) *</Label>
              <Input
                id="icon_file"
                type="file"
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload SVG or PNG files. Icons will be automatically resized to 40px.
              </p>
            </div>

            {/* Preview uploaded icon */}
            {(formData.svg_content || formData.png_file) && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded border">
                  {formData.icon_type === 'svg' && formData.svg_content ? (
                    <div 
                      className="w-8 h-8"
                      dangerouslySetInnerHTML={{ __html: formData.svg_content }}
                      style={{ color: formData.default_color }}
                    />
                  ) : formData.png_file ? (
                    <img 
                      src={URL.createObjectURL(formData.png_file)} 
                      alt="Preview"
                      className="w-8 h-8 object-contain"
                    />
                  ) : null}
                </div>
                <div className="text-sm text-gray-600">
                  <p>Preview: {formData.name || 'Icon'}</p>
                  <p className="text-xs">Type: {formData.icon_type?.toUpperCase()}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
