'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  CreditCard,
  Settings,
  LogOut,
  Crown,
  Send,
  Apple,
  Key,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSettingsProvider, useGlobalSettings } from '@/context/GlobalSettingsContext';

const navItems = [
  { href: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/super-admin/restaurants', icon: Store, label: 'Restaurants' },
  { href: '/super-admin/users', icon: Users, label: 'Users' },
  { href: '/super-admin/license-management', icon: Key, label: 'License Management' },
  { href: '/super-admin/business-info', icon: Building, label: 'Business Info' },
  { href: '/super-admin/dietary-characteristics', icon: Apple, label: 'Dietary Icons' },
  { href: '/super-admin/email-management', icon: Send, label: 'Send Email' },
  { href: '/super-admin/billing', icon: CreditCard, label: 'Billing' },
  { href: '/super-admin/settings', icon: Settings, label: 'Settings' }
];

// Inner Layout Component (uses settings context)
function SuperAdminLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const { settings } = useGlobalSettings();

  if (pathname === '/super-admin') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        {/* Header Section - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            {/* Dynamic Logo Display */}
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0">
              {settings.appLogo && settings.appLogo !== '/icons/logo.svg' ? (
                <Image 
                  src={settings.appLogo} 
                  alt={settings.appName || 'Super Admin'}
                  width={40}
                  height={40}
                  className="object-contain rounded-lg"
                />
              ) : (
                <Crown className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent block truncate">
                {settings.appName || 'Super Admin'}
              </span>
              <p className="text-xs text-gray-500">Platform Control</p>
            </div>
          </div>
          
          {/* Logout button */}
          <Link
            href="/super-admin"
            className="flex items-center justify-center space-x-2 text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Link>
        </div>

        {/* Navigation Section - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 mx-2 px-3 py-2.5 text-sm hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-lg',
                    isActive ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-purple-700 font-semibold shadow-sm border border-purple-200' : 'text-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Platform Stats - Fixed at Bottom */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-500">Platform Status</p>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <main className="h-full overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Main Layout Component (provides settings context)
export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <GlobalSettingsProvider>
      <SuperAdminLayoutInner>
        {children}
      </SuperAdminLayoutInner>
    </GlobalSettingsProvider>
  );
}
