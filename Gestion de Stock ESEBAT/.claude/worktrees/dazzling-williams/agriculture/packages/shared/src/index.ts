// Roles & RBAC
export { UserRole, ROLES, ROLE_HIERARCHY, hasRequiredRole } from './roles';
export type { RoleLevel } from './roles';

// Enums
export {
  FarmingType,
  FARMING_TYPES,
  SoilType,
  SOIL_TYPES,
  ParcelStatus,
  PARCEL_STATUSES,
  Season,
  SEASONS,
  CropCategory,
  CROP_CATEGORIES,
  AlertType,
  ALERT_TYPES,
  AlertSeverity,
  ALERT_SEVERITIES,
  AlertStatus,
  ALERT_STATUSES,
  AlertRuleScope,
} from './enums';

// Zod schemas
export {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from './schemas/auth';
export type { LoginInput, RegisterInput } from './schemas/auth';
export { farmCreateSchema, farmUpdateSchema } from './schemas/farm';
export type { FarmCreateInput, FarmUpdateInput } from './schemas/farm';
export { parcelCreateSchema, parcelUpdateSchema } from './schemas/parcel';
export type { ParcelCreateInput, ParcelUpdateInput } from './schemas/parcel';
export { soilProfileSchema } from './schemas/soil';
export type { SoilProfileInput } from './schemas/soil';
export { runRecommendationSchema } from './schemas/recommendation';
export type { RunRecommendationInput } from './schemas/recommendation';
export { cropCreateSchema, cropUpdateSchema, cropRequirementCreateSchema, cropRequirementUpdateSchema } from './schemas/crop';
export type { CropCreateInput, CropUpdateInput, CropRequirementCreateInput, CropRequirementUpdateInput } from './schemas/crop';

// API types
export type {
  ErrorResponse,
  ErrorDetail,
  ApiError,
  UserDTO,
  AuthTokens,
  HealthResponse,
} from './types/api';
export type { FarmDTO, RegionDTO } from './types/farm';
export type { ParcelDTO, Paginated } from './types/parcel';
export type {
  CropDTO,
  RecommendationDTO,
  RecommendationResultDTO,
  RecommendationReason,
  SoilProfileDTO,
} from './types/recommendation';
export type { AlertDTO, AlertSummaryDTO, AlertRuleCondition } from './types/alert';
export type { AuditLogDTO } from './types/audit';
export {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  adminRegionSchema,
  adminRegionUpdateSchema,
  adminCropSchema,
  adminCropRequirementSchema,
  adminAlertRuleSchema,
} from './schemas/admin';
export type {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  AdminRegionInput,
  AdminAlertRuleInput,
} from './schemas/admin';
