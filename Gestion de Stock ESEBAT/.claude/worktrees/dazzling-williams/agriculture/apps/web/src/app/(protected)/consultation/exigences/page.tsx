'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function ConsultationExigencesPage() {
  const [page, setPage] = useState(1);
  const [cropId, setCropId] = useState('');
  const [season, setSeason] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-crop-requirements', page, cropId, season],
    queryFn: () =>
      adminApi.getCropRequirements({ page, limit: 20, cropId: cropId || undefined, season: season || undefined }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Exigences agronomiques</h1>
        <p className="text-stone-500 mt-1">Consultation en lecture seule des règles de recommandation.</p>
      </div>
      <div className="flex gap-4 flex-wrap">
        <input
          placeholder="Filtrer par ID culture"
          value={cropId}
          onChange={(e) => setCropId(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl w-48 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Toutes saisons</option>
          <option value="DRY">DRY</option>
          <option value="RAINY">RAINY</option>
          <option value="ANY">ANY</option>
        </select>
      </div>
      {isLoading ? (
        <div className="h-64 bg-white rounded-2xl border border-stone-100 animate-pulse" />
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Culture</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Région</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Saison</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">pH</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Version</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 text-stone-800">{r.cropName ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-600">{r.regionName ?? 'Global'}</td>
                    <td className="px-4 py-3 text-stone-600">{r.season ?? '-'}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.phMin != null && r.phMax != null ? `${r.phMin}-${r.phMax}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{r.version ?? 1}</td>
                    <td className="px-4 py-3">
                      <span className={r.isActive !== false ? 'text-emerald-600' : 'text-stone-500'}>
                        {r.isActive !== false ? 'Actif' : 'Inactif'}
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
