/** Lignes facture : conserve les libellés configurés sur la formation (jamais de libellé générique imposé). */
export function buildDisplayRows(facture, fo = {}) {
  const lignes = facture?.lignes || []
  const moisFromLigne = Number(lignes.find((l) => Number(l.duree_mois) > 0)?.duree_mois) || 0
  const mois = Number(fo.duree_mois) > 0 ? Number(fo.duree_mois) : moisFromLigne
  const unitMen = Number(fo.mensualite) || 0
  const labels = fo.libelles_champs && typeof fo.libelles_champs === 'object' ? fo.libelles_champs : {}
  const labelOf = (key, fallback) => {
    const v = labels[key]
    return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
  }
  const rows = []
  let mensualiteAjoutee = false

  const pushMensualiteRows = (unit, designationBase) => {
    const u = Number(unit) || 0
    if (u <= 0) return
    const base = designationBase || labelOf('mensualite', 'Mensualité')
    rows.push({ designation: base, montant: u, isUnitMensualite: true })
    if (mois > 0) {
      rows.push({
        designation: labelOf('nombre_mensualites', 'Nombre de mensualités'),
        montant: mois,
        isQuantite: true,
        hideMontantCurrency: true,
      })
      rows.push({
        designation: `Total ${base.toLowerCase()} (${mois} mois)`,
        montant: mois * u,
        isTotalMensualites: true,
      })
    }
    mensualiteAjoutee = true
  }

  for (const l of lignes) {
    const desc = String(l.description || l.designation || '').trim()
    const kind = l.kind
    if (kind === 'mensualite_unitaire' || /^mensualit/i.test(desc) || /^total mensualit/i.test(desc)) {
      if (mensualiteAjoutee) continue
      const unit =
        Number(l.montant_unitaire ?? fo.mensualite ?? l.prix_unitaire) ||
        unitMen ||
        (mois > 0 && Number(l.total) > 0 ? Math.round(Number(l.total) / mois) : 0)
      pushMensualiteRows(unit || unitMen, desc && !/^total /i.test(desc) ? desc : undefined)
      continue
    }
    if (kind === 'inscription' || (/inscription/i.test(desc) && !l.hors_forfait_annuel)) {
      rows.push({
        designation: desc || labelOf('frais_inscription', "Frais d'inscription"),
        montant: Number(l.total ?? l.montant) || Number(fo.frais_inscription) || 0,
      })
      continue
    }
    if (/^scolarit/i.test(desc)) {
      if (!mensualiteAjoutee) {
        const total = Number(l.total ?? l.montant) || 0
        const unit = unitMen || (mois > 0 ? Math.round(total / mois) : 0)
        pushMensualiteRows(unit, desc)
      }
      continue
    }
    rows.push({ designation: desc || '—', montant: Number(l.total ?? l.montant) || 0 })
  }
  if (!rows.some((r) => /inscription/i.test(r.designation)) && Number(fo.frais_inscription) > 0) {
    rows.unshift({
      designation: labelOf('frais_inscription', "Frais d'inscription"),
      montant: Number(fo.frais_inscription),
    })
  }
  if (!mensualiteAjoutee && unitMen > 0) pushMensualiteRows(unitMen)

  const rawSupp = facture?.lignes_supplementaires || []
  const supplementaires = (Array.isArray(rawSupp) ? rawSupp : [])
    .map((l) => ({
      designation: String(l.designation || l.description || '').trim(),
      montant: Number(l.montant || l.total) || 0,
    }))
    .filter((s) => s.designation && s.montant > 0)

  for (const s of supplementaires) {
    rows.push({ designation: s.designation, montant: s.montant, supplement: true })
  }

  const fromSnapshot = Number(facture?.montant_total_a_payer) || Number(facture?.montant_ttc) || 0
  const recomputed = rows
    .filter((r) => !r.isUnitMensualite && !r.isQuantite)
    .reduce((a, b) => a + (Number(b.montant) || 0), 0)

  return { rows, totalAPayer: fromSnapshot > 0 ? fromSnapshot : recomputed, supplementaires }
}
