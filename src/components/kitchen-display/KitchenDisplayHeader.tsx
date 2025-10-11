'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock,
  Monitor
} from 'lucide-react';

interface KitchenDisplay {
  id: string;
  displayName: string;
  theme: 'light' | 'dark' | 'high-contrast';
  fontSize: 'small' | 'medium' | 'large';
}

interface KitchenDisplayHeaderProps {
  display: KitchenDisplay;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  lastUpdate: Date;
  onBack: () => void;
  onRefresh: () => void;
}

export function KitchenDisplayHeader({ 
  display, 
  connectionStatus, 
  lastUpdate, 
  onBack, 
  onRefresh 
}: KitchenDisplayHeaderProps) {
  
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Connecting...';
    }
  };

  const getConnectionBadgeVariant = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'default' as const;
      case 'disconnected':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between p-2 sm:p-4">
        {/* Left Section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-1 sm:space-x-2 h-8 sm:h-9 px-2 sm:px-3"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Monitor className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
            <div>
              <h1 className="text-sm sm:text-xl font-semibold text-gray-900 truncate max-w-32 sm:max-w-none">
                {display.displayName}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Kitchen Display System</p>
            </div>
          </div>
        </div>

        {/* Center Section - Time (hidden on mobile) */}
        <div className="text-center hidden lg:block">
          <div className="text-2xl font-mono font-bold text-gray-900">
            {new Date().toLocaleTimeString()}
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-1 sm:space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {getConnectionIcon()}
            <Badge variant={getConnectionBadgeVariant()} className="text-xs hidden sm:inline-flex">
              {getConnectionText()}
            </Badge>
          </div>

          {/* Last Update (hidden on mobile) */}
          <div className="items-center space-x-2 text-sm text-gray-500 hidden lg:flex">
            <Clock className="h-4 w-4" />
            <span>
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="flex items-center space-x-1 sm:space-x-2 h-8 sm:h-9 px-2 sm:px-3"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Display Settings (hidden on mobile) */}
          <div className="items-center space-x-2 hidden lg:flex">
            <Badge variant="outline" className="text-xs">
              {display.theme}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {display.fontSize}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Mobile time display */}
      <div className="lg:hidden border-t bg-gray-50 px-2 py-1 text-center">
        <div className="text-sm font-mono font-semibold text-gray-700">
          {new Date().toLocaleTimeString()} • {new Date().toLocaleDateString()}
        </div>
      </div>
    </header>
  );
}
