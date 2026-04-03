'use client';

import { useEffect, useMemo, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { FormGroup } from '@/components/ui/form-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BadgeStatus } from '@/components/ui/badge-status';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Cohort = { id: string; nom: string; section?: string; annee: number; formation?: { code: string; nom: string } };
type GridStudent = { personId: string; matricule: string; nom: string; prenom: string; notes: { ecId: string; note: number | null }[] };
type GridData = { students: GridStudent[]; ecs: { id: string; code: string; nom: string }[] };

type Request = {
  id: string;
  motif: string;
  statut: string;
  nouvelleNote: number | null;
  createdAt: string;
  grade: { note: number; person: { matricule: string; user?: { firstName: string; lastName: string } }; ec: { code: string; nom: string } };
  demandeur: { firstName: string; lastName: string };
};

export default function NotesPedagogiePage() {
  const toast = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [configs, setConfigs] = useState<Array<{ anneeUniv: number; session: number; dateLimite: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<'PENDING' | ''>('PENDING');
  const [anneeFilter, setAnneeFilter] = useState<number | ''>('');
  const [sessionFilter, setSessionFilter] = useState<number | ''>('');
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ anneeUniv: new Date().getFullYear(), session: 1, dateLimite: '' });

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState('');
  const [anneeUnivClasse, setAnneeUnivClasse] = useState(new Date().getFullYear());
  const [sessionClasse, setSessionClasse] = useState(1);
  const [gridData, setGridData] = useState<GridData | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(false);

  useEffect(() => {
    api<Cohort[]>('/inscriptions/cohorts').then(setCohorts).catch(() => setCohorts([]));
  }, []);

  const loadGrid = () => {
    if (!cohortId) {
      toast.error('Veuillez sélectionner une classe.');
      return;
    }
    setLoadingGrid(true);
    api<{ students: GridStudent[]; ecs: { id: string; code: string; nom: string }[]; grid: GridStudent[] }>(
      `/grades/cohort/${cohortId}/grid?anneeUniv=${anneeUnivClasse}&session=${sessionClasse}`,
    )
      .then((d) => setGridData({ students: d.grid || d.students, ecs: d.ecs }))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Erreur chargement');
        setGridData(null);
      })
      .finally(() => setLoadingGrid(false));
  };

  const downloadTemplate = () => {
    if (!cohortId) {
      toast.error('Veuillez sélectionner une classe.');
      return;
    }
    const path = `/grades/cohort/${cohortId}/template?anneeUniv=${anneeUnivClasse}&session=${sessionClasse}`;
    downloadFile(path, `notes-classe-${cohortId}-${anneeUnivClasse}-S${sessionClasse}.csv`).catch((err) =>
      toast.error(err instanceof Error ? err.message : 'Erreur téléchargement'),
    );
  };

  useEffect(() => {
    Promise.all([
      api<Request[]>(`/grades/modification-requests${statutFilter ? `?statut=${statutFilter}` : ''}`),
      api<typeof configs>('/grades/session-configs'),
    ])
      .then(([r, c]) => {
        setRequests(r);
        setConfigs(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statutFilter]);

  const handleApprove = async (id: string) => {
    try {
      await api(`/grades/modification-requests/${id}/approve`, { method: 'PATCH' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api(`/grades/modification-requests/${id}/reject`, { method: 'PATCH' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/grades/session-configs', {
        method: 'POST',
        body: JSON.stringify(configForm),
      });
      setConfigs((prev) => [...prev.filter((c) => !(c.anneeUniv === configForm.anneeUniv && c.session === configForm.session)), configForm]);
      setShowConfig(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (anneeFilter && !configs.some((c) => c.anneeUniv === anneeFilter)) {
        return true; // filtre sur annee concerne surtout l'entête config, pas la demande elle-même (maquette)
      }
      if (sessionFilter && !configs.some((c) => c.session === sessionFilter)) {
        return true;
      }
      return true;
    });
  }, [requests, anneeFilter, sessionFilter, configs]);

  const kpis = useMemo(() => {
    const total = requests.length;
    const enAttente = requests.filter((r) => r.statut === 'PENDING').length;
    const approuvees = requests.filter((r) => r.statut === 'APPROVED').length;
    const refusees = requests.filter((r) => r.statut === 'REJECTED').length;
    const sessionsConfig = configs.length;
    return { total, enAttente, approuvees, refusees, sessionsConfig };
  }, [requests, configs.length]);

  if (loading) return <p className="text-[var(--foreground-muted)]">Chargement...</p>;

  return (
    <div className="space-y-6 max-w-6xl">
      <BackLink href="/dashboard/pedagogie">Pédagogie</BackLink>
      <PageHeader
        title="Évaluations & notes (Pédagogie)"
        description="Devoirs, TP, examens et suivi par classe ; dates limites de saisie ; validation des demandes de correction. Les enseignants saisissent présence et grilles depuis leur espace (mêmes colonnes : Devoir 1, Devoir 2, TP, examen final, rattrapage)."
      />

      <FormSectionCard
        title="Notes par classe"
        description="Sélectionnez une classe, l'année et la session pour afficher les étudiants et les colonnes d'évaluations (ECs). Téléchargez le fichier de saisie pour remplir les notes hors ligne."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <FormGroup label="Classe" required>
            <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">— Choisir une classe —</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}{c.section ? ` (${c.section})` : ''} — {c.formation?.code ?? ''}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label="Année universitaire">
            <Input
              type="number"
              value={anneeUnivClasse}
              onChange={(e) => setAnneeUnivClasse(+e.target.value)}
              min={2020}
              max={2030}
            />
          </FormGroup>
          <FormGroup label="Session">
            <Select value={sessionClasse} onChange={(e) => setSessionClasse(+e.target.value)}>
              <option value={1}>Session 1</option>
              <option value={2}>Session 2</option>
            </Select>
          </FormGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={loadGrid} disabled={loadingGrid || !cohortId}>
              {loadingGrid ? 'Chargement...' : 'Afficher les notes'}
            </Button>
            <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={!cohortId}>
              Télécharger le modèle CSV
            </Button>
          </div>
        </div>
        {gridData && (
          <div className="mt-4 overflow-x-auto">
            <p className="text-sm text-[var(--foreground-muted)] mb-2">
              {gridData.students.length} étudiant(s) — {gridData.ecs.length} évaluation(s) (ECs).
            </p>
            <table className="w-full text-sm border-collapse" style={{ borderColor: 'var(--color-border)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="px-2 py-1.5 text-left font-medium text-[var(--foreground-muted)]">Matricule</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[var(--foreground-muted)]">Nom</th>
                  <th className="px-2 py-1.5 text-left font-medium text-[var(--foreground-muted)]">Prénom</th>
                  {gridData.ecs.map((ec) => (
                    <th key={ec.id} className="px-2 py-1.5 text-left font-medium text-[var(--foreground-muted)]" title={ec.nom}>{ec.code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridData.students.map((s) => (
                  <tr key={s.personId} className="border-b last:border-0 hover:bg-[var(--surface-secondary)]" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-2 py-1.5 font-mono text-[var(--foreground)]">{s.matricule}</td>
                    <td className="px-2 py-1.5 text-[var(--foreground)]">{s.nom}</td>
                    <td className="px-2 py-1.5 text-[var(--foreground)]">{s.prenom}</td>
                    {s.notes.map((n) => (
                      <td key={n.ecId} className="px-2 py-1.5 text-[var(--foreground)]">{n.note != null ? n.note : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSectionCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Demandes totales" value={kpis.total} icon="document-text" />
        <KpiCard label="En attente" value={kpis.enAttente} variant="warning" icon="clock" />
        <KpiCard label="Approuvées" value={kpis.approuvees} variant="success" icon="check-circle" />
        <KpiCard label="Refusées" value={kpis.refusees} variant="danger" icon="x-circle" />
        <KpiCard label="Sessions config." value={kpis.sessionsConfig} icon="calendar" />
      </div>

      <FilterPanel
        onReset={
          statutFilter || anneeFilter || sessionFilter
            ? () => {
                setStatutFilter('PENDING');
                setAnneeFilter('');
                setSessionFilter('');
              }
            : undefined
        }
      >
        <FormGroup label="Statut" className="min-w-[160px]">
          <Select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value as 'PENDING' | '')}
          >
            <option value="PENDING">En attente</option>
            <option value="">Tous</option>
          </Select>
        </FormGroup>
        <FormGroup label="Année" className="min-w-[140px]">
          <Select
            value={anneeFilter === '' ? '' : String(anneeFilter)}
            onChange={(e) => setAnneeFilter(e.target.value ? +e.target.value : '')}
          >
            <option value="">Toutes</option>
            {[...new Set(configs.map((c) => c.anneeUniv))].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Session" className="min-w-[140px]">
          <Select
            value={sessionFilter === '' ? '' : String(sessionFilter)}
            onChange={(e) => setSessionFilter(e.target.value ? +e.target.value : '')}
          >
            <option value="">Toutes</option>
            {[1, 2].map((s) => (
              <option key={s} value={s}>Session {s}</option>
            ))}
          </Select>
        </FormGroup>
      </FilterPanel>

      {showConfig && (
        <FormSectionCard
          title="Date limite de saisie"
          description="Configurer les dates limites par année universitaire et par session."
        >
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormGroup label="Année" required>
                <Input
                  type="number"
                  value={configForm.anneeUniv}
                  onChange={(e) => setConfigForm({ ...configForm, anneeUniv: +e.target.value })}
                  min={2020}
                  max={2030}
                />
              </FormGroup>
              <FormGroup label="Session" required>
                <Select
                  value={configForm.session}
                  onChange={(e) => setConfigForm({ ...configForm, session: +e.target.value })}
                >
                  <option value={1}>Session 1</option>
                  <option value={2}>Session 2</option>
                </Select>
              </FormGroup>
              <FormGroup label="Date limite" required>
                <Input
                  type="datetime-local"
                  value={configForm.dateLimite}
                  onChange={(e) => setConfigForm({ ...configForm, dateLimite: e.target.value })}
                />
              </FormGroup>
            </div>
            <Button type="submit">Enregistrer</Button>
          </form>
        </FormSectionCard>
      )}

      <FormSectionCard
        title="Dates limites configurées"
        description="Les sessions verrouillées par le jury ne permettent plus de saisie directe."
      >
        {configs.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            Aucune configuration. Utilisez « Configurer dates limites » pour ajouter une session.
          </p>
        ) : (
          <ul className="text-sm text-[var(--foreground)] space-y-1">
            {configs.map((c) => (
              <li key={`${c.anneeUniv}-${c.session}`}>
                <span className="font-medium">{c.anneeUniv}</span>{' '}
                — Session {c.session} :{' '}
                {new Date(c.dateLimite).toLocaleString('fr-FR')}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowConfig((v) => !v)}
          >
            {showConfig ? 'Fermer la configuration' : 'Configurer dates limites'}
          </Button>
        </div>
      </FormSectionCard>

      <DataTableShell
        title="Demandes de modification de notes"
        description={
          filtered.length === 0
            ? 'Aucune demande pour les critères actuels.'
            : `${filtered.length} demande(s) — filtrées par statut et éventuellement par année/session.`
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Étudiant</th>
              <th className="px-3 py-2 text-left">EC</th>
              <th className="px-3 py-2 text-left">Note actuelle</th>
              <th className="px-3 py-2 text-left">Nouvelle note</th>
              <th className="px-3 py-2 text-left">Motif</th>
              <th className="px-3 py-2 text-left">Demandeur</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]"
                >
                  Aucune demande
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-[var(--surface-secondary)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {r.grade.person.matricule} —{' '}
                    {r.grade.person.user
                      ? `${r.grade.person.user.firstName} ${r.grade.person.user.lastName}`
                      : ''}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {r.grade.ec.code} — {r.grade.ec.nom}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]">{r.grade.note}/20</td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {r.nouvelleNote ?? '-'}
                    {r.nouvelleNote != null && '/20'}
                  </td>
                  <td className="px-3 py-2 max-w-[260px] truncate text-[var(--foreground-muted)]" title={r.motif}>
                    {r.motif}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {r.demandeur.firstName} {r.demandeur.lastName}
                  </td>
                  <td className="px-3 py-2">
                    <BadgeStatus status={r.statut} />
                  </td>
                  <td className="px-3 py-2">
                    {r.statut === 'PENDING' && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApprove(r.id)}
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(r.id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
