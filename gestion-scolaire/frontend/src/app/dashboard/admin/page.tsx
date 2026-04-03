'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';
import {
  DashboardPageHeader,
  StatCard,
  RecentActivityCard,
  AlertPanel,
  QuickActionsCard,
  ModuleCard,
  ModuleGrid,
} from '@/components/dashboard';
import {
  getDefaultAdminStats,
  getAdminAlertsFromData,
  ADMIN_RECENT_ACTIVITY_MOCK,
  ADMIN_QUICK_ACTIONS,
  ADMIN_MODULES,
} from '@/data/adminDashboard';

type PendingBreach = { id: string; justification: string };
type NonEnRegle = { personId: string; matricule: string; nom: string; formation: string };

export default function AdminDashboard() {
  const [pendingBreaches, setPendingBreaches] = useState<PendingBreach[]>([]);
  const [nonEnRegle, setNonEnRegle] = useState<NonEnRegle[]>([]);
  const [pendingDemandes, setPendingDemandes] = useState<unknown[]>([]);
  const [stats, setStats] = useState(getDefaultAdminStats());
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setRole(JSON.parse(u).role);
  }, []);

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isServicePedagogique = role === 'SERVICE_PEDAGOGIQUE';
  const isAdminOrSuper = role === 'ADMIN' || role === 'SUPER_ADMIN';

  useEffect(() => {
    if (role === null) return;
    if (isServicePedagogique) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const anneeUniv = new Date().getFullYear();

    const promises: Promise<unknown>[] =
      role === 'SUPER_ADMIN'
        ? [api<unknown[]>('/formations/demandes-deverrouillage/pending').catch(() => [])]
        : [
            api<PendingBreach[]>('/governance/breach-requests/pending').catch(() => []),
            api<NonEnRegle[]>('/finance/non-en-regle').catch(() => []),
          ];

    if (role === 'SUPER_ADMIN') {
      promises[0]
        .then((d) => setPendingDemandes(Array.isArray(d) ? d : []))
        .finally(() => setLoading(false));
    } else {
      Promise.all(promises)
        .then(([b, n]) => {
          setPendingBreaches(Array.isArray(b) ? b : []);
          setNonEnRegle(Array.isArray(n) ? n : []);
        })
        .finally(() => setLoading(false));
    }

    api<{ total: number; parFormation: { count: number }[] }>(`/reports/effectifs?anneeUniv=${anneeUniv}`)
      .then((r) => {
        const total = r?.total ?? 0;
        setStats((s) => ({ ...s, students: total, studentsSub: s.studentsSub }));
      })
      .catch(() => {});
  }, [role, isServicePedagogique]);

  const alerts = getAdminAlertsFromData({
    pendingEnrollments: stats.pendingEnrollments,
    pendingGradeChanges: stats.pendingGradeChanges ?? 0,
    teachersWithoutAssignment: 2,
    classesWithoutTimetable: 4,
    roomOverCapacity: 1,
    pendingBreaches: pendingBreaches.length,
    nonEnRegle: nonEnRegle.length,
  });

  const modulesWithBadges = ADMIN_MODULES.map((m) => {
    if (m.id === 'inscriptions') return { ...m, badge: stats.pendingEnrollments };
    return m;
  });

  if (loading && role !== null && !isServicePedagogique) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Spinner label="Chargement du tableau de bord..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DashboardPageHeader
        title="Tableau de bord Administrateur"
        description="Vue d'ensemble de la plateforme, des utilisateurs et de l'activité académique."
        actions={
          isAdminOrSuper ? (
            <>
              <Link
                href="/dashboard/admin/utilisateurs"
                className="inline-flex items-center justify-center rounded-lg font-medium text-sm px-3 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <Icon name="user" className="h-4 w-4 mr-2" />
                Ajouter un utilisateur
              </Link>
              <Link
                href="/dashboard/scolarite/etudiants/nouveau"
                className="inline-flex items-center justify-center rounded-lg font-medium text-sm px-3 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <Icon name="academic-cap" className="h-4 w-4 mr-2" />
                Ajouter un étudiant
              </Link>
              <Link
                href="/dashboard/admin/settings/appearance"
                className="inline-flex items-center justify-center rounded-lg font-medium text-sm px-4 py-2 bg-[var(--color-primary)] text-white hover:opacity-90 transition-colors"
              >
                <Icon name="cog" className="h-4 w-4 mr-2" />
                Paramètres plateforme
              </Link>
            </>
          ) : undefined
        }
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Étudiants"
          value={stats.students.toLocaleString()}
          sub={stats.studentsSub}
          icon="academic-cap"
          accent="blue"
        />
        <StatCard
          label="Enseignants"
          value={stats.teachers}
          sub={stats.teachersSub}
          icon="users"
          accent="emerald"
        />
        <StatCard
          label="Classes actives"
          value={stats.classes}
          sub={stats.classesSub}
          icon="table-cells"
          accent="slate"
        />
        <StatCard
          label="Inscriptions en attente"
          value={stats.pendingEnrollments}
          sub={stats.pendingEnrollmentsSub}
          icon="clipboard-list"
          accent="amber"
        />
      </section>

      {/* 2 colonnes: Activité + Accès rapides | Alertes + Actions rapides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RecentActivityCard items={ADMIN_RECENT_ACTIVITY_MOCK} />
          <QuickActionsCard actions={ADMIN_QUICK_ACTIONS} />
        </div>
        <div className="space-y-6">
          <AlertPanel alerts={alerts} />
          <SectionDomains isAdminOrSuper={isAdminOrSuper} />
        </div>
      </div>

      {/* Modules de gestion — section secondaire */}
      {isAdminOrSuper && (
        <section className="pt-4 border-t border-slate-200">
          <ModuleGrid
            title="Modules de gestion"
            description="Accès aux principaux modules Scolarité, Pédagogie et Administration."
          >
            {modulesWithBadges.map((mod) => (
              <ModuleCard key={mod.id} {...mod} />
            ))}
          </ModuleGrid>
        </section>
      )}
    </div>
  );
}

function SectionDomains({ isAdminOrSuper }: { isAdminOrSuper: boolean }) {
  if (!isAdminOrSuper) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">Accès par domaine</h2>
        <p className="mt-0.5 text-sm text-slate-500">Scolarité, Pédagogie, Comptabilité</p>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/dashboard/scolarite"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-blue-600">
            <Icon name="academic-cap" className="h-4 w-4" />
          </span>
          Scolarité
        </Link>
        <Link
          href="/dashboard/pedagogie"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-emerald-600">
            <Icon name="book-open" className="h-4 w-4" />
          </span>
          Pédagogie
        </Link>
        <Link
          href="/dashboard/comptable"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:shadow-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600">
            <Icon name="currency" className="h-4 w-4" />
          </span>
          Comptabilité
        </Link>
      </div>
    </section>
  );
}
