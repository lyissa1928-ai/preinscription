import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { forfaitAnnuelFromFormation } from '../lib/formationTarifs'
import { sanitizeConditionsHtml, renderConditionsLooksLikeHtml } from '../utils/conditionsHtml'
import IdentiteBeneficiaireProforma from '../components/proforma/IdentiteBeneficiaireProforma'

const BRAND_COLORS = {
  esebat: { prim: '#F97316', sec: '#FB923C' },
  escoa: { prim: '#0B2A66', sec: '#1E3A8A' },
  efosante: { prim: '#B91C1C', sec: '#38BDF8' },
}

function detectBrand(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('esebat')) return 'esebat'
  if (n.includes('escoa')) return 'escoa'
  if (n.includes('efosante') || n.includes('efo sante') || n.includes('efo-sante')) return 'efosante'
  return null
}

/** Couleurs d’affichage : priorité aux couleurs enregistrées sur l’établissement, sinon marque détectée. */
function getEtabTheme(etab) {
  if (!etab) {
    return { prim: '#1e40af', sec: '#3b82f6', name: '' }
  }
  const b = detectBrand(etab.nom || '')
  const fallback = b ? BRAND_COLORS[b] : { prim: '#1e40af', sec: '#3b82f6' }
  const prim = String(etab.couleur_primaire || '').trim() || fallback.prim
  const sec = String(etab.couleur_secondaire || '').trim() || fallback.sec || prim
  return { prim, sec, name: etab.nom || '' }
}

const LBL = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

