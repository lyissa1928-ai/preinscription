export const FarmingType = {
  RAINFED: 'RAINFED',
  IRRIGATED: 'IRRIGATED',
  MIXED: 'MIXED',
} as const;
export type FarmingType = (typeof FarmingType)[keyof typeof FarmingType];

export const FARMING_TYPES = Object.values(FarmingType);

export const SoilType = {
  SANDY: 'SANDY',
  CLAY: 'CLAY',
  SILTY: 'SILTY',
  LOAMY: 'LOAMY',
  UNKNOWN: 'UNKNOWN',
} as const;
export type SoilType = (typeof SoilType)[keyof typeof SoilType];

export const SOIL_TYPES = Object.values(SoilType);

export const ParcelStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type ParcelStatus = (typeof ParcelStatus)[keyof typeof ParcelStatus];

export const PARCEL_STATUSES = Object.values(ParcelStatus);

// Sprint 3 - Recommandations
export const Season = {
  DRY: 'DRY',
  RAINY: 'RAINY',
  ANY: 'ANY',
} as const;
export type Season = (typeof Season)[keyof typeof Season];

export const SEASONS = Object.values(Season);

export const CropCategory = {
  CEREAL: 'CEREAL',
  VEGETABLE: 'VEGETABLE',
  FRUIT: 'FRUIT',
  LEGUME: 'LEGUME',
  TUBER: 'TUBER',
  OTHER: 'OTHER',
} as const;
export type CropCategory = (typeof CropCategory)[keyof typeof CropCategory];

export const CROP_CATEGORIES = Object.values(CropCategory);

// Sprint 4 - Alertes
export const AlertType = {
  SOIL_MOISTURE_LOW: 'SOIL_MOISTURE_LOW',
  SOIL_PH_OUT_OF_RANGE: 'SOIL_PH_OUT_OF_RANGE',
  SOIL_SALINITY_HIGH: 'SOIL_SALINITY_HIGH',
  HEAT_WAVE_RISK: 'HEAT_WAVE_RISK',
  HEAVY_RAIN_RISK: 'HEAVY_RAIN_RISK',
  DROUGHT_RISK: 'DROUGHT_RISK',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const ALERT_TYPES = Object.values(AlertType);

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

export const ALERT_SEVERITIES = Object.values(AlertSeverity);

export const AlertStatus = {
  OPEN: 'OPEN',
  ACKED: 'ACKED',
  RESOLVED: 'RESOLVED',
  MUTED: 'MUTED',
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

export const ALERT_STATUSES = Object.values(AlertStatus);

export const AlertRuleScope = {
  GLOBAL: 'GLOBAL',
  REGION: 'REGION',
  PARCEL: 'PARCEL',
} as const;
export type AlertRuleScope = (typeof AlertRuleScope)[keyof typeof AlertRuleScope];
