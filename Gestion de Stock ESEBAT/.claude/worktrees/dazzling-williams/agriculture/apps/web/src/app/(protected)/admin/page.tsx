'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type AdminStatsDTO } from '@/lib/api';

const CARDS = [
  { href: '/admin/users', label: 'Utilisateurs', desc: 'Gérer les comptes et rôles' },
  { href: '/admin/regions', label: 'Régions', desc: 'Référentiel des régions' },
  { href: '/admin/crops', label: 'Cultures', desc: 'Catalogue des cultures' },
  { href: '/admin/crop-requirements', label: 'Exigences agronomiques', desc: 'Règles de recommandation' },
  { href: '/admin/alert-rules', label: 'Règles alertes', desc: 'Seuils et types d\'alertes' },
  { href: '/admin/audit-logs', label: 'Audit', desc: 'Historique des actions' },
];

const STAT_LABELS: Record<keyof AdminStatsDTO, string> = {
  totalUsers: 'Utilisateurs',
  activeUsers: 'Actifs',
  totalFarms: 'Exploitations',
  totalParcels: 'Parcelles',
  totalRegions: 'Régions',
  totalCrops: 'Cultures',
  totalAlertRules: 'Règles alertes',
  openAlerts: 'Alertes ouvertes',
  criticalAlerts: 'Alertes critiques',
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStatsDTO | null>(null);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Administration</h1>
      <p className="text-stone-600">
        Configurez la plateforme : utilisateurs, référentiels, règles et audit.
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(Object.keys(STAT_LABELS) as Array<keyof AdminStatsDTO>).map((key) => (
            <div
              key={key}
              className={`p-4 rounded-2xl border ${
                key === 'criticalAlerts' && stats.criticalAlerts > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-stone-100 shadow-sm'
              }`}
            >
              <p className="text-sm text-stone-500">{STAT_LABELS[key]}</p>
              <p className="text-2xl font-bold text-stone-800 mt-1">{stats[key]}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block p-6 bg-white rounded-2xl shadow-sm border border-stone-100 hover:border-emerald-200 hover:shadow-md transition"
          >
            <h2 className="font-semibold text-stone-800">{c.label}</h2>
            <p className="text-sm text-stone-500 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
