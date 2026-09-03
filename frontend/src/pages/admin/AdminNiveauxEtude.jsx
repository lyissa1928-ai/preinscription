import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const EMPTY = { code: '', libelle: '', ordre: '100', actif: true }

export default function AdminNiveauxEtude() {
  const [niveaux, setNiveaux] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axios
      .get('/api/niveaux-etude?all=1')
      .then(({ data }) => setNiveaux(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || 'Impossible de charger les niveaux.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const up = (f) => (e) => {
    const val = f === 'actif' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [f]: val }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (n) => {
    setEditing(n)
    setForm({
      code: n.code || '',
      libelle: n.libelle || '',
      ordre: String(n.ordre ?? 100),
      actif: n.actif !== false,
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        code: form.code.trim() || undefined,
        libelle: form.libelle.trim(),
        ordre: parseInt(form.ordre, 10) || 0,
        actif: form.actif,
      }
      if (editing) {
        await axios.put(`/api/niveaux-etude/${editing.id}`, body)
        toast.success('Niveau modifié.')
      } else {
        await axios.post('/api/niveaux-etude', body)
        toast.success('Niveau créé.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActif = async (n) => {
    const next = n.actif === false
    try {
      await axios.patch(`/api/niveaux-etude/${n.id}/actif`, { actif: next })
      toast.success(next ? 'Niveau activé.' : 'Niveau désactivé.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handleDelete = async (n) => {
    if (!confirm(`Supprimer le niveau « ${n.libelle} » ?`)) return
    try {
      const { data } = await axios.delete(`/api/niveaux-etude/${n.id}`)
      toast.success(data.message || 'Niveau supprimé.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Niveaux d’étude</h1>
          <p className="text-sm text-gray-500">
            Référentiel utilisé pour les formations (présentiel et FAD).
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          + Nouveau niveau
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Chargement…</p>
        ) : niveaux.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Aucun niveau enregistré.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Ordre</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {niveaux.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 text-gray-500">{n.ordre}</td>
                  <td className="px-4 py-3 font-mono text-xs">{n.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{n.libelle}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        n.actif === false ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {n.actif === false ? 'Inactif' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => openEdit(n)} className="text-xs font-semibold text-indigo-700 hover:underline">
                        Modifier
                      </button>
                      <button type="button" onClick={() => toggleActif(n)} className="text-xs font-semibold text-slate-600 hover:underline">
                        {n.actif === false ? 'Activer' : 'Désactiver'}
                      </button>
                      <button type="button" onClick={() => handleDelete(n)} className="text-xs font-semibold text-red-600 hover:underline">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-bold text-gray-900">{editing ? 'Modifier le niveau' : 'Nouveau niveau'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl text-gray-400 hover:text-gray-700">
                ×
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Libellé *</label>
                <input className="input-field" value={form.libelle} onChange={up('libelle')} required placeholder="Ex: Licence 3" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Code</label>
                <input className="input-field" value={form.code} onChange={up('code')} placeholder="Auto si vide" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Ordre d’affichage</label>
                <input className="input-field" type="number" value={form.ordre} onChange={up('ordre')} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <input type="checkbox" className="h-4 w-4 rounded" checked={form.actif} onChange={up('actif')} />
                <span className="text-sm font-semibold text-gray-800">Niveau actif</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-40">
                  {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
