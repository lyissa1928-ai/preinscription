import type { PieChartDataItem } from '@/components/ui/pie-chart-card';
import type { TrendBarItem } from '@/components/ui/trend-bar-chart';

/** Données dérivées pour KPIs enseignant (à combiner avec l’API). */
export function getEnseignantKpisFromData(opts: {
  enCoursCount: number;
  encadrementsCount: number;
  seancesCetteSemaine: number;
  notesASaisir: number;
}) {
  return {
    modulesEnCours: opts.enCoursCount,
    encadrements: opts.encadrementsCount,
    seancesSemaine: opts.seancesCetteSemaine,
    notesASaisir: opts.notesASaisir,
  };
}

/** Répartition activité (EC, encadrements, séances) pour diagramme circulaire. */
export function getEnseignantActiviteRepartition(opts: {
  ecCount: number;
  encadrementsCount: number;
  seancesCount: number;
}): PieChartDataItem[] {
  const { ecCount, encadrementsCount, seancesCount } = opts;
  const data: PieChartDataItem[] = [];
  if (ecCount > 0) data.push({ name: 'EC en cours', value: ecCount });
  if (encadrementsCount > 0) data.push({ name: 'Encadrements', value: encadrementsCount });
  if (seancesCount > 0) data.push({ name: 'Séances / sem.', value: seancesCount });
  if (data.length === 0) data.push({ name: 'Aucune activité', value: 1 });
  return data;
}

/** Tendance séances par jour (mock). */
export function getEnseignantSeancesParJour(): TrendBarItem[] {
  return [
    { name: 'Lun', value: 3 },
    { name: 'Mar', value: 2 },
    { name: 'Mer', value: 4 },
    { name: 'Jeu', value: 2 },
    { name: 'Ven', value: 1 },
  ];
}
