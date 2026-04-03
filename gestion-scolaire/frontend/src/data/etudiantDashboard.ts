import type { PieChartDataItem } from '@/components/ui/pie-chart-card';

/**
 * @deprecated Le tableau de bord étudiant consomme désormais `GET /students/me/dashboard`.
 * Conservé uniquement si d’autres écrans importent encore ces helpers.
 */
export function getEtudiantDashboardStats() {
  return {
    documentsDisponibles: 0,
    notesPubliees: 0,
    prochainsCours: 0,
    statutPaiement: '—' as const,
  };
}

export function getEtudiantNotesRepartition(): PieChartDataItem[] {
  return [];
}

export function getEtudiantDocumentsRepartition(): PieChartDataItem[] {
  return [];
}
