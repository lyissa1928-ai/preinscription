import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const EMPTY = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  adresse: '',
  date_naissance: '',
  mot_de_passe: '',
  mot_de_passe_confirmation: '',
}

export default function ResponsableFadAgents() {
  const { user } = useAuth()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    axios
      .get('/api/responsable-fad/agents')
      .then(({ data }) => setAgents(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err.response?.data?.message || 'Impossible de charger les agents FAD.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const up = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (a) => {
    setEditing(a)
    setForm({
      prenom: a.prenom || '',
      nom: a.nom || '',
      email: a.email || '',
      telephone: a.telephone || '',
      adresse: a.adresse || '',
      date_naissance: a.date_naissance ? String(a.date_naissance).slice(0, 10) : '',
      mot_de_passe: '',
      mot_de_passe_confirmation: '',
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!editing && form.mot_de_passe !== form.mot_de_passe_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (editing && form.mot_de_passe && form.mot_de_passe !== form.mot_de_passe_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const body = {
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          telephone: form.telephone,
          adresse: form.adresse,
          date_naissance: form.date_naissance || null,
        }
        if (form.mot_de_passe) body.mot_de_passe = form.mot_de_passe
        await axios.put(`/api/responsable-fad/agents/${editing.id}`, body)
        toast.success('Agent FAD modifié.')
      } else {
        await axios.post('/api/responsable-fad/agents', form)
        toast.success('Agent FAD créé.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActif = async (a) => {
    const next = a.actif === false
    try {
      await axios.patch(`/api/responsable-fad/agents/${a.id}/actif`, { actif: next })
      toast.success(next ? 'Agent réactivé.' : 'Agent suspendu.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handleDelete = async (a) => {
    if (!confirm(`Supprimer l’agent « ${a.prenom} ${a.nom} » ? Le compte sera désactivé.`)) return
    try {
      await axios.delete(`/api/responsable-fad/agents/${a.id}`)
      toast.success('Agent FAD supprimé.')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] w-full bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <Link to="/responsable" className="mb-6 inline-flex text-sm font-medium text-slate-500 hover:text-indigo-700">
          ← Dossiers FAD
        </Link>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agents FAD</h1>
            <p className="mt-1 text-sm text-slate-500">
              Créez et gérez les agents de formation à distance de votre établissement
              {user?.etablissement_nom ? ` (${user.etablissement_nom})` : ''}.
            </p>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            + Nouvel agent FAD
          </button>
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : agents.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">Aucun agent FAD pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Téléphone</th>
                    <th className="px-4 py-3 font-semibold">Matricule</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {a.prenom} {a.nom}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.email}</td>
                      <td className="px-4 py-3 text-slate-600">{a.telephone || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.matricule || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            a.actif === false
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {a.actif === false ? 'Suspendu' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={() => openEdit(a)} className="text-xs font-semibold text-indigo-700 hover:underline">
                            Modifier
                          </button>
                          <button type="button" onClick={() => toggleActif(a)} className="text-xs font-semibold text-slate-600 hover:underline">
                            {a.actif === false ? 'Réactiver' : 'Suspendre'}
                          </button>
                          <button type="button" onClick={() => handleDelete(a)} className="text-xs font-semibold text-red-600 hover:underline">
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? 'Modifier l’agent FAD' : 'Nouvel agent FAD'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-2xl text-slate-400 hover:text-slate-700" aria-label="Fermer">
                ×
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Prénom *</label>
                  <input className="input-field" value={form.prenom} onChange={up('prenom')} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Nom *</label>
                  <input className="input-field" value={form.nom} onChange={up('nom')} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Email *</label>
                <input className="input-field" type="email" value={form.email} onChange={up('email')} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone *</label>
                <input className="input-field" type="tel" value={form.telephone} onChange={up('telephone')} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse</label>
                <input className="input-field" value={form.adresse} onChange={up('adresse')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Date de naissance</label>
                <input className="input-field" type="date" value={form.date_naissance} onChange={up('date_naissance')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Mot de passe {editing ? '' : '*'}
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    value={form.mot_de_passe}
                    onChange={up('mot_de_passe')}
                    required={!editing}
                    minLength={6}
                    autoComplete="new-password"
                    placeholder={editing ? 'Laisser vide pour ne pas changer' : ''}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Confirmation {editing ? '' : '*'}</label>
                  <input
                    className="input-field"
                    type="password"
                    value={form.mot_de_passe_confirmation}
                    onChange={up('mot_de_passe_confirmation')}
                    required={!editing || !!form.mot_de_passe}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              {!editing && (
                <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Première connexion : changement de mot de passe obligatoire.
                </p>
              )}
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
    </main>
  )
}
