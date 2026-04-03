import { z } from 'zod';

export const soilProfileSchema = z.object({
  ph: z.number().min(0).max(14).optional().nullable(),
  soilMoisture: z.number().min(0).max(100).optional().nullable(),
  salinity: z.number().min(0).optional().nullable(),
});

export type SoilProfileInput = z.infer<typeof soilProfileSchema>;
