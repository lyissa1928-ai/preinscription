import type { AlertItem, ModuleCardItem, QuickActionItem, RecentActivityItem } from '@/components/dashboard';

// Statistiques par défaut du tableau de bord Admin.
export function getDefaultAdminStats() {
  return {
    students: 0,
    studentsSub: "Étudiants inscrits sur l'année",
    teachers: 0,
    teachersSub: 'Enseignants actifs',
    classes: 0,
    classesSub: 'Classes / cohortes actives',
    pendingEnrollments: 0,
    pendingEnrollmentsSub: 'Inscriptions en attente de validation',
    pendingGradeChanges: 0,
  };
}

// Génère les alertes à partir des données agrégées.
export function getAdminAlertsFromData(input: {
  pendingEnrollments: number;
  pendingGradeChanges: number;
  teachersWithoutAssignment: number;
  classesWithoutTimetable: number;
  roomOverCapacity: number;
  pendingBreaches: number;
  nonEnRegle: number;
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (input.pendingEnrollments > 0) {
    alerts.push({
      id: 'pending-enrollments',
      severity: 'warning',
      message: `${input.pendingEnrollments} inscription(s) en attente`,
      href: '/dashboard/scolarite/inscriptions',
      count: input.pendingEnrollments,
    });
  }

  if (input.pendingGradeChanges > 0) {
    alerts.push({
      id: 'pending-grade-changes',
      severity: 'warning',
      message: `${input.pendingGradeChanges} demande(s) de modification de note en attente`,
      href: '/dashboard/pedagogie/notes',
      count: input.pendingGradeChanges,
    });
  }

  if (input.teachersWithoutAssignment > 0) {
    alerts.push({
      id: 'teachers-without-assignment',
      severity: 'info',
      message: `${input.teachersWithoutAssignment} enseignant(s) sans affectation de cours`,
      href: '/dashboard/pedagogie/enseignants',
      count: input.teachersWithoutAssignment,
    });
  }

  if (input.classesWithoutTimetable > 0) {
    alerts.push({
      id: 'classes-without-timetable',
      severity: 'info',
      message: `${input.classesWithoutTimetable} classe(s) sans emploi du temps publié`,
      href: '/dashboard/pedagogie/emploi-du-temps',
      count: input.classesWithoutTimetable,
    });
  }

  if (input.roomOverCapacity > 0) {
    alerts.push({
      id: 'room-over-capacity',
      severity: 'danger',
      message: 'Au moins une salle dépasse sa capacité théorique',
      href: '/dashboard/scolarite/salles',
    });
  }

  if (input.pendingBreaches > 0) {
    alerts.push({
      id: 'pending-breaches',
      severity: 'danger',
      message: `${input.pendingBreaches} demande(s) de brèche financière en attente`,
      href: '/dashboard/comptable/gouvernance',
      count: input.pendingBreaches,
    });
  }

  if (input.nonEnRegle > 0) {
    alerts.push({
      id: 'students-non-en-regle',
      severity: 'warning',
      message: `${input.nonEnRegle} étudiant(s) non en règle`,
      href: '/dashboard/comptable/recouvrement',
      count: input.nonEnRegle,
    });
  }

  return alerts;
}

// Activité récente (mock) — affichée dans RecentActivityCard.
export const ADMIN_RECENT_ACTIVITY_MOCK: RecentActivityItem[] = [
  {
    id: '1',
    title: 'Validation de 5 inscriptions',
    time: 'Il y a 2 heures',
    icon: 'clipboard-list',
  },
  {
    id: '2',
    title: 'Création d’un nouveau campus',
    time: 'Hier',
    icon: 'building-office-2',
  },
  {
    id: '3',
    title: 'Brèche financière approuvée',
    time: 'Il y a 3 jours',
    icon: 'shield-check',
  },
];

// Actions rapides Admin.
export const ADMIN_QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'new-user',
    label: 'Créer un utilisateur',
    href: '/dashboard/admin/utilisateurs',
    icon: 'user',
  },
  {
    id: 'new-student',
    label: 'Inscrire un étudiant',
    href: '/dashboard/scolarite/etudiants/nouveau',
    icon: 'academic-cap',
  },
  {
    id: 'appearance',
    label: 'Couleurs et thèmes',
    href: '/dashboard/admin/settings/appearance',
    icon: 'paint-brush',
  },
  {
    id: 'reports',
    label: 'Rapports financiers',
    href: '/dashboard/comptable/rapports',
    icon: 'chart',
  },
];

// Modules de gestion Admin (cartes du bas du dashboard).
export const ADMIN_MODULES: ModuleCardItem[] = [
  {
    id: 'campus',
    title: 'Campus',
    description: 'Créer et gérer les sites. Les séances et l’emploi du temps sont rattachés aux campus.',
    href: '/dashboard/scolarite/campus',
    icon: 'building-office-2',
  },
  {
    id: 'salles',
    title: 'Salles',
    description: 'Salles et capacités par campus (indispensable pour l’emploi du temps).',
    href: '/dashboard/scolarite/salles',
    icon: 'table-cells',
  },
  {
    id: 'inscriptions',
    title: 'Inscriptions',
    description: 'Suivre et valider les nouvelles inscriptions.',
    href: '/dashboard/scolarite/inscriptions',
    icon: 'clipboard-list',
  },
  {
    id: 'pedagogie',
    title: 'Pédagogie',
    description: 'Emplois du temps, examens, audit pédagogique.',
    href: '/dashboard/pedagogie',
    icon: 'book-open',
  },
  {
    id: 'finances',
    title: 'Finances',
    description: 'Encaissements, recouvrement et gouvernance.',
    href: '/dashboard/comptable',
    icon: 'currency',
  },
  {
    id: 'utilisateurs',
    title: 'Utilisateurs',
    description: 'Gestion des comptes et des rôles.',
    href: '/dashboard/admin/utilisateurs',
    icon: 'user-group',
  },
  {
    id: 'badge-scans',
    title: 'Journal scans badges',
    description: 'Traçabilité des scans QR enseignants (présence).',
    href: '/dashboard/admin/badge-scans',
    icon: 'document-magnifying-glass',
  },
];

