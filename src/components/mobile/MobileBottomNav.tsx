import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Menu, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  cartItemCount: number;
  cartTotal: number;
  currencySymbol: string;
  onCartClick: () => void;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

export const MobileBottomNav = memo(function MobileBottomNav({
  cartItemCount,
  cartTotal,
  currencySymbol,
  onCartClick,
  onMenuClick,
  onSearchClick,
  onProfileClick,
  className
}: MobileBottomNavProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden",
      className
    )}>
      <div className="flex items-center justify-between p-2">
        {/* Navigation Icons */}
        <div className="flex space-x-1">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">Menu</span>
            </Button>
          )}
          
          {onSearchClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearchClick}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <Search className="h-5 w-5" />
              <span className="text-xs">Search</span>
            </Button>
          )}
          
          {onProfileClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onProfileClick}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <User className="h-5 w-5" />
              <span className="text-xs">Profile</span>
            </Button>
          )}
        </div>
        
        {/* Cart Button */}
        <Button
          onClick={onCartClick}
          className="flex-1 max-w-[200px] ml-2 relative"
          disabled={cartItemCount === 0}
        >
          <div className="flex items-center justify-center gap-2">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Badge>
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {cartItemCount === 0 ? 'Cart' : `${cartItemCount} item${cartItemCount !== 1 ? 's' : ''}`}
              </span>
              {cartTotal > 0 && (
                <span className="text-xs opacity-90">
                  {currencySymbol}{cartTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
});

export default MobileBottomNav;