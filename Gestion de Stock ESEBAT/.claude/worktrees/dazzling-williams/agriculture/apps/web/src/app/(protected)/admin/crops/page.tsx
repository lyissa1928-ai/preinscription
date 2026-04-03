'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function AdminCropsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-crops', page, q],
    queryFn: () => adminApi.getCrops({ page, limit: 20, q: q || undefined }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminApi.enableCrop(id) : adminApi.disableCrop(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-crops'] }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Cultures</h1>
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
                  <th className="text-left px-4 py-3">Catégorie</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.category}</td>
                    <td className="px-4 py-3">
                      <span className={(c as { isActive?: boolean }).isActive !== false ? 'text-green-600' : 'text-gray-500'}>
                        {(c as { isActive?: boolean }).isActive !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate({ id: c.id, active: (c as { isActive?: boolean }).isActive === false })}
                        disabled={toggleMutation.isPending}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {(c as { isActive?: boolean }).isActive === false ? 'Activer' : 'Désactiver'}
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
