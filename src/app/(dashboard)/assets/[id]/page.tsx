'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStatusVariant, formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { Package, History, Wrench, CalendarDays } from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${params.id}`)
      .then(r => r.json())
      .then(d => { setAsset(d.asset); setLoading(false); });
  }, [params.id]);

  if (loading) return <div className="min-h-screen"><Header title="Asset Detail" /><div className="p-6"><p className="text-muted-foreground">Loading...</p></div></div>;
  if (!asset) return <div className="min-h-screen"><Header title="Asset Detail" /><div className="p-6"><p>Asset not found</p></div></div>;

  return (
    <div className="min-h-screen">
      <Header title={`${asset.assetTag} — ${asset.name}`} />
      <div className="p-6 space-y-6">
        {/* Asset Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white"><Package className="h-6 w-6" /></div>
                  <div>
                    <CardTitle>{asset.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{asset.assetTag}</p>
                  </div>
                </div>
                <Badge variant={getStatusVariant(asset.status)} className="text-sm px-3 py-1">{asset.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Category</span><p className="font-medium">{asset.category?.name}</p></div>
                <div><span className="text-muted-foreground">Serial Number</span><p className="font-medium font-mono">{asset.serialNumber || '—'}</p></div>
                <div><span className="text-muted-foreground">Location</span><p className="font-medium">{asset.location || '—'}</p></div>
                <div><span className="text-muted-foreground">Department</span><p className="font-medium">{asset.department?.name || '—'}</p></div>
                <div><span className="text-muted-foreground">Condition</span><p className="font-medium">{asset.condition || '—'}</p></div>
                <div><span className="text-muted-foreground">Acquisition Date</span><p className="font-medium">{formatDate(asset.acquisitionDate)}</p></div>
                <div><span className="text-muted-foreground">Cost</span><p className="font-medium">{formatCurrency(Number(asset.acquisitionCost))}</p></div>
                <div><span className="text-muted-foreground">Bookable</span><p className="font-medium">{asset.isBookable ? 'Yes' : 'No'}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Attributes</CardTitle></CardHeader>
            <CardContent>
              {asset.attributes && Object.keys(asset.attributes).length > 0 ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(asset.attributes as Record<string, unknown>).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{String(v)}</span></div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No attributes</p>}
            </CardContent>
          </Card>
        </div>

        {/* History Tabs */}
        <Tabs defaultValue="allocations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="allocations" className="gap-2"><History className="h-4 w-4" /> Allocations</TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2"><Wrench className="h-4 w-4" /> Maintenance</TabsTrigger>
            <TabsTrigger value="state" className="gap-2"><Package className="h-4 w-4" /> State Log</TabsTrigger>
            {asset.isBookable && <TabsTrigger value="bookings" className="gap-2"><CalendarDays className="h-4 w-4" /> Bookings</TabsTrigger>}
          </TabsList>

          <TabsContent value="allocations">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">Target</th><th className="text-left p-3 text-sm">By</th><th className="text-left p-3 text-sm">Date</th><th className="text-left p-3 text-sm">Status</th>
                </tr></thead><tbody>
                  {asset.allocations?.map((a: any) => (
                    <tr key={a.id} className="border-t"><td className="p-3 text-sm">{a.targetType}: {a.targetId}</td><td className="p-3 text-sm">{a.allocator?.name}</td><td className="p-3 text-sm">{formatDate(a.createdAt)}</td><td className="p-3"><Badge variant={getStatusVariant(a.status)} className="text-xs">{a.status}</Badge></td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">Issue</th><th className="text-left p-3 text-sm">Priority</th><th className="text-left p-3 text-sm">Raised By</th><th className="text-left p-3 text-sm">Status</th><th className="text-left p-3 text-sm">Date</th>
                </tr></thead><tbody>
                  {asset.maintenanceRequests?.map((m: any) => (
                    <tr key={m.id} className="border-t"><td className="p-3 text-sm">{m.issue}</td><td className="p-3"><Badge variant={m.priority === 'high' ? 'destructive' : m.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs">{m.priority}</Badge></td><td className="p-3 text-sm">{m.raiser?.name}</td><td className="p-3"><Badge variant={getStatusVariant(m.status)} className="text-xs">{m.status}</Badge></td><td className="p-3 text-sm">{formatDate(m.createdAt)}</td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="state">
            <Card>
              <CardContent className="p-0">
                <table className="w-full"><thead className="bg-muted/50"><tr>
                  <th className="text-left p-3 text-sm">From</th><th className="text-left p-3 text-sm">To</th><th className="text-left p-3 text-sm">By</th><th className="text-left p-3 text-sm">When</th>
                </tr></thead><tbody>
                  {asset.stateLog?.map((s: any) => (
                    <tr key={s.id} className="border-t"><td className="p-3 text-sm">{s.fromStatus || '—'}</td><td className="p-3"><Badge variant={getStatusVariant(s.toStatus)} className="text-xs">{s.toStatus}</Badge></td><td className="p-3 text-sm">{s.changer?.name}</td><td className="p-3 text-sm">{formatDateTime(s.changedAt)}</td></tr>
                  ))}
                </tbody></table>
              </CardContent>
            </Card>
          </TabsContent>

          {asset.isBookable && (
            <TabsContent value="bookings">
              <Card>
                <CardContent className="p-0">
                  <table className="w-full"><thead className="bg-muted/50"><tr>
                    <th className="text-left p-3 text-sm">Booked By</th><th className="text-left p-3 text-sm">Start</th><th className="text-left p-3 text-sm">End</th><th className="text-left p-3 text-sm">Status</th>
                  </tr></thead><tbody>
                    {asset.bookings?.map((b: any) => (
                      <tr key={b.id} className="border-t"><td className="p-3 text-sm">{b.booker?.name}</td><td className="p-3 text-sm">{formatDateTime(b.startTime)}</td><td className="p-3 text-sm">{formatDateTime(b.endTime)}</td><td className="p-3"><Badge variant={getStatusVariant(b.status)} className="text-xs">{b.status}</Badge></td></tr>
                    ))}
                  </tbody></table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
