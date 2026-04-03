import type { UserRole } from '../roles.js';

export interface ErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  env: string;
  timestamp?: string;
}
