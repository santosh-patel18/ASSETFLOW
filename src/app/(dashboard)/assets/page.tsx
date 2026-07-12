'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusVariant } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Package, Plus, Search, Eye } from 'lucide-react';

export default function AssetsPage() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAssets = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    fetch(`/api/assets?${params}`)
      .then(r => r.json())
      .then(d => { setAssets(d.assets || []); setLoading(false); });
  };

  useEffect(() => {
    fetchAssets();
    fetch('/api/org/categories').then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => { const t = setTimeout(fetchAssets, 300); return () => clearTimeout(t); }, [search, statusFilter, categoryFilter]);

  return (
    <div className="min-h-screen">
      <Header title="Asset Directory" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-[300px]" />
            </div>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Allocated">Allocated</SelectItem>
                <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(user?.role === 'admin' || user?.role === 'asset_manager') && (
            <Link href="/assets/register">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Register Asset</Button>
            </Link>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Asset Tag</th>
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Category</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Location</th>
                <th className="text-left p-3 text-sm font-medium">Department</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm font-mono font-medium text-primary">{asset.assetTag}</td>
                  <td className="p-3 text-sm font-medium">{asset.name}</td>
                  <td className="p-3 text-sm">{asset.category?.name}</td>
                  <td className="p-3"><Badge variant={getStatusVariant(asset.status)} className="text-xs">{asset.status}</Badge></td>
                  <td className="p-3 text-sm text-muted-foreground">{asset.location || '—'}</td>
                  <td className="p-3 text-sm text-muted-foreground">{asset.department?.name || '—'}</td>
                  <td className="p-3">
                    <Link href={`/assets/${asset.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 h-8"><Eye className="h-3 w-3" /> View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && !loading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No assets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
