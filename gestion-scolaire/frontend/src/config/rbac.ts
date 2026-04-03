/**
 * Droits par rôle — source unique pour les vérifications côté frontend.
 * Évite de redéfinir CAN_WRITE, canLock, etc. dans chaque page.
 */

import { normalizeRole } from '@/lib/role-normalize';

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SERVICE_PEDAGOGIQUE: 'SERVICE_PEDAGOGIQUE',
  RESPONSABLE_PEDAGOGIQUE: 'RESPONSABLE_PEDAGOGIQUE',
  AGENT_PEDAGOGIQUE: 'AGENT_PEDAGOGIQUE',
  SCOLARITE: 'SCOLARITE',
  DEPT_HEAD: 'DEPT_HEAD',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  AUDITOR: 'AUDITOR',
  CAISSIER: 'CAISSIER',
  CHEF_COMPTABLE: 'CHEF_COMPTABLE',
  DAF: 'DAF',
} as const;

/**
 * Peut créer / supprimer des enseignants (aligné sur le backend CAN_ADD_PERSONNEL).
 * La scolarité n’est pas incluse : consultation liste OK, pas de création ni suppression enseignant.
 */
export const CAN_ADD_PERSONNEL = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

/** Édition fiche enseignant (contrat, grade) — scolarité + pédagogie + admin. */
export const CAN_WRITE_TEACHER_PROFILE = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

/** Peut créer/modifier/supprimer filières, formations, campus, salles, etc. (pas SCOLARITE seule). */
export const CAN_WRITE_STRUCTURE = ['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'] as const;

/** Création manuelle d’une formation (hors assistant Licence/Master) — aligné sur le backend (ADMIN / SUPER_ADMIN). */
export const CAN_MANUAL_FORMATION_LEGACY = ['ADMIN', 'SUPER_ADMIN'] as const;

/** Peut importer filières/formations (Excel). */
export const CAN_IMPORT_FORMATIONS = ['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'] as const;

/** Peut verrouiller/déverrouiller filières / formations / maquettes / semestres. */
export const CAN_LOCK = ['ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_PEDAGOGIQUE'] as const;

/** Peut accéder à la gouvernance. */
export const CAN_GOVERNANCE = ['ADMIN', 'SUPER_ADMIN'] as const;

/** Peut voir les demandes de validation. */
export const CAN_DEMANDES_VALIDATION = ['ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_PEDAGOGIQUE'] as const;

/** Peut voir les demandes de déverrouillage. */
export const CAN_DEMANDES_DEVERROUILLAGE = ['ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_PEDAGOGIQUE'] as const;

export function canWriteStructure(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_WRITE_STRUCTURE as readonly string[]).includes(r);
}

export function canManualFormationLegacy(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_MANUAL_FORMATION_LEGACY as readonly string[]).includes(r);
}

export function canImportFormations(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_IMPORT_FORMATIONS as readonly string[]).includes(r);
}

export function canLock(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_LOCK as readonly string[]).includes(r);
}

export function canGovernance(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_GOVERNANCE as readonly string[]).includes(r);
}

export function canDemandesValidation(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_DEMANDES_VALIDATION as readonly string[]).includes(r);
}

export function canDemandesDeverrouillage(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_DEMANDES_DEVERROUILLAGE as readonly string[]).includes(r);
}

export function canAddPersonnel(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_ADD_PERSONNEL as readonly string[]).includes(r);
}

/** Alias explicite : création / suppression d’enseignants (pas la scolarité). */
export function canManageTeachers(role: string | null): boolean {
  return canAddPersonnel(role);
}

export function canWriteTeacherProfile(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_WRITE_TEACHER_PROFILE as readonly string[]).includes(r);
}

/** Création / modification / suppression de campus — aligné sur `campuses` (backend CAN_MANAGE). */
export const CAN_MANAGE_CAMPUS = ['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'] as const;

export function canManageCampus(role: string | null): boolean {
  const r = normalizeRole(role);
  return r !== null && (CAN_MANAGE_CAMPUS as readonly string[]).includes(r);
}

/** Salles : mêmes rôles que campus (backend `salles` CAN_MANAGE). */
export function canManageSalles(role: string | null): boolean {
  return canManageCampus(role);
}
