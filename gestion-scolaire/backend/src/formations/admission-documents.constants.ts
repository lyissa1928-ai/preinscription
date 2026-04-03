/** Cycles d’admission pris en charge pour les pièces à fournir (préinscription). */
export const ADMISSION_CYCLE_CODES = [
  'BT1',
  'BT2',
  'BTS1',
  'BTS2',
  'L1',
  'L2',
  'L3',
  'M1',
  'M2',
] as const;

export type AdmissionCycleCode = (typeof ADMISSION_CYCLE_CODES)[number];

export function isAdmissionCycleCode(
  v: string,
): v is AdmissionCycleCode {
  return (ADMISSION_CYCLE_CODES as readonly string[]).includes(v);
}

/** Cycles où une carte scolaire peut être proposée comme pièce complémentaire (optionnelle). */
export const CYCLES_WITH_OPTIONAL_CARTE_SCOLAIRE: readonly AdmissionCycleCode[] = [
  'BT1',
  'BTS1',
  'L1',
];

export const ADMISSION_DOCUMENT_GLOBAL_NOTES = {
  identityOneOf:
    'Une seule pièce d’identité obligatoire : CNI pour les candidats sénégalais, ou passeport pour les candidats étrangers. Ne fournissez pas les deux comme documents obligatoires.',
  attestationInsteadOfDiploma:
    'Lorsque le diplôme définitif n’est pas encore disponible, une attestation de réussite ou équivalent peut être acceptée pour les types de pièces concernés (voir le détail par document).',
} as const;
