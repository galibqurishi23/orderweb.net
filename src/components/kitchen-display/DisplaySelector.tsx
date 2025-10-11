'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Settings } from 'lucide-react';

interface KitchenDisplay {
  id: string;
  displayName: string;
  theme: 'light' | 'dark' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
  layoutConfig: any;
  soundAlerts: boolean;
  refreshIntervalSeconds: number;
}

interface DisplaySelectorProps {
  displays: KitchenDisplay[];
  onSelect: (display: KitchenDisplay) => void;
}

export function DisplaySelector({ displays, onSelect }: DisplaySelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (display: KitchenDisplay) => {
    setSelectedId(display.id);
    setTimeout(() => onSelect(display), 100);
  };

  const getThemeColor = (theme: string) => {
    switch (theme) {
      case 'dark': return 'bg-gray-800 text-white';
      case 'high-contrast': return 'bg-black text-yellow-400';
      default: return 'bg-white text-gray-900';
    }
  };

  const getFontSizeBadge = (size: string) => {
    switch (size) {
      case 'small': return 'A';
      case 'large': return 'A';
      default: return 'A';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Kitchen Display System
        </h1>
        <p className="text-gray-600">
          Select a kitchen display to start viewing orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displays.map((display) => (
          <Card 
            key={display.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
              selectedId === display.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleSelect(display)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Monitor className="h-6 w-6 text-blue-600" />
                <Badge variant="outline" className="text-xs">
                  {display.theme}
                </Badge>
              </div>
              <CardTitle className="text-lg">{display.displayName}</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Theme Preview */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Theme Preview:</div>
                <div className={`p-3 rounded-md text-center text-sm ${getThemeColor(display.theme)}`}>
                  Sample Order Display
                </div>
              </div>

              {/* Settings */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Font Size:</span>
                <Badge variant="secondary" className="text-xs">
                  {display.fontSize}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Sound Alerts:</span>
                <Badge variant={display.soundAlerts ? "default" : "secondary"} className="text-xs">
                  {display.soundAlerts ? 'On' : 'Off'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Refresh Rate:</span>
                <Badge variant="outline" className="text-xs">
                  {display.refreshIntervalSeconds}s
                </Badge>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full mt-4"
                onClick={() => handleSelect(display)}
              >
                <Monitor className="h-4 w-4 mr-2" />
                Launch Display
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Need to configure displays? Contact your administrator or visit the 
          <Button variant="link" className="p-0 h-auto ml-1">
            <Settings className="h-4 w-4 mr-1" />
            printer settings
          </Button>
        </p>
      </div>
    </div>
  );
}
