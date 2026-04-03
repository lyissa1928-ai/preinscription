/**
 * Colonnes standard de la feuille de notes (alignées sur evaluationType + evaluationLibelle en base).
 * Une ligne Grade par couple (personId, ecId, session, anneeUniv, type, libellé).
 */
export const STANDARD_EVALUATION_COLUMNS = [
  {
    key: 'devoir1',
    label: 'Devoir 1',
    evaluationType: 'DEVOIR',
    evaluationLibelle: 'Devoir 1',
  },
  {
    key: 'devoir2',
    label: 'Devoir 2',
    evaluationType: 'DEVOIR',
    evaluationLibelle: 'Devoir 2',
  },
  { key: 'tp', label: 'TP', evaluationType: 'TP', evaluationLibelle: 'TP' },
  {
    key: 'examen_final',
    label: 'Examen final',
    evaluationType: 'EXAMEN',
    evaluationLibelle: 'Examen final',
  },
  {
    key: 'rattrapage',
    label: 'Examen rattrapage',
    evaluationType: 'EXAMEN',
    evaluationLibelle: 'Examen de rattrapage',
  },
] as const;

export type StandardEvalKey =
  (typeof STANDARD_EVALUATION_COLUMNS)[number]['key'];
