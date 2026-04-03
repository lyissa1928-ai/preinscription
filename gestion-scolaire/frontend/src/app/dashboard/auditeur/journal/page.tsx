'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ip: string | null;
  createdAt: string;
};

export default function JournalAuditPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    api<{ logs: AuditLog[]; total: number }>(`/audit/logs?${params}`)
      .then((r) => {
        setLogs(r.logs);
        setTotal(r.total);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [offset]);

  const handleSearch = () => {
    setOffset(0);
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    params.set('limit', String(limit));
    params.set('offset', '0');
    api<{ logs: AuditLog[]; total: number }>(`/audit/logs?${params}`)
      .then((r) => { setLogs(r.logs); setTotal(r.total); })
      .catch(() => { setLogs([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    downloadFile(`/audit/export?${params}`, `journal-audit-${new Date().toISOString().slice(0, 10)}.xlsx`).catch((e) => toast.error(e?.message || 'Erreur export'));
  };

  return (
    <div>
      <BackLink href="/dashboard/auditeur" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Journal d&apos;audit</h1>
      <p className="mt-2 text-slate-600">
        Traçabilité des actions sensibles
      </p>

      <div className="mt-4 flex gap-4 flex-wrap">
        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="px-3 py-2 border rounded" placeholder="Date début" />
        <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="px-3 py-2 border rounded" placeholder="Date fin" />
        <input type="text" value={action} onChange={(e) => setAction(e.target.value)} className="px-3 py-2 border rounded w-48" placeholder="Action" />
        <input type="text" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="px-3 py-2 border rounded w-40" placeholder="Entité" />
        <button onClick={handleSearch} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Rechercher
        </button>
        <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-slate-600">{total} entrée(s)</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow border">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Utilisateur</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Entité</th>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Ancienne valeur</th>
                  <th className="text-left p-3">Nouvelle valeur</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm">{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="p-3 text-sm">{l.userId ?? '-'}</td>
                    <td className="p-3 text-sm font-medium">{l.action}</td>
                    <td className="p-3 text-sm">{l.entityType}</td>
                    <td className="p-3 text-sm">{l.entityId ? l.entityId.slice(0, 8) + '…' : '-'}</td>
                    <td className="p-3 text-sm max-w-xs truncate">{l.oldValue ?? '-'}</td>
                    <td className="p-3 text-sm max-w-xs truncate">{l.newValue ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="px-3 py-1 text-sm bg-slate-200 rounded disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="py-1 text-sm">
              {offset + 1}-{Math.min(offset + limit, total)} / {total}
            </span>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 text-sm bg-slate-200 rounded disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </div>
  );
}
