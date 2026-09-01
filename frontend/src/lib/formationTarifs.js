/**
 * Aligné sur backend/utils/formationTarifs.js :
 * total mensualités = mensualité × durée (mois)
 * forfait annuel = inscription + total mensualités
 */
export function computeTotalMensualites(men, mois) {
  const b = parseInt(String(men ?? ''), 10) || 0
  const c = parseInt(String(mois ?? ''), 10) || 0
  return Math.max(0, b * c)
}

export function computeScolariteAnnuelle(fi, men, mois) {
  const a = parseInt(String(fi ?? ''), 10) || 0
  return a + computeTotalMensualites(men, mois)
}

/** Libellé durée à partir du nombre de mois (évite double saisie). */
export function dureeLabelFromMois(mois) {
  const n = parseInt(String(mois ?? ''), 10) || 0
  if (n <= 0) return ''
  if (n === 12) return '12 mois (1 an)'
  if (n === 24) return '24 mois (2 ans)'
  if (n === 36) return '36 mois (3 ans)'
  return `${n} mois`
}

/** Forfait annuel (scolarité) — `prix` côté API — ne pas additionner deux fois l'inscription. */
export function forfaitAnnuelFromFormation(f) {
  if (!f) return 0
  const p = parseInt(f.prix, 10)
  if (Number.isFinite(p) && p >= 0) return p
  return computeScolariteAnnuelle(f.frais_inscription, f.mensualite, f.duree_mois)
}

/** Récapitulatif financier calculé (affichage UI). */
export function resumeFinancierFormation(f) {
  const fi = parseInt(String(f?.frais_inscription ?? ''), 10) || 0
  const men = parseInt(String(f?.mensualite ?? ''), 10) || 0
  const mois = parseInt(String(f?.duree_mois ?? ''), 10) || 0
  const totalMen = computeTotalMensualites(men, mois)
  const soutenance = parseInt(String(f?.frais_soutenance ?? ''), 10) || 0
  const bibliotheque = parseInt(String(f?.frais_bibliotheque ?? ''), 10) || 0
  const epi = parseInt(String(f?.frais_epi ?? ''), 10) || 0
  const supp = Array.isArray(f?.frais_supplementaires)
    ? f.frais_supplementaires.reduce((s, x) => s + (parseInt(String(x?.montant ?? ''), 10) || 0), 0)
    : (parseInt(String(f?.autres_frais ?? ''), 10) || 0)
  const forfait = fi + totalMen
  return {
    frais_inscription: fi,
    mensualite: men,
    duree_mois: mois,
    total_mensualites: totalMen,
    frais_soutenance: soutenance,
    frais_bibliotheque: bibliotheque,
    frais_epi: epi,
    frais_supplementaires_total: supp,
    forfait_annuel: forfait,
    total_general: forfait + soutenance + bibliotheque + epi + supp,
  }
}
