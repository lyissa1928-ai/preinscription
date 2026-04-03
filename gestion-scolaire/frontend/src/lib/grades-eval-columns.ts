/** Colonnes standard — alignées sur le backend `STANDARD_EVALUATION_COLUMNS`. */
export const EVAL_SHEET_COLUMNS = [
  { key: 'devoir1', label: 'Devoir 1' },
  { key: 'devoir2', label: 'Devoir 2' },
  { key: 'tp', label: 'TP' },
  { key: 'examen_final', label: 'Examen final' },
  { key: 'rattrapage', label: 'Examen rattrapage' },
] as const;

export type EvalSheetKey = (typeof EVAL_SHEET_COLUMNS)[number]['key'];
