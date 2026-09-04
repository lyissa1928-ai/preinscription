import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NATIONALITES_SUGGESTIONS_FR } from '../../data/nationalites'
import { DashboardPage, DashboardHero, Panel } from '../../components/dashboard/DashboardChrome'
import { normalizeTypeDocument, titreTypeDocument, isFactureDefinitive } from '../../utils/factureTypeDocument'
import IdentiteBeneficiaireProforma from '../../components/proforma/IdentiteBeneficiaireProforma'

const DIPLOMES = [
  'Baccalauréat',
  'Baccalauréat série S (scientifique)',
  'BFEM / Brevet des collèges',
  'Niveau 3ème',
  'Niveau Terminale (non bachelier)',
  'BTS',
  'DUT',
  'Licence',
  'Master',
  'Autre',
]
const MENTIONS = ['Très Bien', 'Bien', 'Assez Bien', 'Passable']
const ANNEES = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0)

const EMPTY = {
  prenom: '',
  nom: '',
  sexe: '',
  date_naissance: '',
  lieu_naissance: '',
  nationalite: '',
  pays_residence: '',
  adresse: '',
  telephone: '',
  email: '',
  type_piece: '',
  numero_piece: '',
  numero_passeport: '',
  dernier_diplome: '',
  etablissement_origine: '',
  annee_obtention: '',
  mention: '',
  annee_academique: '2025-2026',
  type_payeur: 'etudiant',
  destinataire: '',
}

/**
 * Accueil scolarité : mode → formation → bénéficiaire → documents.
 */
