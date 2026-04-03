import { z } from 'zod';
import { SOIL_TYPES, PARCEL_STATUSES } from '../enums';

export const parcelCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  area: z.number().positive('La superficie doit être positive'),
  regionId: z.string().min(1, 'Région invalide'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  soilType: z.enum(SOIL_TYPES as [string, ...string[]]),
  status: z.enum(PARCEL_STATUSES as [string, ...string[]]).default('ACTIVE'),
});

export const parcelUpdateSchema = parcelCreateSchema.partial();

export type ParcelCreateInput = z.infer<typeof parcelCreateSchema>;
export type ParcelUpdateInput = z.infer<typeof parcelUpdateSchema>;
