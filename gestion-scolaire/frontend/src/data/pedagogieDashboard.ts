import type { PieChartDataItem } from '@/components/ui/pie-chart-card';
import type { TrendBarItem } from '@/components/ui/trend-bar-chart';

/** Formations les plus demandées (effectif inscrit ou candidatures) — tendance Power BI. */
export function getFormationsPlusDemandees(): TrendBarItem[] {
  return [
    { name: 'Licence Info', value: 142 },
    { name: 'Master MIAGE', value: 98 },
    { name: 'Licence Maths', value: 87 },
    { name: 'Master Data', value: 76 },
    { name: 'Licence Éco-Gestion', value: 65 },
    { name: 'Master Finance', value: 54 },
  ];
}

/** Répartition des effectifs par formation (diagramme circulaire). */
export function getEffectifsParFormation(): PieChartDataItem[] {
  return [
    { name: 'Licence Info', value: 420 },
    { name: 'Master MIAGE', value: 280 },
    { name: 'Licence Maths', value: 195 },
    { name: 'Autres formations', value: 305 },
  ];
}
