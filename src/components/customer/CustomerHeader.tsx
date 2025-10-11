import React, { memo } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Phone, Globe, Star } from 'lucide-react';
interface TenantData {
  logo?: string;
  business_name?: string;
  business_description?: string;
  business_address?: string;
  business_phone?: string;
  business_type?: string;
  cuisine_type?: string;
  address?: string;
  phone?: string;
  website?: string;
  delivery_fee?: number;
  minimum_order?: number;
  min_order_amount?: number;
  estimated_delivery_time?: string;
  rating?: number;
  total_reviews?: number;
  operating_hours?: any;
  currency_symbol?: string;
}

interface CustomerHeaderProps {
  tenant: TenantData;
  onLoginClick: () => void;
}

export const CustomerHeader = memo(function CustomerHeader({
  tenant,
  onLoginClick
}: CustomerHeaderProps) {
  const hasValidLogo = tenant.logo && 
    tenant.logo.length > 0 && 
    !tenant.logo.includes('placehold.co');

  return (
    <div className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header Content */}
        <div className="flex items-start space-x-4">
          {/* Logo */}
          {hasValidLogo && (
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={tenant.logo}
                alt={`${tenant.business_name} logo`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 64px, 80px"
                priority
              />
            </div>
          )}
          
          {/* Business Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                  {tenant.business_name}
                </h1>
                
                {tenant.business_description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {tenant.business_description}
                  </p>
                )}
                
                {/* Business Details */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  {tenant.business_address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate max-w-[200px]">
                        {tenant.business_address}
                      </span>
                    </div>
                  )}
                  
                  {tenant.business_phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{tenant.business_phone}</span>
                    </div>
                  )}
                  
                  {tenant.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={tenant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Website
                      </a>
                    </div>
                  )}
                </div>
                
                {/* Operating Hours */}
                {tenant.operating_hours && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{tenant.operating_hours}</span>
                  </div>
                )}
                
                {/* Business Type Badge */}
                {tenant.business_type && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {tenant.business_type}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Login Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onLoginClick}
                className="ml-4 flex-shrink-0"
              >
                Login
              </Button>
            </div>
          </div>
        </div>
        
        {/* Additional Info Row */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            {/* Rating if available */}
            {tenant.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{tenant.rating}</span>
              </div>
            )}
            
            {/* Delivery info */}
            {tenant.delivery_fee !== undefined && (
              <div>
                Delivery: {tenant.currency_symbol || '$'}{tenant.delivery_fee.toFixed(2)}
              </div>
            )}
            
            {tenant.minimum_order && (
              <div>
                Min order: {tenant.currency_symbol || '$'}{tenant.minimum_order.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default CustomerHeader;