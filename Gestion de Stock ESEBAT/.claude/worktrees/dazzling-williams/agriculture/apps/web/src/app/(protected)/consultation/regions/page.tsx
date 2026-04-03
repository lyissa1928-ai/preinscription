'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function ConsultationRegionsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-regions', page, q],
    queryFn: () => adminApi.getRegions({ page, limit: 20, q: q || undefined }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Régions</h1>
        <p className="text-stone-500 mt-1">Consultation en lecture seule du référentiel des régions.</p>
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
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Zone</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 text-stone-800">{r.name}</td>
                    <td className="px-4 py-3 text-stone-600">{r.code}</td>
                    <td className="px-4 py-3 text-stone-600">{r.zone}</td>
                    <td className="px-4 py-3">
                      <span className={r.isActive ? 'text-emerald-600' : 'text-stone-500'}>
                        {r.isActive ? 'Actif' : 'Inactif'}
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
