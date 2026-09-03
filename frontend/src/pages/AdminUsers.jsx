import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { mediaUrl } from '../utils/mediaUrl'

const ROLES_STAFF = [
  { val: 'admin', label: 'Administrateur (plateforme)' },
  { val: 'admin_etablissement', label: 'Administrateur établissement' },
  { val: 'responsable', label: 'Responsable pédagogique' },
  { val: 'responsable_fad', label: 'Responsable FAD (formations à distance)' },
  { val: 'agent_admin', label: 'Agent administratif' },
  { val: 'comptable', label: 'Comptable / Finance' },
  { val: 'controleur_qualite', label: 'Contrôleur qualité' },
]

const ROLE_COLORS = {
  admin:       'bg-red-100 text-red-700',
  admin_etablissement: 'bg-blue-100 text-blue-800',
  responsable: 'bg-teal-100 text-teal-700',
  responsable_fad: 'bg-indigo-100 text-indigo-700',
  agent_admin: 'bg-orange-100 text-orange-700',
  comptable:   'bg-purple-100 text-purple-700',
  controleur_qualite: 'bg-cyan-100 text-cyan-800',
  etudiant:    'bg-gray-100 text-gray-700'
}
const ROLE_LABELS = {
  admin: 'Administrateur', admin_etablissement: 'Admin. établissement', responsable: 'Resp. Pédagogique',
  responsable_fad: 'Responsable FAD',
  agent_admin: 'Agent Administratif', comptable: 'Comptable',
  controleur_qualite: 'Contrôleur qualité', etudiant: 'Étudiant'
}

