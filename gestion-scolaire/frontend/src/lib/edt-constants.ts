/**
 * Convention alignée sur le backend : jour 1 = Lundi … 6 = Samedi.
 * Heures : entiers 8–23 (ex. 8 = 8h00, 14 = 14h00).
 */

export const JOURS_EDT = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const;

/** Indices de jours utilisables dans les grilles (1 → 6). */
export const JOUR_INDICES_EDT = [1, 2, 3, 4, 5, 6] as const;

/** Créneaux horaires autorisés : 8h à 23h (fin de cours au plus tard 23h). */
export const HEURE_MIN_EDT = 8;
export const HEURE_MAX_EDT = 23;

/** Liste pour selects (début / fin de cours). */
export function heuresOptionsEdt(): number[] {
  return Array.from({ length: HEURE_MAX_EDT - HEURE_MIN_EDT + 1 }, (_, i) => HEURE_MIN_EDT + i);
}

/**
 * Lignes de la grille (heure de début affichée).
 * Jusqu’à 22h incl. pour qu’un cours puisse finir à 23h (ex. 22h–23h).
 */
export function heuresGrilleEdt(): number[] {
  return Array.from({ length: HEURE_MAX_EDT - HEURE_MIN_EDT }, (_, i) => HEURE_MIN_EDT + i);
}
