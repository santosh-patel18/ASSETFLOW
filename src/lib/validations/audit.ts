import { z } from 'zod';

export const createAuditCycleSchema = z.object({
  scope_department_id: z.string().uuid().optional().nullable(),
  scope_location: z.string().max(255).optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  auditor_ids: z.array(z.string().uuid()).min(1, 'At least one auditor is required'),
});

export const markAuditItemSchema = z.object({
  result: z.enum(['Verified', 'Missing', 'Damaged']),
});

export const closeAuditCycleSchema = z.object({
  resolutions: z.array(z.object({
    asset_id: z.string().uuid(),
    action: z.enum(['mark_lost', 'mark_available', 'no_change']),
  })).optional().default([]),
});
