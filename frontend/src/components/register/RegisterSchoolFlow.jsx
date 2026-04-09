import { useEffect, useMemo } from 'react'
import axios from 'axios'
import { FaCheck, FaSearch, FaGraduationCap, FaLayerGroup, FaChalkboardTeacher } from 'react-icons/fa'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const TYPE_META = {
  presentiel: {
    label: 'Présentiel',
    short: 'Sur site',
    emoji: '🏫',
    gradient: 'from-sky-500 to-blue-700',
    ring: 'ring-sky-400/30',
  },
  en_ligne: {
    label: 'À distance',
    short: 'FAD / en ligne',
    emoji: '🌐',
    gradient: 'from-emerald-500 to-teal-700',
    ring: 'ring-emerald-400/30',
  },
}

function FieldHint({ children }) {
  return <p className="text-[12px] leading-snug text-slate-500 mt-1.5">{children}</p>
}

export const initialSchoolUi = () => ({
  phase: 'etab', // etab | filiere | type | formation | done
  catalogue: [],
  loadingCat: false,
  selectedFiliereNom: null,
  selectedType: null,
})

/**
 * Étape inscription : établissement puis parcours filière → type → formation (optionnel).
 * L’état est contrôlé par le parent pour survivre aux changements d’étape du formulaire.
 */
