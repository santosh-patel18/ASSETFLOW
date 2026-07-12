'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusVariant, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Lock } from 'lucide-react';

export default function AuditCycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [cycle, setCycle] = useState<any>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/audit-cycles/${params.id}`).then(r => r.json()).then(d => setCycle(d.cycle));
  }, [params.id]);

  const markItem = async (assetId: string, result: string) => {
    await fetch(`/api/audit-cycles/${params.id}/items/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    });
    // Refresh
    fetch(`/api/audit-cycles/${params.id}`).then(r => r.json()).then(d => setCycle(d.cycle));
  };

  const closeCycle = async () => {
    const resArray = Object.entries(resolutions).map(([asset_id, action]) => ({ asset_id, action }));
    await fetch(`/api/audit-cycles/${params.id}/close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutions: resArray }),
    });
    router.push('/audits');
  };

  if (!cycle) return <div className="min-h-screen"><Header title="Audit Cycle" /><div className="p-6"><p className="text-muted-foreground">Loading...</p></div></div>;

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';
  const discrepancies = cycle.items?.filter((i: any) => i.result && i.result !== 'Verified') || [];

  return (
    <div className="min-h-screen">
      <Header title={`Audit Cycle — ${cycle.scopeDepartment?.name || cycle.scopeLocation || 'All'}`} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</p>
            <Badge variant={getStatusVariant(cycle.status)} className="mt-1">{cycle.status}</Badge>
          </div>
          {isManager && cycle.status === 'Open' && (
            <Button onClick={closeCycle} className="gap-2"><Lock className="h-4 w-4" /> Close Cycle</Button>
          )}
        </div>

        {/* Discrepancy Report */}
        {discrepancies.length > 0 && (
          <Card className="border-amber-500/30">
            <CardHeader><CardTitle className="text-base text-amber-500">⚠️ Discrepancy Report ({discrepancies.length} items)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {discrepancies.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5">
                  <div>
                    <p className="text-sm font-medium">{item.asset?.assetTag} — {item.asset?.name}</p>
                    <Badge variant={getStatusVariant(item.result)} className="text-xs mt-1">{item.result}</Badge>
                  </div>
                  {isManager && cycle.status === 'Open' && (
                    <Select value={resolutions[item.assetId] || 'no_change'} onValueChange={v => setResolutions({ ...resolutions, [item.assetId]: v })}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_change">No Change</SelectItem>
                        <SelectItem value="mark_lost">Mark Lost</SelectItem>
                        <SelectItem value="mark_available">Mark Available</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Audit Items ({cycle.items?.length || 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full"><thead className="bg-muted/50"><tr>
              <th className="text-left p-3 text-sm">Asset</th><th className="text-left p-3 text-sm">Location</th><th className="text-left p-3 text-sm">Current Status</th><th className="text-left p-3 text-sm">Result</th><th className="text-left p-3 text-sm">Marked By</th>{cycle.status === 'Open' && <th className="text-left p-3 text-sm">Actions</th>}
            </tr></thead><tbody>
              {cycle.items?.map((item: any) => (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm"><span className="font-mono text-primary">{item.asset?.assetTag}</span> {item.asset?.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{item.asset?.location || '—'}</td>
                  <td className="p-3"><Badge variant={getStatusVariant(item.asset?.status)} className="text-xs">{item.asset?.status}</Badge></td>
                  <td className="p-3">{item.result ? <Badge variant={getStatusVariant(item.result)} className="text-xs">{item.result}</Badge> : <span className="text-xs text-muted-foreground">Unmarked</span>}</td>
                  <td className="p-3 text-sm text-muted-foreground">{item.marker?.name || '—'}</td>
                  {cycle.status === 'Open' && (
                    <td className="p-3 flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markItem(item.assetId, 'Verified')}>✓ Verified</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markItem(item.assetId, 'Missing')}>⚠ Missing</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => markItem(item.assetId, 'Damaged')}>✗ Damaged</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody></table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
