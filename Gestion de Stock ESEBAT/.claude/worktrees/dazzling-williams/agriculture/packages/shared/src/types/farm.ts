import type { FarmingType } from '../enums';

export interface RegionDTO {
  id: string;
  name: string;
  zone: string;
}

export interface FarmDTO {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  regionId: string;
  totalArea: number | null;
  farmingType: FarmingType;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  region?: RegionDTO;
}
