'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { AlertPanel, type AlertItem } from '@/components/dashboard';
import { PieChartCard } from '@/components/ui/pie-chart-card';
import { TrendBarChart } from '@/components/ui/trend-bar-chart';
import { api } from '@/lib/api';
import { canReadBadgeScanLogs, canScanTeacherBadge } from '@/lib/badges-rbac';
import { getFormationsPlusDemandees, getEffectifsParFormation } from '@/data/pedagogieDashboard';

type PedagogyDashboardStats = {
  anneeUniv: number;
  statsGenerales: {
    classesActives: number;
    enseignantsActifs: number;
    coursProgrammes: number;
    seancesAujourdHui: number;
    sallesOccupees: number;
    sallesDisponibles: number;
    tauxOccupation: number;
  };
  activitesDuJour: {
    id: string;
    heureDebut: number;
    heureFin: number;
    classe: string;
    cours: string;
    enseignant: string | null;
    salle: string | null;
    campus: string | null;
  }[];
  alertes?: {
    demandesModificationNotesEnAttente: number;
    classesSansEdt: number;
  };
  monCampus?: {
    id: string;
    code: string;
    nom: string;
    nbSalles: number;
    nbCohortes: number;
    seancesAujourdHui: number;
    activitesDuJour: PedagogyDashboardStats['activitesDuJour'];
  } | null;
};

