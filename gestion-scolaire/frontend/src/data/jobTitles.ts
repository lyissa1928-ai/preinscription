/**
 * Liste des intitulés de poste prédéfinis pour le personnel (PATS).
 * Pas de saisie libre — choix dans la liste uniquement.
 */
export const JOB_TITLES = [
  'Agent pédagogique',
  'Responsable pédagogique',
  'Directeur pédagogique',
  'Secrétaire pédagogique',
  'Gestionnaire pédagogique',
  'Coordinateur pédagogique',
  'Chef de département',
  'Directeur des études',
  'Responsable de scolarité',
  'Agent de scolarité',
  'DAF',
  'Chef comptable',
  'Comptable',
  'Caissier',
  'Agent administratif',
  'Secrétaire général',
  'Responsable des ressources humaines',
  'Auditeur interne',
] as const;

export type JobTitle = (typeof JOB_TITLES)[number];
