/**
 * Constantes RBAC partagées (RBAC pur, 1 rôle par user).
 *
 * — Statuts / rôles possibles —
 * • SUPER_ADMIN, ADMIN : administration globale.
 * • SERVICE_PEDAGOGIQUE : directeur pédagogique (fédérateur), voit tous les campus et toute l’activité pédagogique.
 * • RESPONSABLE_PEDAGOGIQUE : par campus (un par campus), voit tout ce que fait l’agent pédagogique de son campus.
 * • AGENT_PEDAGOGIQUE : par campus (un par campus), génère et gère l’emploi du temps de son campus.
 * • SCOLARITE, DEPT_HEAD, TEACHER, STUDENT, AUDITOR, CAISSIER, CHEF_COMPTABLE, DAF.
 */

// ——— Grades (notes) ———
/** Lecture configs sessions + notes (sans écriture) */
export const GRADES_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
  'TEACHER',
  'AUDITOR',
] as const;
/** Saisie / édition notes : enseignant, scolarité, service pédagogique et responsable pédagogique */
export const GRADES_WRITE = [
  'TEACHER',
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Configuration sessions (date limite, verrouillage jury) */
export const GRADES_SESSION_CONFIG = [
  'SCOLARITE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Approve/Reject demande de modification de note (pédagogie + chef de dépt + admin) */
export const GRADES_APPROVE_REJECT = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Lecture des demandes de modification */
export const GRADES_MODIFICATION_READ = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
  'AUDITOR',
] as const;
/** Mes ECs / mes notes (enseignant ou étudiant) */
export const GRADES_MY_ECS = ['TEACHER'] as const;
export const GRADES_ME = [
  'STUDENT',
  'TEACHER',
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
  'AUDITOR',
] as const;
/** Lecture notes par EC (enseignant + pédagogie + scolarité) */
export const GRADES_EC_READ = [
  'TEACHER',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'SCOLARITE',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
  'AUDITOR',
] as const;

// ——— Finance (paiements) ———
/** Créer paiement / encaissement */
export const FINANCE_PAYMENT_CREATE = [
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Valider / Rejeter paiement */
export const FINANCE_PAYMENT_VALIDATE_REJECT = [
  'CHEF_COMPTABLE',
  'DAF',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Lecture liste paiements + statuts */
export const FINANCE_PAYMENT_READ = [
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
  'ADMIN',
  'SUPER_ADMIN',
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'AUDITOR',
] as const;
/** Lecture statut financier personne */
export const FINANCE_STATUT_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'AUDITOR',
  'ADMIN',
  'SUPER_ADMIN',
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
] as const;
/** Non en règle (liste) */
export const FINANCE_NON_EN_REGLE = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'DAF',
  'ADMIN',
  'SUPER_ADMIN',
  'AUDITOR',
] as const;
/** Recouvrement / actions massives */
export const FINANCE_RECOUVREMENT = [
  'DAF',
  'ADMIN',
  'SUPER_ADMIN',
  'AUDITOR',
] as const;

// ——— Attendance (pointage) ———
/** Enseignant : ses cours du jour + pointage arrivee/depart + me */
export const ATTENDANCE_TEACHER = ['TEACHER'] as const;
/** Supervision : liste tous les pointages + validate. Responsable pédagogique hérite des mêmes droits que le directeur sur son périmètre. */
export const ATTENDANCE_SUPERVISE = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

// ——— Payroll (paie) ———
/** Écriture (calcul, génération bulletins) + lecture liste */
export const PAYROLL_WRITE = ['DAF', 'ADMIN', 'SUPER_ADMIN'] as const;
/** Lecture seule (rapports) */
export const PAYROLL_READ = ['DAF', 'ADMIN', 'SUPER_ADMIN', 'AUDITOR'] as const;
/** Enseignant : ses bulletins uniquement */
export const PAYROLL_ME = ['TEACHER'] as const;
/** Téléchargement bulletin par un admin */
export const PAYROLL_BULLETIN_ADMIN = ['DAF', 'ADMIN', 'SUPER_ADMIN'] as const;

// ——— Courses (emploi du temps) ———
/** Gestion (création, modification, suppression, template, bulk) : directeur + responsable pédagogique (hérite agent) + agent pédagogique + admin. */
export const COURSES_MANAGE = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Lecture planning : scolarité, directeur, responsable et agent (leur campus), enseignants, admin. */
export const COURSES_READ = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'TEACHER',
  'STUDENT',
  'DEPT_HEAD',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

// ——— Personnel (enseignants, staff) ———
/** Ajout d’enseignants ou de personnel (staff). Admin et responsable pédagogique ont le même privilège. */
export const CAN_ADD_PERSONNEL = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Mise à jour fiche enseignant (contrat, grade, etc.) — scolarité + pédagogie + admin (responsable pédagogique inclus). */
export const CAN_WRITE_TEACHER_RECORD = [
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

// ——— Structure académique (filières, formations, semestres, maquettes, UE, EC) ———
/** Création / modification / suppression. Admin et responsable pédagogique ont le même privilège. */
export const CAN_MANAGE_STRUCTURE_ACADEMIQUE = [
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
] as const;
/** Création manuelle d’une formation (hors assistant Licence/Master) : réservé admin (legacy / cas exceptionnels). */
export const STRUCTURE_MANUAL_FORMATION = ['ADMIN', 'SUPER_ADMIN'] as const;

// ——— Création d’utilisateurs (POST /users) ———
/** Rôles autorisés lors de la création via "Ajouter un utilisateur" (personnel administratif et technique uniquement). Les étudiants et enseignants sont gérés par des modules dédiés (étudiants : scolarité ; enseignants : pédagogie / admin). */
export const STAFF_ONLY_USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'AGENT_PEDAGOGIQUE',
  'SCOLARITE',
  'DEPT_HEAD',
  'AUDITOR',
  'CAISSIER',
  'CHEF_COMPTABLE',
  'DAF',
] as const;
