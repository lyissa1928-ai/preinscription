/**
 * Règles alignées sur backend/utils/inscriptionValidation.js (messages identiques).
 */

const MAX_NAME_LEN = 120

export function trimStr(v) {
  return String(v ?? '').trim()
}

export function normalizeEmail(email) {
  return trimStr(email).toLowerCase()
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailFormat(emailTrimmedLowercase) {
  return EMAIL_REGEX.test(emailTrimmedLowercase)
}

/** Chiffres significatifs — aligné avec normalizeTelephoneForUniqueness côté serveur. */
export function phoneDigitsCount(raw) {
  return String(raw ?? '').replace(/\D/g, '').length
}

export function validatePasswordPolicy(motDePasse) {
  const p = String(motDePasse ?? '')
  if (p.length < 8) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }
  if (!/[a-z]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une lettre minuscule.' }
  }
  if (!/[A-Z]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule.' }
  }
  if (!/[0-9]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins un chiffre.' }
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins un caractère spécial (ex. ! ? @ #).' }
  }
  return { ok: true }
}

export function validateNomPrenom(nom, prenom) {
  const n = trimStr(nom)
  const p = trimStr(prenom)
  if (!n) return { ok: false, message: 'Le nom est obligatoire.' }
  if (!p) return { ok: false, message: 'Le prénom est obligatoire.' }
  if (n.length > MAX_NAME_LEN || p.length > MAX_NAME_LEN) {
    return { ok: false, message: 'Le nom ou le prénom est trop long (maximum 120 caractères).' }
  }
  return { ok: true }
}
