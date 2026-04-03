'use client';

import { useState } from 'react';
import { useAlerts } from '@/hooks/use-alerts';
import { AlertCard } from '@/components/alerts/AlertCard';
import { useAuth } from '@/hooks/use-auth';

type TabFilter = { status?: string; severity?: string };
const TABS: { label: string; filter: TabFilter }[] = [
  { label: 'Toutes', filter: {} },
  { label: 'Ouvertes', filter: { status: 'OPEN' } },
  { label: 'Critiques', filter: { severity: 'CRITICAL' } },
  { label: 'Acquittées', filter: { status: 'ACKED' } },
  { label: 'Résolues', filter: { status: 'RESOLVED' } },
];

export default function AlertsPage() {
  const { currentUser } = useAuth();
  const [tabFilter, setTabFilter] = useState<TabFilter>({});
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useAlerts({
    page,
    limit,
    status: tabFilter.status,
    severity: tabFilter.severity,
  });

  const alerts = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {currentUser && (
        <p className="text-sm text-stone-500">
          Alertes de <span className="font-medium text-stone-700">{currentUser.email}</span>
        </p>
      )}
      <h1 className="text-2xl font-bold text-stone-800">Alertes reçues</h1>
      <p className="text-sm text-stone-500 -mt-2">Actions : Acquitter · Mute · Résoudre</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const isActive =
            (t.filter.status === tabFilter.status || (!t.filter.status && !tabFilter.status)) &&
            (t.filter.severity === tabFilter.severity || (!t.filter.severity && !tabFilter.severity));
          return (
            <button
              key={t.label}
              onClick={() => {
                setTabFilter(t.filter);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 p-6 h-32 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
          {error instanceof Error ? error.message : 'Erreur'}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center text-stone-500">
          Aucune alerte pour les filtres sélectionnés.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 border border-stone-200 rounded-xl disabled:opacity-50 hover:bg-stone-50"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-stone-600">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
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
