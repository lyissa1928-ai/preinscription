/**
 * Aligné backend formationTarifs :
 * Solde = mensualité × durée mensualité
 * Total = solde + bibliothèque + EPI
 * Frais par an = frais d'inscription + total
 */
export function computeTotalMensualites(men, mois) {
  const b = parseInt(String(men ?? ''), 10) || 0
  const c = parseInt(String(mois ?? ''), 10) || 0
  return Math.max(0, b * c)
}

/** Alias métier : Solde */
export function computeSolde(men, mois) {
  return computeTotalMensualites(men, mois)
}

export function computeTotalFormation(men, mois, bibliotheque, epi) {
  const bib = parseInt(String(bibliotheque ?? ''), 10) || 0
  const e = parseInt(String(epi ?? ''), 10) || 0
  return computeSolde(men, mois) + bib + e
}

export function computeFraisParAn(fi, men, mois, bibliotheque, epi) {
  const a = parseInt(String(fi ?? ''), 10) || 0
  return a + computeTotalFormation(men, mois, bibliotheque, epi)
}

/** @deprecated — préférer computeFraisParAn ; conserve inscription + solde (sans bib/EPI) pour anciens écrans */
export function computeScolariteAnnuelle(fi, men, mois) {
  const a = parseInt(String(fi ?? ''), 10) || 0
  return a + computeTotalMensualites(men, mois)
}

export function dureeLabelFromMois(mois) {
  const n = parseInt(String(mois ?? ''), 10) || 0
  if (n <= 0) return ''
  if (n === 12) return '12 mois (1 an)'
  if (n === 24) return '24 mois (2 ans)'
  if (n === 36) return '36 mois (3 ans)'
  return `${n} mois`
}

export function forfaitAnnuelFromFormation(f) {
  if (!f) return 0
  return computeFraisParAn(
    f.frais_inscription,
    f.mensualite,
    f.duree_mois,
    f.frais_bibliotheque,
    f.frais_epi,
  )
}

export function resumeFinancierFormation(f) {
  const fi = parseInt(String(f?.frais_inscription ?? ''), 10) || 0
  const men = parseInt(String(f?.mensualite ?? ''), 10) || 0
  const mois = parseInt(String(f?.duree_mois ?? ''), 10) || 0
  const bibliotheque = parseInt(String(f?.frais_bibliotheque ?? ''), 10) || 0
  const epi = parseInt(String(f?.frais_epi ?? ''), 10) || 0
  const solde = computeSolde(men, mois)
  const total = solde + bibliotheque + epi
  const fraisParAn = fi + total
  return {
    frais_inscription: fi,
    mensualite: men,
    duree_mois: mois,
    nombre_annees: parseInt(String(f?.nombre_annees ?? ''), 10) || 0,
    solde,
    total_mensualites: solde,
    frais_bibliotheque: bibliotheque,
    frais_epi: epi,
    total,
    frais_par_an: fraisParAn,
    forfait_annuel: fraisParAn,
    total_general: fraisParAn,
  }
}
