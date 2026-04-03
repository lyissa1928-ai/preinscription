/**
 * Mapping rôle → URL du dashboard. Source unique pour login, redirection et sidebar.
 */

export const ROLE_DASHBOARDS: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/admin',
  ADMIN: '/dashboard/admin',
  SERVICE_PEDAGOGIQUE: '/dashboard/pedagogie',
  RESPONSABLE_PEDAGOGIQUE: '/dashboard/pedagogie', // voit tout ce que fait l’agent de son campus, depuis le dashboard pédagogie
  AGENT_PEDAGOGIQUE: '/dashboard/pedagogie',      // emploi du temps et pilotage pédagogique de son campus
  SCOLARITE: '/dashboard/scolarite',
  DEPT_HEAD: '/dashboard/chef-departement',
  TEACHER: '/dashboard/enseignant',
  STUDENT: '/dashboard/etudiant',
  AUDITOR: '/dashboard/auditeur',
  CAISSIER: '/dashboard/comptable',
  CHEF_COMPTABLE: '/dashboard/comptable',
  DAF: '/dashboard/comptable',
};

export function getDashboardForRole(role: string): string {
  return ROLE_DASHBOARDS[role] || '/dashboard/profil';
}
