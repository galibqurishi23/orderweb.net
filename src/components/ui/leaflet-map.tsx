'use client';

import React from 'react';
import type { DeliveryZone } from '@/lib/types';

// Placeholder for leaflet map component - missing dependencies
// TODO: Install react-leaflet, leaflet, and @turf/turf for full functionality

interface MapProps {
  zones: DeliveryZone[];
  restaurantLocation?: [number, number];
  onZoneCreate?: (zone: Partial<DeliveryZone>) => void;
  editMode?: boolean;
  height?: string;
  selectedZone?: DeliveryZone | null;
}

export function LeafletMap({ 
  zones, 
  restaurantLocation,
  onZoneCreate,
  editMode = false,
  height = "400px",
  selectedZone
}: MapProps) {
  return (
    <div className={`w-full bg-gray-100 border border-gray-300 rounded-md flex items-center justify-center`} style={{ height }}>
      <div className="text-center p-4">
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Map Component</h3>
        <p className="text-sm text-gray-500">
          Leaflet map integration disabled for production build.
          <br />
          Install react-leaflet dependencies to enable map functionality.
        </p>
        <div className="mt-4 text-xs text-gray-400">
          Delivery Zones: {zones.length}
          {restaurantLocation && <div>Restaurant: {restaurantLocation[0]}, {restaurantLocation[1]}</div>}
          {editMode && <div>Edit Mode: Enabled</div>}
          {selectedZone && <div>Selected Zone: {selectedZone.id}</div>}
        </div>
      </div>
    </div>
  );
}

export default LeafletMap;
