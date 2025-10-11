'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Edit2, Save, X, GripVertical, Check, AlertCircle } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { 
  MealDeal, 
  MealDealCategory, 
  MenuItem,
  CategorySelectionType 
} from '@/lib/menu-types'

interface MealDealsManagerProps {
  tenantId: string // This is actually the slug (e.g., "kitchen")
  tenantUuid?: string // This is the actual UUID for database operations
}

interface MenuItemOption extends MenuItem {
  selected?: boolean
}

const SELECTION_TYPES: Array<{
  value: CategorySelectionType
  label: string
  description: string
}> = [
  { value: 'required', label: 'Required', description: 'Customer must select from this category' },
  { value: 'optional', label: 'Optional', description: 'Customer can choose to select from this category' }
]

export default function MealDealsManager({ tenantId, tenantUuid }: MealDealsManagerProps) {
  const [mealDeals, setMealDeals] = useState<MealDeal[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [editingDeal, setEditingDeal] = useState<MealDeal | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state for meal deal creation/editing
  const [dealForm, setDealForm] = useState({
    name: '',
    description: '',
    price: '',
    categories: [] as MealDealCategory[]
  })

  useEffect(() => {
    loadMealDeals()
    loadMenuItems()
  }, [tenantId])

  const loadMealDeals = async () => {
    try {
      // Use tenantUuid for meal deals API (database operations need the UUID)
      const apiTenant = tenantUuid || tenantId
      const response = await fetch(`/api/${apiTenant}/meal-deals`)
      if (response.ok) {
        const deals = await response.json()
        setMealDeals(deals)
      }
    } catch (error) {
      console.error('Failed to load meal deals:', error)
      toast.error('Failed to load meal deals')
    } finally {
      setLoading(false)
    }
  }

  const loadMenuItems = async () => {
    try {
      // Use the same format as TenantDataContext - tenantId here is actually the slug
      const response = await fetch(`/api/menu?tenantId=${tenantId}&action=menu`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Extract menu items from the category structure
          const menuItems = result.data.flatMap((categoryData: any) => 
            categoryData.items.map((item: any) => ({
              ...item,
              categoryId: categoryData.category.id
            }))
          )
          setMenuItems(menuItems)
        }
      }
    } catch (error) {
      console.error('Failed to load menu items:', error)
      toast.error('Failed to load menu items')
    }
  }

  const startCreating = () => {
    setIsCreating(true)
    setEditingDeal(null)
    setDealForm({
      name: '',
      description: '',
      price: '',
      categories: []
    })
  }

  const startEditing = (deal: MealDeal) => {
    setEditingDeal(deal)
    setIsCreating(false)
    setDealForm({
      name: deal.name,
      description: deal.description || '',
      price: deal.price.toString(),
      categories: [...deal.categories]
    })
  }

  const cancelEditing = () => {
    setEditingDeal(null)
    setIsCreating(false)
    setDealForm({
      name: '',
      description: '',
      price: '',
      categories: []
    })
  }

  const addCategory = () => {
    const newCategory: MealDealCategory = {
      id: `cat-${Date.now()}`,
      name: 'Choose an Option',
      selectionType: 'required',
      minSelections: 1,
      maxSelections: 1,
      menuItemIds: []
    }

    setDealForm(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }))
  }

  const updateCategory = (categoryId: string, updates: Partial<MealDealCategory>) => {
    setDealForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    }))
  }

  const removeCategory = (categoryId: string) => {
    setDealForm(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId)
    }))
  }

  const toggleMenuItem = (categoryId: string, menuItemId: string) => {
    setDealForm(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id === categoryId) {
          const isSelected = cat.menuItemIds.includes(menuItemId)
          return {
            ...cat,
            menuItemIds: isSelected 
              ? cat.menuItemIds.filter(id => id !== menuItemId)
              : [...cat.menuItemIds, menuItemId]
          }
        }
        return cat
      })
    }))
  }

  const saveMealDeal = async () => {
    if (!dealForm.name.trim() || !dealForm.price || dealForm.categories.length === 0) {
      toast.error('Please fill in all required fields and add at least one category')
      return
    }

    setSaving(true)
    try {
      const dealData = {
        name: dealForm.name.trim(),
        description: dealForm.description.trim(),
        price: parseFloat(dealForm.price),
        categories: dealForm.categories,
        active: true,
        displayOrder: mealDeals.length
      }

      const apiTenant = tenantUuid || tenantId
      const url = editingDeal 
        ? `/api/${apiTenant}/meal-deals/${editingDeal.id}`
        : `/api/${apiTenant}/meal-deals`
      
      const method = editingDeal ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealData)
      })

      if (response.ok) {
        toast.success(editingDeal ? 'Meal deal updated successfully' : 'Meal deal created successfully')
        await loadMealDeals()
        cancelEditing()
      } else {
        throw new Error('Failed to save meal deal')
      }
    } catch (error) {
      console.error('Failed to save meal deal:', error)
      toast.error('Failed to save meal deal')
    } finally {
      setSaving(false)
    }
  }

  const toggleDealStatus = async (dealId: string, active: boolean) => {
    try {
      const apiTenant = tenantUuid || tenantId
      const response = await fetch(`/api/${apiTenant}/meal-deals/${dealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      })

      if (response.ok) {
        toast.success(active ? 'Meal deal activated' : 'Meal deal deactivated')
        await loadMealDeals()
      } else {
        throw new Error('Failed to update meal deal status')
      }
    } catch (error) {
      console.error('Failed to update meal deal status:', error)
      toast.error('Failed to update meal deal status')
    }
  }

  const deleteMealDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this meal deal?')) return

    try {
      const apiTenant = tenantUuid || tenantId
      const response = await fetch(`/api/${apiTenant}/meal-deals/${dealId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Meal deal deleted successfully')
        await loadMealDeals()
      } else {
        throw new Error('Failed to delete meal deal')
      }
    } catch (error) {
      console.error('Failed to delete meal deal:', error)
      toast.error('Failed to delete meal deal')
    }
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(dealForm.categories)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setDealForm(prev => ({
      ...prev,
      categories: items
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading meal deals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Smart Meal Deals</h2>
          <p className="text-muted-foreground">
            Create dynamic meal deals with flexible category selection rules
          </p>
        </div>
        <Button onClick={startCreating} disabled={isCreating || !!editingDeal}>
          <Plus className="h-4 w-4 mr-2" />
          Create Meal Deal
        </Button>
      </div>

      {/* Creating/Editing Form */}
      {(isCreating || editingDeal) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingDeal ? 'Edit Meal Deal' : 'Create New Meal Deal'}
            </CardTitle>
            <CardDescription>
              Build a dynamic meal deal with customizable categories and selection rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal-name">Deal Name *</Label>
                <Input
                  id="deal-name"
                  value={dealForm.name}
                  onChange={(e) => setDealForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Family Combo, Student Special"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-price">Price *</Label>
                <Input
                  id="deal-price"
                  type="number"
                  step="0.01"
                  value={dealForm.price}
                  onChange={(e) => setDealForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="29.99"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal-description">Description</Label>
              <Textarea
                id="deal-description"
                value={dealForm.description}
                onChange={(e) => setDealForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what makes this meal deal special..."
                rows={3}
              />
            </div>

            {/* Categories Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Categories</h3>
                <Button variant="outline" size="sm" onClick={addCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>

              {dealForm.categories.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No categories added yet</p>
                  <Button variant="outline" onClick={addCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Category
                  </Button>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="categories">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {dealForm.categories.map((category, index) => (
                          <Draggable key={category.id} draggableId={category.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border rounded-lg p-4 bg-card ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                              >
                                <div className="flex items-start gap-4">
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="mt-2 text-muted-foreground hover:text-foreground cursor-grab"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>

                                  <div className="flex-1 space-y-4">
                                    {/* Category Header */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Category Name</Label>
                                        <Input
                                          value={category.name}
                                          onChange={(e) => updateCategory(category.id, { name: e.target.value })}
                                          placeholder="e.g., Choose a Main, Pick Sides"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Selection Type</Label>
                                        <Select
                                          value={category.selectionType}
                                          onValueChange={(value: CategorySelectionType) => 
                                            updateCategory(category.id, { selectionType: value })
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {SELECTION_TYPES.map(type => (
                                              <SelectItem key={type.value} value={type.value}>
                                                <div>
                                                  <div className="font-medium">{type.label}</div>
                                                  <div className="text-xs text-muted-foreground">{type.description}</div>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {/* Selection Rules */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Minimum Selections</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={category.minSelections}
                                          onChange={(e) => updateCategory(category.id, { minSelections: parseInt(e.target.value) || 0 })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Maximum Selections</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={category.maxSelections}
                                          onChange={(e) => updateCategory(category.id, { maxSelections: parseInt(e.target.value) || 1 })}
                                        />
                                      </div>
                                    </div>

                                    {/* Menu Items Selection */}
                                    <div className="space-y-2">
                                      <Label>Available Menu Items ({category.menuItemIds.length} selected)</Label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                                        {menuItems.map(item => (
                                          <div
                                            key={item.id}
                                            className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
                                              category.menuItemIds.includes(item.id)
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted hover:bg-muted/80'
                                            }`}
                                            onClick={() => toggleMenuItem(category.id, item.id)}
                                          >
                                            <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
                                              category.menuItemIds.includes(item.id)
                                                ? 'border-primary-foreground bg-transparent'
                                                : 'border-muted-foreground'
                                            }`}>
                                              {category.menuItemIds.includes(item.id) && (
                                                <Check className="h-3 w-3" />
                                              )}
                                            </div>
                                            <div className="flex-1 text-sm">
                                              <div className="font-medium">{item.name}</div>
                                              <div className="text-xs opacity-75">£{item.price.toFixed(2)}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCategory(category.id)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Button onClick={saveMealDeal} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingDeal ? 'Update Deal' : 'Create Deal'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Meal Deals */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          Existing Meal Deals ({mealDeals.length})
        </h3>

        {mealDeals.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <div className="text-muted-foreground mb-4">
                <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No meal deals yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first meal deal to start offering dynamic combos to customers
              </p>
              <Button onClick={startCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Meal Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mealDeals.map(deal => (
              <Card key={deal.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold">{deal.name}</h4>
                        <Badge variant={deal.active ? 'default' : 'secondary'}>
                          {deal.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-lg font-bold text-primary">
                          £{deal.price.toFixed(2)}
                        </span>
                      </div>
                      
                      {deal.description && (
                        <p className="text-muted-foreground mb-3">{deal.description}</p>
                      )}
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Categories ({deal.categories.length}):</p>
                        <div className="flex flex-wrap gap-2">
                          {deal.categories.map(category => (
                            <Badge key={category.id} variant="outline" className="text-xs">
                              {category.name} 
                              <span className="ml-1 text-muted-foreground">
                                ({category.selectionType === 'required' ? 'Required' : 'Optional'})
                                {category.minSelections === category.maxSelections 
                                  ? ` - Select ${category.minSelections}`
                                  : ` - ${category.minSelections}-${category.maxSelections}`
                                }
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={deal.active}
                          onCheckedChange={(checked) => toggleDealStatus(deal.id, checked)}
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(deal)}
                        disabled={isCreating || editingDeal !== null}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMealDeal(deal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
