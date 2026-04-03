import { z } from 'zod';
import { CROP_CATEGORIES, SEASONS } from '../enums';

export const cropCreateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  scientificName: z.string().max(200).optional().nullable(),
  category: z.enum(CROP_CATEGORIES as [string, ...string[]]),
  description: z.string().max(2000).optional().nullable(),
  defaultPlantingMonths: z.array(z.number().int().min(1).max(12)).optional().nullable(),
  defaultHarvestMonths: z.array(z.number().int().min(1).max(12)).optional().nullable(),
});

export const cropUpdateSchema = cropCreateSchema.partial();

export const cropRequirementCreateSchema = z.object({
  cropId: z.string().cuid(),
  regionId: z.string().cuid().optional().nullable(),
  season: z.enum(SEASONS as [string, ...string[]]).default('ANY'),
  phMin: z.number().optional().nullable(),
  phMax: z.number().optional().nullable(),
  soilMoistureMin: z.number().min(0).max(100).optional().nullable(),
  soilMoistureMax: z.number().min(0).max(100).optional().nullable(),
  salinityMax: z.number().min(0).optional().nullable(),
  rainfallMinMm: z.number().min(0).optional().nullable(),
  rainfallMaxMm: z.number().min(0).optional().nullable(),
  tempMinC: z.number().optional().nullable(),
  tempMaxC: z.number().optional().nullable(),
  weightPh: z.number().int().min(0).max(100).default(20),
  weightMoisture: z.number().int().min(0).max(100).default(20),
  weightSalinity: z.number().int().min(0).max(100).default(20),
  weightRainfall: z.number().int().min(0).max(100).default(20),
  weightTemp: z.number().int().min(0).max(100).default(20),
  notes: z.string().max(2000).optional().nullable(),
});

export const cropRequirementUpdateSchema = cropRequirementCreateSchema.partial().omit({ cropId: true });

export type CropCreateInput = z.infer<typeof cropCreateSchema>;
export type CropUpdateInput = z.infer<typeof cropUpdateSchema>;
export type CropRequirementCreateInput = z.infer<typeof cropRequirementCreateSchema>;
export type CropRequirementUpdateInput = z.infer<typeof cropRequirementUpdateSchema>;
