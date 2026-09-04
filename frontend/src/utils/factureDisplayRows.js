/**
 * Lignes facture — libellés administratifs clairs :
 * Inscription | Mensualité | Total mensualités (N × montant) | Bibliothèque | EPI | …
 * Le total à payer est affiché hors tableau (pied de tableau), pas comme « Frais par an ».
 */
export function buildDisplayRows(facture, fo = {}) {
  const labels = fo.libelles_champs && typeof fo.libelles_champs === 'object' ? fo.libelles_champs : {}
  const labelOf = (key, fallback) => {
    const v = labels[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  }
  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

  const moisFromLigne = Number(facture?.lignes?.find?.((l) => Number(l.duree_mois) > 0)?.duree_mois) || 0
  const mois = Number(fo.duree_mois) > 0 ? Number(fo.duree_mois) : moisFromLigne
  const fi = Number(fo.frais_inscription) || 0
  let men = Number(fo.mensualite) || 0
  const bib = Number(fo.frais_bibliotheque) || 0
  const epi = Number(fo.frais_epi) || 0

  if (!men && Array.isArray(facture?.lignes)) {
    const u = facture.lignes.find((l) => l.kind === 'mensualite_unitaire' || /^mensualit/i.test(l.description || ''))
    if (u) men = Number(u.montant_unitaire ?? u.prix_unitaire ?? u.total ?? u.montant) || 0
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
    Number(
      (Array.isArray(rawSupp) ? rawSupp : []).find((l) =>
        /^epi$/i.test(String(l.designation || '').trim()),
      )?.montant,
    ) ||
    0

  const rows = []
  rows.push({
    designation: labelOf('frais_inscription', 'Inscription'),
    montant: inscription,
    kind: 'inscription',
  })
  rows.push({
    designation: labelOf('mensualite', 'Mensualité'),
    montant: mensualite,
    isUnitMensualite: true,
    kind: 'mensualite',
  })

  const totalMensLabel =
    mois > 0 && mensualite > 0
      ? `${labelOf('solde', 'Total mensualités')} (${mois} × ${fmt(mensualite)} FCFA)`
      : labelOf('solde', 'Total mensualités')
  rows.push({
    designation: totalMensLabel,
    montant: solde,
    isTotalMensualites: true,
    kind: 'solde',
  })

  if (bibEff > 0) {
    rows.push({
      designation: labelOf('frais_bibliotheque', 'Bibliothèque'),
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
