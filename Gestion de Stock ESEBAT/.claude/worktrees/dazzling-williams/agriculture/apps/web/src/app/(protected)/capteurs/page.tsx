'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type SensorDTO } from '@/lib/api';
import { Plus, Radio, ArrowRight } from 'lucide-react';

const SENSOR_TYPE_LABELS: Record<string, string> = {
  SOIL_PH: 'pH sol',
  SOIL_MOISTURE: 'Humidité sol',
  SOIL_SALINITY: 'Salinité',
  WEATHER_STATION: 'Station météo',
};

export default function CapteursPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['sensors', page, q, typeFilter],
    queryFn: () =>
      adminApi.getSensors({
        page,
        limit: 20,
        q: q || undefined,
        type: typeFilter || undefined,
      }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Capteurs</h1>
          <p className="text-stone-500 mt-1">
            Gérez les capteurs IoT associés aux parcelles. Les données sont envoyées via l&apos;API ou MQTT.
            <Link href="/capteurs/guide" className="ml-2 text-emerald-600 hover:underline text-sm">
              Guide technicien (implémentation) →
            </Link>
          </p>
        </div>
        <Link
          href="/capteurs/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Ajouter un capteur
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Rechercher (nom, n° série)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tous les types</option>
          {Object.entries(SENSOR_TYPE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
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
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Nom</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Parcelle</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Dernière lecture</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-stone-500">
                      Aucun capteur. Ajoutez-en un pour commencer.
                    </td>
                  </tr>
                ) : (
                  items.map((s: SensorDTO) => (
                    <tr key={s.id} className="border-t border-stone-100 hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Radio className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-medium text-stone-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {SENSOR_TYPE_LABELS[s.type] ?? s.type}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {s.parcelName ?? '-'} {s.farmName && `(${s.farmName})`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            s.isActive
                              ? 'px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700'
                              : 'px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600'
                          }
                        >
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-sm">
                        {s.lastReadingAt
                          ? new Date(s.lastReadingAt).toLocaleString('fr-FR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/capteurs/${s.id}`}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline text-sm font-medium"
                        >
                          Modifier
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
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
