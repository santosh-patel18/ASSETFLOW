'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Download, Package, Wrench, Building2, CalendarDays } from 'lucide-react';

export default function ReportsPage() {
  const [utilization, setUtilization] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [deptAlloc, setDeptAlloc] = useState<any>(null);
  const [bookingHeatmap, setBookingHeatmap] = useState<any>(null);

  useEffect(() => {
    fetch('/api/reports/utilization').then(r => r.json()).then(setUtilization);
    fetch('/api/reports/maintenance-frequency').then(r => r.json()).then(setMaintenance);
    fetch('/api/reports/department-allocation').then(r => r.json()).then(setDeptAlloc);
    fetch('/api/reports/booking-heatmap').then(r => r.json()).then(setBookingHeatmap);
  }, []);

  const handleExport = () => {
    window.open('/api/reports/export?type=csv', '_blank');
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen">
      <Header title="Reports & Analytics" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Reports Dashboard</h2>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <Tabs defaultValue="utilization" className="space-y-6">
          <TabsList>
            <TabsTrigger value="utilization" className="gap-2"><Package className="h-4 w-4" /> Utilization</TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /> Maintenance</TabsTrigger>
            <TabsTrigger value="departments" className="gap-2"><Building2 className="h-4 w-4" /> Departments</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2"><CalendarDays className="h-4 w-4" /> Booking Heatmap</TabsTrigger>
          </TabsList>

          {/* Utilization Tab */}
          <TabsContent value="utilization" className="space-y-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Asset Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {utilization?.statusCounts?.map((sc: any) => {
                    const colors: Record<string, string> = {
                      Available: 'from-emerald-500 to-emerald-600',
                      Allocated: 'from-blue-500 to-blue-600',
                      'Under Maintenance': 'from-amber-500 to-amber-600',
                      Lost: 'from-red-500 to-red-600',
                      Retired: 'from-gray-500 to-gray-600',
                    };
                    return (
                      <div key={sc.status} className="flex items-center gap-3 p-4 rounded-lg border bg-card min-w-[160px]">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colors[sc.status] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-lg font-bold`}>
                          {sc._count.id}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{sc.status}</p>
                          <p className="text-xs text-muted-foreground">{sc._count.id} assets</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Allocated */}
            <Card>
              <CardHeader><CardTitle className="text-base">Most Allocated Assets (Top 10)</CardTitle></CardHeader>
              <CardContent>
                {utilization?.utilization?.length > 0 ? (
                  <div className="space-y-3">
                    {utilization.utilization.map((u: any, i: number) => (
                      <div key={u.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-mono w-6">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{u.assetTag}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(u.allocation_count * 20, 200)}px` }} />
                          <span className="text-sm font-semibold">{u.allocation_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No allocation data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            {/* Priority Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Request Priority Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {maintenance?.priorityDistribution?.map((p: any) => {
                    const colors: Record<string, string> = {
                      low: 'from-slate-500 to-slate-600',
                      medium: 'from-amber-500 to-amber-600',
                      high: 'from-red-500 to-red-600',
                    };
                    return (
                      <div key={p.priority} className="flex items-center gap-3 p-4 rounded-lg border bg-card min-w-[140px]">
                        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colors[p.priority] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-white text-lg font-bold`}>
                          {p._count.id}
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">{p.priority}</p>
                          <p className="text-xs text-muted-foreground">{p._count.id} requests</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Most Maintained */}
            <Card>
              <CardHeader><CardTitle className="text-base">Most Maintained Assets (Top 20)</CardTitle></CardHeader>
              <CardContent>
                {maintenance?.data?.length > 0 ? (
                  <div className="space-y-3">
                    {maintenance.data.map((m: any, i: number) => (
                      <div key={m.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground font-mono w-6">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.assetTag} · {m.category?.name}</p>
                          </div>
                        </div>
                        <Badge variant="warning" className="text-xs">{m.request_count} requests</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No maintenance data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card>
              <CardHeader><CardTitle className="text-base">Department Asset Allocation</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-muted/50"><tr>
                    <th className="text-left p-3 text-sm font-medium">Department</th>
                    <th className="text-left p-3 text-sm font-medium">Employees</th>
                    <th className="text-left p-3 text-sm font-medium">Assets</th>
                    <th className="text-left p-3 text-sm font-medium">Active Allocations</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {deptAlloc?.data?.map((d: any) => (
                      <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-sm font-medium">{d.name}</td>
                        <td className="p-3 text-sm">{d._count?.employees || 0}</td>
                        <td className="p-3 text-sm">{d._count?.assets || 0}</td>
                        <td className="p-3 text-sm font-semibold text-primary">{d.active_allocations}</td>
                        <td className="p-3"><Badge variant={d.status === 'Active' ? 'success' : 'secondary'} className="text-xs">{d.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking Heatmap Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Booking Heatmap (Last 30 Days)</CardTitle>
                <p className="text-sm text-muted-foreground">{bookingHeatmap?.totalBookings || 0} total bookings</p>
              </CardHeader>
              <CardContent>
                {bookingHeatmap?.heatmap ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="p-1 text-muted-foreground font-normal"></th>
                          {Array.from({ length: 24 }, (_, i) => (
                            <th key={i} className="p-1 text-muted-foreground font-normal w-8">{i}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bookingHeatmap.heatmap.map((row: number[], dayIdx: number) => (
                          <tr key={dayIdx}>
                            <td className="p-1 pr-2 text-muted-foreground font-medium">{days[dayIdx]}</td>
                            {row.map((count: number, hourIdx: number) => {
                              const opacity = count === 0 ? 0 : Math.min(0.3 + count * 0.15, 1);
                              return (
                                <td key={hourIdx} className="p-0.5">
                                  <div
                                    className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-medium"
                                    style={{
                                      backgroundColor: count > 0 ? `rgba(99, 102, 241, ${opacity})` : 'rgba(255,255,255,0.05)',
                                      color: count > 0 ? 'white' : 'transparent',
                                    }}
                                  >
                                    {count || ''}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                      <span>Less</span>
                      {[0.1, 0.3, 0.5, 0.7, 1].map((o, i) => (
                        <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: `rgba(99, 102, 241, ${o})` }} />
                      ))}
                      <span>More</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No booking data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
