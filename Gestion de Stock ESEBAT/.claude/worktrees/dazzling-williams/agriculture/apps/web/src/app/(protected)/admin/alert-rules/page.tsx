'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function AdminAlertRulesPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-alert-rules', page, type, severity],
    queryFn: () => adminApi.getAlertRules({ page, limit: 20, type: type || undefined, severity: severity || undefined }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? adminApi.enableAlertRule(id) : adminApi.disableAlertRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-alert-rules'] }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Règles alertes</h1>
      <div className="flex gap-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Tous types</option>
          <option value="SOIL_MOISTURE_LOW">SOIL_MOISTURE_LOW</option>
          <option value="SOIL_PH_OUT_OF_RANGE">SOIL_PH_OUT_OF_RANGE</option>
          <option value="SOIL_SALINITY_HIGH">SOIL_SALINITY_HIGH</option>
          <option value="HEAT_WAVE_RISK">HEAT_WAVE_RISK</option>
          <option value="HEAVY_RAIN_RISK">HEAVY_RAIN_RISK</option>
          <option value="DROUGHT_RISK">DROUGHT_RISK</option>
        </select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Toutes</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="CRITICAL">CRITICAL</option>
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
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Sévérité</th>
                  <th className="text-left px-4 py-3">Scope</th>
                  <th className="text-left px-4 py-3">Cooldown</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${r.severity === 'CRITICAL' ? 'bg-red-100' : r.severity === 'WARNING' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.scope}</td>
                    <td className="px-4 py-3">{r.cooldownHours}h</td>
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
