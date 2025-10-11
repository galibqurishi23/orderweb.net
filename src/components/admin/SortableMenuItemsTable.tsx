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
import { 
  GripVertical, 
  Edit, 
  Trash2, 
  Package, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Star,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { MenuItem, MenuCategory } from '@/lib/menu-types';
import { getCurrencySymbol } from '@/lib/currency-utils';

interface SortableMenuItemRowProps {
  item: MenuItem;
  categories: MenuCategory[];
  currency: string;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onView: (item: MenuItem) => void;
}

export function SortableMenuItemRow({ 
  item, 
  categories, 
  currency,
  onEdit, 
  onDelete,
  onView
}: SortableMenuItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currencySymbol = getCurrencySymbol(currency);
  const category = categories.find(c => c.id === item.categoryId);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-muted/50 ${isDragging ? 'bg-muted' : ''}`}
    >
      <TableCell className="w-10 p-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-gray-100"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </TableCell>
      <TableCell className="w-[300px] font-medium">
        <div className="flex items-center gap-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 object-cover rounded-lg shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{item.name}</span>
              {item.isFeatured && (
                <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            {item.description && (
              <span className="text-sm text-gray-500 line-clamp-1 truncate">
                {item.description}
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[120px]">
        <span className="font-semibold text-gray-900">
          {currencySymbol}{item.price.toFixed(2)}
        </span>
      </TableCell>
      <TableCell className="w-[140px]">
        {category ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
            {category.name}
          </Badge>
        ) : (
          <Badge variant="secondary" className="whitespace-nowrap">Uncategorized</Badge>
        )}
      </TableCell>
      <TableCell className="w-[120px]">
        <div className="flex items-center gap-1">
          {item.available ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700 font-medium">Active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-700 font-medium">Inactive</span>
            </>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[140px] text-center">
        <div className="flex gap-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(item)}
            className="h-8 w-8"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(item)}
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
                <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(item)}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
                >
                  Delete Item
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface SortableMenuItemsTableProps {
  items: MenuItem[];
  categories: MenuCategory[];
  currency: string;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onView: (item: MenuItem) => void;
  onReorder: (itemIds: string[], categoryId?: string) => void;
  selectedCategory?: string;
}

export function SortableMenuItemsTable({
  items,
  categories,
  currency,
  onEdit,
  onDelete,
  onView,
  onReorder,
  selectedCategory
}: SortableMenuItemsTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort items by display order
  const sortedItems = [...items].sort((a, b) => {
    const orderA = a.displayOrder || 0;
    const orderB = b.displayOrder || 0;
    return orderA - orderB;
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex(item => item.id === active.id);
      const newIndex = sortedItems.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(sortedItems, oldIndex, newIndex);
        const itemIds = reorderedItems.map(item => item.id);
        
        // If we have a selected category, pass it to the reorder function
        const categoryId = selectedCategory && selectedCategory !== 'all' && selectedCategory !== 'uncategorized' 
          ? selectedCategory 
          : undefined;
        
        onReorder(itemIds, categoryId);
      }
    }
  }

  const itemIds = sortedItems.map(item => item.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-[300px]">Item</TableHead>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead className="w-[140px]">Category</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {sortedItems.map((item) => (
                <SortableMenuItemRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  currency={currency}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
}
