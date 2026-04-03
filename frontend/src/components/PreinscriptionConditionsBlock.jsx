import { getParagraphsForNiveauKey, normalizePreinscriptionNiveau } from '../utils/preinscriptionDocumentRules'

const KNOWN_KEYS = ['bt1', 'bt2', 'bts1', 'bts2', 'l1', 'l2', 'l3', 'm1', 'm2', 'generic']

export default function PreinscriptionConditionsBlock({ formationNiveau, profileKey, className = '' }) {
  const key = profileKey
    ? (KNOWN_KEYS.includes(profileKey) ? profileKey : normalizePreinscriptionNiveau(profileKey))
    : normalizePreinscriptionNiveau(formationNiveau)
  const paragraphs = getParagraphsForNiveauKey(key)

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-800 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Conditions d&apos;entrée — pièces (référence)</p>
      <ul className="space-y-3 list-none">
        {paragraphs.map((p, i) => (
          <li key={i} className="pl-0 border-l-4 border-blue-600/70 pl-3 leading-relaxed whitespace-pre-wrap">
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
