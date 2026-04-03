const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as ApiError;
    throw new Error(err?.error?.message || res.statusText);
  }
  return data as T;
}

/** Appel fetch brut vers /auth/refresh pour éviter la dépendance circulaire avec api() */
async function doRefreshToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (typeof window === 'undefined') return null;
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.accessToken, refreshToken: data.refreshToken };
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // 401 + pas déjà un retry: tenter refresh puis relancer la requête
  if (res.status === 401 && !isRetry && typeof window !== 'undefined') {
    const refreshed = await doRefreshToken();
    if (refreshed) {
      localStorage.setItem(ACCESS_KEY, refreshed.accessToken);
      localStorage.setItem(REFRESH_KEY, refreshed.refreshToken);
      headers['Authorization'] = `Bearer ${refreshed.accessToken}`;
      const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
      return handleResponse<T>(retryRes);
    }
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    window.location.href = '/auth/login';
    throw new Error('Session expirée');
  }

  return handleResponse<T>(res);
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, role?: string) =>
    api<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: role || 'FARMER' }),
    }),

  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken?: string) =>
    api<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refreshToken || null }),
    }),

  me: () => api<{ id: string; email: string; role: string }>('/auth/me'),

  forgotPassword: (email: string) =>
    api<{ success: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    api<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

export type FarmDTO = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  regionId: string;
  totalArea: number | null;
  farmingType: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  region?: { id: string; name: string; zone: string };
};

export type ParcelDTO = {
  id: string;
  farmId: string;
  name: string;
  area: number;
  regionId: string;
  latitude: number | null;
  longitude: number | null;
  soilType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  region?: { id: string; name: string; zone: string };
};

export type RegionDTO = { id: string; name: string; zone: string };

