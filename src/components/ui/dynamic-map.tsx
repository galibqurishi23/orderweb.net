'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeliveryZone } from '@/lib/types';

export interface MapProps {
  zones: DeliveryZone[];
  restaurantLocation?: [number, number];
  onZoneCreate?: (zone: Partial<DeliveryZone>) => void;
  editMode?: boolean;
  height?: string;
  selectedZone?: DeliveryZone | null;
}

// Dynamic import to avoid SSR issues with Leaflet
const LeafletMapComponent = dynamic(
  () => import('./leaflet-map').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
          <div className="text-sm text-slate-500">Loading interactive map...</div>
        </div>
      </div>
    ),
  }
);

export function MapContainer(props: MapProps) {
  return <LeafletMapComponent {...props} />;
}
