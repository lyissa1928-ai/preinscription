/** Normalise proforma | definitive (défaut proforma). */
export function normalizeTypeDocument(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'definitive' || v === 'définitive' || v === 'def') return 'definitive'
  return 'proforma'
}

/** Titre d’en-tête (écran / PDF). */
export function titreTypeDocument(value, { uppercase = true } = {}) {
  const t = normalizeTypeDocument(value)
  const label = t === 'definitive' ? 'Facture définitive' : 'Facture proforma'
  return uppercase ? label.toUpperCase() : label
}

export function isFactureDefinitive(value) {
  return normalizeTypeDocument(value) === 'definitive'
}
