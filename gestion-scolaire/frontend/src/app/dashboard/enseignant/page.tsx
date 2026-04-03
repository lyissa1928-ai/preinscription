'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { PieChartCard } from '@/components/ui/pie-chart-card';
import { TrendBarChart } from '@/components/ui/trend-bar-chart';
import { Spinner } from '@/components/ui/spinner';
import {
  getEnseignantKpisFromData,
  getEnseignantActiviteRepartition,
  getEnseignantSeancesParJour,
} from '@/data/enseignantDashboard';
import { JOURS_EDT, JOUR_INDICES_EDT, heuresGrilleEdt } from '@/lib/edt-constants';

type Course = {
  id: string;
  jour: number;
  heureDebut: number;
  heureFin: number;
  type: string;
  groupe?: string | null;
  anneeUniv: number;
  ec: { code: string; nom: string };
  salle: { nom: string; campus?: { nom: string; code?: string } | null };
};

type DashboardData = { enCours: Course[]; historique: Course[] };

type Encadrement = {
  id: string;
  type: string;
  titre: string;
  anneeUniv: number | null;
  statut: string;
  person: {
    user: { firstName: string; lastName: string; email?: string } | null;
    student: { numeroCarteEtudiant: string } | null;
  };
};

export default function EnseignantDashboard() {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [edtYear, setEdtYear] = useState(new Date().getFullYear());
  const [edtCourses, setEdtCourses] = useState<Course[]>([]);
  const [encadrements, setEncadrements] = useState<Encadrement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<DashboardData>('/courses/me/dashboard').catch(() => ({ enCours: [], historique: [] })),
      api<Encadrement[]>('/encadrements/me').catch(() => []),
    ])
      .then(([d, e]) => {
        setDashboard(d);
        setEncadrements(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api<Course[]>(`/courses/me?anneeUniv=${edtYear}`)
      .then(setEdtCourses)
      .catch(() => setEdtCourses([]));
  }, [edtYear]);

  const getCourseAt = (jour: number, heure: number) =>
    edtCourses.find((c) => c.jour === jour && c.heureDebut <= heure && c.heureFin > heure);

  const handleDownloadEdt = () => {
    downloadFile(`/courses/export/me-pdf?anneeUniv=${edtYear}`, `Mon_EDT_${edtYear}.pdf`)
      .then(() => toast.success('PDF téléchargé.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Téléchargement impossible.'));
  };

  const handleDownloadBadge = () => {
    downloadFile('/persons/me/badge-pdf', 'badge-utilisateur.pdf', { validatePdfMagic: true })
      .then(() => toast.success('Badge téléchargé.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Téléchargement du badge impossible.'));
  };

  if (loading) {
    return <Spinner label="Chargement du tableau de bord..." />;
  }

  const enCours = dashboard?.enCours ?? [];
  const enCoursCount = enCours.length;
  const encadrementsCount = encadrements.length;
  const seancesCetteSemaine = enCours.reduce((acc, c) => acc + 1, 0) * 2; // approximation
  const kpis = getEnseignantKpisFromData({
    enCoursCount,
    encadrementsCount,
    seancesCetteSemaine: Math.min(12, enCoursCount * 3),
    notesASaisir: 0,
  });
  const activitePie = getEnseignantActiviteRepartition({
    ecCount: enCoursCount,
    encadrementsCount,
    seancesCount: kpis.seancesSemaine,
  });
  const seancesParJour = getEnseignantSeancesParJour();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="Tableau de bord Enseignant"
          description="Emploi du temps (tous campus), notes par évaluation, pointage, badge et paie."
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBadge}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            Télécharger mon badge
          </button>
        </div>
      </div>

      {/* KPI style Power BI */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Modules en cours"
          value={kpis.modulesEnCours}
          sub="EC de l'année en cours"
          icon="book-open"
          variant="info"
        />
        <KpiCard
          label="Encadrements"
          value={kpis.encadrements}
          sub="Thèses, mémoires, projets"
          icon="academic-cap"
          variant="accent"
        />
        <KpiCard
          label="Séances cette semaine"
          value={kpis.seancesSemaine}
          sub="Cours programmés"
          icon="calendar"
          variant="default"
        />
        <KpiCard
          label="Notes à saisir"
          value={kpis.notesASaisir}
          sub="En attente de saisie"
          icon="document-text"
          variant="warning"
        />
      </section>

      {/* Graphiques Power BI : tendances et répartition */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <PieChartCard
          title="Répartition de l'activité"
          description="EC, encadrements, séances hebdo"
          data={activitePie}
        />
        <TrendBarChart
          title="Séances par jour"
          description="Tendance hebdomadaire"
          data={seancesParJour}
        />
      </div>

      <Card
        title="Mon emploi du temps (tous campus)"
        description="Vue unique : vos cours sur tous les sites. Choisissez l’année, consultez la grille ou exportez en PDF."
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm text-[var(--foreground-muted)]">
            Année universitaire
            <select
              value={edtYear}
              onChange={(e) => setEdtYear(+e.target.value)}
              className="ml-2 px-2 py-1.5 border rounded-md bg-[var(--surface)] text-[var(--foreground)]"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleDownloadEdt}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-rose-700 text-white hover:bg-rose-800"
          >
            Télécharger PDF (tous campus)
          </button>
          <Link
            href="/dashboard/enseignant/emploi-du-temps"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Page plein écran
          </Link>
        </div>
        {edtCourses.length === 0 ? (
          <p className="text-[var(--foreground-muted)] text-sm">Aucun cours pour cette année.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-[var(--surface-secondary)] border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  <th className="p-2 text-left w-14">Heure</th>
                  {JOUR_INDICES_EDT.map((j) => (
                    <th key={j} className="p-2 text-left min-w-[100px]">{JOURS_EDT[j]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heuresGrilleEdt().map((h) => (
                  <tr key={h} className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
                    <td className="p-2 font-medium text-[var(--foreground)]">{h}h</td>
                    {JOUR_INDICES_EDT.map((j) => {
                      const c = getCourseAt(j, h);
                      if (!c) return <td key={j} className="p-1 bg-[var(--surface-secondary)]/40" />;
                      if (c.heureDebut !== h) return <td key={j} className="p-1" />;
                      const span = c.heureFin - c.heureDebut;
                      return (
                        <td key={j} rowSpan={span} className="p-1 align-top border-l" style={{ borderColor: 'var(--color-border-subtle)' }}>
                          <div className="rounded-md p-2 bg-blue-50 dark:bg-blue-950/40 text-[var(--foreground)]">
                            <div className="font-semibold">{c.ec.code} {c.type}</div>
                            <div className="line-clamp-2">{c.ec.nom}</div>
                            <div className="text-[var(--foreground-muted)] mt-0.5">{c.salle.nom}</div>
                            {c.salle.campus && (
                              <div className="text-[var(--color-primary)] font-medium mt-0.5">
                                {c.salle.campus.nom}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Modules en cours de dispensation" description="Synthèse EC de l’année civile en cours (tableau de bord).">
        {enCours.length ? (
          <ul className="space-y-1.5 text-sm">
            {enCours.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 py-1.5 border-b last:border-0"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <span className="font-medium text-[var(--foreground)]">{c.ec.code}</span>
                <span className="text-[var(--foreground)]">{c.ec.nom}</span>
                <span className="text-[var(--foreground-muted)]">{c.type}</span>
                {c.groupe && (
                  <span className="text-[var(--foreground-muted)]">({c.groupe})</span>
                )}
                <span className="text-[var(--foreground-muted)]">
                  {JOURS_EDT[c.jour] ?? `J${c.jour}`} {c.heureDebut}h–{c.heureFin}h — {c.salle.nom}
                  {c.salle.campus ? ` — ${c.salle.campus.nom}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--foreground-muted)] text-sm">
            Aucun module en cours cette année.
          </p>
        )}
      </Card>

      <Card title="Historique des modules terminés" description="EC des années précédentes.">
        {dashboard?.historique?.length ? (
          <ul className="space-y-1 max-h-48 overflow-y-auto text-sm">
            {dashboard.historique.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-2 py-1"
              >
                <span className="font-medium text-[var(--foreground)]">{c.ec.code}</span>
                <span className="text-[var(--foreground)]">{c.ec.nom}</span>
                <span className="text-[var(--foreground-muted)]">{c.anneeUniv}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--foreground-muted)] text-sm">Aucun historique.</p>
        )}
      </Card>

      <Card title="Suivi des encadrements" description="Thèses, mémoires, projets assignés.">
        {encadrements.length ? (
          <ul className="space-y-2 text-sm">
            {encadrements.map((e) => (
              <li
                key={e.id}
                className="pb-2 border-b last:border-0 last:pb-0"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div className="font-medium text-[var(--foreground)]">{e.titre}</div>
                <div className="text-[var(--foreground-muted)]">
                  Type : {e.type} — Statut : {e.statut}
                  {e.anneeUniv != null ? ` — ${e.anneeUniv}` : ''}
                </div>
                {e.person?.user && (
                  <div className="text-[var(--foreground-muted)]">
                    {e.person.user.firstName} {e.person.user.lastName}
                    {e.person.student?.numeroCarteEtudiant &&
                      ` (${e.person.student.numeroCarteEtudiant})`}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--foreground-muted)] text-sm">Aucun encadrement assigné.</p>
        )}
      </Card>

      {/* Accès rapide — toutes les fonctionnalités enseignant */}
      <Card title="Accès rapide" description="Toutes vos fonctionnalités métier.">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={handleDownloadBadge}
            className="text-left rounded-xl border p-4 transition hover:shadow-md border-[var(--color-border-subtle)] bg-[var(--surface)]"
          >
            <div className="text-sm font-semibold text-[var(--foreground)]">Badge enseignant</div>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">PDF à jour (photo, logo, identité)</p>
          </button>
          <NavCard
            href="/dashboard/enseignant/emploi-du-temps"
            title="Emploi du temps"
            description="Mes cours de la semaine"
            variant="blue"
            icon="calendar"
          />
          <NavCard
            href="/dashboard/enseignant/notes"
            title="Notes"
            description="Saisie des notes pour vos EC"
            variant="default"
            icon="document-text"
          />
          <NavCard
            href="/dashboard/enseignant/pointage"
            title="Pointage"
            description="Arrivée / Départ pour vos cours"
            variant="default"
            icon="clock"
          />
          <NavCard
            href="/dashboard/enseignant/paie"
            title="Bulletins"
            description="Télécharger vos bulletins de salaire"
            variant="default"
            icon="ticket"
          />
        </div>
      </Card>
    </div>
  );
}
