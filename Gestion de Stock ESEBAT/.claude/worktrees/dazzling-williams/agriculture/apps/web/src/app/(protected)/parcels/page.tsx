'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { farmerApi } from '@/lib/api';
import { ParcelsMap } from '@/components/parcels/ParcelsMap';
import { useAuth } from '@/hooks/use-auth';

export default function ParcelsPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['parcels', page, search],
    queryFn: () => farmerApi.getParcels({ page, limit: 10, search: search || undefined }),
  });

  const { data: mapData } = useQuery({
    queryKey: ['parcels', 'map'],
    queryFn: () => farmerApi.getParcels({ page: 1, limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => farmerApi.deleteParcel(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['parcels'] }),
  });

  if (error) {
    const msg = error instanceof Error ? error.message : 'Erreur';
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-4">Parcelles</h1>
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 mb-4">
          {msg}
        </div>
        {msg.includes('exploitation') && (
          <Link href="/farm" className="text-emerald-600 hover:underline">
            Créer mon exploitation →
          </Link>
        )}
      </div>
    );
  }

  const parcels = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      {currentUser && (
        <p className="text-sm text-stone-500 mb-2">
          Parcelles de <span className="font-medium text-stone-700">{currentUser.email}</span>
        </p>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Parcelles créées</h1>
        <Link
          href="/parcels/new"
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-sm"
        >
          Nouvelle parcelle
        </Link>
      </div>

      {mapData?.data && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-2">Carte des parcelles</h2>
          <ParcelsMap parcels={mapData.data} height="350px" />
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-xs px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="animate-pulse h-12" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 border-t animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="font-semibold text-stone-800">Liste des parcelles · Actions : Modifier | Supprimer</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">Superficie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">Région</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">Sol</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-stone-700">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      Aucune parcelle créée. Ajoutez une parcelle pour commencer.
                    </td>
                  </tr>
                ) : parcels.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/parcels/${p.id}`} className="text-emerald-700 hover:underline font-medium">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{p.area} ha</td>
                    <td className="px-4 py-3">{p.region?.name ?? '-'}</td>
                    <td className="px-4 py-3">{p.soilType}</td>
                    <td className="px-4 py-3">
                        <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/parcels/${p.id}`}
                        className="text-emerald-600 hover:underline mr-3"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Supprimer cette parcelle ?')) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="px-4 py-3 flex justify-between items-center border-t border-stone-100">
              <span className="text-sm text-stone-500">
                {meta.total} parcelle(s)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border border-stone-200 rounded-lg disabled:opacity-50"
                >
                  Précédent
                </button>
                <span className="px-3 py-1">
                  {page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="px-3 py-1 border border-stone-200 rounded-lg disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
