import { z } from 'zod';
import { FARMING_TYPES } from '../enums';

const phoneRegex = /^\+?[\d\s-]{8,20}$/;

export const farmCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  phone: z.string().regex(phoneRegex).optional().or(z.literal('')),
  regionId: z.string().min(1, 'Région invalide'),
  totalArea: z.number().min(0).optional(),
  farmingType: z.enum(FARMING_TYPES as [string, ...string[]]),
  description: z.string().max(2000).optional(),
});

export const farmUpdateSchema = farmCreateSchema.partial();

export type FarmCreateInput = z.infer<typeof farmCreateSchema>;
export type FarmUpdateInput = z.infer<typeof farmUpdateSchema>;
