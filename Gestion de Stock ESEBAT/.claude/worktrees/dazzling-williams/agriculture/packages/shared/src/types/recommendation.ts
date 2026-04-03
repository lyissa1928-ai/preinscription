import type { CropCategory } from '../enums';

export interface CropDTO {
  id: string;
  name: string;
  scientificName: string | null;
  category: CropCategory;
  description: string | null;
}

export interface RecommendationReason {
  type: 'match' | 'mismatch' | 'missing';
  criterion: string;
  message: string;
}

export interface RecommendationResultDTO {
  cropId: string;
  cropName: string;
  score: number;
  recommended: boolean;
  positiveReasons: string[];
  negativeReasons: string[];
  missingData: string[];
  explainText: string;
}

export interface RecommendationDTO {
  id: string;
  parcelId: string;
  generatedAt: string;
  engineVersion: string;
  season: string;
  topCropId: string | null;
  topCropName: string | null;
  topScore: number | null;
  results: RecommendationResultDTO[];
  inputs: Record<string, unknown>;
}

export interface SoilProfileDTO {
  parcelId: string;
  ph: number | null;
  soilMoisture: number | null;
  salinity: number | null;
  updatedAt: string;
}
