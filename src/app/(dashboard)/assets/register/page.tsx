'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

export default function RegisterAssetPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '', category_id: '', serial_number: '', acquisition_date: '',
    acquisition_cost: '', condition: '', location: '', department_id: '',
    is_bookable: false, attributes: '{}',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/org/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
    fetch('/api/org/departments').then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let attrs = {};
    try { attrs = JSON.parse(form.attributes); } catch { setError('Invalid attributes JSON'); setLoading(false); return; }

    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        category_id: form.category_id,
        serial_number: form.serial_number || null,
        acquisition_date: form.acquisition_date || null,
        acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : null,
        condition: form.condition || null,
        location: form.location || null,
        department_id: form.department_id || null,
        is_bookable: form.is_bookable,
        attributes: attrs,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/assets/${data.asset.id}`);
    } else {
      setError(data.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header title="Register Asset" />
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>New Asset Registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div><Label>Category *</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.filter(c => c.status === 'Active').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
                <div><Label>Acquisition Date</Label><Input type="date" value={form.acquisition_date} onChange={e => setForm({ ...form, acquisition_date: e.target.value })} /></div>
                <div><Label>Acquisition Cost</Label><Input type="number" step="0.01" value={form.acquisition_cost} onChange={e => setForm({ ...form, acquisition_cost: e.target.value })} /></div>
                <div><Label>Condition</Label><Input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} placeholder="New, Good, Fair, Poor" /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>{departments.filter(d => d.status === 'Active').map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="bookable" checked={form.is_bookable} onChange={e => setForm({ ...form, is_bookable: e.target.checked })} className="rounded" />
                <Label htmlFor="bookable">Bookable / Shared Resource</Label>
              </div>
              <div><Label>Attributes (JSON)</Label><Textarea value={form.attributes} onChange={e => setForm({ ...form, attributes: e.target.value })} placeholder='{"warranty_months": 24}' rows={3} /></div>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="h-4 w-4" />}
                Register Asset
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
