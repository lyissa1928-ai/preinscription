'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export type BadgeScanLogRow = {
  id: string;
  success: boolean;
  messageCode: string;
  detail: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    matricule: string | null;
    person: { matricule: string } | null;
  };
};

export function BadgeScanLogsTable() {
  const [rows, setRows] = useState<BadgeScanLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [onlyOk, setOnlyOk] = useState<'all' | 'ok' | 'fail'>('all');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<BadgeScanLogRow[]>('/attendance/badge-scan-logs?take=200')
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyOk === 'ok' && !r.success) return false;
      if (onlyOk === 'fail' && r.success) return false;
      if (!q) return true;
      const name = `${r.user.firstName} ${r.user.lastName}`.toLowerCase();
      const mat = (r.user.matricule || r.user.person?.matricule || '').toLowerCase();
      return name.includes(q) || mat.includes(q) || r.messageCode.toLowerCase().includes(q);
    });
  }, [rows, filter, onlyOk]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Chargement du journal…" />
      </div>
    );
  }

  if (error) {
    return (
      <Card title="Journal des scans">
        <p className="text-sm text-red-600">{error}</p>
        <button type="button" onClick={load} className="mt-3 text-sm underline">
          Réessayer
        </button>
      </Card>
    );
  }

  return (
    <Card
      title="Journal des scans de badges"
      description="Tentatives d’enregistrement de présence via QR enseignant (horodatage serveur)."
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrer par nom, matricule ou code…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
        />
        <select
          value={onlyOk}
          onChange={(e) => setOnlyOk(e.target.value as 'all' | 'ok' | 'fail')}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <option value="all">Tous</option>
          <option value="ok">Réussites</option>
          <option value="fail">Échecs</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)' }}
        >
          Actualiser
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--color-border)' }}>
              <th className="py-2 pr-3 font-semibold text-[var(--foreground-muted)]">Date / heure</th>
              <th className="py-2 pr-3 font-semibold text-[var(--foreground-muted)]">Utilisateur</th>
              <th className="py-2 pr-3 font-semibold text-[var(--foreground-muted)]">Résultat</th>
              <th className="py-2 pr-3 font-semibold text-[var(--foreground-muted)]">Code</th>
              <th className="py-2 font-semibold text-[var(--foreground-muted)]">Détail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--foreground-muted)]">
                  Aucune entrée.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-2 pr-3">
                    {r.user.firstName} {r.user.lastName}
                    <span className="block text-xs text-[var(--foreground-muted)]">
                      {r.user.matricule || r.user.person?.matricule || '—'} · {r.user.role}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {r.success ? (
                      <span className="text-emerald-700 font-medium">OK</span>
                    ) : (
                      <span className="text-red-700 font-medium">Échec</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.messageCode}</td>
                  <td className="py-2 text-xs text-[var(--foreground-muted)] max-w-[200px] truncate" title={r.detail || ''}>
                    {r.detail || '—'}
                  </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
