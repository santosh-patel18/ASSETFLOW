'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Package, PackageCheck, Wrench, CalendarDays, ArrowLeftRight,
  Clock, AlertTriangle, Plus, BookOpen, PlusCircle,
} from 'lucide-react';

interface DashboardData {
  kpi: {
    availableAssets: number;
    allocatedAssets: number;
    maintenanceToday: number;
    activeBookings: number;
    pendingTransfers: number;
    overdueReturns: number;
  };
  overdueReturns: Array<{
    id: string;
    expectedReturnDate: string;
    asset: { id: string; name: string; assetTag: string };
  }>;
  upcomingReturns: Array<{
    id: string;
    expectedReturnDate: string;
    asset: { id: string; name: string; assetTag: string };
  }>;
}

const kpiConfig = [
  { key: 'availableAssets', label: 'Available Assets', icon: Package, color: 'from-emerald-500 to-emerald-600' },
  { key: 'allocatedAssets', label: 'Allocated Assets', icon: PackageCheck, color: 'from-blue-500 to-blue-600' },
  { key: 'maintenanceToday', label: 'Maintenance Active', icon: Wrench, color: 'from-amber-500 to-amber-600' },
  { key: 'activeBookings', label: 'Active Bookings', icon: CalendarDays, color: 'from-purple-500 to-purple-600' },
  { key: 'pendingTransfers', label: 'Pending Transfers', icon: ArrowLeftRight, color: 'from-cyan-500 to-cyan-600' },
  { key: 'overdueReturns', label: 'Overdue Returns', icon: AlertTriangle, color: 'from-red-500 to-red-600' },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Welcome back, <span className="gradient-text">{user?.name}</span>
            </h2>
            <p className="text-muted-foreground mt-1">Here&apos;s your operational snapshot.</p>
          </div>
          <div className="flex gap-2">
            {(user?.role === 'admin' || user?.role === 'asset_manager') && (
              <Link href="/assets/register">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Register Asset
                </Button>
              </Link>
            )}
            <Link href="/bookings">
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="h-4 w-4" /> Book Resource
              </Button>
            </Link>
            <Link href="/maintenance">
              <Button variant="outline" size="sm" className="gap-2">
                <Wrench className="h-4 w-4" /> Maintenance
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-8 bg-muted rounded w-16 mb-2" />
                  <div className="h-4 bg-muted rounded w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiConfig.map((kpi, index) => (
              <Card
                key={kpi.key}
                className="kpi-card overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${kpi.color} flex items-center justify-center text-white`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                    {kpi.key === 'overdueReturns' && data?.kpi.overdueReturns ? (
                      <Badge variant="destructive" className="text-[10px]">!</Badge>
                    ) : null}
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {data?.kpi[kpi.key] ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Overdue & Upcoming Returns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Returns */}
          <Card className="border-red-500/20">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-lg">Overdue Returns</h3>
              </div>
              {data?.overdueReturns && data.overdueReturns.length > 0 ? (
                <div className="space-y-3">
                  {data.overdueReturns.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div>
                        <p className="font-medium text-sm">{item.asset.name}</p>
                        <p className="text-xs text-muted-foreground">{item.asset.assetTag}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Due: {new Date(item.expectedReturnDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No overdue returns 🎉</p>
              )}
            </div>
          </Card>

          {/* Upcoming Returns */}
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-lg">Upcoming Returns</h3>
              </div>
              {data?.upcomingReturns && data.upcomingReturns.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingReturns.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div>
                        <p className="font-medium text-sm">{item.asset.name}</p>
                        <p className="text-xs text-muted-foreground">{item.asset.assetTag}</p>
                      </div>
                      <Badge variant="warning" className="text-xs">
                        {new Date(item.expectedReturnDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming returns</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
