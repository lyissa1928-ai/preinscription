import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import { forfaitAnnuelFromFormation } from '../lib/formationTarifs'

const NIVEAUX = [
  'Terminale / Baccalauréat', 'Bac+1 / Licence 1', 'Bac+2 / Licence 2',
  'Bac+3 / Licence 3', 'Bac+4 / Master 1', 'Bac+5 / Master 2', 'Doctorat', 'Autre',
]

const BRAND_COLORS = {
  esebat: { prim: '#F97316', sec: '#FB923C' }, // orange
  escoa: { prim: '#0B2A66', sec: '#1E3A8A' },  // bleu fonce
  efosante: { prim: '#B91C1C', sec: '#38BDF8' }, // rouge sang + bleu clair
}

function detectBrand(name = '') {
  const n = String(name).toLowerCase()
  if (n.includes('esebat')) return 'esebat'
  if (n.includes('escoa')) return 'escoa'
  if (n.includes('efosante') || n.includes('efo sante') || n.includes('efo-sante')) return 'efosante'
  return null
}

const LBL = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
    {children} {required && <span className="text-red-500">*</span>}
  </label>
)

function FormulaireDemandeProforma({ formations, etablissements }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', telephone: '',
    niveau: '', etablissement_id: '', type_formation: '', formation_id: '', details: '',
    type_payeur: 'etudiant',
    payeur_nom: '', payeur_prenom: '', payeur_relation: '', payeur_telephone: '',
    payeur_org_nom: '', payeur_org_ninea: '', payeur_org_contact: '',
  })
  const [loading, setLoading] = useState(false)
  const up = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleEtabChange = (val) => setForm((p) => ({ ...p, etablissement_id: val, type_formation: '', formation_id: '' }))
  const handleTypeChange = (val) => setForm((p) => ({ ...p, type_formation: val, formation_id: '' }))

  const formationsParEtab = useMemo(() => (
    form.etablissement_id
      ? formations.filter((f) => String(f.etablissement_id) === String(form.etablissement_id))
      : formations
  ), [form.etablissement_id, formations])
  const formationsFiltrees = form.type_formation ? formationsParEtab.filter((f) => f.type === form.type_formation) : []
  const formationSelectionnee = form.formation_id ? formations.find((f) => f.id === parseInt(form.formation_id, 10)) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.prenom || !form.nom || !form.email || !form.telephone || !form.type_formation || !form.formation_id) {
      toast.error('Veuillez remplir les champs obligatoires puis sélectionner une formation.')
      return
    }
    setLoading(true)
    try {
      const { data } = await axios.post('/api/public/demande-proforma', form)
      toast.success('Facture proforma générée !')
      navigate(`/facture-publique/${data.reference}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi.')
      setLoading(false)
    }
  }

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><LBL required>Prénom</LBL><input className="input-field" placeholder="Votre prénom" value={form.prenom} onChange={up('prenom')} required /></div>
        <div><LBL required>Nom</LBL><input className="input-field" placeholder="Votre nom" value={form.nom} onChange={up('nom')} required /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><LBL required>Email</LBL><input type="email" className="input-field" placeholder="votre@email.com" value={form.email} onChange={up('email')} required /></div>
        <div><LBL required>Téléphone</LBL><input type="tel" className="input-field" placeholder="+221 77 000 00 00" value={form.telephone} onChange={up('telephone')} required /></div>
      </div>
      <div>
        <LBL>Niveau actuel</LBL>
        <select className="input-field" value={form.niveau} onChange={up('niveau')}>
          <option value="">-- Votre niveau d'études --</option>
          {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Formation souhaitée</p>
      </div>
      <div>
        <LBL>Établissement</LBL>
        <select className="input-field" value={form.etablissement_id} onChange={(e) => handleEtabChange(e.target.value)}>
          <option value="">-- Tous les établissements --</option>
          {etablissements.map((e) => <option key={e.id} value={String(e.id)}>{e.nom}</option>)}
        </select>
      </div>
      <div>
        <LBL required>Mode de formation</LBL>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[{ val: 'presentiel', label: '🏫 Présentiel', sub: 'Cours en classe' }, { val: 'en_ligne', label: '🌐 À distance (FAD)', sub: '100% flexible' }].map(({ val, label, sub }) => (
            <label key={val} className={`flex flex-col gap-0.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.type_formation === val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
              <input type="radio" name="type_formation" value={val} checked={form.type_formation === val} onChange={() => handleTypeChange(val)} className="sr-only" />
              <span className="font-semibold text-gray-800 text-sm">{label}</span>
              <span className="text-xs text-gray-500">{sub}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <LBL required>Formation {form.type_formation && <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${form.type_formation === 'en_ligne' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{formationsFiltrees.length} disponible{formationsFiltrees.length !== 1 ? 's' : ''}</span>}</LBL>
        <select className="input-field" value={form.formation_id} onChange={up('formation_id')} required disabled={!form.type_formation}>
          <option value="">{form.type_formation ? '-- Sélectionner une formation --' : "-- Choisissez d'abord un mode --"}</option>
          {formationsFiltrees.map((f) => <option key={f.id} value={f.id}>{f.titre}{f.ville ? ` — ${f.ville}` : ''}</option>)}
        </select>
        {formationSelectionnee && (
          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Détail des frais</p>
            <p className="text-[11px] text-emerald-900/80 leading-snug">
              Forfait annuel = frais d&apos;inscription + (mensualité × durée en mois). Le total ci-dessous correspond à la facture proforma (hors frais complémentaires éventuels).
            </p>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Frais d&apos;inscription</span><span className="font-semibold">{fmt(formationSelectionnee.frais_inscription)} FCFA</span></div>
            {formationSelectionnee.mensualite > 0 && (
              <div className="flex justify-between text-sm"><span className="text-gray-600">Mensualité</span><span className="font-semibold text-blue-700">{fmt(formationSelectionnee.mensualite)} FCFA/mois</span></div>
            )}
            {(formationSelectionnee.duree_mois > 0 || formationSelectionnee.duree) && (
              <div className="flex justify-between text-sm"><span className="text-gray-600">Durée de paiement</span><span className="font-semibold">{formationSelectionnee.duree_mois > 0 ? `${formationSelectionnee.duree_mois} mois` : formationSelectionnee.duree || '—'}</span></div>
            )}
            <div className="flex justify-between text-sm"><span className="text-gray-600">Forfait annuel (scolarité)</span><span className="font-semibold">{fmt(forfaitAnnuelFromFormation(formationSelectionnee))} FCFA</span></div>
            {Array.isArray(formationSelectionnee.frais_supplementaires) && formationSelectionnee.frais_supplementaires.length > 0 && (
              <div className="text-xs text-amber-800 border-t border-emerald-200 pt-1 mt-1 space-y-0.5">
                <span className="font-semibold">Frais complémentaires (hors forfait) :</span>
                {formationSelectionnee.frais_supplementaires.map((x, i) => (
                  <div key={i} className="flex justify-between"><span>{x.designation}</span><span>{fmt(x.montant)} FCFA</span></div>
                ))}
              </div>
            )}
            <div className="border-t border-emerald-200 pt-1 flex justify-between">
              <span className="text-sm font-bold text-emerald-900">Total facture (forfait)</span>
              <span className="text-sm font-black text-emerald-700">{fmt(forfaitAnnuelFromFormation(formationSelectionnee))} FCFA</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-3"><p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Destinataire de la facture</p></div>
      <div>
        <LBL required>Qui règle les frais ?</LBL>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[{ val: 'etudiant', label: '🎓 Étudiant', sub: 'Lui-même' }, { val: 'tuteur', label: '👨‍👩‍👧 Tuteur', sub: 'Parent / tuteur' }, { val: 'organisation', label: '🏢 Organisme', sub: 'Entreprise / ONG' }].map(({ val, label, sub }) => (
            <label key={val} className={`flex flex-col gap-0.5 p-2.5 rounded-xl border-2 cursor-pointer transition-all text-center ${form.type_payeur === val ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
              <input type="radio" name="type_payeur" value={val} checked={form.type_payeur === val} onChange={up('type_payeur')} className="sr-only" />
              <span className="font-semibold text-gray-800 text-xs">{label}</span>
              <span className="text-xs text-gray-400">{sub}</span>
            </label>
          ))}
        </div>
      </div>
      {form.type_payeur === 'tuteur' && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><LBL required>Prénom du tuteur</LBL><input className="input-field" value={form.payeur_prenom} onChange={up('payeur_prenom')} required placeholder="Ex: Aissatou" /></div>
            <div><LBL required>Nom du tuteur</LBL><input className="input-field" value={form.payeur_nom} onChange={up('payeur_nom')} required placeholder="Ex: Diallo" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><LBL>Lien avec l'étudiant</LBL><input className="input-field" value={form.payeur_relation} onChange={up('payeur_relation')} placeholder="Ex: Père, Mère…" /></div>
            <div><LBL>Téléphone du tuteur</LBL><input className="input-field" value={form.payeur_telephone} onChange={up('payeur_telephone')} placeholder="+221 77 000 00 00" /></div>
          </div>
        </div>
      )}
      {form.type_payeur === 'organisation' && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
          <div><LBL required>Nom de l'organisation</LBL><input className="input-field" value={form.payeur_org_nom} onChange={up('payeur_org_nom')} required placeholder="Ex: Société XYZ SARL" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><LBL>NINEA / NIF</LBL><input className="input-field" value={form.payeur_org_ninea} onChange={up('payeur_org_ninea')} placeholder="Ex: 00123456 2Z1" /></div>
            <div><LBL>Personne de contact</LBL><input className="input-field" value={form.payeur_org_contact} onChange={up('payeur_org_contact')} placeholder="Ex: M. Fall DRH" /></div>
          </div>
        </div>
      )}
      <button type="submit" disabled={loading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-40">
        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Génération en cours...</> : '🧾 Générer ma facture proforma'}
      </button>
      <p className="text-xs text-gray-400 text-center">Sans compte requis · Génération instantanée · Gratuit</p>
    </form>
  )
}

export default function PublicProformaPage() {
  const [formations, setFormations] = useState([])
  const [etablissements, setEtablissements] = useState([])

  useEffect(() => {
    axios.get('/api/formations').then(({ data }) => setFormations(data)).catch(() => {})
    axios.get('/api/etablissements').then(({ data }) => setEtablissements((data || []).filter((e) => e.actif !== false))).catch(() => {})
  }, [])

  const palette = useMemo(() => {
    const brands = etablissements.map((e) => detectBrand(e.nom)).filter(Boolean)
    const uniq = [...new Set(brands)]
    const first = uniq[0] ? BRAND_COLORS[uniq[0]] : null
    const second = uniq[1] ? BRAND_COLORS[uniq[1]] : null
    const prim = first?.prim || '#1e40af'
    const sec = second?.prim || first?.sec || '#1d4ed8'
    return { prim, sec }
  }, [etablissements])

  return (
    <div
      className="min-h-screen"
      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${palette.prim} 10%, white), white 45%, color-mix(in srgb, ${palette.sec} 7%, white))` }}
    >
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Link to="/" className="text-sm text-blue-700 hover:underline">← Retour à l'accueil</Link>
        </div>
        <section className="bg-white/95 rounded-3xl border border-gray-100 shadow-xl p-4 sm:p-6 md:p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${palette.prim}, ${palette.sec})` }}>🧾</div>
            <div>
              <h1 className="font-black text-gray-900 text-xl leading-tight">Demande de facture proforma</h1>
              <p className="text-xs text-gray-500">Sans compte · Instantané · Gratuit</p>
            </div>
          </div>
          <FormulaireDemandeProforma formations={formations} etablissements={etablissements} />
        </section>
      </main>
    </div>
  )
}
