import { z } from 'zod';

export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  category_id: z.string().uuid('Invalid category'),
  serial_number: z.string().max(255).optional().nullable(),
  acquisition_date: z.string().optional().nullable(),
  acquisition_cost: z.number().nonnegative().optional().nullable(),
  condition: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  is_bookable: z.boolean().optional().default(false),
  attributes: z.record(z.any()).optional().default({}),
  photo_url: z.string().optional().nullable(),
  document_urls: z.array(z.string()).optional().default([]),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  serial_number: z.string().max(255).optional().nullable(),
  acquisition_date: z.string().optional().nullable(),
  acquisition_cost: z.number().nonnegative().optional().nullable(),
  condition: z.string().max(50).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  is_bookable: z.boolean().optional(),
  attributes: z.record(z.any()).optional(),
  photo_url: z.string().optional().nullable(),
  document_urls: z.array(z.string()).optional(),
});

export const allocateAssetSchema = z.object({
  target_type: z.enum(['employee', 'department']),
  target_id: z.string().uuid(),
  expected_return_date: z.string().optional().nullable(),
});

export const returnAssetSchema = z.object({
  condition_notes: z.string().optional().nullable(),
});

export const transferRequestSchema = z.object({
  new_target_type: z.enum(['employee', 'department']),
  new_target_id: z.string().uuid(),
});

/**
 * Dynamically validate asset attributes against a category's field_schema.
 * field_schema format: { "field_name": { "type": "string"|"number"|"boolean", "required": boolean } }
 */
export function validateAttributesAgainstSchema(
  attributes: Record<string, unknown>,
  fieldSchema: Record<string, { type: string; required?: boolean }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [key, schema] of Object.entries(fieldSchema)) {
    const value = attributes[key];
    
    if (schema.required && (value === undefined || value === null || value === '')) {
      errors.push(`Attribute '${key}' is required`);
      continue;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      switch (schema.type) {
        case 'string':
          if (typeof value !== 'string') errors.push(`Attribute '${key}' must be a string`);
          break;
        case 'number':
          if (typeof value !== 'number') errors.push(`Attribute '${key}' must be a number`);
          break;
        case 'boolean':
          if (typeof value !== 'boolean') errors.push(`Attribute '${key}' must be a boolean`);
          break;
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
