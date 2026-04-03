'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function AdminRegionsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-regions', page, q],
    queryFn: () => adminApi.getRegions({ page, limit: 20, q: q || undefined }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminApi.enableRegion(id) : adminApi.disableRegion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-regions'] }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Régions</h1>
      <input
        type="search"
        placeholder="Rechercher"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="px-3 py-2 border rounded-lg w-64"
      />
      {isLoading ? (
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-4 py-3">Nom</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Zone</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.code}</td>
                    <td className="px-4 py-3">{r.zone}</td>
                    <td className="px-4 py-3">
                      <span className={r.isActive ? 'text-green-600' : 'text-gray-500'}>
                        {r.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: r.id, active: !r.isActive })}
                        disabled={toggleMutation.isPending}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {r.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex gap-2 justify-center">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 border rounded disabled:opacity-50">Précédent</button>
              <span className="px-4 py-2">Page {page} / {meta.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="px-4 py-2 border rounded disabled:opacity-50">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
