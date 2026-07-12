'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { Bell, Check, CheckCheck } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      });
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    fetchNotifications();
  };

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' });
    }
    fetchNotifications();
  };

  const getNotificationIcon = (type: string) => {
    const colors: Record<string, string> = {
      ASSET_ASSIGNED: 'from-blue-500 to-blue-600',
      TRANSFER_REQUESTED: 'from-amber-500 to-amber-600',
      TRANSFER_APPROVED: 'from-emerald-500 to-emerald-600',
      TRANSFER_REJECTED: 'from-red-500 to-red-600',
      MAINTENANCE_REQUESTED: 'from-amber-500 to-amber-600',
      MAINTENANCE_APPROVED: 'from-emerald-500 to-emerald-600',
      MAINTENANCE_REJECTED: 'from-red-500 to-red-600',
      MAINTENANCE_RESOLVED: 'from-teal-500 to-teal-600',
      BOOKING_CONFIRMED: 'from-purple-500 to-purple-600',
      ROLE_CHANGE: 'from-indigo-500 to-indigo-600',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="min-h-screen">
      <Header title="Notifications" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`transition-all duration-200 ${!notification.read ? 'border-primary/30 bg-primary/5' : 'opacity-75'}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getNotificationIcon(notification.type)} flex items-center justify-center text-white flex-shrink-0`}>
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{notification.type}</Badge>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    </div>
                    <p className="text-sm mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(notification.createdAt)}</p>
                  </div>
                </div>
                {!notification.read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(notification.id)} className="h-8 gap-1">
                    <Check className="h-3 w-3" /> Read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
