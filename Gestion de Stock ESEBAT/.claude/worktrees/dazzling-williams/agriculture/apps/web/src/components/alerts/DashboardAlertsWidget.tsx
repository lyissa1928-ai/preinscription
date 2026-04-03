'use client';

import Link from 'next/link';
import { useAlertSummary, useAlerts } from '@/hooks/use-alerts';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export function DashboardAlertsWidget() {
  const { data: summary, isLoading: summaryLoading } = useAlertSummary();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({
    page: 1,
    limit: 3,
    status: undefined,
  });

  const alerts = alertsData?.data ?? [];
  const isLoading = summaryLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="mb-6 bg-white rounded-2xl border border-stone-100 p-6 animate-pulse">
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-stone-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const open = summary?.open ?? 0;
  const critical = summary?.critical ?? 0;

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-stone-800">Alertes</h2>
        <Link
          href="/alerts"
          className="text-emerald-600 hover:underline font-medium text-sm"
        >
          Voir tout →
        </Link>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
          <span className="text-sm text-stone-600">Ouvertes</span>
          <p className="text-xl font-bold text-amber-700">{open}</p>
        </div>
        <div className="px-4 py-3 bg-red-50 rounded-xl border border-red-100">
          <span className="text-sm text-stone-600">Critiques</span>
          <p className="text-xl font-bold text-red-700">{critical}</p>
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="text-stone-500 text-sm">Aucune alerte récente.</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2 items-center mb-0.5">
                  <SeverityBadge severity={a.severity} />
                  <StatusBadge status={a.status} />
                </div>
                <Link
                  href="/alerts"
                  className="font-medium text-stone-800 hover:text-emerald-600 truncate block"
                >
                  {a.title}
                </Link>
                <p className="text-xs text-stone-500 truncate">
                  {a.parcelName ?? a.parcelId} ·{' '}
                  {new Date(a.triggeredAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Link
                href="/alerts"
                className="text-emerald-600 hover:underline text-sm shrink-0"
              >
                Voir
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
