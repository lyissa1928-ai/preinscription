import { z } from 'zod';
import { ROLES } from '../roles';
import { CROP_CATEGORIES, SEASONS } from '../enums';
import { ALERT_TYPES, ALERT_SEVERITIES } from '../enums';

export const adminCreateUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  role: z.enum(ROLES as [string, ...string[]]),
  isActive: z.boolean().default(true),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(ROLES as [string, ...string[]]).optional(),
  isActive: z.boolean().optional(),
  resetPassword: z.string().min(8).optional(),
});

export const adminRegionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(10),
  zone: z.string().min(1).max(50),
});

export const adminRegionUpdateSchema = adminRegionSchema.partial();

export const adminCropSchema = z.object({
  name: z.string().min(1).max(200),
  scientificName: z.string().max(200).optional().nullable(),
  category: z.enum(CROP_CATEGORIES as [string, ...string[]]),
  description: z.string().max(2000).optional().nullable(),
  defaultPlantingMonths: z.array(z.number().int().min(1).max(12)).optional().nullable(),
  defaultHarvestMonths: z.array(z.number().int().min(1).max(12)).optional().nullable(),
});

export const adminCropRequirementSchema = z
  .object({
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
  })
  .refine((d) => d.phMin == null || d.phMax == null || d.phMin <= d.phMax, {
    message: 'phMin doit être <= phMax',
    path: ['phMax'],
  });

export const adminAlertRuleSchema = z.object({
  scope: z.enum(['GLOBAL', 'REGION', 'PARCEL']).default('GLOBAL'),
  regionId: z.string().cuid().optional().nullable(),
  parcelId: z.string().cuid().optional().nullable(),
  type: z.enum(ALERT_TYPES as [string, ...string[]]),
  severity: z.enum(ALERT_SEVERITIES as [string, ...string[]]),
  conditions: z.record(z.unknown()),
  windowDays: z.number().int().min(1).optional().nullable(),
  cooldownHours: z.number().int().min(1).default(24),
  messageTemplate: z.string().min(1),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminRegionInput = z.infer<typeof adminRegionSchema>;
export type AdminAlertRuleInput = z.infer<typeof adminAlertRuleSchema>;
