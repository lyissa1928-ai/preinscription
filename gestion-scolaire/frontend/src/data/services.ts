/**
 * Liste des services de rattachement de l'établissement.
 * Pas de saisie manuelle — choix dans la liste uniquement.
 */
export const SERVICES = [
  'Pédagogie',
  'Scolarité',
  'Comptabilité',
  'Finances',
  'Direction',
  'Ressources humaines',
  'Informatique',
  'Vigilance',
  'Accueil',
  'Communication',
  'Service technique',
] as const;

export type Service = (typeof SERVICES)[number];