export default function RegisterSchoolFlow({
  form,
  setForm,
  schoolUi,
  setSchoolUi,
  /** Ref parent : dernier etablissement_id pour lequel le catalogue a été chargé (survit au remontage de l’étape). */
  schoolCatalogueEtabRef,
  etablissements,
  etablissementsFiltres,
  etabSearch,
  setEtabSearch,
  fieldClass,
  brandAccentClassForNom,
  selectedEtab,
}) {
  const { phase, catalogue, loadingCat, selectedFiliereNom, selectedType } = schoolUi
  const patch = (p) => setSchoolUi((s) => ({ ...s, ...p }))

  const etabId = form.etablissement_id

  useEffect(() => {
    if (!etabId) {
      schoolCatalogueEtabRef.current = null
      setSchoolUi(initialSchoolUi())
      setForm((f) => (f.formation_id ? { ...f, formation_id: '' } : f))
      return
    }
    const etabKey = String(etabId)
    /** Déjà chargé pour cet établissement (ref parente survit au remontage de l’étape 2). */
    if (schoolCatalogueEtabRef.current === etabKey) {
      return
    }
    let cancelled = false
    setSchoolUi((s) => ({
      ...s,
      loadingCat: true,
      selectedFiliereNom: null,
      selectedType: null,
    }))
    setForm((f) => ({ ...f, formation_id: '' }))
    axios
      .get(`/api/formations?etablissement_id=${encodeURIComponent(etabId)}`)
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        schoolCatalogueEtabRef.current = etabKey
        setSchoolUi((s) => ({
          ...s,
          catalogue: list,
          loadingCat: false,
          phase: list.length > 0 ? 'filiere' : 'done',
        }))
      })
      .catch(() => {
        if (cancelled) return
        schoolCatalogueEtabRef.current = etabKey
        setSchoolUi((s) => ({
          ...s,
          catalogue: [],
          loadingCat: false,
          phase: 'done',
        }))
      })
    return () => {
      cancelled = true
    }
  }, [etabId, setForm, setSchoolUi, schoolCatalogueEtabRef])

  const formationsParFiliere = useMemo(() => {
    const map = new Map()
    for (const f of catalogue) {
      const key = (f.filiere_nom && String(f.filiere_nom).trim()) || 'Sans filière'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(f)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'))
  }, [catalogue])

  const listeFiliere = selectedFiliereNom
    ? formationsParFiliere.find(([n]) => n === selectedFiliereNom)?.[1] || []
    : []

  const typesDispo = useMemo(() => {
    const order = ['presentiel', 'en_ligne']
    const st = new Set()
    for (const f of listeFiliere) {
      if (f.type === 'presentiel' || f.type === 'en_ligne') st.add(f.type)
    }
    return order.filter((t) => st.has(t))
  }, [listeFiliere])

  const formationsFinales = listeFiliere.filter((f) => f.type === selectedType)

  const selectedFormation = catalogue.find((f) => String(f.id) === String(form.formation_id))

  const goFiliere = () => {
    patch({ phase: 'filiere', selectedFiliereNom: null, selectedType: null })
    setForm((f) => ({ ...f, formation_id: '' }))
  }

  const goType = () => {
    patch({ phase: 'type', selectedType: null })
    setForm((f) => ({ ...f, formation_id: '' }))
  }

  const skipToDone = () => {
    patch({ phase: 'done' })
    setForm((f) => ({ ...f, formation_id: '' }))
  }

  const breadcrumb = () => {
    const parts = [{ key: 'etab', label: 'Établissement', active: phase === 'etab' }]
    if (catalogue.length > 0) {
      parts.push({ key: 'fil', label: 'Filière', active: phase === 'filiere' })
      parts.push({ key: 'typ', label: 'Mode', active: phase === 'type' })
      parts.push({ key: 'for', label: 'Formation', active: phase === 'formation' })
    }
    parts.push({ key: 'ok', label: 'Récap', active: phase === 'done' })
    return (
      <nav
        className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-4"
        aria-label="Progression du choix"
      >
        {parts.map((p, i) => (
          <span key={p.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300 font-normal">/</span>}
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 transition-colors',
                p.active ? 'bg-blue-100 text-blue-800' : 'text-slate-400',
              )}
            >
              {p.label}
            </span>
          </span>
        ))}
      </nav>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Votre parcours académique</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          D’abord votre <strong className="text-slate-800">établissement</strong>, puis la{' '}
          <strong className="text-slate-800">filière</strong>, le <strong className="text-slate-800">mode</strong> (présentiel ou
          distance) et enfin la <strong className="text-slate-800">formation</strong> qui vous intéresse. Vous pourrez toujours
          affiner lors du dossier de préinscription.
        </p>
      </div>

      {etabId && catalogue.length > 0 && phase !== 'etab' && breadcrumb()}

      {phase === 'etab' && (
        <>
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 text-sm" />
            <Input
              type="search"
              className={cn('pl-9', fieldClass)}
              placeholder="Rechercher un établissement…"
              value={etabSearch}
              onChange={(e) => setEtabSearch(e.target.value)}
              aria-label="Filtrer les établissements"
            />
            <FieldHint>Tapez quelques lettres ou choisissez une carte — le fond d’écran s’adapte à la marque lorsque c’est possible.</FieldHint>
          </div>
          {etablissementsFiltres.length > 0 && (
            <div
              className="grid gap-3 sm:grid-cols-2 max-h-[min(42vh,300px)] overflow-y-auto pr-1 -mr-0.5 [scrollbar-width:thin]"
              role="group"
              aria-label="Choix d’établissement"
            >
              {etablissementsFiltres.map((e) => {
                const sel = String(etabId) === String(e.id)
                const accent = brandAccentClassForNom(e.nom)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, etablissement_id: String(e.id), formation_id: '' }))
                      patch({ selectedFiliereNom: null, selectedType: null })
                    }}
                    className={cn(
                      'group text-left rounded-2xl border-2 px-4 py-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                      sel
                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50/90 shadow-lg shadow-blue-600/15 ring-2 ring-blue-500/20'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md',
                    )}
                  >
                    <span
                      className={cn('mb-3 block h-1 w-14 rounded-full bg-gradient-to-r shadow-sm', accent)}
                      aria-hidden
                    />
                    <span className="font-bold text-slate-900 text-[15px] leading-snug block pr-2">{e.nom}</span>
                    {sel && (
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-800">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                          <FaCheck className="text-[10px]" aria-hidden />
                        </span>
                        Sélectionné
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {etablissements.length === 0 && (
            <p className="text-xs text-amber-700 mt-2 font-medium">
              Aucun établissement disponible pour l’instant. Contactez l’administration.
            </p>
          )}
          {etablissements.length > 0 && etablissementsFiltres.length === 0 && (
            <p className="text-xs text-amber-700 mt-2">Aucun résultat pour « {etabSearch} ».</p>
          )}
          {etabId && loadingCat && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Chargement des formations…
            </div>
          )}
        </>
      )}

      {phase === 'filiere' && etabId && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-800">
            <span className="text-slate-500 font-medium">Établissement :</span>{' '}
            <strong className="text-slate-900">{selectedEtab?.nom || '—'}</strong>
            <p className="text-xs text-slate-500 mt-1.5 leading-snug">
              Ce choix est celui de votre inscription ; les formations ci-dessous sont uniquement celles de cet établissement.
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 flex items-center gap-2">
              <FaLayerGroup className="text-blue-600" aria-hidden />
              Choisissez une filière
            </h3>
            <button
              type="button"
              onClick={skipToDone}
              className="text-xs font-semibold text-slate-500 hover:text-blue-700 underline underline-offset-2"
            >
              Je choisirai plus tard
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formationsParFiliere.map(([nom, liste]) => {
              const nP = liste.filter((x) => x.type === 'presentiel').length
              const nD = liste.filter((x) => x.type === 'en_ligne').length
              return (
                <button
                  key={nom}
                  type="button"
                  onClick={() => {
                    patch({ selectedFiliereNom: nom, phase: 'type' })
                  }}
                  className="text-left rounded-2xl border-2 border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <p className="font-bold text-slate-900 text-[15px] leading-snug mb-2">{nom}</p>
                  <p className="text-xs text-slate-500 mb-3">{liste.length} proposition{liste.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap gap-2">
                    {nP > 0 && (
                      <span className="text-[10px] font-bold rounded-full bg-sky-100 text-sky-800 px-2.5 py-1">🏫 Présentiel · {nP}</span>
                    )}
                    {nD > 0 && (
                      <span className="text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1">
                        🌐 Distance · {nD}
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-xs font-bold text-blue-700">Continuer →</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {phase === 'type' && selectedFiliereNom && (
        <div className="space-y-4">
          {selectedEtab && (
            <p className="text-xs text-slate-600 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className="text-slate-500">Établissement :</span>{' '}
              <strong className="text-slate-800">{selectedEtab.nom}</strong>
            </p>
          )}
          <button type="button" onClick={goFiliere} className="text-sm font-semibold text-slate-600 hover:text-blue-700">
            ← Retour aux filières
          </button>
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-500 flex items-center gap-2">
            <FaChalkboardTeacher className="text-indigo-600" aria-hidden />
            Mode pour « {selectedFiliereNom} »
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {typesDispo.map((t) => {
              const meta = TYPE_META[t]
              const count = listeFiliere.filter((f) => f.type === t).length
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    patch({ selectedType: t, phase: 'formation' })
                  }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ring-offset-2',
                    meta?.ring,
                  )}
                >
                  <div className={cn('absolute inset-0 opacity-[0.08] bg-gradient-to-br', meta?.gradient)} aria-hidden />
                  <div className="relative">
                    <div className="text-4xl mb-2">{meta?.emoji}</div>
                    <div className="text-lg font-black text-slate-900">{meta?.label}</div>
                    <p className="text-sm text-slate-500 mt-1">{meta?.short}</p>
                    <p className="mt-4 text-sm font-bold text-blue-700">{count} formation{count !== 1 ? 's' : ''} →</p>
                  </div>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={skipToDone}
            className="text-xs font-semibold text-slate-500 hover:text-blue-700 underline underline-offset-2"
          >
            Passer — je préciserai au dossier de préinscription
          </button>
        </div>
      )}

      {phase === 'formation' && selectedFiliereNom && selectedType && (
        <div className="space-y-4">
          {selectedEtab && (
            <p className="text-xs text-slate-600 rounded-lg border border-slate-100 bg-white px-3 py-2">
              <span className="text-slate-500">Établissement :</span>{' '}
              <strong className="text-slate-800">{selectedEtab.nom}</strong>
            </p>
          )}
          <button type="button" onClick={goType} className="text-sm font-semibold text-slate-600 hover:text-blue-700">
            ← Retour aux modes
          </button>
          <h3 className="text-base font-bold text-slate-900">
            {TYPE_META[selectedType]?.emoji} {TYPE_META[selectedType]?.label}
            <span className="font-normal text-slate-500"> — {selectedFiliereNom}</span>
          </h3>
          <div className="grid grid-cols-1 gap-3 max-h-[min(50vh,380px)] overflow-y-auto pr-1 [scrollbar-width:thin]">
            {formationsFinales.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, formation_id: String(f.id) }))
                  patch({ phase: 'done' })
                }}
                className="text-left rounded-xl border-2 border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50/80 px-4 py-3.5 transition-all"
              >
                <p className="font-bold text-slate-900 text-sm leading-snug">{f.titre}</p>
                {f.niveau_requis && <p className="text-[11px] text-slate-500 mt-1">{f.niveau_requis}</p>}
                <p className="text-[11px] font-semibold text-blue-700 mt-2">Sélectionner cette formation →</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'done' && etabId && (
        <div className="space-y-4">
          {catalogue.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (form.formation_id) patch({ phase: 'formation' })
                  else if (selectedFiliereNom && selectedType) patch({ phase: 'formation' })
                  else if (selectedFiliereNom) patch({ phase: 'type' })
                  else patch({ phase: 'filiere' })
                }}
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Modifier filière / mode / formation
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/50 p-5 shadow-inner">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800/90 mb-3 flex items-center gap-2">
              <FaGraduationCap className="text-lg" aria-hidden />
              Récapitulatif de votre orientation
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <span className="text-slate-400 font-medium">Établissement :</span>{' '}
                <span className="font-bold text-slate-900">{selectedEtab?.nom}</span>
              </li>
              {selectedFormation ? (
                <li>
                  <span className="text-slate-400 font-medium">Formation visée :</span>{' '}
                  <span className="font-bold text-slate-900">{selectedFormation.titre}</span>
                  {selectedFormation.filiere_nom && (
                    <span className="block text-xs text-slate-500 mt-0.5">{selectedFormation.filiere_nom}</span>
                  )}
                </li>
              ) : (
                <li className="text-slate-600 text-xs leading-relaxed">
                  Vous pourrez choisir précisément votre formation lors du <strong>dossier de préinscription</strong> après création du
                  compte.
                </li>
              )}
            </ul>
          </div>
          {catalogue.length > 0 && !form.formation_id && (
            <button
              type="button"
              onClick={() => patch({ phase: 'filiere' })}
              className="w-full sm:w-auto rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            >
              + Affiner : filière, mode et formation
            </button>
          )}
        </div>
      )}

      {selectedEtab && phase === 'etab' && (
        <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
          <FaCheck className="text-emerald-600 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">Établissement sélectionné : </span>
            {selectedEtab.nom}
          </span>
        </p>
      )}
    </>
  )
}
