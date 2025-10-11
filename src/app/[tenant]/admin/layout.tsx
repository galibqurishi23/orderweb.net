'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ChefHat, 
  MapPin, 
  BarChart3, 
  Settings,
  LogOut,
  Printer,
  Tag,
  Clock,
  CreditCard,
  ClipboardList,
  Mail,
  Star,
  Users2,
  Phone,
  Key,
  Eye,
  Menu,
  X,
  Edit3,
  Cog,
  Network,
  Database
} from 'lucide-react';
import { DineDeskLogo } from '@/components/icons/logo';
import AdminLogo from '@/components/icons/admin-logo';
import { cn } from '@/lib/utils';
import { AdminProvider, useAdmin } from '@/context/AdminContext';
import { TenantDataProvider } from '@/context/TenantDataContext';
import { ThemeProvider } from '@/context/ThemeContext';

// Component that uses AdminContext
function AdminLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { tenantData } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Extract tenant from pathname to avoid async params issue
  const tenant = pathname.split('/')[1];

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('admin-sidebar-collapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newState));
  };

  // Add loading effect
  useEffect(() => {
    if (tenantData !== null) {
      setIsLoading(false);
    }
  }, [tenantData]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      // Redirect to login page
      window.location.href = `/${tenant}/admin`;
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout call fails
      window.location.href = `/${tenant}/admin`;
    }
  };
  
  // Navigation items with tenant-aware paths
  const navItems = [
    { href: `/${tenant}/admin/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
    { href: `/${tenant}/admin/orders`, icon: ShoppingBag, label: 'All Orders' },
    { href: `/${tenant}/admin/advance-orders`, icon: Clock, label: 'Advance Orders' },
    { href: `/${tenant}/admin/menu`, icon: ChefHat, label: 'Menu' },
    { href: `/${tenant}/admin/customers`, icon: Users2, label: 'Customers' },
    { href: `/${tenant}/admin/phone-loyalty-pos`, icon: Phone, label: 'Phone Loyalty POS' },
    { href: `/${tenant}/admin/loyalty-points`, icon: Star, label: 'Loyalty Points' },
    { href: `/${tenant}/admin/vouchers`, icon: Tag, label: 'Vouchers' },
    { href: `/${tenant}/admin/shop`, icon: ShoppingBag, label: 'Shop & Gift Cards' },
    { href: `/${tenant}/admin/zones`, icon: MapPin, label: 'Delivery Zones' },
    { href: `/${tenant}/admin/order-configuration`, icon: ClipboardList, label: 'Order Configuration' },
    { href: `/${tenant}/admin/printers`, icon: Printer, label: 'Printers' },
    { href: `/${tenant}/admin/payments`, icon: CreditCard, label: 'Payments' },
    { href: `/${tenant}/admin/email-settings`, icon: Mail, label: 'Email Settings' },
    { href: `/${tenant}/admin/email-management/templates`, icon: Edit3, label: 'Email Templates' },
    { href: `/${tenant}/admin/reports`, icon: BarChart3, label: 'Reports' },
    { href: `/${tenant}/admin/license-management`, icon: Key, label: 'License Management' },
    { href: `/${tenant}/admin/pos-api-management`, icon: Database, label: 'POS API Management' },
    { href: `/${tenant}/admin/settings`, icon: Settings, label: 'Settings' }
  ];

  // Show loading state while tenant data is being fetched
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-700">Loading Restaurant...</h1>
          <p className="text-gray-500">Fetching "{tenant}" information</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Restaurant Not Found</h1>
          <p className="text-gray-600">The restaurant "{tenant}" does not exist.</p>
          <Link href="/super-admin" className="text-blue-600 hover:underline mt-4 inline-block">
            Go to Super Admin
          </Link>
        </div>
      </div>
    );
  }

  if (pathname === `/${tenant}/admin`) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Collapsible Professional Sidebar */}
      <div className={cn(
        "bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "w-16" : "w-80"
      )}>
        {/* Compact Professional Header with Toggle */}
        <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
          {/* Toggle Button */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-slate-200 transition-colors duration-200 text-slate-600 hover:text-slate-900"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            {!isSidebarCollapsed && (
              <div className="text-xs text-slate-500 font-medium">Admin Panel</div>
            )}
          </div>
          
          {/* Compact Restaurant Info */}
          <div className={cn(
            "flex items-center space-x-3 transition-all duration-300",
            isSidebarCollapsed ? "justify-center" : "mb-3"
          )}>
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-gray-100 rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                {tenantData.settings?.logo ? (
                  <img src={tenantData.settings.logo} alt={tenantData.name} className="w-10 h-10 object-cover rounded-lg" />
                ) : (
                  <AdminLogo className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse"></div>
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-gray-800 truncate leading-tight">
                  {tenantData.name}
                </h1>
                <p className="text-xs text-slate-600 font-medium">Admin Panel</p>
              </div>
            )}
          </div>
          
          {/* Ultra Compact Quick Actions */}
          {!isSidebarCollapsed && (
            <div className="space-y-1">
              {/* Food Order and Visit Shop - Side by Side */}
              <div className="flex space-x-1.5">
                <Link
                  href={`/${tenant}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 flex-1 px-2 py-1.5 text-xs font-medium text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 rounded-md transition-all duration-200 shadow-sm hover:shadow border border-blue-100 hover:border-blue-200"
                >
                  <ChefHat className="w-3 h-3" />
                  <span>Food</span>
                </Link>
                <Link
                  href={`/${tenant}/shop`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-1.5 flex-1 px-2 py-1.5 text-xs font-medium text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-md transition-all duration-200 shadow-sm hover:shadow border border-emerald-200 hover:border-emerald-300"
                >
                  <ShoppingBag className="w-3 h-3" />
                  <span>Shop</span>
                </Link>
              </div>
              {/* Sign Out - Below */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-1.5 w-full px-2 py-1.5 text-xs font-medium text-rose-700 bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 rounded-md transition-all duration-200 shadow-sm hover:shadow border border-rose-200 hover:border-rose-300"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
          
          {/* Collapsed Quick Actions */}
          {isSidebarCollapsed && (
            <div className="space-y-2 mt-4">
              <Link
                href={`/${tenant}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-2 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                title="Food Order"
              >
                <ChefHat className="w-4 h-4" />
              </Link>
              <Link
                href={`/${tenant}/shop`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors duration-200"
                title="Visit Shop"
              >
                <ShoppingBag className="w-4 h-4" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors duration-200 w-full"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Navigation with Categories */}
        <nav className="flex-1 py-6 px-2 overflow-y-auto">
          <div className="space-y-6">
              {/* Core Operations */}
              <div>
                {!isSidebarCollapsed && (
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Core Operations</h3>
                )}
                <div className="space-y-1">
                  {[
                    { href: `/${tenant}/admin/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
                    { href: `/${tenant}/admin/orders`, icon: ShoppingBag, label: 'All Orders' },
                    { href: `/${tenant}/admin/advance-orders`, icon: Clock, label: 'Advance Orders' },
                    { href: `/${tenant}/admin/menu`, icon: ChefHat, label: 'Menu Management' }
                  ].map(item => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center text-sm font-medium rounded-lg transition-all duration-200 group relative',
                          isSidebarCollapsed ? 'justify-center p-3 mx-1' : 'space-x-3 px-4 py-3',
                          isActive 
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-l-4 border-l-blue-600 shadow-md' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                        title={isSidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={cn(
                          'w-5 h-5 transition-colors',
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        )} />
                        {!isSidebarCollapsed && (
                          <>
                            <span className="font-medium">{item.label}</span>
                            {isActive && (
                              <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

            {/* Customer Management */}
            <div>
              {!isSidebarCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Customer Management</h3>
              )}
              <div className="space-y-1">
                {[
                  { href: `/${tenant}/admin/customers`, icon: Users2, label: 'Customers' },
                  { href: `/${tenant}/admin/phone-loyalty-pos`, icon: Phone, label: 'Phone Loyalty POS' },
                  { href: `/${tenant}/admin/loyalty-points`, icon: Star, label: 'Loyalty Points' }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center text-sm font-medium rounded-lg transition-all duration-200 group relative',
                        isSidebarCollapsed ? 'justify-center p-3 mx-1' : 'space-x-3 px-4 py-3',
                        isActive 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-100 text-green-700 border-l-4 border-l-green-600 shadow-md' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'
                      )} />
                      {!isSidebarCollapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Store Operations */}
            <div>
              {!isSidebarCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Store Operations</h3>
              )}
              <div className="space-y-1">
                {[
                  { href: `/${tenant}/admin/vouchers`, icon: Tag, label: 'Vouchers' },
                  { href: `/${tenant}/admin/shop`, icon: ShoppingBag, label: 'Shop & Gift Cards' },
                  { href: `/${tenant}/admin/zones`, icon: MapPin, label: 'Delivery Zones' },
                  { href: `/${tenant}/admin/order-configuration`, icon: ClipboardList, label: 'Order Configuration' }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center text-sm font-medium rounded-lg transition-all duration-200 group relative',
                        isSidebarCollapsed ? 'justify-center p-3 mx-1' : 'space-x-3 px-4 py-3',
                        isActive 
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-100 text-purple-700 border-l-4 border-l-purple-600 shadow-md' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'
                      )} />
                      {!isSidebarCollapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* System & Reports */}
            <div>
              {!isSidebarCollapsed && (
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">System & Reports</h3>
              )}
              <div className="space-y-1">
                {[
                  { href: `/${tenant}/admin/printers`, icon: Printer, label: 'Printers' },
                  { href: `/${tenant}/admin/payments`, icon: CreditCard, label: 'Payments' },
                  { href: `/${tenant}/admin/email-settings`, icon: Cog, label: 'Email Settings' },
                  { href: `/${tenant}/admin/email-templates-advanced`, icon: Mail, label: 'Email Templates' },
                  { href: `/${tenant}/admin/reports`, icon: BarChart3, label: 'Reports' },
                  { href: `/${tenant}/admin/license-management`, icon: Key, label: 'License Management' },
                  { href: `/${tenant}/admin/pos-api-management`, icon: Database, label: 'POS API Management' },
                  { href: `/${tenant}/admin/settings`, icon: Settings, label: 'Settings' }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center text-sm font-medium rounded-lg transition-all duration-200 group relative',
                        isSidebarCollapsed ? 'justify-center p-3 mx-1' : 'space-x-3 px-4 py-3',
                        isActive 
                          ? 'bg-gradient-to-r from-teal-50 to-cyan-100 text-teal-700 border-l-4 border-l-teal-600 shadow-md' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                      )} />
                      {!isSidebarCollapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 bg-teal-600 rounded-full animate-pulse"></div>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
        
        {/* Professional Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center">
            {!isSidebarCollapsed && (
              <p className="text-xs text-gray-400">
                Developed by -{' '}
                <a 
                  href="https://orderweb.co.uk/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-500 hover:text-gray-600 transition-colors duration-200"
                >
                  Order Web
                </a>
              </p>
            )}
            {isSidebarCollapsed && (
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Main Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <main className="h-full overflow-y-auto">
          <div className="h-full">
            <div className="bg-white shadow-sm border border-gray-200 m-4 h-[calc(100vh-2rem)] overflow-y-auto rounded-xl">
              <div className="p-6 h-full">
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Main layout component with AdminProvider wrapper
export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tenant = pathname.split('/')[1];

  return (
    <AdminProvider tenantSlug={tenant}>
      <TenantDataProvider>
        <ThemeProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </ThemeProvider>
      </TenantDataProvider>
    </AdminProvider>
  );
}
