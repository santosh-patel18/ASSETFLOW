'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building2, Tags, Users, Edit, UserCheck, UserX, Clock, Copy, Check, X, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function OrgPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDeptHead = user?.role === 'department_head';
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const [deptForm, setDeptForm] = useState({ name: '', parent_department_id: '', head_employee_id: '' });
  const [catForm, setCatForm] = useState({ name: '' });
  const [catFields, setCatFields] = useState<{ name: string; type: string; required: boolean }[]>([{ name: '', type: 'string', required: false }]);
  const [loading, setLoading] = useState(true);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [approvedPassword, setApprovedPassword] = useState<{ name: string; email: string; password: string } | null>(null);

  const fetchAll = () => {
    Promise.all([
      fetch('/api/org/departments').then(r => r.json()),
      fetch('/api/org/categories').then(r => r.json()),
      fetch('/api/org/employees').then(r => r.json()),
    ]).then(([d, c, e]) => {
      setDepartments(d.departments || []);
      setCategories(c.categories || []);
      const allEmployees = e.employees || [];
      setEmployees(allEmployees.filter((emp: any) => emp.status !== 'Pending'));
      setPendingRegistrations(allEmployees.filter((emp: any) => emp.status === 'Pending'));
      setLoading(false);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  const approveRegistration = async (id: string) => {
    const res = await fetch(`/api/org/registrations/${id}/approve`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok) {
      setApprovedPassword({ name: data.employee.name, email: data.employee.email, password: data.generated_password });
      fetchAll();
    } else {
      alert(data.error || 'Failed to approve');
    }
  };

  const rejectRegistration = async (id: string) => {
    if (!confirm('Are you sure you want to reject this registration? This will permanently delete the request.')) return;
    await fetch(`/api/org/registrations/${id}/reject`, { method: 'PATCH' });
    fetchAll();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const createDepartment = async () => {
    await fetch('/api/org/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: deptForm.name,
        parent_department_id: deptForm.parent_department_id || null,
        head_employee_id: deptForm.head_employee_id || null,
      }),
    });
    setShowDeptDialog(false);
    setDeptForm({ name: '', parent_department_id: '', head_employee_id: '' });
    fetchAll();
  };

  const createCategory = async () => {
    // Convert fields array into schema object
    const schema: Record<string, any> = {};
    catFields.forEach(f => {
      if (f.name.trim()) {
        const key = f.name.trim().toLowerCase().replace(/\s+/g, '_');
        schema[key] = { type: f.type };
        if (f.required) schema[key].required = true;
      }
    });
    const res = await fetch('/api/org/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catForm.name, field_schema: schema }),
    });
    const data = await res.json();
    if (res.ok && data.message) {
      alert(data.message);
    }
    setShowCatDialog(false);
    setCatForm({ name: '' });
    setCatFields([{ name: '', type: 'string', required: false }]);
    fetchAll();
  };

  const addCatField = () => {
    setCatFields([...catFields, { name: '', type: 'string', required: false }]);
  };

  const updateCatField = (index: number, key: string, value: any) => {
    const updated = [...catFields];
    (updated[index] as any)[key] = value;
    setCatFields(updated);
  };

  const removeCatField = (index: number) => {
    if (catFields.length === 1) return;
    setCatFields(catFields.filter((_, i) => i !== index));
  };

  const changeRole = async () => {
    if (!selectedEmployee || !newRole) return;
    const res = await fetch(`/api/org/employees/${selectedEmployee.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to change role');
    }
    setShowRoleDialog(false);
    setSelectedEmployee(null);
    setNewRole('');
    fetchAll();
  };

  return (
    <div className="min-h-screen">
      <Header title="Organization Setup" />
      <div className="p-6">
        <Tabs defaultValue={pendingRegistrations.length > 0 ? 'pending' : (isAdmin ? 'departments' : 'categories')} className="space-y-6">
          <TabsList className={`grid w-full max-w-2xl ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="pending" className="gap-2 relative">
              <Clock className="h-4 w-4" /> Pending
              {pendingRegistrations.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">{pendingRegistrations.length}</Badge>
              )}
            </TabsTrigger>
            {isAdmin && <TabsTrigger value="departments" className="gap-2"><Building2 className="h-4 w-4" /> Departments</TabsTrigger>}
            <TabsTrigger value="categories" className="gap-2"><Tags className="h-4 w-4" /> Categories</TabsTrigger>
            <TabsTrigger value="employees" className="gap-2"><Users className="h-4 w-4" /> Employees</TabsTrigger>
          </TabsList>

          {/* Pending Registrations Tab */}
          <TabsContent value="pending" className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Registration Requests</h2>

            {/* Show generated password after approval */}
            {approvedPassword && (
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-400">✅ Registration Approved — Credentials Generated</p>
                      <p className="text-sm mt-2">Name: <span className="font-medium">{approvedPassword.name}</span></p>
                      <p className="text-sm">Email: <span className="font-medium">{approvedPassword.email}</span></p>
                      <p className="text-sm">Password: <code className="bg-muted px-2 py-0.5 rounded text-primary font-mono">{approvedPassword.password}</code></p>
                      <p className="text-xs text-muted-foreground mt-2">⚠️ Share this password securely with the employee. They can change it after first login.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => copyToClipboard(`Email: ${approvedPassword.email}\nPassword: ${approvedPassword.password}`)}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setApprovedPassword(null)}>✕</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {pendingRegistrations.length > 0 ? (
              <div className="space-y-3">
                {pendingRegistrations.map(reg => (
                  <Card key={reg.id} className="border-amber-500/20 hover:border-amber-500/40 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-medium">
                          {reg.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{reg.name}</p>
                          <p className="text-sm text-muted-foreground">{reg.email}</p>
                          <p className="text-xs text-muted-foreground">Department: {reg.department?.name || 'Not specified'} · Requested: {formatDate(reg.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-xs">Pending</Badge>
                        <Button variant="outline" size="sm" className="gap-1 h-8 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => approveRegistration(reg.id)}>
                          <UserCheck className="h-3 w-3" /> Approve
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 h-8 text-destructive" onClick={() => rejectRegistration(reg.id)}>
                          <UserX className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No pending registration requests</p>
              </div>
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Departments</h2>
              <Button onClick={() => setShowDeptDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Department</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map(dept => (
                <Card key={dept.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <Badge variant={dept.status === 'Active' ? 'success' : 'secondary'}>{dept.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {dept.parent && <p className="text-muted-foreground">Parent: {dept.parent.name}</p>}
                    {dept.headEmployee && <p className="text-muted-foreground">Head: {dept.headEmployee.name}</p>}
                    <p className="text-muted-foreground">{dept._count?.employees || 0} employees · {dept._count?.assets || 0} assets</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Asset Categories</h2>
              <Button onClick={() => setShowCatDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map(cat => (
                <Card key={cat.id} className={`hover:border-primary/50 transition-colors ${cat.status === 'Pending' ? 'border-amber-500/30' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      <Badge variant={cat.status === 'Active' ? 'success' : cat.status === 'Pending' ? 'warning' : 'secondary'}>{cat.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>{cat._count?.assets || 0} assets</p>
                    {cat.fieldSchema && Object.keys(cat.fieldSchema as object).length > 0 && (
                      <p className="mt-1 text-xs">Fields: {Object.keys(cat.fieldSchema as object).join(', ')}</p>
                    )}
                    {cat.status === 'Pending' && isAdmin && (
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={async () => { await fetch(`/api/org/categories/${cat.id}`, { method: 'PATCH' }); fetchAll(); }}>
                          <Check className="h-3 w-3" /> Approve
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-destructive" onClick={async () => { if (confirm('Reject this category?')) { await fetch(`/api/org/categories/${cat.id}`, { method: 'DELETE' }); fetchAll(); } }}>
                          <X className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                    {cat.status === 'Pending' && isDeptHead && (
                      <p className="text-xs text-amber-400 mt-2">⏳ Awaiting admin approval</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <h2 className="text-xl font-semibold">Employee Directory</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Name</th>
                    <th className="text-left p-3 text-sm font-medium">Email</th>
                    <th className="text-left p-3 text-sm font-medium">Department</th>
                    <th className="text-left p-3 text-sm font-medium">Role</th>
                    <th className="text-left p-3 text-sm font-medium">Status</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium">{emp.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{emp.email}</td>
                      <td className="p-3 text-sm">{emp.department?.name || '—'}</td>
                      <td className="p-3"><Badge variant="outline" className="capitalize text-xs">{emp.role.replace('_', ' ')}</Badge></td>
                      <td className="p-3"><Badge variant={emp.status === 'Active' ? 'success' : 'secondary'} className="text-xs">{emp.status}</Badge></td>
                      <td className="p-3">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedEmployee(emp); setNewRole(emp.role); setShowRoleDialog(true); }}
                            className="gap-1 h-8"
                          >
                            <Edit className="h-3 w-3" /> Role
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Department Dialog */}
        <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Department</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
              <div><Label>Parent Department</Label>
                <Select value={deptForm.parent_department_id} onValueChange={v => setDeptForm({ ...deptForm, parent_department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Head Employee</Label>
                <Select value={deptForm.head_employee_id} onValueChange={v => setDeptForm({ ...deptForm, head_employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={createDepartment}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Dialog */}
        <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Asset Category</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input value={catForm.name} onChange={e => setCatForm({ name: e.target.value })} placeholder="e.g. Laptops, Vehicles, Furniture" />
              </div>

              <div>
                <Label className="mb-2 block">Custom Fields</Label>
                <p className="text-xs text-muted-foreground mb-3">Define the attributes for assets in this category.</p>
                <div className="space-y-2">
                  {catFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={field.name}
                        onChange={e => updateCatField(i, 'name', e.target.value)}
                        placeholder="Field name (e.g. Brand)"
                        className="flex-1"
                      />
                      <Select value={field.type} onValueChange={v => updateCatField(i, 'type', v)}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                        <input type="checkbox" checked={field.required} onChange={e => updateCatField(i, 'required', e.target.checked)} className="rounded" />
                        Req
                      </label>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCatField(i)} disabled={catFields.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2 gap-1 text-xs" onClick={addCatField}>
                  <Plus className="h-3 w-3" /> Add Field
                </Button>
              </div>

              {isDeptHead && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                  ⏳ This category will be submitted for admin approval.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={createCategory} disabled={!catForm.name.trim()}>
                {isDeptHead ? 'Submit for Approval' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Change Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Change Role — {selectedEmployee?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="asset_manager">Asset Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button onClick={changeRole}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