export default function StaffPreinscriptionGuichet() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const natureFacture = normalizeTypeDocument(searchParams.get('nature'))
  const isProforma = !isFactureDefinitive(natureFacture)
  const isAdmin = user?.role === 'admin'
  const isFadStaff = user?.role === 'responsable_fad' || user?.role === 'agent_fad'
  const isPresentielStaff = user?.role === 'responsable'
  const [etablissements, setEtablissements] = useState([])
  const [etabId, setEtabId] = useState(isAdmin ? '' : user?.etablissement_id ?? '')
  const [modeFormation, setModeFormation] = useState(
    isFadStaff ? 'en_ligne' : isPresentielStaff ? 'presentiel' : '',
  ) // presentiel | en_ligne
  const [allFormations, setAllFormations] = useState([])
  const [niveauFilter, setNiveauFilter] = useState('')
  const [formationId, setFormationId] = useState('')
  const [tarif, setTarif] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    axios.get('/api/etablissements').then(({ data }) => {
      setEtablissements((data || []).filter((e) => e.actif !== false))
    }).catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (!etabId) {
      setAllFormations([])
      if (!isFadStaff && !isPresentielStaff) setModeFormation('')
      setNiveauFilter('')
      setFormationId('')
      setTarif(null)
      return
    }
    if (isFadStaff) setModeFormation('en_ligne')
    else if (isPresentielStaff) setModeFormation('presentiel')
    axios
      .get(`/api/formations?etablissement_id=${etabId}`)
      .then(({ data }) => {
        let list = (data || []).filter((f) => f.actif !== false)
        if (isFadStaff) list = list.filter((f) => f.type === 'en_ligne')
        else if (isPresentielStaff) list = list.filter((f) => f.type !== 'en_ligne')
        setAllFormations(list)
      })
      .catch(() => setAllFormations([]))
    setNiveauFilter('')
    setFormationId('')
    setTarif(null)
  }, [etabId, isFadStaff, isPresentielStaff])

  const formationsDuMode = useMemo(() => {
    if (!modeFormation) return []
    return allFormations.filter((f) => {
      const t = f.type === 'en_ligne' ? 'en_ligne' : 'presentiel'
      return t === modeFormation
    })
  }, [allFormations, modeFormation])

  const niveaux = useMemo(() => {
    const set = new Set(formationsDuMode.map((f) => f.niveau).filter(Boolean))
    return [...set].sort((a, b) => String(a).localeCompare(String(b), 'fr'))
  }, [formationsDuMode])

  const formationsFiltrees = useMemo(() => {
    if (!niveauFilter) return formationsDuMode
    return formationsDuMode.filter((f) => String(f.niveau || '') === String(niveauFilter))
  }, [formationsDuMode, niveauFilter])

  useEffect(() => {
    setNiveauFilter('')
    setFormationId('')
    setTarif(null)
  }, [modeFormation])

  useEffect(() => {
    if (!formationId) return
    const stillVisible = formationsFiltrees.some((f) => String(f.id) === String(formationId))
    if (!stillVisible) {
      setFormationId('')
      setTarif(null)
    }
  }, [formationsFiltrees, formationId])

  useEffect(() => {
    if (!formationId) {
      setTarif(null)
      return
    }
    axios
      .get(`/api/responsable/formations/${formationId}/tarif`)
      .then(({ data }) => setTarif(data.tarif))
      .catch(() => setTarif(null))
  }, [formationId])

  const formation = useMemo(
    () => formationsFiltrees.find((f) => String(f.id) === String(formationId)),
    [formationsFiltrees, formationId],
  )

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const enregistrer = async () => {
    if (!modeFormation) {
      toast.error('Choisissez le mode de formation (présentiel ou en ligne).')
      return
    }
    if (!formationId) {
      toast.error('Choisissez une formation.')
      return
    }
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast.error('Nom et prénom obligatoires.')
      return
    }
    if (!form.telephone.trim()) {
      toast.error('Téléphone obligatoire.')
      return
    }
    if (isProforma && form.type_payeur === 'organisation' && !form.destinataire.trim()) {
      toast.error('Indiquez le destinataire (entreprise, État ou organisation).')
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post('/api/responsable/dossiers/guichet', {
        ...form,
        formation_id: Number(formationId),
        numero_passeport: form.numero_passeport || form.numero_piece,
        type_document: natureFacture,
        nature: natureFacture,
        type_payeur: isProforma ? form.type_payeur : 'etudiant',
        payeur_org_nom: isProforma && form.type_payeur === 'organisation' ? form.destinataire.trim() : '',
        destinataire: isProforma && form.type_payeur === 'organisation' ? form.destinataire.trim() : '',
      })
      setResult(data)
      toast.success(data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  const nouvelleSaisie = () => {
    setResult(null)
    setForm(EMPTY)
    setModeFormation('')
    setNiveauFilter('')
    setFormationId('')
    setTarif(null)
  }

  if (result?.dossier) {
    const d = result.dossier
    const facture = result.facture
    const titreDoc = titreTypeDocument(facture?.type_document || natureFacture, { uppercase: false })
    return (
      <DashboardPage>
        <DashboardHero
          eyebrow="Accueil scolarité"
          title="Préinscription enregistrée"
          subtitle={`${d.prenom} ${d.nom} · ${d.numero_dossier}`}
        />
        <Panel title="Documents à remettre" bodyClassName="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Une seule saisie. Les documents s’appuient sur ce dossier
            {result.reused ? ' (déjà existant — aucun doublon créé).' : '.'}
            {' '}Téléchargez la facture, l’attestation ou la lettre depuis les liens ci-dessous.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to={`/facture/${d.id}`} target="_blank" className="btn-primary text-center">
              {titreDoc}
            </Link>
            <Link to={`/attestation/${d.id}`} target="_blank" className="btn-outline text-center">
              Attestation de préinscription
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Pas de lettre de préinscription pour une saisie au guichet (visiteur). La lettre est réservée aux candidats étrangers acceptés en ligne.
          </p>
          {facture?.numero && (
            <p className="text-xs text-slate-500">
              {titreDoc} {facture.numero} · Total {fmt(facture.montant_ttc)} FCFA (tarif catalogue)
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to="/mon-etablissement/factures" className="btn-secondary text-sm">
              Historique des factures
            </Link>
            <button type="button" className="btn-secondary text-sm" onClick={nouvelleSaisie}>
              Nouvelle préinscription
            </button>
          </div>
        </Panel>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage>
      <DashboardHero
        eyebrow="Accueil scolarité"
        title={`Préinscription & ${titreTypeDocument(natureFacture, { uppercase: false }).toLowerCase()}`}
        subtitle="Mode → formation → bénéficiaire → générer → télécharger → archiver."
      />

      <div className="space-y-6">
        <Panel title="1. Mode de formation" bodyClassName="p-6 space-y-4">
          {isAdmin && (
            <div>
              <label className="mb-1 block text-sm font-semibold">Établissement *</label>
              <select className="input-field max-w-xl" value={etabId} onChange={(e) => setEtabId(e.target.value)}>
                <option value="">— Choisir —</option>
                {etablissements.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </div>
          )}
          {!isAdmin && user?.etablissement_nom && (
            <p className="text-sm text-slate-600">
              Établissement : <strong>{user.etablissement_nom}</strong> — seules ses formations sont proposées.
            </p>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">
              {isFadStaff ? 'Mode FAD (formations à distance uniquement)' : isPresentielStaff ? 'Mode présentiel' : 'Choisissez le mode *'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {!isFadStaff && (
              <button
                type="button"
                disabled={!etabId || isPresentielStaff}
                onClick={() => setModeFormation('presentiel')}
                className={`rounded-xl border-2 px-4 py-4 text-left transition ${
                  modeFormation === 'presentiel'
                    ? 'border-[color:var(--etab-primary,#1e40af)] bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } disabled:opacity-50`}
              >
                <span className="block text-base font-bold text-slate-900">Formation en présentiel</span>
                <span className="mt-1 block text-xs text-slate-500">Cours sur site</span>
              </button>
              )}
              {!isPresentielStaff && (
              <button
                type="button"
                disabled={!etabId || isFadStaff}
                onClick={() => setModeFormation('en_ligne')}
                className={`rounded-xl border-2 px-4 py-4 text-left transition ${
                  modeFormation === 'en_ligne'
                    ? 'border-[color:var(--etab-primary,#1e40af)] bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } disabled:opacity-50`}
              >
                <span className="block text-base font-bold text-slate-900">Formation en ligne</span>
                <span className="mt-1 block text-xs text-slate-500">Formation à distance (FAD)</span>
              </button>
              )}
            </div>
          </div>
        </Panel>

        {modeFormation && (
          <Panel title="2. Formation et tarif (catalogue de votre établissement)" bodyClassName="p-6 space-y-4">
            {niveaux.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-semibold">Niveau (optionnel)</label>
                <select
                  className="input-field max-w-md"
                  value={niveauFilter}
                  onChange={(e) => setNiveauFilter(e.target.value)}
                >
                  <option value="">Tous les niveaux</option>
                  {niveaux.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-semibold">Formation *</label>
              <select
                className="input-field"
                value={formationId}
                onChange={(e) => setFormationId(e.target.value)}
              >
                <option value="">— Choisir —</option>
                {formationsFiltrees.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titre}{f.niveau ? ` · ${f.niveau}` : ''}
                  </option>
                ))}
              </select>
              {formationsFiltrees.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  Aucune formation {modeFormation === 'en_ligne' ? 'en ligne' : 'présentielle'} active pour cet établissement.
                </p>
              )}
            </div>
            {formation && (
              <p className="text-sm text-slate-600">
                Niveau : <strong>{formation.niveau || '—'}</strong>
                {formation.niveau_requis ? ` · Accès : ${formation.niveau_requis}` : ''}
                {formation.duree ? ` · Durée : ${formation.duree}` : ''}
              </p>
            )}
            {tarif && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-800">Tarif récupéré automatiquement (non modifiable)</p>
                <ul className="mt-2 space-y-1 text-slate-700">
                  {tarif.lignes?.map((l) => (
                    <li key={l.designation}>{l.designation} — <strong>{fmt(l.montant)} FCFA</strong></li>
                  ))}
                  <li>Total forfait : <strong>{fmt(tarif.prix_annuel)} FCFA</strong></li>
                </ul>
              </div>
            )}
          </Panel>
        )}

        <Panel title="3. Identité du bénéficiaire" bodyClassName="p-6">
          {isProforma ? (
            <IdentiteBeneficiaireProforma form={form} up={up} />
          ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Prénom(s) *</label>
              <input className="input-field" value={form.prenom} onChange={up('prenom')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Nom *</label>
              <input className="input-field" value={form.nom} onChange={up('nom')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Sexe</label>
              <select className="input-field" value={form.sexe} onChange={up('sexe')}>
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Date de naissance</label>
              <input type="date" className="input-field" value={form.date_naissance} onChange={up('date_naissance')} />
              <p className="mt-1 text-xs text-slate-500">Facultatif</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Lieu de naissance</label>
              <input className="input-field" value={form.lieu_naissance} onChange={up('lieu_naissance')} />
              <p className="mt-1 text-xs text-slate-500">Facultatif</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Nationalité *</label>
              <input
                className="input-field"
                list="nat-guichet"
                value={form.nationalite}
                onChange={up('nationalite')}
              />
              <datalist id="nat-guichet">
                {NATIONALITES_SUGGESTIONS_FR.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Pays de résidence</label>
              <input className="input-field" value={form.pays_residence} onChange={up('pays_residence')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Téléphone *</label>
              <input className="input-field" value={form.telephone} onChange={up('telephone')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">E-mail</label>
              <input type="email" className="input-field" value={form.email} onChange={up('email')} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold">Adresse *</label>
              <textarea className="input-field min-h-[72px]" value={form.adresse} onChange={up('adresse')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Type de pièce</label>
              <select className="input-field" value={form.type_piece} onChange={up('type_piece')}>
                <option value="">—</option>
                <option value="CNI">CNI</option>
                <option value="passeport">Passeport</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">N° pièce / passeport</label>
              <input
                className="input-field font-mono text-sm"
                value={form.numero_piece || form.numero_passeport}
                onChange={(e) => setForm((f) => ({ ...f, numero_piece: e.target.value, numero_passeport: e.target.value }))}
              />
            </div>
          </div>
          )}
        </Panel>

        {!isProforma && (
        <Panel title="4. Parcours académique" bodyClassName="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Année académique *</label>
              <input className="input-field" value={form.annee_academique} onChange={up('annee_academique')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Dernier diplôme *</label>
              <select className="input-field" value={form.dernier_diplome} onChange={up('dernier_diplome')}>
                <option value="">—</option>
                {DIPLOMES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Année d’obtention *</label>
              <select className="input-field" value={form.annee_obtention} onChange={up('annee_obtention')}>
                <option value="">—</option>
                {ANNEES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Établissement d’origine *</label>
              <input className="input-field" value={form.etablissement_origine} onChange={up('etablissement_origine')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Mention</label>
              <select className="input-field" value={form.mention} onChange={up('mention')}>
                <option value="">—</option>
                {MENTIONS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </Panel>
        )}

        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={enregistrer} disabled={saving || !formationId}>
            {saving
              ? 'Enregistrement…'
              : isProforma
                ? 'Générer la facture proforma'
                : 'Générer la facture et l’attestation'}
          </button>
        </div>
      </div>
    </DashboardPage>
  )
}
