/** Montants lisibles dans jsPDF (évite les espaces insécables U+202F mal rendus). */
export function fmtPdfNumber(n) {
  return new Intl.NumberFormat('fr-FR')
    .format(Math.round(Number(n) || 0))
    .replace(/\u202f/g, ' ')
    .replace(/\u00a0/g, ' ')
}

export function fmtPdfDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
