import { z } from 'zod';
import { SEASONS } from '../enums';

export const runRecommendationSchema = z.object({
  season: z.enum(SEASONS.filter((s) => s !== 'ANY') as [string, ...string[]]).nullable().optional(),
  historyDays: z.number().int().min(7).max(90).default(30),
});

export type RunRecommendationInput = z.infer<typeof runRecommendationSchema>;
