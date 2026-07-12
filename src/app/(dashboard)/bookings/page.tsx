'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStatusVariant, formatDateTime } from '@/lib/utils';
import { CalendarDays, Plus, X } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ resource_id: '', start_time: '', end_time: '' });
  const [error, setError] = useState('');

  const fetchBookings = () => {
    fetch('/api/bookings').then(r => r.json()).then(d => setBookings(d.bookings || []));
  };

  useEffect(() => {
    fetchBookings();
    fetch('/api/assets?bookable=true&limit=100').then(r => r.json()).then(d => setResources(d.assets || []));
  }, []);

  const handleBook = async () => {
    setError('');
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error === 'overlap' ? `Booking conflict! ${data.message}` : data.error || data.details?.end_time?.[0] || 'Booking failed');
      return;
    }
    setShowDialog(false);
    setForm({ resource_id: '', start_time: '', end_time: '' });
    fetchBookings();
  };

  const handleCancel = async (id: string) => {
    await fetch(`/api/bookings/${id}/cancel`, { method: 'PATCH' });
    fetchBookings();
  };

  return (
    <div className="min-h-screen">
      <Header title="Resource Bookings" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bookings</h2>
          <Button onClick={() => setShowDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Book Resource</Button>
        </div>

        <div className="grid gap-4">
          {bookings.map(booking => (
            <Card key={booking.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{booking.resource?.name} <span className="text-xs text-muted-foreground font-mono">({booking.resource?.assetTag})</span></p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(booking.startTime)} — {formatDateTime(booking.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">Booked by: {booking.booker?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusVariant(booking.status)} className="text-xs">{booking.status}</Badge>
                  {(booking.status === 'Upcoming' || booking.status === 'Ongoing') && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => handleCancel(booking.id)}>
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {bookings.length === 0 && <p className="text-center text-muted-foreground py-8">No bookings yet</p>}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Book Resource</DialogTitle></DialogHeader>
            {error && <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">{error}</div>}
            <div className="space-y-4">
              <div><Label>Resource</Label>
                <Select value={form.resource_id} onValueChange={v => setForm({ ...form, resource_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                  <SelectContent>{resources.map(r => <SelectItem key={r.id} value={r.id}>{r.assetTag} — {r.name} ({r.location || 'No location'})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start Time</Label><Input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleBook}>Book</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
