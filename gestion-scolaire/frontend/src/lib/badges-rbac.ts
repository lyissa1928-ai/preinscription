/**
 * Rôles autorisés côté API pour le scan de présence enseignant (voir backend attendance.controller).
 */
export const TEACHER_BADGE_SCAN_ROLES = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

/** Lecture du journal des scans (GET /attendance/badge-scan-logs). */
export const BADGE_SCAN_LOGS_ROLES = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export function canScanTeacherBadge(role: string | null | undefined): boolean {
  if (!role) return false;
  return (TEACHER_BADGE_SCAN_ROLES as readonly string[]).includes(role);
}

export function canReadBadgeScanLogs(role: string | null | undefined): boolean {
  if (!role) return false;
  return (BADGE_SCAN_LOGS_ROLES as readonly string[]).includes(role);
}
