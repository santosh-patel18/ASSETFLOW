'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getStatusVariant, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Wrench, Plus, Check, X, UserCheck, CheckCircle } from 'lucide-react';

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showTechDialog, setShowTechDialog] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [techName, setTechName] = useState('');
  const [form, setForm] = useState({ asset_id: '', issue: '', priority: 'medium', photo_url: '' });
  const [error, setError] = useState('');

  const fetchData = () => {
    fetch('/api/maintenance-requests').then(r => r.json()).then(d => setRequests(d.requests || []));
    fetch('/api/assets?limit=200').then(r => r.json()).then(d => setAssets(d.assets || []));
  };

  useEffect(() => { fetchData(); }, []);

  const handleRaise = async () => {
    setError('');
    const res = await fetch('/api/maintenance-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
    setShowDialog(false);
    setForm({ asset_id: '', issue: '', priority: 'medium', photo_url: '' });
    fetchData();
  };

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/maintenance-requests/${id}/${action}`, { method: 'PATCH' });
    fetchData();
  };

  const handleAssignTech = async () => {
    await fetch(`/api/maintenance-requests/${selectedId}/assign-technician`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician: techName }),
    });
    setShowTechDialog(false);
    setTechName('');
    fetchData();
  };

  const isManager = user?.role === 'admin' || user?.role === 'asset_manager';

  return (
    <div className="min-h-screen">
      <Header title="Maintenance Management" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Maintenance Requests</h2>
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Raise Request</Button>
        </div>

        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white ${req.priority === 'high' ? 'bg-gradient-to-br from-red-500 to-red-600' : req.priority === 'medium' ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-slate-500 to-slate-600'}`}>
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{req.asset?.assetTag} — {req.asset?.name}</p>
                      <p className="text-sm text-muted-foreground">{req.issue}</p>
                      <p className="text-xs text-muted-foreground mt-1">Raised by {req.raiser?.name} on {formatDate(req.createdAt)}{req.technician ? ` · Tech: ${req.technician}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={req.priority === 'high' ? 'destructive' : req.priority === 'medium' ? 'warning' : 'secondary'} className="text-xs capitalize">{req.priority}</Badge>
                    <Badge variant={getStatusVariant(req.status)} className="text-xs">{req.status}</Badge>
                    {isManager && req.status === 'Pending' && (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, 'approve')}><Check className="h-3 w-3" /> Approve</Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => handleAction(req.id, 'reject')}><X className="h-3 w-3" /> Reject</Button>
                      </>
                    )}
                    {isManager && req.status === 'Approved' && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setSelectedId(req.id); setShowTechDialog(true); }}><UserCheck className="h-3 w-3" /> Assign Tech</Button>
                    )}
                    {isManager && ['Approved', 'Technician Assigned', 'In Progress'].includes(req.status) && (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAction(req.id, 'resolve')}><CheckCircle className="h-3 w-3" /> Resolve</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {requests.length === 0 && <p className="text-center text-muted-foreground py-8">No maintenance requests</p>}
        </div>

        {/* Raise Request Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Raise Maintenance Request</DialogTitle></DialogHeader>
            {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><Label>Asset</Label><Select value={form.asset_id} onValueChange={v => setForm({ ...form, asset_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{assets.map(a => <SelectItem key={a.id} value={a.id}>{a.assetTag} — {a.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Issue Description</Label><Textarea value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="Describe the issue..." /></div>
              <div><Label>Priority</Label><Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={handleRaise}>Submit</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Technician Dialog */}
        <Dialog open={showTechDialog} onOpenChange={setShowTechDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Technician</DialogTitle></DialogHeader>
            <div><Label>Technician Name</Label><Input value={techName} onChange={e => setTechName(e.target.value)} placeholder="Enter technician name" /></div>
            <DialogFooter><Button onClick={handleAssignTech}>Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
