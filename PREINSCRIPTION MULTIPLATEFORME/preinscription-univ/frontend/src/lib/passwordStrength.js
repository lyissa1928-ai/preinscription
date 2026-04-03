/** Score 0–4 + libellé + couleur pour la jauge de mot de passe (aligné sur l’inscription). */
export function passwordStrength(pw) {
  const p = String(pw || '')
  if (p.length === 0) return { score: 0, label: '', color: 'bg-slate-200' }
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  score = Math.min(4, score)
  const map = [
    { label: 'Très faible', color: 'bg-red-500' },
    { label: 'Faible', color: 'bg-orange-500' },
    { label: 'Correct', color: 'bg-amber-400' },
    { label: 'Bon', color: 'bg-emerald-500' },
    { label: 'Robuste', color: 'bg-emerald-600' },
  ]
  return { score, label: map[score].label, color: map[score].color }
}
