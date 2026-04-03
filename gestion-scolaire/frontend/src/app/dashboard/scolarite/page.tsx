'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';
import { api } from '@/lib/api';
import { canScanTeacherBadge } from '@/lib/badges-rbac';

type ScolariteDashboardData = {
  anneeUniv: number;
  effectifs: { total: number; parFormation: { code: string; nom: string; count: number }[] };
  inscriptionsEnAttente: number;
};

export default function ScolariteDashboard() {
  const [data, setData] = useState<ScolariteDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      setRole(u ? ((JSON.parse(u) as { role?: string }).role ?? null) : null);
    } catch {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    api<ScolariteDashboardData>('/reports/scolarite/dashboard')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const yearLabel = data?.anneeUniv ?? new Date().getFullYear();
  const totalEffectifs = data?.effectifs.total ?? 0;
  const enAttente = data?.inscriptionsEnAttente ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Tableau de bord Scolarité"
        description="Effectifs, inscriptions en attente, validations administratives. Filières, formations, campus, transferts et clôture."
      />

      <Card title={`Synthèse (${yearLabel})`} description="Effectifs et inscriptions à traiter.">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement des statistiques...</p>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Effectifs total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalEffectifs}</p>
              <p className="mt-1 text-xs text-slate-500">inscrits (hors annulées)</p>
            </div>
            <div className="rounded-lg border bg-amber-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-700">En attente de clôture</p>
              <p className="mt-1 text-2xl font-semibold text-amber-800">{enAttente}</p>
              <p className="mt-1 text-xs text-amber-700">
                <Link href="/dashboard/scolarite/transfert" className="underline hover:no-underline">
                  Transfert & clôture
                </Link>
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Répartition par filière / formation</p>
              {data?.effectifs.parFormation && data.effectifs.parFormation.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {data.effectifs.parFormation.slice(0, 5).map((f) => (
                    <li key={f.code} className="flex justify-between">
                      <span className="text-slate-700">{f.code}</span>
                      <span className="font-medium text-slate-900">{f.count}</span>
                    </li>
                  ))}
                  {data.effectifs.parFormation.length > 5 && (
                    <li className="text-slate-500 pt-1">
                      + {data.effectifs.parFormation.length - 5} autre(s) formation(s)
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Aucune donnée</p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="Accès rapide" description="Modules scolarité.">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <NavCard href="/dashboard/scolarite/etudiants" title="Étudiants" description="Liste, import par liste/cohorte, suivi" variant="default" icon="academic-cap" />
          <NavCard href="/dashboard/scolarite/inscriptions" title="Inscriptions" description="Inscrire des étudiants, associer à une formation" variant="default" icon="clipboard-list" />
          <NavCard href="/dashboard/scolarite/filieres" title="Filières" description="Domaines académiques (spécialités)" variant="blue" icon="academic-cap" />
          <NavCard href="/dashboard/scolarite/formations" title="Formations" description="Parcours Licence / Master, maquettes, UE" variant="blue" icon="graduation-cap" />
          <NavCard href="/dashboard/scolarite/transfert" title="Transfert & clôture" description="Clôturer les inscriptions : INSCRIT → VALIDE" variant="amber" icon="transfer" />
          <NavCard href="/dashboard/scolarite/campus" title="Campus" description="Sites et implantations" variant="default" icon="building" />
          <NavCard href="/dashboard/scolarite/salles" title="Salles" description="Salles et capacités par campus" variant="default" icon="building-office-2" />
          <NavCard
            href="/dashboard/scolarite/enseignants"
            title="Enseignants"
            description={
              role === 'SCOLARITE'
                ? 'Consultation de l’effectif (création des comptes : pédagogie ou admin)'
                : 'Effectif, rattachement filière'
            }
            variant="default"
            icon="users"
          />
          <NavCard href="/dashboard/scolarite/personnel" title="Personnel" description="Staff administratif" variant="default" icon="user-group" />
          {canScanTeacherBadge(role) && (
            <NavCard
              href="/dashboard/scolarite/scan-badge"
              title="Scan présence (badge)"
              description="Enregistrer la présence journalière d’un enseignant via son QR"
              variant="emerald"
              icon="magnifying-glass"
            />
          )}
        </div>
      </Card>
    </div>
  );
}
