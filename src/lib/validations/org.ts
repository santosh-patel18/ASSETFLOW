import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  parent_department_id: z.string().uuid().optional().nullable(),
  head_employee_id: z.string().uuid().optional().nullable(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parent_department_id: z.string().uuid().optional().nullable(),
  head_employee_id: z.string().uuid().optional().nullable(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  field_schema: z.record(z.any()).optional().default({}),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  field_schema: z.record(z.any()).optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(['employee', 'department_head', 'asset_manager', 'admin']),
});
