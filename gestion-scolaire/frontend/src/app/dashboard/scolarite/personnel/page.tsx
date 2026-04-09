'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { canAddPersonnel as canAddPersonnelRole } from '@/config/rbac';

/** Rôles considérés comme personnel (hors STUDENT, TEACHER). */
const STAFF_ROLES = new Set([
  'SUPER_ADMIN', 'ADMIN', 'SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'AGENT_PEDAGOGIQUE',
  'SCOLARITE', 'DEPT_HEAD', 'AUDITOR', 'CAISSIER', 'CHEF_COMPTABLE', 'DAF',
]);

type User = {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  matricule?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PersonnelPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'ADMIN',
  });
  const [errors, setErrors] = useState<{ email?: string; firstName?: string; lastName?: string }>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const canAddPersonnel = canAddPersonnelRole(userRole);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      try {
        setUserRole((JSON.parse(u) as { role?: string }).role ?? '');
      } catch {
        setUserRole('');
      }
    } else {
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    api<User[]>('/users')
      .then((all) => setUsers(all.filter((u) => STAFF_ROLES.has(u.role))))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const e: { email?: string; firstName?: string; lastName?: string } = {};
    const email = form.email.trim().toLowerCase();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!email) e.email = 'L\'email est obligatoire.';
    else if (!EMAIL_REGEX.test(email)) e.email = 'Format d\'email invalide.';
    if (!firstName) e.firstName = 'Le prénom est obligatoire.';
    if (!lastName) e.lastName = 'Le nom est obligatoire.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) {
      toast.error('Veuillez corriger les champs indiqués.');
      return;
    }
    setSaving(true);
    try {
      const created = await api<User & { defaultPasswordIsMatricule?: boolean }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.role,
        }),
      });
      setUsers((prev) => [...prev, created]);
      setShowForm(false);
      setForm({ email: '', firstName: '', lastName: '', role: 'ADMIN' });
      if (created.defaultPasswordIsMatricule && created.matricule) {
        toast.success(`Personnel créé. Matricule : ${created.matricule} — Mot de passe initial : identique au matricule.`);
      } else {
        toast.success('Membre du personnel créé.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <BackLink href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour scolarité</BackLink>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Personnel</h1>
        {canAddPersonnel && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Annuler' : '+ Nouveau membre'}
          </button>
        )}
      </div>
      <p className="mt-2 text-slate-600 text-sm">
        Personnel administratif (non enseignant, non étudiant)
      </p>

      {canAddPersonnel && showForm && (
        <form onSubmit={handleCreate} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">Créer un membre du personnel</h3>
          <p className="text-sm text-slate-600 mb-4">Tous les champs marqués d’un astérisque (*) sont obligatoires. L’email doit être unique (aucun autre compte étudiant, enseignant ou personnel).</p>
          {form.role === 'SERVICE_PEDAGOGIQUE' && (
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
              <strong>Service pédagogique :</strong> ce compte a une vue fédératrice sur tous les établissements (campus). À la création, le système vous rattache comme responsable pédagogique sur les sites qui n’en avaient pas encore.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors((prev) => ({ ...prev, email: undefined })); }}
                className={`w-full px-3 py-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
                required
                placeholder="exemple@etablissement.sn"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Prénom *</label>
              <input
                value={form.firstName}
                onChange={(e) => { setForm({ ...form, firstName: e.target.value }); setErrors((prev) => ({ ...prev, firstName: undefined })); }}
                className={`w-full px-3 py-2 border rounded ${errors.firstName ? 'border-red-500' : ''}`}
                required
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Nom *</label>
              <input
                value={form.lastName}
                onChange={(e) => { setForm({ ...form, lastName: e.target.value }); setErrors((prev) => ({ ...prev, lastName: undefined })); }}
                className={`w-full px-3 py-2 border rounded ${errors.lastName ? 'border-red-500' : ''}`}
                required
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Rôle *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded">
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
                <option value="SCOLARITE">Scolarité</option>
                <option value="SERVICE_PEDAGOGIQUE">Service pédagogique (directeur — tous les campus)</option>
                <option value="CHEF_COMPTABLE">Chef comptable</option>
                <option value="AUDITOR">Auditeur</option>
                <option value="CAISSIER">Caissier</option>
                <option value="DAF">DAF</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Création...' : 'Créer'}
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Matricule</th>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-slate-500">Aucun membre du personnel</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-mono">{u.matricule ?? '-'}</td>
                  <td className="p-3">{u.firstName} {u.lastName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 text-slate-600">{u.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
