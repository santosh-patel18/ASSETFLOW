'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Activity as ActivityIcon, User } from 'lucide-react';

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/activity-log?page=${page}&limit=30`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); });
  }, [page]);

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('SIGNUP')) return 'from-emerald-500 to-emerald-600';
    if (action.includes('DELETE') || action.includes('REJECT')) return 'from-red-500 to-red-600';
    if (action.includes('APPROVE') || action.includes('RESOLVE')) return 'from-blue-500 to-blue-600';
    if (action.includes('CHANGE') || action.includes('UPDATE')) return 'from-amber-500 to-amber-600';
    return 'from-slate-500 to-slate-600';
  };

  return (
    <div className="min-h-screen">
      <Header title="Activity Log" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Activity Timeline</h2>
          <p className="text-sm text-muted-foreground">{total} total events</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="relative flex items-start gap-4 pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-4 top-3 h-4 w-4 rounded-full bg-gradient-to-br ${getActionColor(log.action)} border-2 border-background`} />
                <Card className="flex-1 hover:border-primary/20 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{log.action}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{log.targetType}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-3 w-3" />
                      </div>
                      <span className="text-sm font-medium">{log.actor?.name}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{log.actor?.role?.replace('_', ' ')}</Badge>
                    </div>
                    {log.metadata && Object.keys(log.metadata as object).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        {total > 30 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded border disabled:opacity-50 hover:bg-muted"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-muted-foreground">
              Page {page} of {Math.ceil(total / 30)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 30 >= total}
              className="px-3 py-1 text-sm rounded border disabled:opacity-50 hover:bg-muted"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
