'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('FARMER');

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, q, role],
    queryFn: () => adminApi.getUsers({ page, limit: 20, q: q || undefined, role: role || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        email: createEmail,
        password: createPassword,
        role: createRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreate(false);
      setCreateEmail('');
      setCreatePassword('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminApi.enableUser(id) : adminApi.disableUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
        >
          Créer
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher (email)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-3 py-2 border rounded-lg w-64"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">Tous les rôles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="FARMER">FARMER</option>
          <option value="AGRONOMIST">AGRONOMIST</option>
          <option value="TECHNICIAN">TECHNICIAN</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Rôle</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Créé</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'text-green-600' : 'text-gray-500'}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: u.id, active: !u.isActive })}
                        disabled={toggleMutation.isPending}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {u.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2">Page {page} / {meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Créer utilisateur</h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="FARMER">FARMER</option>
                <option value="AGRONOMIST">AGRONOMIST</option>
                <option value="TECHNICIAN">TECHNICIAN</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600">
                Annuler
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!createEmail || !createPassword || createMutation.isPending}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
