import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Map status to visual variant for badges.
 */
export function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
    Available: 'success',
    Active: 'success',
    Verified: 'success',
    Resolved: 'success',
    Completed: 'success',
    Allocated: 'default',
    Ongoing: 'default',
    Approved: 'default',
    Reserved: 'warning',
    Upcoming: 'warning',
    Pending: 'warning',
    Requested: 'warning',
    'Under Maintenance': 'warning',
    'In Progress': 'warning',
    'Technician Assigned': 'warning',
    Open: 'warning',
    Lost: 'destructive',
    Disposed: 'destructive',
    Retired: 'destructive',
    Rejected: 'destructive',
    Missing: 'destructive',
    Damaged: 'destructive',
    Cancelled: 'secondary',
    Inactive: 'secondary',
    Returned: 'secondary',
    Transferred: 'secondary',
    Closed: 'secondary',
  };
  return map[status] || 'default';
}
