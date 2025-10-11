import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingCartButtonProps {
  cartItemCount: number;
  cartTotal: number;
  currencySymbol: string;
  onClick: () => void;
  className?: string;
}

export const FloatingCartButton = memo(function FloatingCartButton({
  cartItemCount,
  cartTotal,
  currencySymbol,
  onClick,
  className
}: FloatingCartButtonProps) {
  // Don't show if cart is empty
  if (cartItemCount === 0) {
    return null;
  }

  return (
    <Button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-40 shadow-lg hover:shadow-xl transition-all duration-300",
        "hidden md:flex items-center gap-3 px-4 py-3 h-auto rounded-full",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
    >
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
        >
          {cartItemCount > 99 ? '99+' : cartItemCount}
        </Badge>
      </div>
      
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-medium">
          {cartItemCount} item{cartItemCount !== 1 ? 's' : ''}
        </span>
        <span className="text-xs opacity-90">
          {currencySymbol}{cartTotal.toFixed(2)}
        </span>
      </div>
    </Button>
  );
});

export default FloatingCartButton;