export default function PedagogieDashboard() {
  const [stats, setStats] = useState<PedagogyDashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
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
    api<PedagogyDashboardStats>('/reports/pedagogy/dashboard')
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, []);

  const yearLabel = stats?.anneeUniv ?? new Date().getFullYear();
  const classesActives = stats?.statsGenerales.classesActives ?? 0;
  const enseignantsActifs = stats?.statsGenerales.enseignantsActifs ?? 0;
  const coursProgrammes = stats?.statsGenerales.coursProgrammes ?? 0;
  const seancesAujourdHui = stats?.statsGenerales.seancesAujourdHui ?? 0;
  const tauxOccupation =
    stats?.statsGenerales.tauxOccupation != null
      ? Math.round(stats.statsGenerales.tauxOccupation * 100)
      : 0;
  const sallesOccupees = stats?.statsGenerales.sallesOccupees ?? 0;
  const sallesDisponibles = stats?.statsGenerales.sallesDisponibles ?? 0;

  const occupationVariant: 'success' | 'warning' | 'danger' =
    tauxOccupation >= 90 ? 'danger' : tauxOccupation >= 70 ? 'warning' : 'success';

  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];
    if (!loadingStats && stats) {
      if (tauxOccupation >= 90) {
        list.push({
          id: 'occupation-salles',
          severity: 'danger',
          message: `Taux d’occupation des salles très élevé (${tauxOccupation} %)`,
          href: '/dashboard/pedagogie/emploi-du-temps',
        });
      } else if (tauxOccupation >= 70) {
        list.push({
          id: 'occupation-salles-elevee',
          severity: 'warning',
          message: `Taux d’occupation des salles élevé (${tauxOccupation} %)`,
          href: '/dashboard/pedagogie/emploi-du-temps',
        });
      }
      if (seancesAujourdHui === 0) {
        list.push({
          id: 'aucune-seance',
          severity: 'info',
          message: 'Aucune séance planifiée pour aujourd’hui',
          href: '/dashboard/pedagogie/emploi-du-temps',
        });
      }
      if (stats.alertes?.demandesModificationNotesEnAttente && stats.alertes.demandesModificationNotesEnAttente > 0) {
        list.push({
          id: 'demandes-notes',
          severity: 'warning',
          message: `${stats.alertes.demandesModificationNotesEnAttente} demande(s) de modification de note en attente`,
          href: '/dashboard/pedagogie/notes',
          count: stats.alertes.demandesModificationNotesEnAttente,
        });
      }
      if (stats.alertes?.classesSansEdt !== undefined && stats.alertes.classesSansEdt > 0) {
        list.push({
          id: 'classes-sans-edt',
          severity: 'warning',
          message: `${stats.alertes.classesSansEdt} classe(s) sans emploi du temps`,
          href: '/dashboard/pedagogie/emploi-du-temps',
          count: stats.alertes.classesSansEdt,
        });
      }
    }
    return list;
  }, [loadingStats, stats, tauxOccupation, seancesAujourdHui]);

  const hasActivities = !!stats && stats.activitesDuJour.length > 0;

  const formationsTendance = useMemo(() => getFormationsPlusDemandees(), []);
  const effectifsPie = useMemo(() => getEffectifsParFormation(), []);

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Tableau de bord Pédagogie"
        description="Centre de pilotage académique : classes, enseignants, cours, séances du jour et occupation des salles."
      />

      {stats?.monCampus && (
        <Card title="Mon campus" description={`Votre site de rattachement : ${stats.monCampus.nom}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)] px-4 py-2">
              <span className="text-sm font-medium text-[var(--foreground-muted)]">Salles</span>
              <span className="text-lg font-semibold">{stats.monCampus.nbSalles}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)] px-4 py-2">
              <span className="text-sm font-medium text-[var(--foreground-muted)]">Classes</span>
              <span className="text-lg font-semibold">{stats.monCampus.nbCohortes}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)] px-4 py-2">
              <span className="text-sm font-medium text-[var(--foreground-muted)]">Séances aujourd'hui</span>
              <span className="text-lg font-semibold">{stats.monCampus.seancesAujourdHui}</span>
            </div>
            <Link
              href="/dashboard/scolarite/campus"
              className="ml-auto inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Voir le campus
            </Link>
          </div>
          {stats.monCampus.activitesDuJour.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-[var(--foreground-muted)]">Activités du jour sur ce campus</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">Heure</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">Classe</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">Cours</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">Salle</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monCampus.activitesDuJour.map((a) => (
                    <tr key={a.id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-2">{a.heureDebut}h–{a.heureFin}h</td>
                      <td className="px-3 py-2">{a.classe}</td>
                      <td className="px-3 py-2">{a.cours}</td>
                      <td className="px-3 py-2">{a.salle ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[2.1fr,1.1fr]">
        <section className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Classes actives"
              value={loadingStats ? '—' : classesActives.toLocaleString('fr-FR')}
              sub="Cohortes ouvertes sur l’année"
              icon="table-cells"
              variant="accent"
            />
            <KpiCard
              label="Enseignants actifs"
              value={loadingStats ? '—' : enseignantsActifs.toLocaleString('fr-FR')}
              sub="Avec au moins un cours programmé"
              icon="users"
              variant="info"
            />
            <KpiCard
              label="Cours programmés"
              value={loadingStats ? '—' : coursProgrammes.toLocaleString('fr-FR')}
              sub={`Année ${yearLabel}`}
              icon="book-open"
            />
            <KpiCard
              label="Séances aujourd’hui"
              value={loadingStats ? '—' : seancesAujourdHui.toLocaleString('fr-FR')}
              sub={tauxOccupation ? `${tauxOccupation} % occupation salles` : undefined}
              icon="calendar-days"
              variant={occupationVariant}
            />
          </div>

          {/* Statistiques Power BI : formations les plus demandées + répartition effectifs */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <TrendBarChart
              title="Formations les plus demandées"
              description="Effectif / candidatures par formation (tendance)"
              data={formationsTendance}
            />
            <PieChartCard
              title="Répartition des effectifs"
              description="Par formation"
              data={effectifsPie}
            />
          </div>

          <DataTableShell
            title="Activités du jour"
            description="Cours prévus aujourd’hui, par créneau et par salle."
          >
            {loadingStats ? (
              <p className="px-4 py-6 text-sm text-[var(--foreground-muted)]">
                Chargement des activités du jour...
              </p>
            ) : hasActivities ? (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Heure
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Classe
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Cours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Enseignant
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Salle
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--foreground-muted)]">
                      Campus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats!.activitesDuJour.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-[var(--surface-secondary)]"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.heureDebut}h–{c.heureFin}h
                      </td>
                      <td className="px-3 py-2">{c.classe}</td>
                      <td className="px-3 py-2">{c.cours}</td>
                      <td className="px-3 py-2">{c.enseignant ?? '—'}</td>
                      <td className="px-3 py-2">{c.salle ?? '—'}</td>
                      <td className="px-3 py-2">{c.campus ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-6 text-sm text-[var(--foreground-muted)]">
                Aucune séance prévue aujourd’hui.
              </p>
            )}
          </DataTableShell>
        </section>

        <section className="space-y-4">
          <AlertPanel alerts={alerts} />

          <Card title="Accès rapide" description="Modules pédagogie.">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              <NavCard
                href="/dashboard/scolarite/campus"
                title="Campus"
                description="Créer et gérer les sites. Les séances se déroulent dans les campus."
                variant="emerald"
                icon="building"
              />
              <NavCard
                href="/dashboard/scolarite/salles"
                title="Salles"
                description="Salles par campus (nécessaires pour planifier l’emploi du temps)."
                variant="emerald"
                icon="building-office-2"
              />
              <NavCard
                href="/dashboard/pedagogie/classes"
                title="Classes"
                description="Créer les classes, import groupé des étudiants validés"
                variant="emerald"
                icon="table-cells"
              />
              <NavCard
                href="/dashboard/pedagogie/emploi-du-temps"
                title="Emploi du temps"
                description="Création des cours, détection des conflits"
                variant="emerald"
                icon="calendar"
              />
              <NavCard
                href="/dashboard/pedagogie/enseignants"
                title="Enseignants"
                description="Effectif et affectations aux cours"
                variant="emerald"
                icon="users"
              />
              <NavCard
                href="/dashboard/pedagogie/notes"
                title="Évaluations & notes"
                description="Grilles par classe, devoirs, TP, examens, demandes de correction"
                variant="default"
                icon="document-text"
              />
              {canScanTeacherBadge(role) && (
                <NavCard
                  href="/dashboard/scolarite/scan-badge"
                  title="Scan présence (badge)"
                  description="Pointage journalier enseignant via QR du badge"
                  variant="emerald"
                  icon="magnifying-glass"
                />
              )}
              {canReadBadgeScanLogs(role) && (
                <NavCard
                  href="/dashboard/pedagogie/journal-scans-badge"
                  title="Journal scans badges"
                  description="Historique des tentatives de scan (supervision)"
                  variant="default"
                  icon="document-magnifying-glass"
                />
              )}
              <NavCard
                href="/dashboard/pedagogie/audit"
                title="Audit pédagogique"
                description="Journal des actions pédagogiques"
                variant="default"
                icon="document-magnifying-glass"
              />
              <NavCard
                href="/dashboard/pedagogie/rapports"
                title="Rapports"
                description="Synthèses et taux de réussite (à venir)"
                variant="default"
                icon="chart"
              />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
