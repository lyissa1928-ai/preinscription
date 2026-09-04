/**
 * Lignes facture — structure imposée :
 * Frais d'inscription | Mensualité | Solde | Frais par an
 * (+ bibliothèque / EPI si montants > 0, avant le frais par an)
 */
export function buildDisplayRows(facture, fo = {}) {
  const labels = fo.libelles_champs && typeof fo.libelles_champs === 'object' ? fo.libelles_champs : {}
  const labelOf = (key, fallback) => {
    const v = labels[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  }

  const moisFromLigne = Number(facture?.lignes?.find?.((l) => Number(l.duree_mois) > 0)?.duree_mois) || 0
  const mois = Number(fo.duree_mois) > 0 ? Number(fo.duree_mois) : moisFromLigne
  const fi = Number(fo.frais_inscription) || 0
  let men = Number(fo.mensualite) || 0
  const bib = Number(fo.frais_bibliotheque) || 0
  const epi = Number(fo.frais_epi) || 0

  // Fallback depuis les lignes stockées si snapshot incomplet
  if (!men && Array.isArray(facture?.lignes)) {
    const u = facture.lignes.find((l) => l.kind === 'mensualite_unitaire' || /^mensualit/i.test(l.description || ''))
    if (u) men = Number(u.montant_unitaire ?? u.prix_unitaire ?? u.total ?? u.montant) || 0
  }
  if (!fi && Array.isArray(facture?.lignes)) {
    const ins = facture.lignes.find((l) => l.kind === 'inscription' || /inscription/i.test(l.description || ''))
    if (ins) {
      /* keep 0 if already set */
    }
  }

  const inscription =
    fi ||
    (Array.isArray(facture?.lignes)
      ? Number(
          facture.lignes.find((l) => l.kind === 'inscription' || /inscription/i.test(String(l.description || '')))
            ?.total ??
            facture.lignes.find((l) => l.kind === 'inscription' || /inscription/i.test(String(l.description || '')))
              ?.montant,
        ) || 0
      : 0)

  const mensualite = men
  const solde = mensualite * (mois > 0 ? mois : 0)

  // Suppléments hors bib/EPI déjà dans snapshot
  const rawSupp = facture?.lignes_supplementaires || []
  const supplementaires = (Array.isArray(rawSupp) ? rawSupp : [])
    .map((l) => ({
      designation: String(l.designation || l.description || '').trim(),
      montant: Number(l.montant || l.total) || 0,
    }))
    .filter((s) => {
      if (!s.designation || s.montant <= 0) return false
      const d = s.designation.toLowerCase()
      if (/biblio|epi/i.test(d)) return false
      return true
    })

  const bibEff =
    bib ||
    Number(
      (Array.isArray(rawSupp) ? rawSupp : []).find((l) => /biblio/i.test(String(l.designation || '')))?.montant,
    ) ||
    0
  const epiEff =
    epi ||
    Number((Array.isArray(rawSupp) ? rawSupp : []).find((l) => /^epi$/i.test(String(l.designation || '').trim()))?.montant) ||
    0

  const rows = []
  rows.push({
    designation: labelOf('frais_inscription', "Frais d'inscription"),
    montant: inscription,
    kind: 'inscription',
  })
  rows.push({
    designation: labelOf('mensualite', 'Mensualité'),
    montant: mensualite,
    isUnitMensualite: true,
    kind: 'mensualite',
  })
  rows.push({
    designation: labelOf('solde', 'Solde'),
    montant: solde,
    isTotalMensualites: true,
    kind: 'solde',
    hint: mois > 0 ? `${mensualite} × ${mois} mois` : null,
  })
  if (bibEff > 0) {
    rows.push({
      designation: labelOf('frais_bibliotheque', 'Abonnement bibliothèque'),
      montant: bibEff,
      kind: 'bibliotheque',
    })
  }
  if (epiEff > 0) {
    rows.push({
      designation: labelOf('frais_epi', 'EPI'),
      montant: epiEff,
      kind: 'epi',
    })
  }
  for (const s of supplementaires) {
    rows.push({ ...s, supplement: true })
  }

  const fraisParAn =
    inscription +
    solde +
    bibEff +
    epiEff +
    supplementaires.reduce((a, b) => a + (Number(b.montant) || 0), 0)

  rows.push({
    designation: labelOf('frais_par_an', 'Frais par an'),
    montant: fraisParAn,
    isFraisParAn: true,
    kind: 'frais_par_an',
  })

  const fromSnapshot = Number(facture?.montant_total_a_payer) || Number(facture?.montant_ttc) || 0
  return {
    rows,
    totalAPayer: fromSnapshot > 0 ? fromSnapshot : fraisParAn,
    fraisParAn,
    solde,
    inscription,
    mensualite,
    supplementaires,
  }
}