/** Bloc conditions d’admission (API établissement), habillé aux couleurs de l’établissement */
function BlocConditionsAdmission({ etablissementId, onAckChange, ack, theme, readOnlyConsultation = false }) {
  const prim = theme?.prim || '#1e40af'
  const sec = theme?.sec || '#3b82f6'
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState('')
  const [conditions, setConditions] = useState([])

  useEffect(() => {
    if (!etablissementId) {
      setLoading(false)
      setConditions([])
      setNom('')
      return
    }
    let cancelled = false
    setLoading(true)
    axios
      .get(`/api/conditions-admission/public/${encodeURIComponent(etablissementId)}`)
      .then(({ data }) => {
        if (!cancelled) {
          setNom(data.nom || '')
          const list = Array.isArray(data.conditions) ? data.conditions : []
          setConditions(list)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNom('')
          setConditions([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [etablissementId])

  if (!etablissementId) {
    return (
      <p className="text-sm text-slate-600 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
        Sélectionnez d’abord un <strong>établissement</strong> ci-dessus.
      </p>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: `${prim}33`, borderTopColor: prim }}
        />
      </div>
    )
  }

  const blocks = conditions.filter((c) => c.texte && String(c.texte).trim().length > 0)
  const hasText = blocks.length > 0

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-[1px] shadow-md"
        style={{
          background: `linear-gradient(135deg, ${prim}, ${sec})`,
          boxShadow: `0 12px 40px -8px color-mix(in srgb, ${prim} 40%, transparent)`,
        }}
      >
        <div className="rounded-[0.95rem] bg-white p-4 sm:p-5">
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: prim }}
          >
            {readOnlyConsultation ? 'Consultation' : 'Étape obligatoire'}
          </p>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            Conditions d’admission —{' '}
            <span style={{ color: prim }}>{nom || 'Établissement'}</span>
          </h2>
          <div
            className="mt-4 rounded-xl max-h-[min(440px,56vh)] overflow-y-auto px-4 py-3 text-sm text-slate-800 leading-relaxed border-l-4 ql-snow space-y-5"
            style={{
              borderLeftColor: prim,
              background: `linear-gradient(180deg, color-mix(in srgb, ${prim} 6%, white), color-mix(in srgb, ${sec} 4%, white))`,
            }}
          >
            {hasText ? (
              blocks.map((c, i) => (
                <div key={c.id ?? i} className={i > 0 ? 'pt-4 border-t border-slate-200/80' : ''}>
                  {blocks.length > 1 && (
                    <p className="text-xs font-bold text-slate-500 mb-2">Bloc {i + 1}</p>
                  )}
                  {renderConditionsLooksLikeHtml(c.texte) ? (
                    <div
                      className="ql-editor border-0 p-0 min-h-0 text-slate-800 [&_a]:underline [&_a]:font-semibold"
                      style={{ color: 'inherit' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeConditionsHtml(c.texte) }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-slate-800">{c.texte}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-600 leading-relaxed">
                Aucun texte n’a encore été publié par cet établissement pour cette plateforme. Pour toute précision,
                contactez directement le service des admissions. Vous pouvez néanmoins cocher la case ci-dessous pour
                confirmer cette prise d’information.
              </p>
            )}
          </div>
        </div>
      </div>

      {readOnlyConsultation ? (
        <p className="text-xs text-slate-600 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 leading-relaxed">
          Consultation informative pour les candidats connectés. La case de confirmation est réservée aux visiteurs sans
          compte. Pour déposer les justificatifs, utilisez l’onglet <strong>Demande proforma</strong> (ou le bouton
          ci-dessous).
        </p>
      ) : (
        <label
          className="flex items-start gap-3 cursor-pointer rounded-2xl border-2 px-4 py-4 transition-shadow hover:shadow-md"
          style={{
            borderColor: ack ? prim : `${prim}55`,
            background: ack ? `color-mix(in srgb, ${prim} 10%, white)` : `color-mix(in srgb, ${prim} 4%, white)`,
          }}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
            style={{ accentColor: prim }}
            checked={ack}
            onChange={(e) => onAckChange(e.target.checked)}
          />
          <span className="text-sm font-medium text-slate-800 leading-snug">
            Je confirme avoir lu les informations ci-dessus. Je comprends que le formulaire de demande de facture proforma
            n’est accessible qu’après cette confirmation.
          </span>
        </label>
      )}
    </div>
  )
}

function FormulaireDemandeProformaPublic({ etablissements, initialEtablissementId, lockEtablissementId }) {
  const [submittedRef, setSubmittedRef] = useState(null)
  const [form, setForm] = useState({
    etablissement_id: '',
    type_formation: '',
    formation_id: '',
    email: '',
  })
  const [files, setFiles] = useState({ identite: null, diplome: null })
  const [formations, setFormations] = useState([])
  const [loadingFormations, setLoadingFormations] = useState(false)
  const [loading, setLoading] = useState(false)
  const up = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const upFile = (f) => (e) => setFiles((p) => ({ ...p, [f]: e.target.files?.[0] || null }))

  const handleEtabChange = (val) => {
    setForm((p) => ({ ...p, etablissement_id: val, type_formation: '', formation_id: '' }))
    setFormations([])
  }
  const handleTypeChange = (val) => setForm((p) => ({ ...p, type_formation: val, formation_id: '' }))

  useEffect(() => {
    const fixed = lockEtablissementId || initialEtablissementId
    if (!fixed) return
    setForm((f) => ({ ...f, etablissement_id: String(parseInt(fixed, 10) || fixed) }))
  }, [lockEtablissementId, initialEtablissementId])

  useEffect(() => {
    if (!form.etablissement_id) {
      setFormations([])
      return
    }
    let cancelled = false
    setLoadingFormations(true)
    axios
      .get(`/api/formations?etablissement_id=${encodeURIComponent(form.etablissement_id)}`)
      .then(({ data }) => {
        if (!cancelled) setFormations(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setFormations([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFormations(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.etablissement_id])

  const formationsFiltrees = useMemo(() => {
    if (!form.etablissement_id || !form.type_formation) return []
    return formations.filter(
      (f) => String(f.etablissement_id) === String(form.etablissement_id) && f.type === form.type_formation,
    )
  }, [form.etablissement_id, form.type_formation, formations])

  const formationSelectionnee = form.formation_id
    ? formations.find((f) => f.id === parseInt(form.formation_id, 10))
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.etablissement_id || !form.type_formation || !form.formation_id) {
      toast.error('Sélectionnez l’établissement, le mode et la formation.')
      return
    }
    if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Indiquez une adresse e-mail valide (pour recevoir la facture proforma).')
      return
    }
    if (!files.identite || !files.diplome) {
      toast.error('Carte d’identité / NIN / passeport (JPG ou PNG) et dernier diplôme sont obligatoires.')
      return
    }
    const idExt = (files.identite.name || '').toLowerCase()
    if (!/\.(jpe?g|png)$/.test(idExt)) {
      toast.error('La pièce d’identité doit être au format JPG ou PNG.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('email', form.email.trim())
      fd.append('type_formation', form.type_formation)
      fd.append('formation_id', form.formation_id)
      fd.append('etablissement_id', form.etablissement_id)
      fd.append('type_payeur', 'etudiant')
      fd.append('justificatif_identite', files.identite)
      fd.append('justificatif_diplome', files.diplome)

      const { data } = await axios.post('/api/public/demande-proforma', fd)
      toast.success(data.message || 'Demande enregistrée.')
      setSubmittedRef(data.reference || null)
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi.")
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
  const fixedEtabId = lockEtablissementId || initialEtablissementId
  const showEtabSelect = !fixedEtabId

  if (submittedRef) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-6 text-center space-y-3">
        <p className="text-3xl">✅</p>
        <h2 className="text-lg font-black text-emerald-950">Demande enregistrée</h2>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Référence <strong className="font-mono">{submittedRef}</strong>. Tout le staff de l’établissement a été
          informé. Vous recevrez la facture proforma à <strong>{form.email}</strong> après validation.
          <span className="block mt-2 text-emerald-800/90">Aucune préinscription ni création de compte n’est nécessaire.</span>
        </p>
        <Link to="/" className="inline-block text-sm font-semibold text-emerald-800 underline">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
        <p className="font-semibold">Demande de facture — sans compte</p>
        <p className="text-xs mt-1 text-emerald-900/90 leading-relaxed">
          Choisissez l’établissement et la formation, indiquez votre e-mail et déposez votre pièce d’identité (NIN /
          passeport en JPG ou PNG) et votre dernier diplôme. Ce n’est <strong>pas</strong> une préinscription : le staff
          examinera votre demande et vous enverra la facture proforma par e-mail.
        </p>
      </div>

      {showEtabSelect && (
        <div>
          <LBL required>Établissement</LBL>
          <select
            className="input-field"
            value={form.etablissement_id}
            onChange={(e) => handleEtabChange(e.target.value)}
            required
          >
            <option value="">-- Choisir votre établissement --</option>
            {etablissements.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {!showEtabSelect && fixedEtabId && (
        <p className="text-sm text-slate-700 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
          Établissement :{' '}
          <strong>{etablissements.find((e) => String(e.id) === String(fixedEtabId))?.nom || '—'}</strong>
        </p>
      )}

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Votre e-mail</p>
        <LBL required>E-mail (réception de la facture)</LBL>
        <input
          type="email"
          className="input-field"
          value={form.email}
          onChange={up('email')}
          required
          placeholder="exemple@email.com"
        />
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Formation concernée</p>
      </div>

      {form.etablissement_id && loadingFormations && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Chargement des formations de l’établissement…
        </p>
      )}

      <div className={!form.etablissement_id || loadingFormations ? 'opacity-50 pointer-events-none' : ''}>
        <LBL required>Mode de formation</LBL>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { val: 'presentiel', label: '🏫 Présentiel', sub: 'Cours en classe' },
            { val: 'en_ligne', label: '🌐 À distance (FAD)', sub: '100% flexible' },
          ].map(({ val, label, sub }) => (
            <label
              key={val}
              className={`flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.type_formation === val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <input
                type="radio"
                name="type_formation_public"
                value={val}
                checked={form.type_formation === val}
                onChange={() => handleTypeChange(val)}
                className="sr-only"
                disabled={!form.etablissement_id || loadingFormations}
              />
              <span className="font-semibold text-gray-800 text-sm">{label}</span>
              <span className="text-xs text-gray-500">{sub}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={!form.etablissement_id || loadingFormations ? 'opacity-50 pointer-events-none' : ''}>
        <LBL required>Formation</LBL>
        <select
          className="input-field"
          value={form.formation_id}
          onChange={up('formation_id')}
          required
          disabled={!form.etablissement_id || loadingFormations || !form.type_formation}
        >
          <option value="">
            {!form.etablissement_id || loadingFormations
              ? '—'
              : !form.type_formation
                ? "-- Choisissez d'abord un mode --"
                : formationsFiltrees.length === 0
                  ? 'Aucune formation pour ce mode'
                  : '-- Sélectionner une formation --'}
          </option>
          {formationsFiltrees.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titre}
              {f.ville ? ` — ${f.ville}` : ''}
            </option>
          ))}
        </select>
        {formationSelectionnee && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Indication tarifaire</p>
            <p className="text-[11px] text-emerald-900/80">Montants indicatifs — facture définitive après validation.</p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Frais d&apos;inscription</span>
              <span className="font-semibold">{fmt(formationSelectionnee.frais_inscription)} FCFA</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-amber-200 pt-4 space-y-3">
        <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Justificatifs (max 2 Mo chacun)</p>
        <div>
          <LBL required>Carte d&apos;identité, NIN ou passeport</LBL>
          <p className="text-xs text-slate-500 mb-1">Format JPG ou PNG uniquement</p>
          <input type="file" accept=".jpg,.jpeg,.png" className="input-field text-sm" onChange={upFile('identite')} required />
        </div>
        <div>
          <LBL required>Dernier diplôme obtenu</LBL>
          <p className="text-xs text-slate-500 mb-1">PDF, JPG ou PNG</p>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-sm" onChange={upFile('diplome')} required />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-40">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Envoi…
          </>
        ) : (
          '📤 Envoyer ma demande de facture proforma'
        )}
      </button>
    </form>
  )
}

function FormulaireDemandeProforma({ etablissements, initialEtablissementId, user, lockEtablissementId }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    etablissement_id: '',
    type_formation: '',
    formation_id: '',
    type_payeur: 'etudiant',
    destinataire: '',
    telephone: user?.telephone || '',
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    date_naissance: user?.date_naissance ? String(user.date_naissance).slice(0, 10) : '',
    lieu_naissance: user?.lieu_naissance || '',
  })
  const [files, setFiles] = useState({ diplome: null, releve: null, formation: null })
  const [formations, setFormations] = useState([])
  const [loadingFormations, setLoadingFormations] = useState(false)
  const [loading, setLoading] = useState(false)
  const up = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const upFile = (f) => (e) => setFiles((p) => ({ ...p, [f]: e.target.files?.[0] || null }))

  const birthFromProfile = Boolean(user?.date_naissance && String(user.date_naissance).trim())
  const birthDateRequired = !birthFromProfile

  const handleEtabChange = (val) => {
    setForm((p) => ({ ...p, etablissement_id: val, type_formation: '', formation_id: '' }))
    setFormations([])
  }
  const handleTypeChange = (val) => setForm((p) => ({ ...p, type_formation: val, formation_id: '' }))

  useEffect(() => {
    const fixed = lockEtablissementId || initialEtablissementId
    if (!fixed) return
    const id = String(parseInt(fixed, 10) || fixed)
    setForm((f) => ({ ...f, etablissement_id: id }))
  }, [lockEtablissementId, initialEtablissementId])

  useEffect(() => {
    if (!user) return
    setForm((p) => ({
      ...p,
      telephone: p.telephone || user.telephone || '',
      prenom: user.prenom || p.prenom,
      nom: user.nom || p.nom,
      email: user.email || p.email,
      date_naissance: user.date_naissance
        ? String(user.date_naissance).slice(0, 10)
        : (p.date_naissance || ''),
      lieu_naissance: user.lieu_naissance || p.lieu_naissance || '',
    }))
  }, [user])

  useEffect(() => {
    if (!form.etablissement_id) {
      setFormations([])
      return
    }
    let cancelled = false
    setLoadingFormations(true)
    axios
      .get(`/api/formations?etablissement_id=${encodeURIComponent(form.etablissement_id)}`)
      .then(({ data }) => {
        if (!cancelled) setFormations(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setFormations([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFormations(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.etablissement_id])

  const formationsFiltrees = useMemo(() => {
    if (!form.etablissement_id || !form.type_formation) return []
    return formations.filter(
      (f) => String(f.etablissement_id) === String(form.etablissement_id) && f.type === form.type_formation,
    )
  }, [form.etablissement_id, form.type_formation, formations])

  const formationSelectionnee = form.formation_id
    ? formations.find((f) => f.id === parseInt(form.formation_id, 10))
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.etablissement_id || !form.type_formation || !form.formation_id) {
      toast.error('Sélectionnez le mode et la formation.')
      return
    }
    if (!form.telephone?.trim() || form.telephone.trim().length < 8) {
      toast.error('Indiquez un numéro de téléphone valide (au moins 8 caractères).')
      return
    }
    if (form.type_payeur === 'organisation' && !String(form.destinataire || '').trim()) {
      toast.error('Indiquez le destinataire (entreprise, État ou organisation).')
      return
    }
    if (!files.diplome || !files.releve || !files.formation) {
      toast.error('Les trois justificatifs sont obligatoires : diplôme, relevé de notes, document formation.')
      return
    }
    if (birthDateRequired && !String(form.date_naissance || '').trim()) {
      toast.error('La date de naissance est obligatoire pour la demande de facture proforma.')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('telephone', form.telephone.trim())
      fd.append('type_formation', form.type_formation)
      fd.append('formation_id', form.formation_id)
      fd.append('etablissement_id', form.etablissement_id)
      fd.append('type_payeur', form.type_payeur || 'etudiant')
      if (form.date_naissance) fd.append('date_naissance', String(form.date_naissance).trim())
      if (form.lieu_naissance) fd.append('lieu_naissance', String(form.lieu_naissance).trim())
      if (form.type_payeur === 'organisation') {
        fd.append('payeur_org_nom', String(form.destinataire || '').trim())
      }
      fd.append('justificatif_diplome', files.diplome)
      fd.append('justificatif_releve', files.releve)
      fd.append('justificatif_formation', files.formation)

      await axios.post('/api/etudiant/demande-proforma', fd)
      toast.success('Demande enregistrée. Validation pédagogique requise avant téléchargement des documents.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi.")
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
  const fixedEtabId = lockEtablissementId || initialEtablissementId
  const showEtabSelect = !fixedEtabId

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
        <p className="font-semibold">Compte connecté</p>
        <p className="text-xs mt-1 text-blue-800/90">
          Ce formulaire ne remplace pas une <strong>préinscription complète</strong> : c’est une demande de facture proforma avec
          justificatifs. Les informations d’identité viennent de votre compte. Les pièces attendues sont celles des{' '}
          <strong>conditions d’admission</strong> (consultables publiquement). Après validation pédagogique, facture proforma et
          attestation sont disponibles depuis votre tableau de bord.
        </p>
      </div>

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Identité du bénéficiaire</p>
      </div>
      <IdentiteBeneficiaireProforma
        form={form}
        up={up}
        identityReadOnly
        birthDateRequired={birthDateRequired}
      />
      {birthFromProfile && (
        <p className="text-xs text-emerald-700 -mt-2">
          Date de naissance reprise automatiquement depuis votre profil.
        </p>
      )}
      {birthDateRequired && (
        <p className="text-xs text-amber-800 -mt-2">
          Indiquez votre date de naissance : elle sera utilisée pour les documents administratifs liés à cette demande.
        </p>
      )}

      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Formation souhaitée</p>
      </div>

      {showEtabSelect && (
        <div>
          <LBL required>Établissement</LBL>
          <select
            className="input-field"
            value={form.etablissement_id}
            onChange={(e) => handleEtabChange(e.target.value)}
            required
          >
            <option value="">-- Choisir votre établissement --</option>
            {etablissements.map((e) => (
              <option key={e.id} value={String(e.id)}>
                {e.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {!showEtabSelect && fixedEtabId && (
        <p className="text-sm text-slate-700 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
          Établissement :{' '}
          <strong>{etablissements.find((e) => String(e.id) === String(fixedEtabId))?.nom || '—'}</strong>
        </p>
      )}

      {!form.etablissement_id && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Sélectionnez d’abord un <strong>établissement</strong>.
        </p>
      )}
      {form.etablissement_id && loadingFormations && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Chargement des formations…
        </p>
      )}
      <div className={!form.etablissement_id || loadingFormations ? 'opacity-50 pointer-events-none' : ''}>
        <LBL required>Mode de formation</LBL>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { val: 'presentiel', label: '🏫 Présentiel', sub: 'Cours en classe' },
            { val: 'en_ligne', label: '🌐 À distance (FAD)', sub: '100% flexible' },
          ].map(({ val, label, sub }) => (
            <label
              key={val}
              className={`flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                form.type_formation === val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <input
                type="radio"
                name="type_formation"
                value={val}
                checked={form.type_formation === val}
                onChange={() => handleTypeChange(val)}
                className="sr-only"
                disabled={!form.etablissement_id || loadingFormations}
              />
              <span className="font-semibold text-gray-800 text-sm">{label}</span>
              <span className="text-xs text-gray-500">{sub}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={!form.etablissement_id || loadingFormations ? 'opacity-50 pointer-events-none' : ''}>
        <LBL required>Formation</LBL>
        <select
          className="input-field"
          value={form.formation_id}
          onChange={up('formation_id')}
          required
          disabled={!form.etablissement_id || loadingFormations || !form.type_formation}
        >
          <option value="">
            {!form.etablissement_id || loadingFormations
              ? '—'
              : !form.type_formation
                ? "-- Choisissez d'abord un mode --"
                : formationsFiltrees.length === 0
                  ? 'Aucune formation pour ce mode'
                  : '-- Sélectionner une formation --'}
          </option>
          {formationsFiltrees.map((f) => (
            <option key={f.id} value={f.id}>
              {f.titre}
              {f.ville ? ` — ${f.ville}` : ''}
            </option>
          ))}
        </select>
        {formationSelectionnee && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Indication tarifaire</p>
            <p className="text-[11px] text-emerald-900/80 leading-snug">
              Montants indicatifs — la facture définitive sera établie après validation.
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Frais d&apos;inscription</span>
              <span className="font-semibold">{fmt(formationSelectionnee.frais_inscription)} FCFA</span>
            </div>
            {formationSelectionnee.mensualite > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mensualité</span>
                <span className="font-semibold text-blue-700">{fmt(formationSelectionnee.mensualite)} FCFA/mois</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Forfait annuel (estimation)</span>
              <span className="font-semibold">{fmt(forfaitAnnuelFromFormation(formationSelectionnee))} FCFA</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-amber-200 pt-4 space-y-3">
        <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Justificatifs (PDF, JPG ou PNG — max 2 Mo chacun)</p>
        <div>
          <LBL required>Dernier diplôme</LBL>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-sm" onChange={upFile('diplome')} required />
        </div>
        <div>
          <LBL required>Relevé de notes</LBL>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-sm" onChange={upFile('releve')} required />
        </div>
        <div>
          <LBL required>Document lié à la formation demandée</LBL>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="input-field text-sm" onChange={upFile('formation')} required />
          <p className="text-[11px] text-gray-500 mt-1">Ex. attestation d’inscription parallèle, certificat de scolarité ciblant la formation, etc.</p>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-40">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Envoi…
          </>
        ) : (
          '📤 Envoyer la demande (validation pédagogique)'
        )}
      </button>
    </form>
  )
}

export default function PublicProformaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const etabFromQuery = searchParams.get('etablissement_id') ?? ''
  const tabFromQuery = searchParams.get('tab') === 'demande' ? 'demande' : 'conditions'
  /** Permet aux candidats connectés de relire les conditions sans repasser par la case à cocher (visiteurs). */
  const consultationMode = searchParams.get('consultation') === '1'
  const [etablissements, setEtablissements] = useState([])
  const [selectedEtab, setSelectedEtab] = useState('')
  const [conditionsAck, setConditionsAck] = useState(false)
  const { user, loading: authLoading } = useAuth()

  /** Candidat connecté : pas d’étape « lecture des conditions » sur cette page (réservée aux visiteurs non connectés). */
  const isEtudiantConnecte = !authLoading && user?.role === 'etudiant'
  const isVisiteurSansCompte = !authLoading && !user
  /** Visiteur : accès direct au formulaire proforma (pas de préinscription). Candidat : formulaire avec justificatifs compte. */
  const conditionsAckEffective = isEtudiantConnecte || isVisiteurSansCompte || conditionsAck

  useEffect(() => {
    axios
      .get('/api/etablissements')
      .then(({ data }) => setEtablissements((data || []).filter((e) => e.actif !== false)))
      .catch(() => {})
  }, [])

  /** Compte candidat : l’établissement d’inscription est la référence (pas de re-sélection). */
  useEffect(() => {
    if (authLoading) return

    const studentEtabId =
      user?.role === 'etudiant' && user?.etablissement_id != null
        ? String(Number(user.etablissement_id))
        : ''

    if (studentEtabId) {
      setSelectedEtab(studentEtabId)
      const consult = searchParams.get('consultation') === '1'
      if (consult && tabFromQuery === 'conditions') {
        if (etabFromQuery !== studentEtabId) {
          setSearchParams(
            { etablissement_id: studentEtabId, tab: 'conditions', consultation: '1' },
            { replace: true },
          )
        }
        return
      }
      if (etabFromQuery !== studentEtabId || tabFromQuery !== 'demande') {
        setSearchParams({ etablissement_id: studentEtabId, tab: 'demande' }, { replace: true })
      }
      return
    }

    if (etabFromQuery) {
      setSelectedEtab(String(parseInt(etabFromQuery, 10) || etabFromQuery))
    } else {
      setSelectedEtab('')
    }
  }, [authLoading, user?.role, user?.etablissement_id, etabFromQuery, tabFromQuery, setSearchParams, searchParams])

  useEffect(() => {
    setConditionsAck(false)
  }, [selectedEtab])

  /** Toujours l’établissement du compte candidat quand il existe (évite délai avant sync du state). */
  const effectiveEtabIdForUi = useMemo(() => {
    if (user?.role === 'etudiant' && user?.etablissement_id != null) {
      return String(Number(user.etablissement_id))
    }
    return selectedEtab
  }, [user?.role, user?.etablissement_id, selectedEtab])

  /** Candidat : onglet « conditions » uniquement en mode consultation (?consultation=1). */
  useEffect(() => {
    if (authLoading) return
    if (searchParams.get('consultation') === '1') return
    if (user?.role === 'etudiant' && effectiveEtabIdForUi && tabFromQuery === 'conditions') {
      setSearchParams({ etablissement_id: effectiveEtabIdForUi, tab: 'demande' }, { replace: true })
    }
  }, [authLoading, user?.role, effectiveEtabIdForUi, tabFromQuery, setSearchParams, searchParams])

  useEffect(() => {
    if (!selectedEtab || tabFromQuery !== 'demande' || conditionsAckEffective) return
    setSearchParams({ etablissement_id: selectedEtab, tab: 'conditions' }, { replace: true })
  }, [selectedEtab, tabFromQuery, conditionsAckEffective, setSearchParams])

  /** Palette page : celle de l’établissement choisi, sinon mélange des écoles. */
  const palette = useMemo(() => {
    const brands = etablissements.map((e) => detectBrand(e.nom)).filter(Boolean)
    const uniq = [...new Set(brands)]
    const first = uniq[0] ? BRAND_COLORS[uniq[0]] : null
    const second = uniq[1] ? BRAND_COLORS[uniq[1]] : null
    const prim = first?.prim || '#1e40af'
    const sec = second?.prim || first?.sec || '#1d4ed8'
    return { prim, sec }
  }, [etablissements])

  const selectedEtabObj = useMemo(
    () => etablissements.find((e) => String(e.id) === String(effectiveEtabIdForUi)),
    [etablissements, effectiveEtabIdForUi],
  )

  const etabTheme = useMemo(() => getEtabTheme(selectedEtabObj), [selectedEtabObj])

  const pageColors = effectiveEtabIdForUi ? etabTheme : palette

  const etablissementFromCompte = Boolean(
    !authLoading && user?.role === 'etudiant' && user?.etablissement_id != null,
  )

  const setTabInUrl = useCallback(
    (t) => {
      if (!effectiveEtabIdForUi) return
      setSearchParams({ etablissement_id: effectiveEtabIdForUi, tab: t })
    },
    [effectiveEtabIdForUi, setSearchParams],
  )

  const onSelectEtab = (id) => {
    setSelectedEtab(id)
    setConditionsAck(false)
    if (id) {
      const defaultTab = !user ? 'demande' : isEtudiantConnecte ? 'demande' : 'conditions'
      setSearchParams({ etablissement_id: id, tab: defaultTab })
    } else {
      setSearchParams({})
    }
  }

  const onTabClick = (t) => {
    if (!effectiveEtabIdForUi) {
      toast.error('Choisissez d’abord un établissement.')
      return
    }
    if (t === 'demande' && !conditionsAckEffective) {
      toast.error('Cochez la case sous les conditions d’admission pour accéder au formulaire.')
      return
    }
    setTabInUrl(t)
  }

  const nextDemandeAfterAuth = `/demande-proforma${effectiveEtabIdForUi ? `?etablissement_id=${effectiveEtabIdForUi}&tab=demande` : ''}`

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${pageColors.prim} 11%, white), white 42%, color-mix(in srgb, ${pageColors.sec} 8%, white))`,
      }}
    >
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link to="/" className="text-sm text-blue-700 hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
        <section className="bg-white/95 rounded-3xl border border-gray-100 shadow-xl p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg ring-2 ring-white/40"
              style={{
                background: `linear-gradient(135deg, ${pageColors.prim}, ${pageColors.sec})`,
                boxShadow: `0 10px 28px -6px color-mix(in srgb, ${pageColors.prim} 45%, transparent)`,
              }}
            >
              🧾
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-xl leading-tight">Demande de facture proforma</h1>
              <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: pageColors.prim }}>
                  ① Établissement
                </span>
                <span className="text-gray-300">·</span>
                {isEtudiantConnecte ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${effectiveEtabIdForUi ? '' : 'text-gray-400'}`}
                      style={effectiveEtabIdForUi ? { color: pageColors.sec } : undefined}
                    >
                      ② Justificatifs & demande
                    </span>
                    <span className="text-gray-400">(compte candidat)</span>
                  </>
                ) : (
                  <>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${effectiveEtabIdForUi ? '' : 'text-gray-400'}`}
                      style={effectiveEtabIdForUi ? { color: pageColors.sec } : undefined}
                    >
                      ② E-mail & justificatifs
                    </span>
                    <span className="text-gray-400">(sans compte — pas de préinscription)</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Établissement {!etablissementFromCompte && <span className="text-red-500">*</span>}
            </label>
            {etablissementFromCompte ? (
              <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3 text-sm text-slate-800">
                <span className="text-slate-600">Établissement de votre compte :</span>{' '}
                <strong className="text-slate-900">{selectedEtabObj?.nom || user?.etablissement_nom || '—'}</strong>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  La demande de facture proforma concerne cet établissement. Déposez les{' '}
                  <strong>justificatifs</strong> prévus aux conditions d’admission pour obtenir, après validation, la
                  facture proforma et l’attestation.
                </p>
                <p className="text-xs mt-3">
                  <Link
                    to={`/demande-proforma?etablissement_id=${effectiveEtabIdForUi}&tab=conditions&consultation=1`}
                    className="font-semibold text-emerald-800 underline decoration-emerald-300 hover:text-emerald-950"
                  >
                    Relire les conditions d’admission (consultation)
                  </Link>
                  {' · '}
                  <Link
                    to={`/etablissement/${effectiveEtabIdForUi}`}
                    className="text-slate-600 underline hover:text-slate-900"
                  >
                    Fiche publique de l’établissement
                  </Link>
                </p>
              </div>
            ) : effectiveEtabIdForUi && conditionsAck ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                <span className="text-slate-500">Établissement retenu pour cette démarche :</span>{' '}
                <strong className="text-slate-900">{selectedEtabObj?.nom || '—'}</strong>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Les étapes suivantes (conditions et demande) portent sur cet établissement. Pour en choisir un autre,
                  décochez la confirmation des conditions d’admission ci-dessous ou rechargez la page.
                </p>
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedEtab}
                onChange={(e) => onSelectEtab(e.target.value)}
              >
                <option value="">-- Choisir l’établissement concerné --</option>
                {etablissements.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          {authLoading ? (
            <div className="flex justify-center py-12">
              <div
                className="animate-spin rounded-full h-10 w-10 border-4 border-t-transparent"
                style={{
                  borderColor: `${pageColors.prim}30`,
                  borderTopColor: pageColors.prim,
                }}
              />
            </div>
          ) : user && user.role !== 'etudiant' ? (
            <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
              Cette démarche est réservée aux comptes <strong>candidats</strong> (rôle étudiant).
            </p>
          ) : (
            <>
              {!effectiveEtabIdForUi && (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  Choisissez un établissement et une formation, puis envoyez votre <strong>e-mail</strong> et vos{' '}
                  <strong>justificatifs</strong> (identité + diplôme). Aucune préinscription ni compte requis.
                </p>
              )}

              {effectiveEtabIdForUi && isVisiteurSansCompte && tabFromQuery === 'demande' && (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
                  Formulaire réservé aux <strong>visiteurs</strong> : demande de facture proforma uniquement. Les
                  candidats inscrits passent par leur espace « Préinscription » ou se connectent pour joindre leurs
                  justificatifs complets.
                </p>
              )}

              {effectiveEtabIdForUi && isEtudiantConnecte && !etablissementFromCompte && (
                <p className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                  Joignez les justificatifs prévus aux conditions de l’établissement.{' '}
                  <Link
                    to={`/demande-proforma?etablissement_id=${effectiveEtabIdForUi}&tab=conditions&consultation=1`}
                    className="font-semibold underline decoration-emerald-400"
                  >
                    Voir les conditions d’admission
                  </Link>
                  {' · '}
                  <Link to={`/etablissement/${effectiveEtabIdForUi}`} className="underline text-emerald-950/80">
                    Fiche publique
                  </Link>
                </p>
              )}

              {effectiveEtabIdForUi && !isEtudiantConnecte && !isVisiteurSansCompte && !conditionsAck && (
                <div
                  className="mb-6 rounded-[1.35rem] p-[2px] shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${etabTheme.prim}, ${etabTheme.sec})`,
                    boxShadow: `0 16px 48px -12px color-mix(in srgb, ${etabTheme.prim} 38%, transparent)`,
                  }}
                >
                  <div
                    className="flex w-full items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3.5 text-sm font-black text-white sm:py-4 sm:text-base"
                    style={{
                      background: `linear-gradient(135deg, ${etabTheme.prim}, ${etabTheme.sec})`,
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm backdrop-blur-sm">
                      1
                    </span>
                    Conditions d’admission — lecture obligatoire
                  </div>
                  <p className="rounded-b-[1.2rem] bg-white/95 px-4 py-2 text-center text-[11px] font-medium text-slate-500">
                    Le formulaire « Demande proforma » n’apparaît qu’après confirmation de lecture ci-dessous.
                  </p>
                </div>
              )}

              {effectiveEtabIdForUi && !isEtudiantConnecte && !isVisiteurSansCompte && conditionsAck && (
                <div
                  className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
                  role="tablist"
                  aria-label="Conditions d’admission et demande proforma"
                >
                  <button
                    type="button"
                    role="tab"
                    id="tab-conditions-proforma"
                    aria-selected={tabFromQuery === 'conditions'}
                    aria-controls="panel-proforma-conditions"
                    onClick={() => onTabClick('conditions')}
                    className="relative overflow-hidden rounded-2xl px-4 py-3.5 text-left text-sm font-black transition-all sm:py-4 sm:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                    style={
                      tabFromQuery === 'conditions' ?
                        {
                          background: `linear-gradient(135deg, ${etabTheme.prim}, ${etabTheme.sec})`,
                          color: 'white',
                          boxShadow: `0 12px 32px -8px color-mix(in srgb, ${etabTheme.prim} 50%, transparent)`,
                        }
                      : {
                          background: 'white',
                          color: '#475569',
                          border: `2px solid color-mix(in srgb, ${etabTheme.prim} 38%, #e2e8f0)`,
                        }
                    }
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-90">Étape 2a</span>
                    Conditions d’admission
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="tab-demande-proforma"
                    aria-selected={tabFromQuery === 'demande'}
                    aria-controls="panel-proforma-demande"
                    onClick={() => onTabClick('demande')}
                    className="relative overflow-hidden rounded-2xl px-4 py-3.5 text-left text-sm font-black transition-all sm:py-4 sm:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
                    style={
                      tabFromQuery === 'demande' ?
                        {
                          background: `linear-gradient(135deg, ${etabTheme.prim}, ${etabTheme.sec})`,
                          color: 'white',
                          boxShadow: `0 12px 32px -8px color-mix(in srgb, ${etabTheme.prim} 50%, transparent)`,
                        }
                      : {
                          background: 'white',
                          color: '#475569',
                          border: `2px solid color-mix(in srgb, ${etabTheme.prim} 38%, #e2e8f0)`,
                        }
                    }
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-90">Étape 2b</span>
                    Demande proforma
                  </button>
                </div>
              )}

              {effectiveEtabIdForUi && (!isEtudiantConnecte || consultationMode) && tabFromQuery === 'conditions' && (
                <div
                  id="panel-proforma-conditions"
                  role="tabpanel"
                  aria-labelledby="tab-conditions-proforma"
                >
                  {isEtudiantConnecte && consultationMode && (
                    <div className="mb-4">
                      <Link
                        to={`/demande-proforma?etablissement_id=${effectiveEtabIdForUi}&tab=demande`}
                        className="inline-flex text-sm font-semibold text-slate-700 hover:text-slate-900 underline"
                      >
                        ← Retour au formulaire (justificatifs)
                      </Link>
                    </div>
                  )}
                  <BlocConditionsAdmission
                    etablissementId={effectiveEtabIdForUi}
                    ack={conditionsAck}
                    onAckChange={setConditionsAck}
                    theme={etabTheme}
                    readOnlyConsultation={isEtudiantConnecte && consultationMode}
                  />
                </div>
              )}

              {effectiveEtabIdForUi && tabFromQuery === 'demande' && conditionsAckEffective && (
                user && user.role === 'etudiant' ? (
                  <div
                    id="panel-proforma-demande"
                    role="region"
                    aria-label="Formulaire de demande de facture proforma"
                  >
                    <FormulaireDemandeProforma
                      etablissements={etablissements}
                      initialEtablissementId={effectiveEtabIdForUi}
                      user={user}
                      lockEtablissementId={effectiveEtabIdForUi}
                    />
                  </div>
                ) : (
                  <div
                    id="panel-proforma-demande"
                    role="tabpanel"
                    aria-labelledby="tab-demande-proforma"
                  >
                    <FormulaireDemandeProformaPublic
                      etablissements={etablissements}
                      initialEtablissementId={effectiveEtabIdForUi}
                      lockEtablissementId={effectiveEtabIdForUi}
                    />
                    <p className="mt-4 text-center text-xs text-slate-500">
                      Vous avez déjà un compte candidat ?{' '}
                      <Link
                        to={`/connexion?next=${encodeURIComponent(nextDemandeAfterAuth)}`}
                        className="font-semibold text-blue-700 underline"
                      >
                        Connectez-vous
                      </Link>{' '}
                      pour le formulaire avec relevé de notes et document formation.
                    </p>
                  </div>
                )
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