export const farmerApi = {
  getFarm: () => api<FarmDTO>('/farmer/farm'),
  createFarm: (data: {
    name: string;
    phone?: string;
    regionId: string;
    totalArea?: number;
    farmingType: string;
    description?: string;
  }) =>
    api<FarmDTO>('/farmer/farm', { method: 'POST', body: JSON.stringify(data) }),
  updateFarm: (data: Partial<{
    name: string;
    phone: string;
    regionId: string;
    totalArea: number;
    farmingType: string;
    description: string;
  }>) =>
    api<FarmDTO>('/farmer/farm', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteFarm: () => api<{ success?: boolean }>('/farmer/farm', { method: 'DELETE' }),

  getParcels: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    return api<{
      data: ParcelDTO[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/farmer/parcels?${q}`);
  },
  getParcel: (id: string) => api<ParcelDTO>(`/farmer/parcels/${id}`),
  createParcel: (data: {
    name: string;
    area: number;
    regionId: string;
    latitude?: number;
    longitude?: number;
    soilType: string;
    status?: string;
  }) =>
    api<ParcelDTO>('/farmer/parcels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateParcel: (id: string, data: Partial<{
    name: string;
    area: number;
    regionId: string;
    latitude: number | null;
    longitude: number | null;
    soilType: string;
    status: string;
  }>) =>
    api<ParcelDTO>(`/farmer/parcels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteParcel: (id: string) =>
    api<{ success: boolean }>(`/farmer/parcels/${id}`, { method: 'DELETE' }),

  getDashboard: () =>
    api<{
      farm: FarmDTO | null;
      stats: { totalParcels: number; totalArea: number; mainRegion: { id: string; name: string } | null } | null;
      recentParcels: ParcelDTO[];
    }>('/farmer/dashboard'),

  getParcelWeather: (parcelId: string, days?: number) =>
    api<WeatherResponse>(`/farmer/parcels/${parcelId}/weather?days=${days ?? 7}`),
  getParcelWeatherHistory: (parcelId: string, days?: number) =>
    api<WeatherResponse>(`/farmer/parcels/${parcelId}/weather/history?days=${days ?? 30}`),

  // Sprint 3 - Sol
  getSoilProfile: (parcelId: string) =>
    api<SoilProfileDTO>(`/farmer/parcels/${parcelId}/soil`),
  updateSoilProfile: (parcelId: string, data: { ph?: number | null; soilMoisture?: number | null; salinity?: number | null }) =>
    api<SoilProfileDTO>(`/farmer/parcels/${parcelId}/soil`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Sprint 3 - Recommandations
  runRecommendation: (parcelId: string, body?: { season?: 'DRY' | 'RAINY' | null; historyDays?: number }) =>
    api<RunRecommendationResponse>(`/farmer/parcels/${parcelId}/recommendations/run`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  getParcelRecommendations: (parcelId: string, page?: number, limit?: number) =>
    api<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/farmer/parcels/${parcelId}/recommendations?page=${page ?? 1}&limit=${limit ?? 10}`,
    ),
  getAllRecommendations: (page?: number, limit?: number) =>
    api<{ data: RecommendationDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/farmer/recommendations?page=${page ?? 1}&limit=${limit ?? 10}`,
    ),
  getRecommendation: (id: string) =>
    api<RecommendationDTO>(`/farmer/recommendations/${id}`),

  // Sprint 4 - Alertes
  getAlerts: (params?: { page?: number; limit?: number; status?: string; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.severity) q.set('severity', params.severity);
    return api<{ data: AlertDTO[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/farmer/alerts?${q}`,
    );
  },
  getAlertSummary: () =>
    api<AlertSummaryDTO>('/farmer/alerts/summary'),
  getAlert: (id: string) =>
    api<AlertDTO>(`/farmer/alerts/${id}`),
  ackAlert: (id: string) =>
    api<AlertDTO>(`/farmer/alerts/${id}/ack`, { method: 'POST' }),
  resolveAlert: (id: string) =>
    api<AlertDTO>(`/farmer/alerts/${id}/resolve`, { method: 'POST' }),
  muteAlert: (id: string, hours: number) =>
    api<AlertDTO>(`/farmer/alerts/${id}/mute`, {
      method: 'POST',
      body: JSON.stringify({ hours }),
    }),
};

export type AlertDTO = {
  id: string;
  farmerUserId: string;
  parcelId: string;
  parcelName?: string;
  ruleId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  status: string;
  triggeredAt: string;
  ackedAt: string | null;
  resolvedAt: string | null;
  mutedUntil: string | null;
  meta: Record<string, unknown> | null;
};

export type AlertSummaryDTO = {
  open: number;
  critical: number;
  warning: number;
  lastTriggeredAt: string | null;
};

export type SoilProfileDTO = {
  parcelId: string;
  ph: number | null;
  soilMoisture: number | null;
  salinity: number | null;
  updatedAt: string;
};

export type RecommendationResultDTO = {
  cropId: string;
  cropName: string;
  score: number;
  recommended: boolean;
  positiveReasons: string[];
  negativeReasons: string[];
  missingData: string[];
  explainText: string;
};

export type RecommendationDTO = {
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
};

export type RunRecommendationResponse = {
  recommendationId: string;
  results: RecommendationResultDTO[];
  inputs: Record<string, unknown>;
  season: string;
  topCropId: string | null;
  topScore: number | null;
};

export type WeatherDailyItem = {
  date: string;
  tMin?: number;
  tMax?: number;
  tAvg?: number;
  humidityAvg?: number;
  rainfallMm?: number;
  windSpeedAvg?: number;
};

export type WeatherResponse = {
  parcelId: string;
  provider: string;
  stale: boolean;
  fromCache: boolean;
  refreshedAt: string;
  daily: WeatherDailyItem[];
};

export const regionsApi = {
  list: () => api<RegionDTO[]>('/regions'),
  get: (id: string) => api<RegionDTO>(`/regions/${id}`),
};

export type AdminStatsDTO = {
  totalUsers: number;
  activeUsers: number;
  totalFarms: number;
  totalParcels: number;
  totalRegions: number;
  totalCrops: number;
  totalAlertRules: number;
  openAlerts: number;
  criticalAlerts: number;
};

// Sprint 5 - Admin
export const adminApi = {
  getStats: () => api<AdminStatsDTO>('/admin/stats'),

  getUsers: (params?: { page?: number; limit?: number; q?: string; role?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.q) q.set('q', params.q);
    if (params?.role) q.set('role', params.role);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return api<{ items: AdminUserDTO[]; meta: PaginationMeta }>(`/admin/users?${q}`);
  },
  getUser: (id: string) => api<AdminUserDetailDTO>(`/admin/users/${id}`),
  createUser: (data: { email: string; password: string; role: string; isActive?: boolean }) =>
    api<AdminUserDTO>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: { role?: string; isActive?: boolean; resetPassword?: string }) =>
    api<AdminUserDTO>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  disableUser: (id: string) => api<AdminUserDTO>(`/admin/users/${id}/disable`, { method: 'POST' }),
  enableUser: (id: string) => api<AdminUserDTO>(`/admin/users/${id}/enable`, { method: 'POST' }),

  getRegions: (params?: { page?: number; limit?: number; q?: string; zone?: string; isActive?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.q) sp.set('q', params.q);
    if (params?.zone) sp.set('zone', params.zone);
    if (params?.isActive !== undefined) sp.set('isActive', String(params.isActive));
    return api<{ items: AdminRegionDTO[]; meta: PaginationMeta }>(`/admin/regions?${sp}`);
  },
  createRegion: (data: { name: string; code: string; zone: string }) =>
    api<AdminRegionDTO>('/admin/regions', { method: 'POST', body: JSON.stringify(data) }),
  updateRegion: (id: string, data: { name?: string; code?: string; zone?: string }) =>
    api<AdminRegionDTO>(`/admin/regions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  disableRegion: (id: string) => api<AdminRegionDTO>(`/admin/regions/${id}/disable`, { method: 'POST' }),
  enableRegion: (id: string) => api<AdminRegionDTO>(`/admin/regions/${id}/enable`, { method: 'POST' }),

  getCrops: (params?: { page?: number; limit?: number; q?: string; category?: string; isActive?: boolean }) => {
    const sp = new URLSearchParams();
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.q) sp.set('q', params.q);
    if (params?.category) sp.set('category', params.category);
    if (params?.isActive !== undefined) sp.set('isActive', String(params.isActive));
    return api<{ items: AdminCropDTO[]; meta: PaginationMeta }>(`/admin/crops?${sp}`);
  },
  createCrop: (data: { name: string; scientificName?: string; category: string; description?: string }) =>
    api<AdminCropDTO>('/admin/crops', { method: 'POST', body: JSON.stringify(data) }),
  updateCrop: (id: string, data: Partial<{ name: string; scientificName: string; category: string; description: string }>) =>
    api<AdminCropDTO>(`/admin/crops/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  disableCrop: (id: string) => api<AdminCropDTO>(`/admin/crops/${id}/disable`, { method: 'POST' }),
  enableCrop: (id: string) => api<AdminCropDTO>(`/admin/crops/${id}/enable`, { method: 'POST' }),

  getCropRequirements: (params?: { page?: number; limit?: number; cropId?: string; regionId?: string; season?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cropId) q.set('cropId', params.cropId);
    if (params?.regionId) q.set('regionId', params.regionId);
    if (params?.season) q.set('season', params.season);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return api<{ items: AdminCropRequirementDTO[]; meta: PaginationMeta }>(`/admin/crop-requirements?${q}`);
  },
  createCropRequirement: (data: Record<string, unknown>) =>
    api<AdminCropRequirementDTO>('/admin/crop-requirements', { method: 'POST', body: JSON.stringify(data) }),
  updateCropRequirement: (id: string, data: Record<string, unknown>) =>
    api<AdminCropRequirementDTO>(`/admin/crop-requirements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  disableCropRequirement: (id: string) => api(`/admin/crop-requirements/${id}/disable`, { method: 'POST' }),
  enableCropRequirement: (id: string) => api(`/admin/crop-requirements/${id}/enable`, { method: 'POST' }),
  newVersionCropRequirement: (id: string) => api(`/admin/crop-requirements/${id}/new-version`, { method: 'POST' }),

  getAlertRules: (params?: { page?: number; limit?: number; type?: string; severity?: string; scope?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.type) q.set('type', params.type);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.scope) q.set('scope', params.scope);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return api<{ items: AdminAlertRuleDTO[]; meta: PaginationMeta }>(`/admin/alert-rules?${q}`);
  },
  createAlertRule: (data: Record<string, unknown>) =>
    api<AdminAlertRuleDTO>('/admin/alert-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateAlertRule: (id: string, data: Record<string, unknown>) =>
    api<AdminAlertRuleDTO>(`/admin/alert-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  disableAlertRule: (id: string) => api(`/admin/alert-rules/${id}/disable`, { method: 'POST' }),
  enableAlertRule: (id: string) => api(`/admin/alert-rules/${id}/enable`, { method: 'POST' }),

  getAuditLogs: (params?: { page?: number; limit?: number; actorId?: string; entity?: string; action?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.actorId) q.set('actorId', params.actorId);
    if (params?.entity) q.set('entity', params.entity);
    if (params?.action) q.set('action', params.action);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    return api<{ items: AdminAuditLogDTO[]; meta: PaginationMeta }>(`/admin/audit-logs?${q}`);
  },

  getSensors: (params?: { page?: number; limit?: number; q?: string; type?: string; parcelId?: string; isActive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.q) q.set('q', params.q);
    if (params?.type) q.set('type', params.type);
    if (params?.parcelId) q.set('parcelId', params.parcelId);
    if (params?.isActive !== undefined) q.set('isActive', String(params.isActive));
    return api<{ items: SensorDTO[]; meta: PaginationMeta }>(`/admin/sensors?${q}`);
  },
  getSensor: (id: string) => api<SensorDTO>(`/admin/sensors/${id}`),
  getSensorParcels: () => api<ParcelOptionDTO[]>(`/admin/sensors/parcels`),
  createSensor: (data: { name: string; type: string; model?: string; serialNumber?: string; parcelId: string }) =>
    api<SensorDTO>('/admin/sensors', { method: 'POST', body: JSON.stringify(data) }),
  updateSensor: (id: string, data: Partial<{ name: string; type: string; model: string; serialNumber: string; parcelId: string; isActive: boolean }>) =>
    api<SensorDTO>(`/admin/sensors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  regenerateSensorKey: (id: string) =>
    api<{ apiKey: string }>(`/admin/sensors/${id}/regenerate-key`, { method: 'POST' }),
};

export type SensorDTO = {
  id: string;
  name: string;
  type: string;
  model: string | null;
  serialNumber: string | null;
  apiKey: string;
  parcelId: string;
  parcelName?: string;
  farmName?: string;
  isActive: boolean;
  lastReadingAt: string | null;
  createdAt: string;
};
export type ParcelOptionDTO = { id: string; name: string; area: number; farmName: string; regionName: string };

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
export type AdminUserDTO = { id: string; email: string; role: string; isActive: boolean; createdAt: string };
export type AdminUserDetailDTO = AdminUserDTO & { farm?: { id: string; name: string } | null; parcelsCount?: number };
export type AdminRegionDTO = { id: string; name: string; code: string; zone: string; isActive: boolean };
export type AdminCropDTO = { id: string; name: string; scientificName?: string; category: string; description?: string; isActive?: boolean };
export type AdminCropRequirementDTO = {
  id: string;
  cropId?: string;
  cropName?: string;
  regionName?: string;
  season?: string;
  phMin?: number;
  phMax?: number;
  version?: number;
  isActive?: boolean;
  [key: string]: unknown;
};
export type AdminAlertRuleDTO = { id: string; type: string; severity: string; scope: string; isActive: boolean; cooldownHours: number; conditions: unknown };
export type AdminAuditLogDTO = { id: string; actorUserId: string | null; actorEmail?: string | null; actorRole?: string | null; action: string; entity: string; entityId: string | null; metadata: Record<string, unknown> | null; createdAt: string };