function RoleBadge({ role }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-700'}`}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

const EMPTY_FORM = {
  prenom: '', nom: '', email: '', telephone: '', adresse: '',
  mot_de_passe: '', mot_de_passe_confirmation: '', role: 'responsable', etablissement_id: '',
}

function normMat(m) {
  return String(m || '').trim().toUpperCase()
}

export default function AdminUsers() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isSelectableUser = (u) => !(u.role === 'admin' && u.id === user?.id)
  const [users, setUsers] = useState([])
  const [etablissements, setEtablissements] = useState([])
  const [filtreRole, setFiltreRole] = useState('staff')
  const [filtreEtab, setFiltreEtab] = useState('all')   // 'all' | etablissement_id
  const [recherche, setRecherche] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })

  // Sélection
  const [selected, setSelected] = useState(new Set())

  // Création
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Édition
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Confirmation suppression
  const [deleteTarget, setDeleteTarget] = useState(null)       // { ids: [], label: '', matricule, email }
  const [deleteMatriculeInput, setDeleteMatriculeInput] = useState('')
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [bulkAction, setBulkAction] = useState(null)           // 'desactiver' | 'reactiver' | 'supprimer'
  const [bulkPhrase, setBulkPhrase] = useState('')
  const [resetResult, setResetResult] = useState(null)         // { label, password }

  const loadUsers = (role = filtreRole, targetPage = page) => {
    setLoading(true)
    setSelected(new Set())
    axios.get('/api/admin/utilisateurs', {
      params: {
        role,
        page: targetPage,
        limit: 25,
        search: recherche || undefined,
        etablissement_id: filtreEtab !== 'all' ? filtreEtab : undefined,
      },
    })
      .then(({ data }) => {
        // Rétrocompatibilité: backend ancien => tableau direct
        if (Array.isArray(data)) {
          setUsers(data)
          setPagination({ total: data.length, page: 1, limit: data.length || 1, totalPages: 1 })
          setPage(1)
          return
        }
        setUsers(data.items || [])
        setPagination(data.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 })
        setPage(targetPage)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    axios.get('/api/etablissements')
      .then(({ data }) => setEtablissements(data.filter(e => e.actif !== false)))
      .catch(() => {})
  }, [])

  useEffect(() => { loadUsers(filtreRole, 1) }, [filtreRole, filtreEtab])

  useEffect(() => {
    const t = setTimeout(() => loadUsers(filtreRole, 1), 250)
    return () => clearTimeout(t)
  }, [recherche])

  /* ── Filtrage local ── */
  const usersFiltres = useMemo(() => users, [users])

  /* ── Sélection ── */
  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    const selectables = usersFiltres.filter(isSelectableUser).map(u => u.id)
    if (selectables.every(id => selected.has(id))) {
      setSelected(prev => { const next = new Set(prev); selectables.forEach(id => next.delete(id)); return next })
    } else {
      setSelected(prev => { const next = new Set(prev); selectables.forEach(id => next.add(id)); return next })
    }
  }
  const allSelected = usersFiltres.filter(isSelectableUser).every(u => selected.has(u.id))
    && usersFiltres.filter(isSelectableUser).length > 0
  const selectedIds = [...selected]

  /* ── Création ── */
  const handleCreate = async (e) => {
    e.preventDefault()
    if (createForm.mot_de_passe !== createForm.mot_de_passe_confirmation) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (createForm.role !== 'admin' && !createForm.etablissement_id) {
      toast.error('Sélectionnez un établissement pour ce rôle.')
      return
    }
    setSaving(true)
    try {
      const { data } = await axios.post('/api/admin/utilisateurs', {
        ...createForm,
        etablissement_id: createForm.role === 'admin' ? null : createForm.etablissement_id,
      })
      const mat = data.utilisateur?.matricule
      toast.success(mat ? `Compte créé. Matricule : ${mat}` : 'Compte créé.')
      setShowCreate(false)
      setCreateForm(EMPTY_FORM)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setSaving(false) }
  }

  /* ── Édition ── */
  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({
      prenom: u.prenom, nom: u.nom, email: u.email, role: u.role,
      etablissement_id: u.etablissement_id || '', mot_de_passe: '',
      telephone: u.telephone || '', adresse: u.adresse || '',
    })
  }
  const handleEdit = async (e) => {
    e.preventDefault()
    if (
      editForm.role !== 'admin' &&
      editForm.role !== 'etudiant' &&
      ['admin_etablissement', 'responsable', 'agent_admin', 'comptable', 'controleur_qualite'].includes(editForm.role) &&
      !editForm.etablissement_id
    ) {
      toast.error('Indiquez un établissement pour ce rôle.')
      return
    }
    setEditSaving(true)
    try {
      const payload = { ...editForm }
      if (payload.role === 'admin') payload.etablissement_id = null
      if (!payload.mot_de_passe) delete payload.mot_de_passe
      await axios.put(`/api/admin/utilisateurs/${editUser.id}`, payload)
      const etabChanged = String(editForm.etablissement_id || '') !== String(editUser.etablissement_id || '')
      toast.success(
        etabChanged && editForm.etablissement_id
          ? 'Utilisateur modifié. Matricule régénéré selon le nouvel établissement.'
          : 'Utilisateur modifié.'
      )
      setEditUser(null)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    } finally { setEditSaving(false) }
  }

  /* ── Toggle actif individuel ── */
  const handleResetPassword = async (u) => {
    if (!window.confirm(`Réinitialiser le mot de passe de ${u.prenom} ${u.nom} ? Un mot de passe temporaire sera affiché une seule fois.`)) return
    try {
      const { data } = await axios.post(`/api/admin/utilisateurs/${u.id}/reinitialiser-mot-de-passe`)
      setResetResult({
        label: `${u.prenom} ${u.nom}`,
        password: data.mot_de_passe_temporaire,
      })
      toast.success(data.message || 'Mot de passe réinitialisé.')
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur.')
    }
  }

  const handleToggleActif = async (u) => {
    try {
      await axios.put(`/api/admin/utilisateurs/${u.id}`, { actif: u.actif === false })
      toast.success(u.actif === false ? 'Compte réactivé.' : 'Compte désactivé.')
      loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.') }
  }

  /* ── Suppression individuelle ── */
  const confirmDelete = (u) => {
    setDeleteMatriculeInput('')
    setDeleteEmailInput('')
    setDeleteTarget({
      ids: [u.id],
      label: `${u.prenom} ${u.nom}`,
      matricule: u.matricule || '',
      email: u.email || '',
    })
  }

  /* ── Exécuter suppression ── */
  const handleDeleteConfirm = async () => {
    try {
      const id = deleteTarget.ids[0]
      await axios.delete(`/api/admin/utilisateurs/${id}/supprimer`, {
        data: {
          confirmation_matricule: deleteMatriculeInput.trim(),
          confirmation_email: deleteEmailInput.trim(),
        },
      })
      toast.success('Compte supprimé.')
      setDeleteTarget(null)
      setDeleteMatriculeInput('')
      setDeleteEmailInput('')
      setSelected(new Set())
      loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.') }
  }

  /* ── Actions par lot ── */
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return
    try {
      const payload = { ids: selectedIds, action }
      if (action === 'supprimer') payload.confirmation_bulk = bulkPhrase.trim()
      const { data } = await axios.post('/api/admin/utilisateurs/bulk-action', payload)
      toast.success(data.message)
      setBulkAction(null)
      setBulkPhrase('')
      setSelected(new Set())
      loadUsers()
    } catch (err) { toast.error(err.response?.data?.message || 'Erreur.') }
  }

  const upCreate = (f) => (e) => {
    const v = e.target.value
    setCreateForm((p) => {
      if (f === 'role' && v === 'admin') return { ...p, role: v, etablissement_id: '' }
      return { ...p, [f]: v }
    })
  }
  const upEdit = (f) => (e) => {
    const v = e.target.value
    setEditForm((p) => {
      if (f === 'role' && v === 'admin') return { ...p, role: v, etablissement_id: '' }
      return { ...p, [f]: v }
    })
  }

  /* ── Grouper par établissement (pour affichage) ── */
  const grouped = useMemo(() => {
    if (filtreEtab !== 'all') return null // pas de groupement si filtre actif
    const groups = {}
    usersFiltres.forEach(u => {
      const key = u.etablissement_id ? String(u.etablissement_id) : '__aucun__'
      if (!groups[key]) groups[key] = { nom: u.etablissement_nom || (u.role === 'admin' ? 'Administrateurs' : 'Sans établissement'), users: [] }
      groups[key].users.push(u)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === '__aucun__') return 1
      return (groups[a].nom || '').localeCompare(groups[b].nom || '')
    })
  }, [usersFiltres, filtreEtab])

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-8 w-full">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <Link to="/admin" className="text-sm text-gray-400 hover:text-blue-700">← Administration</Link>
            <h1 className="text-3xl font-bold text-gray-800 mt-1">Gestion des utilisateurs</h1>
            <p className="text-gray-500 mt-0.5">{pagination.total} compte{pagination.total !== 1 ? 's' : ''} · {etablissements.length} établissement{etablissements.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              + Créer un compte staff
            </button>
          )}
        </div>

        {/* Barre de filtres */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
          {/* Filtre rôle */}
          <div className="flex flex-wrap gap-2">
            {[
              { val: 'staff', label: '👥 Staff' },
              { val: 'etudiant', label: '🎓 Étudiants' },
              { val: 'all', label: '📋 Tous' }
            ].map(f => (
              <button key={f.val} onClick={() => { setFiltreRole(f.val); setFiltreEtab('all'); setRecherche('') }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filtreRole === f.val ? 'bg-blue-700 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Filtre par établissement */}
            <button onClick={() => setFiltreEtab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filtreEtab === 'all' ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
              Tous les établissements
            </button>
            {etablissements.map(e => (
              <button key={e.id} onClick={() => setFiltreEtab(String(e.id))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${filtreEtab === String(e.id) ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                style={filtreEtab === String(e.id) ? { background: e.couleur_primaire || '#1e40af' } : {}}>
                {e.nom}
              </button>
            ))}

            {/* Recherche */}
            <div className="ml-auto flex-shrink-0">
              <input
                type="text"
                placeholder="Nom, email, matricule…"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                className="input-field text-sm py-1.5 w-48"
              />
            </div>
          </div>
        </div>

        {/* Barre d'actions par lot */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-bold text-blue-800">{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setBulkAction('desactiver')}
                className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors">
                ⏸ Désactiver tout
              </button>
              <button onClick={() => setBulkAction('reactiver')}
                className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
                ✅ Réactiver tout
              </button>
              {isAdmin && (
                <button onClick={() => { setBulkPhrase(''); setBulkAction('supprimer') }}
                  className="text-xs font-bold px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors">
                  🗑 Supprimer tout
                </button>
              )}
            </div>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-blue-500 hover:text-blue-700">
              Annuler
            </button>
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-700 border-t-transparent" />
          </div>
        ) : usersFiltres.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">Aucun utilisateur trouvé.</div>
        ) : grouped ? (
          /* ── Vue groupée par établissement ── */
          <div className="space-y-6">
            {grouped.map(([key, group]) => {
              const etab = etablissements.find(e => String(e.id) === key)
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* En-tête groupe */}
                  <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100"
                    style={{ background: etab ? `linear-gradient(135deg, ${etab.couleur_primaire}15, ${etab.couleur_secondaire || etab.couleur_primaire}08)` : '#f9fafb' }}>
                    {etab?.logo_url
                      ? <img src={mediaUrl(etab.logo_url)} alt="" className="w-7 h-7 rounded-lg object-contain bg-white border border-gray-200 p-0.5" />
                      : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
                          style={{ background: etab?.couleur_primaire || '#6b7280' }}>
                          {group.nom[0]}
                        </div>}
                    <span className="font-black text-gray-900 text-sm">{group.nom}</span>
                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                      {group.users.length} compte{group.users.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <UserTable
                    users={group.users}
                    selected={selected}
                    currentUserId={user?.id}
                    allSelected={group.users.filter(isSelectableUser).every(u => selected.has(u.id)) && group.users.filter(isSelectableUser).length > 0}
                    onToggleAll={() => {
                      const ids = group.users.filter(isSelectableUser).map(u => u.id)
                      const allSel = ids.every(id => selected.has(id))
                      setSelected(prev => {
                        const next = new Set(prev)
                        ids.forEach(id => allSel ? next.delete(id) : next.add(id))
                        return next
                      })
                    }}
                    onToggleOne={toggleOne}
                    onEdit={openEdit}
                    onToggleActif={handleToggleActif}
                    onDelete={confirmDelete}
                    onResetPassword={handleResetPassword}
                    canDeletePermanently={isAdmin}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Vue filtrée simple ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <UserTable
              users={usersFiltres}
              selected={selected}
              currentUserId={user?.id}
              allSelected={allSelected}
              onToggleAll={toggleAll}
              onToggleOne={toggleOne}
              onEdit={openEdit}
              onToggleActif={handleToggleActif}
              onDelete={confirmDelete}
              onResetPassword={handleResetPassword}
              canDeletePermanently={isAdmin}
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={loading || page <= 1}
            onClick={() => loadUsers(filtreRole, page - 1)}
          >
            Précédent
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</span>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={loading || page >= pagination.totalPages}
            onClick={() => loadUsers(filtreRole, page + 1)}
          >
            Suivant
          </button>
        </div>
      </main>

      {/* ── Modal Création ── */}
      {showCreate && (
        <Modal title="Créer un compte staff" onClose={() => setShowCreate(false)} maxWidthClass="max-w-lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required><input className="input-field" value={createForm.prenom} onChange={upCreate('prenom')} required /></Field>
              <Field label="Nom" required><input className="input-field" value={createForm.nom} onChange={upCreate('nom')} required /></Field>
            </div>
            <p className="text-xs text-gray-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              {createForm.role === 'admin' ? (
                <>
                  Le <strong>matricule</strong> sera du type <span className="font-mono">DIR001</span> (administrateur global, sans rattachement à un établissement).
                </>
              ) : (
                <>
                  Le <strong>matricule</strong> sera généré automatiquement : 3 lettres (nom de l’établissement choisi) + 3 chiffres (ex.{' '}
                  <span className="font-mono">UNI001</span>).
                </>
              )}
            </p>
            <Field label="Email" required><input type="email" className="input-field" value={createForm.email} onChange={upCreate('email')} required /></Field>
            <Field label="Téléphone" required note="unique (8 chiffres min., espaces et + ignorés)">
              <input type="tel" className="input-field" value={createForm.telephone} onChange={upCreate('telephone')} required />
            </Field>
            <Field label="Adresse" note="recommandé">
              <input className="input-field" value={createForm.adresse} onChange={upCreate('adresse')} placeholder="Optionnel" />
            </Field>
            <Field label="Mot de passe" required><input type="password" className="input-field" value={createForm.mot_de_passe} onChange={upCreate('mot_de_passe')} required minLength={6} /></Field>
            <Field label="Confirmer le mot de passe" required>
              <input type="password" className="input-field" value={createForm.mot_de_passe_confirmation} onChange={upCreate('mot_de_passe_confirmation')} required minLength={6} />
            </Field>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Le compte sera créé avec un mot de passe provisoire : l’utilisateur devra le changer à la première connexion.
            </p>
            <Field label="Rôle" required>
              <select className="input-field" value={createForm.role} onChange={upCreate('role')} required>
                {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </Field>
            {createForm.role === 'admin' ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-3 text-sm text-blue-900">
                <p className="font-semibold">Administrateur — plateforme</p>
                <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                  Aucun établissement à choisir : accès global à la configuration, aux comptes et aux données métier. Vous pouvez créer d’autres administrateurs ; le dernier compte admin actif ne peut pas être supprimé ni retiré de son rôle.
                </p>
              </div>
            ) : (
              <Field label="Établissement" required>
                <select className="input-field" value={createForm.etablissement_id} onChange={upCreate('etablissement_id')} required>
                  <option value="">-- Sélectionner --</option>
                  {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Ce compte ne voit que les données de cet établissement.</p>
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                {saving ? <Spinner /> : 'Créer le compte'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal Édition ── */}
      {editUser && (
        <Modal title={`Modifier — ${editUser.prenom} ${editUser.nom}`} onClose={() => setEditUser(null)} maxWidthClass="max-w-lg">
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="text-sm bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <span className="text-gray-500">Matricule actuel :</span>{' '}
              <span className="font-mono font-semibold text-gray-900">{editUser.matricule || '—'}</span>
              <p className="text-xs text-gray-500 mt-1">Attribué automatiquement à la création. Il est recalculé si vous changez l’établissement.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" required><input className="input-field" value={editForm.prenom} onChange={upEdit('prenom')} required /></Field>
              <Field label="Nom" required><input className="input-field" value={editForm.nom} onChange={upEdit('nom')} required /></Field>
            </div>
            <Field label="Email" required><input type="email" className="input-field" value={editForm.email} onChange={upEdit('email')} required /></Field>
            <Field label="Téléphone" note="unique par compte ; laisser vide si inconnu (comptes anciens)">
              <input type="tel" className="input-field" value={editForm.telephone} onChange={upEdit('telephone')} placeholder="8 chiffres minimum si renseigné" />
            </Field>
            <Field label="Adresse" note="recommandé">
              <input className="input-field" value={editForm.adresse} onChange={upEdit('adresse')} placeholder="Optionnel" />
            </Field>
            <Field label="Nouveau mot de passe" note="laisser vide pour ne pas changer">
              <input type="password" className="input-field" value={editForm.mot_de_passe} onChange={upEdit('mot_de_passe')} minLength={6} placeholder="••••••" />
            </Field>
            <Field label="Rôle" required>
              <select className="input-field" value={editForm.role} onChange={upEdit('role')} required>
                {editUser.role === 'etudiant' && <option value="etudiant">Étudiant</option>}
                {ROLES_STAFF.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
              </select>
            </Field>
            {editForm.role === 'admin' ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-3 py-3 text-sm text-blue-900">
                <p className="font-semibold">Rattachement établissement</p>
                <p className="text-xs text-blue-800/90 mt-1">
                  Compte administrateur global : <strong>aucun établissement</strong>. Pour rattacher ce compte à une école, changez le rôle vers Responsable, Agent ou Comptable puis choisissez l’établissement.
                </p>
              </div>
            ) : (
              <Field label="Établissement" required={editForm.role !== 'etudiant'}>
                <select
                  className="input-field"
                  value={editForm.etablissement_id}
                  onChange={upEdit('etablissement_id')}
                  required={editForm.role !== 'etudiant'}
                >
                  <option value="">-- {editForm.role === 'etudiant' ? 'Aucun' : 'Sélectionner'} --</option>
                  {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={editSaving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                {editSaving ? <Spinner /> : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirmation suppression individuelle (matricule) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-5xl text-center mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">Supprimer définitivement ?</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Le compte de <strong>{deleteTarget.label}</strong> sera supprimé de façon permanente.
            </p>
            {deleteTarget.matricule ? (
              <>
                <p className="text-xs text-gray-500 mb-2">
                  Pour confirmer, saisissez le <strong>matricule exact</strong> du compte :
                </p>
                <p className="font-mono text-sm font-bold text-gray-900 bg-gray-100 rounded-lg px-3 py-2 mb-3 text-center">
                  {deleteTarget.matricule}
                </p>
                <input
                  type="text"
                  className="input-field font-mono uppercase mb-4"
                  placeholder="Matricule"
                  value={deleteMatriculeInput}
                  onChange={e => setDeleteMatriculeInput(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
              </>
            ) : deleteTarget.email ? (
              <>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  Ce compte n’a pas de matricule. Confirmez la suppression en saisissant l’<strong>email du compte</strong> (identique à celui affiché dans la liste).
                </p>
                <p className="text-xs text-gray-500 mb-2">Email attendu :</p>
                <p className="font-mono text-xs font-semibold text-gray-900 bg-gray-100 rounded-lg px-3 py-2 mb-3 break-all text-center">
                  {deleteTarget.email}
                </p>
                <input
                  type="email"
                  className="input-field mb-4"
                  placeholder="Recopiez l’email"
                  value={deleteEmailInput}
                  onChange={e => setDeleteEmailInput(e.target.value)}
                  autoComplete="off"
                />
              </>
            ) : (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                Ce compte n’a ni matricule ni email : ouvrez « Modifier », renseignez un email ou laissez le système attribuer un matricule en changeant l’établissement, puis réessayez.
              </p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteMatriculeInput(''); setDeleteEmailInput('') }} className="btn-secondary flex-1">Annuler</button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={
                  deleteTarget.matricule
                    ? normMat(deleteMatriculeInput) !== normMat(deleteTarget.matricule)
                    : deleteTarget.email
                      ? deleteEmailInput.trim().toLowerCase() !== deleteTarget.email.trim().toLowerCase()
                      : true
                }
                className="flex-1 font-semibold py-2 px-4 rounded-xl transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation action par lot ── */}
      {bulkAction && bulkAction !== 'supprimer' && (
        <ConfirmModal
          title={bulkAction === 'desactiver' ? 'Désactiver les comptes ?' : 'Réactiver les comptes ?'}
          message={<>{selectedIds.length} compte{selectedIds.length > 1 ? 's' : ''} {bulkAction === 'desactiver' ? 'seront désactivés' : 'seront réactivés'}.</>}
          confirmLabel={bulkAction === 'desactiver' ? 'Désactiver tout' : 'Réactiver tout'}
          confirmClass={bulkAction === 'desactiver' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
          onCancel={() => setBulkAction(null)}
          onConfirm={() => handleBulkAction(bulkAction)}
        />
      )}
      {resetResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Mot de passe temporaire</h2>
            <p className="text-sm text-gray-600 mb-3">
              Compte : <strong>{resetResult.label}</strong>. Copiez ce mot de passe et transmettez-le par un canal sécurisé (hors application). L’utilisateur devra le saisir à la connexion puis en choisir un nouveau.
            </p>
            <div className="font-mono text-sm font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 break-all select-all mb-4">
              {resetResult.password}
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => { navigator.clipboard?.writeText(resetResult.password); toast.success('Copié dans le presse-papiers') }}
            >
              Copier
            </button>
            <button type="button" className="btn-secondary w-full mt-2" onClick={() => setResetResult(null)}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {bulkAction === 'supprimer' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-5xl text-center mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">Supprimer définitivement ?</h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
              {selectedIds.length} compte{selectedIds.length > 1 ? 's' : ''} seront supprimés de façon permanente.
            </p>
            <p className="text-xs text-gray-500 mb-2">Saisissez exactement la phrase suivante (majuscules) :</p>
            <p className="font-mono text-xs font-bold bg-gray-100 rounded-lg px-3 py-2 mb-3 break-all">
              {`SUPPRIMER ${selectedIds.length} COMPTE${selectedIds.length > 1 ? 'S' : ''}`}
            </p>
            <input
              type="text"
              className="input-field font-mono uppercase mb-4"
              placeholder="Phrase de confirmation"
              value={bulkPhrase}
              onChange={e => setBulkPhrase(e.target.value.toUpperCase())}
              autoComplete="off"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setBulkAction(null); setBulkPhrase('') }} className="btn-secondary flex-1">Annuler</button>
              <button
                type="button"
                onClick={() => handleBulkAction('supprimer')}
                disabled={bulkPhrase.trim().toUpperCase() !== `SUPPRIMER ${selectedIds.length} COMPTE${selectedIds.length > 1 ? 'S' : ''}`}
                className="flex-1 font-semibold py-2 px-4 rounded-xl transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Sous-composants                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function UserTable({ users, selected, currentUserId, allSelected, onToggleAll, onToggleOne, onEdit, onToggleActif, onDelete, onResetPassword, canDeletePermanently = true }) {
  const rowSelectable = (u) => !(u.role === 'admin' && u.id === currentUserId)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="py-3 px-3 w-10">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll}
                className="w-4 h-4 rounded accent-blue-700 cursor-pointer" />
            </th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Utilisateur</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap">Matricule</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Rôle</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">Établissement</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
            <th className="text-left py-3 px-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Statut</th>
            <th className="text-right py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map(u => (
            <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${u.actif === false ? 'opacity-55' : ''} ${selected.has(u.id) ? 'bg-blue-50' : ''}`}>
              <td className="py-3 px-3">
                {rowSelectable(u) && (
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => onToggleOne(u.id)}
                    className="w-4 h-4 rounded accent-blue-700 cursor-pointer" />
                )}
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                    {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{u.prenom} {u.nom}</p>
                    <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2">
                <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded whitespace-nowrap">{u.matricule || '—'}</span>
              </td>
              <td className="py-3 px-2"><RoleBadge role={u.role} /></td>
              <td className="py-3 px-2 hidden lg:table-cell">
                {u.etablissement_nom
                  ? <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{u.etablissement_nom}</span>
                  : <span className="text-xs text-gray-300">—</span>}
              </td>
              <td className="py-3 px-2 hidden sm:table-cell text-gray-500 text-xs">{u.email}</td>
              <td className="py-3 px-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.actif === false ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                  {u.actif === false ? 'Désactivé' : 'Actif'}
                </span>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center justify-end gap-1.5">
                    {onResetPassword && (
                      <button onClick={() => onResetPassword(u)} title="Réinitialiser le mot de passe"
                        className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      </button>
                    )}
                    <button onClick={() => onEdit(u)} title="Modifier"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onToggleActif(u)} title={u.actif === false ? 'Réactiver' : 'Désactiver'}
                      className={`p-1.5 rounded-lg transition-colors ${u.actif === false ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700' : 'text-amber-500 hover:bg-amber-50 hover:text-amber-700'}`}>
                      {u.actif === false
                        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    </button>
                    {canDeletePermanently && (
                      <button onClick={() => onDelete(u)} title="Supprimer définitivement"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Modal({ title, onClose, children, maxWidthClass = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} className={`flex-1 font-semibold py-2 px-4 rounded-xl transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, note, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {note && <span className="text-gray-400 font-normal ml-1 text-xs">({note})</span>}
      </label>
      {children}
    </div>
  )
}

function Spinner() {
  return <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
}
