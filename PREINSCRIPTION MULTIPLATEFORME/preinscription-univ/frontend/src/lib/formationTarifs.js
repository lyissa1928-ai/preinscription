/**
 * Aligné sur backend/utils/formationTarifs.js : forfait annuel = inscription + mensualité × durée (mois).
 */
export function computeScolariteAnnuelle(fi, men, mois) {
  const a = parseInt(String(fi ?? ''), 10) || 0
  const b = parseInt(String(men ?? ''), 10) || 0
  const c = parseInt(String(mois ?? ''), 10) || 0
  return a + b * c
}

/** Forfait annuel (scolarité) — `prix` côté API — ne pas additionner deux fois l'inscription. */
export function forfaitAnnuelFromFormation(f) {
  if (!f) return 0
  const p = parseInt(f.prix, 10)
  if (Number.isFinite(p) && p >= 0) return p
  return computeScolariteAnnuelle(f.frais_inscription, f.mensualite, f.duree_mois)
}
