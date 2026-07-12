import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  asset_id: z.string().uuid('Invalid asset'),
  issue: z.string().min(1, 'Issue description is required'),
  priority: z.enum(['low', 'medium', 'high']),
  photo_url: z.string().optional().nullable(),
});

export const assignTechnicianSchema = z.object({
  technician: z.string().min(1, 'Technician name is required').max(255),
});
