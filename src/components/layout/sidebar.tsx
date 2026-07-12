'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Package, ArrowLeftRight, CalendarDays,
  Wrench, ClipboardCheck, BarChart3, Activity, Bell, LogOut, ChevronLeft,
  ChevronRight, Settings,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Organization', href: '/org', icon: Building2, roles: ['admin', 'department_head'] },
  { label: 'Assets', href: '/assets', icon: Package, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Allocations', href: '/allocations', icon: ArrowLeftRight, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Bookings', href: '/bookings', icon: CalendarDays, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
  { label: 'Audits', href: '/audits', icon: ClipboardCheck, roles: ['admin', 'asset_manager'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'asset_manager'] },
  { label: 'Activity', href: '/activity', icon: Activity, roles: ['admin', 'asset_manager', 'department_head'] },
  { label: 'Notifications', href: '/notifications', icon: Bell, roles: ['admin', 'asset_manager', 'department_head', 'employee'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter(item =>
    item.roles.includes(user?.role || 'employee')
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 flex flex-col',
        collapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            AF
          </div>
          {!collapsed && (
            <span className="font-bold text-lg gradient-text">AssetFlow</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User & collapse */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-9 w-9"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {!collapsed && (
            <Button variant="ghost" size="sm" onClick={logout} className="flex-1 justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
