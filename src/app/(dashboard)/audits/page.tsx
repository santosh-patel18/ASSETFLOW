'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusVariant, formatDate } from '@/lib/utils';
import { ClipboardCheck, Plus, Eye } from 'lucide-react';

export default function AuditsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ scope_department_id: '', scope_location: '', start_date: '', end_date: '', auditor_ids: [] as string[] });

  const fetchData = () => {
    fetch('/api/audit-cycles').then(r => r.json()).then(d => setCycles(d.cycles || []));
    fetch('/api/org/departments').then(r => r.json()).then(d => setDepartments(d.departments || []));
    fetch('/api/org/employees').then(r => r.json()).then(d => setEmployees(d.employees || []));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    await fetch('/api/audit-cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowDialog(false);
    fetchData();
  };

  return (
    <div className="min-h-screen">
      <Header title="Asset Audit" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Audit Cycles</h2>
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Cycle</Button>
        </div>

        <div className="grid gap-4">
          {cycles.map(cycle => (
            <Card key={cycle.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white"><ClipboardCheck className="h-5 w-5" /></div>
                  <div>
                    <p className="font-medium">Audit Cycle — {cycle.scopeDepartment?.name || cycle.scopeLocation || 'All'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}</p>
                    <p className="text-xs text-muted-foreground">Created by {cycle.creator?.name} · {cycle._count?.items || 0} items · {cycle.auditors?.length || 0} auditors</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(cycle.status)} className="text-xs">{cycle.status}</Badge>
                  <Link href={`/audits/${cycle.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1"><Eye className="h-3 w-3" /> View</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {cycles.length === 0 && <p className="text-center text-muted-foreground py-8">No audit cycles</p>}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Audit Cycle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Scope Department</Label><Select value={form.scope_department_id} onValueChange={v => setForm({ ...form, scope_department_id: v })}><SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Scope Location</Label><Input value={form.scope_location} onChange={e => setForm({ ...form, scope_location: e.target.value })} placeholder="Optional" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Auditors</Label>
                <Select onValueChange={v => { if (!form.auditor_ids.includes(v)) setForm({ ...form, auditor_ids: [...form.auditor_ids, v] }); }}>
                  <SelectTrigger><SelectValue placeholder="Add auditors" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">{form.auditor_ids.map(id => { const e = employees.find(emp => emp.id === id); return <Badge key={id} variant="secondary" className="text-xs">{e?.name || id}</Badge>; })}</div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
