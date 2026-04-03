import { passwordStrength } from '@/lib/passwordStrength'

/**
 * Jauge visuelle 0–4 + libellé (mot de passe vide = barres grises).
 */
export default function PasswordStrengthMeter({ password, className = '' }) {
  const { score, label, color } = passwordStrength(password)
  const hasText = String(password || '').length > 0

  return (
    <div className={`space-y-1.5 ${className}`} aria-live="polite">
      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-200">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${
              hasText && i <= score ? color : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      {hasText && (
        <p className="text-xs font-medium text-slate-600">
          Robustesse : <span className="text-slate-900">{label}</span>
        </p>
      )}
    </div>
  )
}
