import { FaCheck, FaSearch } from 'react-icons/fa'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function FieldHint({ children }) {
  return <p className="text-[12px] leading-snug text-slate-500 mt-1.5">{children}</p>
}

export const initialSchoolUi = () => ({
  phase: 'etab',
  catalogue: [],
  loadingCat: false,
  selectedFiliereNom: null,
  selectedType: null,
})

/**
 * Inscription : choix de l’établissement de rattachement uniquement.
 * La préinscription (formation / filière) se fait après activation du compte.
 */
export default function RegisterSchoolFlow({
  form,
  setForm,
  etablissementsFiltres,
  etabSearch,
  setEtabSearch,
  fieldClass,
  brandAccentClassForNom,
  selectedEtab,
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Établissement de rattachement
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Choisissez l’établissement auquel votre compte sera rattaché. La{' '}
          <strong className="text-slate-800">préinscription à une formation</strong> se fera ensuite
          depuis votre espace étudiant, une fois le compte créé et activé.
        </p>
        <div
          className="rounded-xl border border-amber-100 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950 leading-snug"
          role="note"
        >
          <span className="font-semibold">Important :</span> vous ne choisissez pas encore de filière
          ni de formation ici. Après connexion, utilisez le menu « Préinscription ».
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reg-etab-search" className="text-sm font-medium text-slate-700">
          Rechercher un établissement
        </label>
        <div className="relative">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
          <Input
            id="reg-etab-search"
            type="search"
            className={cn('pl-9', fieldClass)}
            placeholder="Nom de l’établissement…"
            value={etabSearch}
            onChange={(e) => setEtabSearch(e.target.value)}
          />
        </div>
        <FieldHint>Sélectionnez un établissement dans la liste ci-dessous.</FieldHint>
      </div>

      <div className="grid gap-2 max-h-[320px] overflow-y-auto pr-1">
        {etablissementsFiltres.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">Aucun établissement trouvé.</p>
        )}
        {etablissementsFiltres.map((e) => {
          const selected = String(form.etablissement_id) === String(e.id)
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, etablissement_id: String(e.id) }))}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                selected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white',
                  brandAccentClassForNom?.(e.nom) || 'bg-blue-600',
                )}
              >
                {(e.nom || 'E').slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{e.nom}</span>
                {e.adresse && (
                  <span className="mt-0.5 block text-xs text-slate-500 line-clamp-2">{e.adresse}</span>
                )}
              </span>
              {selected && <FaCheck className="mt-1 shrink-0 text-blue-600" aria-hidden />}
            </button>
          )
        })}
      </div>

      {selectedEtab && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Établissement sélectionné : <strong>{selectedEtab.nom}</strong>
        </p>
      )}
    </div>
  )
}
