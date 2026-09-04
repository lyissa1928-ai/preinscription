/**
 * Montant entier en lettres (français) — pour factures (FCFA).
 * Ex. 1 250 000 → « un million deux cent cinquante mille francs CFA »
 */
const UNITS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
]
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function underHundred(n) {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    const base = t === 7 ? 'soixante' : 'quatre-vingt'
    const rest = 10 + u
    if (t === 9 && u === 0) return 'quatre-vingts'
    return `${base}-${UNITS[rest]}`
  }
  if (t === 8) {
    if (u === 0) return 'quatre-vingts'
    return `quatre-vingt-${UNITS[u]}`
  }
  if (u === 0) return TENS[t]
  if (u === 1 && t !== 8) return `${TENS[t]} et un`
  return `${TENS[t]}-${UNITS[u]}`
}

function underThousand(n) {
  if (n < 100) return underHundred(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  const hundredWord = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 && h > 1 ? 's' : ''}`
  if (rest === 0) return hundredWord
  return `${h === 1 ? 'cent' : `${UNITS[h]} cent`} ${underHundred(rest)}`
}

function chunkToWords(n) {
  if (n === 0) return ''
  if (n < 1000) return underThousand(n)
  return underThousand(n)
}

/**
 * @param {number} amount
 * @param {{ currency?: string }} [opts]
 * @returns {string}
 */
export function montantEnLettres(amount, opts = {}) {
  const currency = opts.currency || 'francs CFA'
  let n = Math.round(Number(amount) || 0)
  if (n < 0) n = 0
  if (n === 0) return `zéro ${currency}`

  const parts = []
  const milliards = Math.floor(n / 1_000_000_000)
  n %= 1_000_000_000
  const millions = Math.floor(n / 1_000_000)
  n %= 1_000_000
  const milliers = Math.floor(n / 1000)
  const reste = n % 1000

  if (milliards > 0) {
    parts.push(
      milliards === 1 ? 'un milliard' : `${chunkToWords(milliards)} milliards`,
    )
  }
  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${chunkToWords(millions)} millions`)
  }
  if (milliers > 0) {
    parts.push(milliers === 1 ? 'mille' : `${chunkToWords(milliers)} mille`)
  }
  if (reste > 0) {
    parts.push(chunkToWords(reste))
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  return `${text} ${currency}`
}

/** Première lettre en majuscule (affichage facture). */
export function montantEnLettresCapitalise(amount, opts) {
  const s = montantEnLettres(amount, opts)
  return s.charAt(0).toUpperCase() + s.slice(1)
}
