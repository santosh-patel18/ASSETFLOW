import { z } from 'zod';

export const createBookingSchema = z.object({
  resource_id: z.string().uuid('Invalid resource'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  department_id: z.string().uuid().optional().nullable(),
}).refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: 'End time must be after start time',
  path: ['end_time'],
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});
