import type { SoilType, ParcelStatus } from '../enums';
import type { RegionDTO } from './farm';

export interface ParcelDTO {
  id: string;
  farmId: string;
  name: string;
  area: number;
  regionId: string;
  latitude: number | null;
  longitude: number | null;
  soilType: SoilType;
  status: ParcelStatus;
  createdAt: string;
  updatedAt: string;
  region?: RegionDTO;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
