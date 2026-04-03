'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, entity, action],
    queryFn: () => adminApi.getAuditLogs({ page, limit: 30, entity: entity || undefined, action: action || undefined }),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;
  const selectedItem = detailId ? items.find((a: { id: string }) => a.id === detailId) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Audit</h1>
      <div className="flex gap-4">
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Toutes entités</option>
          <option value="User">User</option>
          <option value="Region">Region</option>
          <option value="Crop">Crop</option>
          <option value="CropRequirement">CropRequirement</option>
          <option value="AlertRule">AlertRule</option>
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 border rounded-lg">
          <option value="">Toutes actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DISABLE">DISABLE</option>
          <option value="ENABLE">ENABLE</option>
          <option value="VERSION_CREATE">VERSION_CREATE</option>
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
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Acteur</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Entité</th>
                  <th className="text-left px-4 py-3">ID</th>
                  <th className="text-left px-4 py-3">Détails</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(a.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">{a.actorEmail ?? '-'}</td>
                    <td className="px-4 py-3">{a.action}</td>
                    <td className="px-4 py-3">{a.entity}</td>
                    <td className="px-4 py-3 text-sm font-mono">{a.entityId ?? '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDetailId(a.id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Voir
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

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailId(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Détails audit</h3>
            <pre className="text-sm bg-slate-100 p-4 rounded overflow-auto">
              {JSON.stringify(selectedItem, null, 2)}
            </pre>
            <button onClick={() => setDetailId(null)} className="mt-4 px-4 py-2 rounded bg-slate-200">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
