/**
 * Montant entier en lettres (français) — Node (export HTML factures).
 */
const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function underHundred(n) {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    const base = t === 7 ? 'soixante' : 'quatre-vingt'
    if (t === 9 && u === 0) return 'quatre-vingts'
    return `${base}-${UNITS[10 + u]}`
  }
  if (t === 8) {
    if (u === 0) return 'quatre-vingts'
    return `quatre-vingt-${UNITS[u]}`
  }
  if (u === 0) return TENS[t]
  if (u === 1) return `${TENS[t]} et un`
  return `${TENS[t]}-${UNITS[u]}`
}

function underThousand(n) {
  if (n < 100) return underHundred(n)
  const h = Math.floor(n / 100)
  const rest = n % 100
  const head = h === 1 ? 'cent' : `${UNITS[h]} cent${rest === 0 && h > 1 ? 's' : ''}`
  if (rest === 0) return head
  return `${h === 1 ? 'cent' : `${UNITS[h]} cent`} ${underHundred(rest)}`
}

function montantEnLettres(amount) {
  let n = Math.round(Number(amount) || 0)
  if (n < 0) n = 0
  if (n === 0) return 'zéro francs CFA'
  const parts = []
  const milliards = Math.floor(n / 1e9)
  n %= 1e9
  const millions = Math.floor(n / 1e6)
  n %= 1e6
  const milliers = Math.floor(n / 1000)
  const reste = n % 1000
  if (milliards) parts.push(milliards === 1 ? 'un milliard' : `${underThousand(milliards)} milliards`)
  if (millions) parts.push(millions === 1 ? 'un million' : `${underThousand(millions)} millions`)
  if (milliers) parts.push(milliers === 1 ? 'mille' : `${underThousand(milliers)} mille`)
  if (reste) parts.push(underThousand(reste))
  const text = parts.join(' ')
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} francs CFA`
}

module.exports = { montantEnLettres }
