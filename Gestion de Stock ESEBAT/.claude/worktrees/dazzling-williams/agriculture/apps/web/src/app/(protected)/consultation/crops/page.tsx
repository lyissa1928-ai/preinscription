'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function ConsultationCropsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-crops', page, q],
    queryFn: () => adminApi.getCrops({ page, limit: 20, q: q || undefined }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Cultures</h1>
        <p className="text-stone-500 mt-1">Consultation en lecture seule du catalogue des cultures.</p>
      </div>
      <input
        type="search"
        placeholder="Rechercher"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="px-4 py-2.5 border border-stone-200 rounded-xl w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      {isLoading ? (
        <div className="h-64 bg-white rounded-2xl border border-stone-100 animate-pulse" />
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Nom scientifique</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 text-stone-800">{c.name}</td>
                    <td className="px-4 py-3 text-stone-600">{c.scientificName ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-600">{c.category}</td>
                    <td className="px-4 py-3">
                      <span className={(c as { isActive?: boolean }).isActive !== false ? 'text-emerald-600' : 'text-stone-500'}>
                        {(c as { isActive?: boolean }).isActive !== false ? 'Actif' : 'Inactif'}
                      </span>
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
                className="px-4 py-2 border border-stone-200 rounded-xl disabled:opacity-50 hover:bg-stone-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-stone-600">
                Page {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="px-4 py-2 border border-stone-200 rounded-xl disabled:opacity-50 hover:bg-stone-50"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
