'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function ConsultationReglesAlertesPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-alert-rules', page, type, severity],
    queryFn: () =>
      adminApi.getAlertRules({ page, limit: 20, type: type || undefined, severity: severity || undefined }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Règles alertes</h1>
        <p className="text-stone-500 mt-1">Consultation en lecture seule des règles d&apos;alertes météo et sol.</p>
      </div>
      <div className="flex gap-4 flex-wrap">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Tous types</option>
          <option value="SOIL_MOISTURE_LOW">SOIL_MOISTURE_LOW</option>
          <option value="SOIL_PH_OUT_OF_RANGE">SOIL_PH_OUT_OF_RANGE</option>
          <option value="SOIL_SALINITY_HIGH">SOIL_SALINITY_HIGH</option>
          <option value="HEAT_WAVE_RISK">HEAT_WAVE_RISK</option>
          <option value="HEAVY_RAIN_RISK">HEAVY_RAIN_RISK</option>
          <option value="DROUGHT_RISK">DROUGHT_RISK</option>
        </select>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">Toutes</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
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
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Sévérité</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Scope</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Cooldown</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 text-stone-800">{r.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          r.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-800'
                            : r.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{r.scope}</td>
                    <td className="px-4 py-3 text-stone-600">{r.cooldownHours}h</td>
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
