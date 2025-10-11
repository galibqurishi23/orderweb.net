import React, { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Category } from '@/lib/types';

interface MenuNavProps {
  categories: Category[];
  activeCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  className?: string;
}

export const MenuNav = memo(function MenuNav({
  categories,
  activeCategory,
  onCategorySelect,
  className
}: MenuNavProps) {
  // Use all categories since items are managed separately
  const categoriesWithItems = useMemo(() => categories, [categories]);

  if (categoriesWithItems.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-30", className)}>
      <ScrollArea className="w-full">
        <div className="flex space-x-1 p-4 min-w-max">
          {categoriesWithItems.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onCategorySelect(category.id)}
              className={cn(
                "whitespace-nowrap transition-all duration-200 font-medium",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-gray-600 hover:text-primary hover:bg-primary/5"
              )}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

export default MenuNav;