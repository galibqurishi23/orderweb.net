import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2, Tag, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
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
import { MenuCategory, MenuItem } from '@/lib/menu-types';

interface SortableCategoryRowProps {
  category: MenuCategory;
  isSubcategory?: boolean;
  menuItems?: MenuItem[];
  onEdit: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
}

export function SortableCategoryRow({ 
  category, 
  isSubcategory = false, 
  menuItems = [], 
  onEdit, 
  onDelete 
}: SortableCategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemCount = menuItems.filter(item => item.categoryId === category.id).length;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/50 ${isDragging ? 'bg-muted' : ''}`}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-100"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          {isSubcategory ? (
            <>
              <span className="text-gray-400">└</span>
              <Layers className="w-4 h-4 text-gray-500" />
            </>
          ) : (
            <Tag className="w-4 h-4 text-blue-600" />
          )}
          {category.name}
        </div>
      </TableCell>
      <TableCell>
        <span className="line-clamp-2">{category.description || '-'}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {itemCount} items
        </Badge>
      </TableCell>
      <TableCell>
        <Badge 
          variant={category.active ? "default" : "secondary"}
          className={category.active ? "bg-green-100 text-green-800 border-green-200" : ""}
        >
          {category.active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category)}
            className="h-8 w-8"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{category.name}"? Items in this category will become uncategorized. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(category)}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                >
                  Delete Category
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface SortableCategoriesTableProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onEdit: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
  onReorder: (categoryIds: string[]) => void;
}

export function SortableCategoriesTable({
  categories,
  menuItems,
  onEdit,
  onDelete,
  onReorder
}: SortableCategoriesTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create hierarchical structure for display
  const getHierarchicalCategories = () => {
    const parentCategories = categories.filter(cat => !cat.parentId);
    return parentCategories.map(parent => ({
      ...parent,
      subcategories: categories.filter(cat => cat.parentId === parent.id)
    }));
  };

  // Flatten categories for sorting while maintaining hierarchy
  const flattenedCategories = getHierarchicalCategories()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .flatMap(parent => [
      parent,
      ...parent.subcategories.sort((a, b) => a.displayOrder - b.displayOrder)
    ]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = flattenedCategories.findIndex(cat => cat.id === active.id);
      const newIndex = flattenedCategories.findIndex(cat => cat.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedCategories = arrayMove(flattenedCategories, oldIndex, newIndex);
        const categoryIds = reorderedCategories.map(cat => cat.id);
        onReorder(categoryIds);
      }
    }
  }

  const categoryIds = flattenedCategories.map(cat => cat.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Items Count</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
            {flattenedCategories.map((category) => {
              const isSubcategory = !!category.parentId;
              return (
                <SortableCategoryRow
                  key={category.id}
                  category={category}
                  isSubcategory={isSubcategory}
                  menuItems={menuItems}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              );
            })}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  );
}
