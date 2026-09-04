import { useEffect, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DashboardPage } from '../components/dashboard/DashboardChrome'
import { mediaUrl } from '../utils/mediaUrl'

/**
 * Gestion des flyers — admin établissement (et plateforme via AdminEtablissementDetail).
 * Association : filière (pas formation).
 */
export function TabFlyers({ etabId, filieres = [] }) {
  const [flyers, setFlyers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    debouches: '',
    filiere_id: '',
    fichier: null,
  })

  const load = () => {
    setLoading(true)
    axios
      .get(`/api/etablissements/${etabId}/flyers`)
      .then(({ data }) => setFlyers(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Impossible de charger les flyers.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (etabId) load()
  }, [etabId])

  const onFilierePick = (fid) => {
    const f = filieres.find((x) => String(x.id) === String(fid))
    setForm((p) => ({
      ...p,
      filiere_id: fid,
      titre: p.titre || f?.nom || '',
      description: p.description || f?.description || '',
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.fichier) {
      toast.error('Sélectionnez un fichier PDF ou image.')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('fichier', form.fichier)
      fd.append('titre', form.titre || 'Flyer')
      fd.append('description', form.description || '')
      fd.append('debouches', form.debouches || '')
      if (form.filiere_id) fd.append('filiere_id', form.filiere_id)
      const { data } = await axios.post(`/api/etablissements/${etabId}/flyers`, fd)
      setFlyers((prev) => [data, ...prev])
      setForm({ titre: '', description: '', debouches: '', filiere_id: '', fichier: null })
      toast.success('Flyer publié — téléchargeable sans connexion.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Retirer ce flyer ?')) return
    try {
      await axios.delete(`/api/etablissements/${etabId}/flyers/${id}`)
      setFlyers((prev) => prev.filter((f) => f.id !== id))
      toast.success('Flyer retiré.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
        Les flyers sont visibles sur la page publique de l&apos;établissement et téléchargeables
        <strong> sans compte</strong>. Associez une <strong>filière</strong> pour préremplir le titre et la
        description.
      </div>

      <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Ajouter un flyer</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold">Filière liée (optionnel)</label>
            <select
              className="input-field"
              value={form.filiere_id}
              onChange={(e) => onFilierePick(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {filieres.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Titre *</label>
            <input
              className="input-field"
              value={form.titre}
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
              required
              placeholder="Ex. Brochure Électrotechnique 2026"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Description</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Présentation affichée avec le flyer…"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Débouchés</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.debouches}
              onChange={(e) => setForm((p) => ({ ...p, debouches: e.target.value }))}
              placeholder="Métiers / secteurs…"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold">Fichier (PDF / image) *</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setForm((p) => ({ ...p, fichier: e.target.files?.[0] || null }))}
              className="block w-full text-sm"
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-40">
            {saving ? 'Publication…' : 'Publier le flyer'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />
        </div>
      ) : flyers.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun flyer pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {flyers.map((f) => (
            <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{f.titre}</p>
                {f.filiere_nom && (
                  <p className="mt-0.5 text-xs font-semibold text-indigo-700">Filière : {f.filiere_nom}</p>
                )}
                {f.description && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{f.description}</p>}
                {f.debouches && <p className="mt-1 text-xs text-slate-500 line-clamp-2">Débouchés : {f.debouches}</p>}
                <a
                  href={mediaUrl(f.file_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-blue-700 hover:underline"
                >
                  Télécharger / ouvrir
                </a>
              </div>
              <button type="button" onClick={() => handleDelete(f.id)} className="text-sm font-semibold text-red-600 hover:underline">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function StaffEtabFlyers() {
  const { user } = useAuth()
  const etabId = user?.etablissement_id
  const [filieres, setFilieres] = useState([])

  useEffect(() => {
    if (!etabId) return
    axios
      .get(`/api/etablissements/${etabId}/filieres`)
      .then(({ data }) => setFilieres(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [etabId])

  if (!etabId) {
    return (
      <DashboardPage>
        <p className="text-slate-500">Aucun établissement rattaché.</p>
      </DashboardPage>
    )
  }

  return (
    <DashboardPage maxWidthClass="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Flyers</h1>
          <p className="text-sm text-slate-500">Documents téléchargeables par le public sur la fiche établissement.</p>
        </div>
        <Link to="/mon-etablissement" className="text-sm font-semibold text-blue-700 hover:underline">
          ← Mon établissement
        </Link>
      </div>
      <TabFlyers etabId={etabId} filieres={filieres} />
    </DashboardPage>
  )
}
