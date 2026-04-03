'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { FormGroup } from '@/components/ui/form-group';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EVAL_SHEET_COLUMNS, type EvalSheetKey } from '@/lib/grades-eval-columns';

type EC = { id: string; code: string; nom: string; semestre: number };
type Student = { personId: string; matricule: string; nom: string };
type Grade = {
  id: string;
  personId: string;
  note: number;
  evaluationType?: string;
  evaluationLibelle?: string;
  person: { matricule: string; user?: { firstName: string; lastName: string } };
};
type EvalKey = { evaluationType: string; evaluationLibelle: string };

type CohortBrief = {
  id: string;
  nom: string;
  section: string;
  formationCode: string;
  formationNom: string;
  annee: number;
};

type RollStudent = {
  personId: string;
  matricule: string;
  nom: string;
  prenom: string;
  status: string;
  comment: string | null;
  rollId: string | null;
};

type RollWeekDay = { date: string; label: string; students: RollStudent[] };
type RollWeekResponse = { weekStart: string; cohortId: string; anneeUniv: number; days: RollWeekDay[] };

type EvalSheetStudent = {
  personId: string;
  matricule: string;
  nom: string;
  notes: Partial<Record<EvalSheetKey, { gradeId: string; note: number } | null>>;
};

type EvalSheetResponse = {
  ecId: string;
  session: number;
  anneeUniv: number;
  columns: { key: string; label: string; evaluationType: string; evaluationLibelle: string }[];
  students: EvalSheetStudent[];
};

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type TabId = 'presence' | 'evaluations' | 'legacy';

export default function NotesEnseignantPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabId>('evaluations');

  const [ecs, setEcs] = useState<EC[]>([]);
  const [cohorts, setCohorts] = useState<CohortBrief[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecId, setEcId] = useState('');
  const [session, setSession] = useState(1);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [evaluationType, setEvaluationType] = useState('EXAMEN');
  const [evaluationLibelle, setEvaluationLibelle] = useState('Session');
  const [evalPresets, setEvalPresets] = useState<EvalKey[]>([
    { evaluationType: 'EXAMEN', evaluationLibelle: 'Session' },
    { evaluationType: 'DEVOIR', evaluationLibelle: 'Devoir 1' },
    { evaluationType: 'EXAMEN', evaluationLibelle: 'Examen partiel' },
  ]);

  const [cohortId, setCohortId] = useState('');
  const [rollDate, setRollDate] = useState(todayIsoDate);
  const [rollStudents, setRollStudents] = useState<RollStudent[]>([]);
  const [rollLoading, setRollLoading] = useState(false);
  const [presenceMode, setPresenceMode] = useState<'jour' | 'semaine'>('jour');
  const [weekRefDate, setWeekRefDate] = useState(todayIsoDate);
  const [rollWeek, setRollWeek] = useState<RollWeekResponse | null>(null);
  const [rollWeekLoading, setRollWeekLoading] = useState(false);

  const [evalSheet, setEvalSheet] = useState<EvalSheetResponse | null>(null);
  const [evalDrafts, setEvalDrafts] = useState<Record<string, Record<EvalSheetKey, string>>>({});
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    api<EC[]>(`/grades/my-ecs?anneeUniv=${anneeUniv}`)
      .then(setEcs)
      .catch(() => setEcs([]));
    api<CohortBrief[]>(`/grades/my-cohorts?anneeUniv=${anneeUniv}`)
      .then(setCohorts)
      .catch(() => setCohorts([]))
      .finally(() => setLoading(false));
  }, [anneeUniv]);

  useEffect(() => {
    if (!ecId) return;
    api<EvalKey[]>(`/grades/ec/${ecId}/evaluations?session=${session}&anneeUniv=${anneeUniv}`)
      .then((fromDb) => {
        const base: EvalKey[] = [
          { evaluationType: 'EXAMEN', evaluationLibelle: 'Session' },
          { evaluationType: 'DEVOIR', evaluationLibelle: 'Devoir 1' },
          { evaluationType: 'EXAMEN', evaluationLibelle: 'Examen partiel' },
        ];
        const merged = [...base];
        for (const x of fromDb) {
          if (!merged.some((m) => m.evaluationType === x.evaluationType && m.evaluationLibelle === x.evaluationLibelle)) {
            merged.push(x);
          }
        }
        setEvalPresets(merged);
      })
      .catch(() => {});
  }, [ecId, session, anneeUniv]);

  useEffect(() => {
    if (!ecId) return;
    const et = encodeURIComponent(evaluationType);
    const el = encodeURIComponent(evaluationLibelle);
    Promise.all([
      api<Student[]>(`/grades/ec/${ecId}/students?anneeUniv=${anneeUniv}`),
      api<Grade[]>(
        `/grades/ec/${ecId}?session=${session}&anneeUniv=${anneeUniv}&evaluationType=${et}&evaluationLibelle=${el}`,
      ),
    ])
      .then(([s, g]) => {
        setStudents(s);
        setGrades(g);
        const vals: Record<string, string> = {};
        g.forEach((gr) => {
          vals[gr.personId] = String(gr.note);
        });
        setNoteValues(vals);
      })
      .catch(() => {
        setStudents([]);
        setGrades([]);
        setNoteValues({});
      });
  }, [ecId, session, anneeUniv, evaluationType, evaluationLibelle]);

  const loadRoll = useCallback(() => {
    if (!cohortId) {
      setRollStudents([]);
      return;
    }
    setRollLoading(true);
    api<{ students: RollStudent[] }>(
      `/grades/cohort/${cohortId}/roll?anneeUniv=${anneeUniv}&date=${encodeURIComponent(rollDate)}`,
    )
      .then((r) => setRollStudents(r.students ?? []))
      .catch(() => {
        setRollStudents([]);
        toast.error('Impossible de charger la feuille de présence.');
      })
      .finally(() => setRollLoading(false));
  }, [cohortId, anneeUniv, rollDate, toast]);

  useEffect(() => {
    if (tab === 'presence' && presenceMode === 'jour') loadRoll();
  }, [tab, presenceMode, loadRoll]);

  const loadRollWeek = useCallback(() => {
    if (!cohortId) {
      setRollWeek(null);
      return;
    }
    setRollWeekLoading(true);
    api<RollWeekResponse>(
      `/grades/cohort/${cohortId}/roll-week?anneeUniv=${anneeUniv}&weekStart=${encodeURIComponent(weekRefDate)}`,
    )
      .then(setRollWeek)
      .catch(() => {
        setRollWeek(null);
        toast.error('Impossible de charger la feuille hebdomadaire.');
      })
      .finally(() => setRollWeekLoading(false));
  }, [cohortId, anneeUniv, weekRefDate, toast]);

  useEffect(() => {
    if (tab === 'presence' && presenceMode === 'semaine') loadRollWeek();
  }, [tab, presenceMode, loadRollWeek]);

  const updateRollWeekStatus = (dayIndex: number, personId: string, status: string) => {
    setRollWeek((prev) => {
      if (!prev) return prev;
      const days = prev.days.map((d, j) => {
        if (j !== dayIndex) return d;
        return {
          ...d,
          students: d.students.map((s) => (s.personId === personId ? { ...s, status } : s)),
        };
      });
      return { ...prev, days };
    });
  };

  const saveRollWeek = async () => {
    if (!cohortId || !rollWeek) return;
    const entries: { personId: string; date: string; status: string }[] = [];
    for (const d of rollWeek.days) {
      for (const s of d.students) {
        entries.push({ personId: s.personId, date: d.date, status: s.status });
      }
    }
    setSaving(true);
    try {
      await api(`/grades/cohort/${cohortId}/roll-week`, {
        method: 'POST',
        body: JSON.stringify({ anneeUniv, entries }),
      });
      toast.success('Présence de la semaine enregistrée.');
      loadRollWeek();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const loadEvalSheet = useCallback(() => {
    if (!ecId) {
      setEvalSheet(null);
      setEvalDrafts({});
      return;
    }
    setEvalLoading(true);
    api<EvalSheetResponse>(`/grades/ec/${ecId}/evaluation-sheet?session=${session}&anneeUniv=${anneeUniv}`)
      .then((data) => {
        setEvalSheet(data);
        const drafts: Record<string, Record<EvalSheetKey, string>> = {};
        for (const st of data.students) {
          drafts[st.personId] = {} as Record<EvalSheetKey, string>;
          for (const col of EVAL_SHEET_COLUMNS) {
            const cell = st.notes[col.key];
            drafts[st.personId][col.key] = cell != null ? String(cell.note) : '';
          }
        }
        setEvalDrafts(drafts);
      })
      .catch(() => {
        setEvalSheet(null);
        setEvalDrafts({});
        toast.error('Impossible de charger la feuille d’évaluations.');
      })
      .finally(() => setEvalLoading(false));
  }, [ecId, session, anneeUniv, toast]);

  useEffect(() => {
    if (tab === 'evaluations') loadEvalSheet();
  }, [tab, loadEvalSheet]);

  const handleSave = async (personId: string) => {
    const val = noteValues[personId];
    if (val === undefined || val === '') return;
    const note = parseFloat(val);
    if (isNaN(note) || note < 0 || note > 20) {
      toast.error('Note entre 0 et 20');
      return;
    }
    setSaving(true);
    try {
      const updated = await api<Grade>('/grades', {
        method: 'POST',
        body: JSON.stringify({
          personId,
          ecId,
          session,
          anneeUniv,
          note,
          evaluationType,
          evaluationLibelle,
        }),
      });
      setGrades((prev) => prev.filter((g) => g.personId !== personId).concat([updated]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    for (const s of students) {
      const val = noteValues[s.personId];
      if (val !== undefined && val !== '') {
        const note = parseFloat(val);
        if (!isNaN(note) && note >= 0 && note <= 20) {
          await handleSave(s.personId);
        }
      }
    }
  };

  const saveRoll = async () => {
    if (!cohortId) return;
    setSaving(true);
    try {
      const entries = rollStudents.map((s) => ({
        personId: s.personId,
        status: s.status,
        comment: s.comment,
      }));
      await api(`/grades/cohort/${cohortId}/roll`, {
        method: 'POST',
        body: JSON.stringify({ anneeUniv, date: rollDate, entries }),
      });
      toast.success('Présence enregistrée.');
      loadRoll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const updateRollStatus = (personId: string, status: string) => {
    setRollStudents((prev) => prev.map((r) => (r.personId === personId ? { ...r, status } : r)));
  };

  const saveEvalSheetAll = async () => {
    if (!ecId || !evalSheet) return;
    const rows = evalSheet.students.map((st) => {
      const d = evalDrafts[st.personId] ?? ({} as Record<EvalSheetKey, string>);
      const notes: Partial<Record<string, number | null>> = {};
      for (const col of EVAL_SHEET_COLUMNS) {
        const raw = d[col.key]?.trim();
        if (raw === undefined || raw === '') continue;
        const n = parseFloat(raw);
        if (!isNaN(n) && n >= 0 && n <= 20) notes[col.key] = n;
      }
      return { personId: st.personId, notes };
    });
    setSaving(true);
    try {
      await api(`/grades/ec/${ecId}/evaluation-sheet`, {
        method: 'POST',
        body: JSON.stringify({ session, anneeUniv, rows }),
      });
      toast.success('Feuille d’évaluations enregistrée.');
      loadEvalSheet();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const setEvalCell = (personId: string, key: EvalSheetKey, value: string) => {
    setEvalDrafts((prev) => ({
      ...prev,
      [personId]: { ...(prev[personId] ?? ({} as Record<EvalSheetKey, string>)), [key]: value },
    }));
  };

  const kpis = useMemo(() => {
    const totalECs = ecs.length;
    const totalStudents = students.length;
    const notesSaisies = grades.length;
    return { totalECs, totalStudents, notesSaisies };
  }, [ecs.length, students.length, grades.length]);

  if (loading) return <p className="text-[var(--foreground-muted)]">Chargement...</p>;

  return (
    <div className="space-y-6 max-w-[1100px]">
      <BackLink href="/dashboard/enseignant">Espace enseignant</BackLink>
      <PageHeader
        title="Évaluations & notes"
        description="Pour chaque classe où vous enseignez : présence (jour ou semaine lun–ven) et feuille de notes avec Devoir 1, Devoir 2, TP, examen final et rattrapage. Votre photo d’identité : menu Profil."
      />

      <div className="flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
        {(
          [
            ['evaluations', 'Devoirs, TP & examens (grille)'],
            ['presence', 'Présence (classe)'],
            ['legacy', 'Saisie par colonne'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--surface-secondary)] text-[var(--foreground)] hover:opacity-90'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="EC à noter" value={kpis.totalECs} icon="book-open" />
        <KpiCard label="Étudiants (EC courant)" value={kpis.totalStudents} icon="users" />
        <KpiCard label="Notes (colonne courante)" value={kpis.notesSaisies} icon="check-circle" variant="success" />
      </div>

      <FilterPanel>
        <FormGroup label="Année universitaire" className="min-w-[140px]">
          <Select value={anneeUniv} onChange={(e) => setAnneeUniv(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Session" className="min-w-[140px]">
          <Select value={session} onChange={(e) => setSession(+e.target.value)}>
            <option value={1}>Session 1</option>
            <option value={2}>Session 2</option>
          </Select>
        </FormGroup>
        <FormGroup label="EC (élément constitutif)" className="min-w-[260px]">
          <Select value={ecId} onChange={(e) => setEcId(e.target.value)}>
            <option value="">Sélectionner</option>
            {ecs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.code} - {e.nom} (S{e.semestre})
              </option>
            ))}
          </Select>
        </FormGroup>
      </FilterPanel>

      {tab === 'presence' && (
        <FormSectionCard
          title="Liste de présence (classe / cohorte)"
          description="Une classe = une cohorte. Émargement par jour ou vue semaine (lundi à vendredi). Statuts : présent, absent, retard, excusé."
        >
          <div className="flex flex-wrap gap-4 mb-4">
            <FormGroup label="Classe" className="min-w-[240px]">
              <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                <option value="">Choisir une classe</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.formationCode} — {c.nom} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="Mode" className="min-w-[200px]">
              <Select
                value={presenceMode}
                onChange={(e) => setPresenceMode(e.target.value as 'jour' | 'semaine')}
              >
                <option value="jour">Une journée</option>
                <option value="semaine">Semaine (lun–ven)</option>
              </Select>
            </FormGroup>
            {presenceMode === 'jour' ? (
              <FormGroup label="Date" className="min-w-[180px]">
                <Input type="date" value={rollDate} onChange={(e) => setRollDate(e.target.value)} />
              </FormGroup>
            ) : (
              <FormGroup label="Semaine (n’importe quel jour)" className="min-w-[200px]">
                <Input type="date" value={weekRefDate} onChange={(e) => setWeekRefDate(e.target.value)} />
              </FormGroup>
            )}
            <div className="flex items-end gap-2 flex-wrap">
              {presenceMode === 'jour' ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={loadRoll} disabled={rollLoading || !cohortId}>
                    Actualiser
                  </Button>
                  <Button type="button" size="sm" onClick={saveRoll} disabled={saving || !cohortId || rollStudents.length === 0}>
                    Enregistrer la feuille
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={loadRollWeek} disabled={rollWeekLoading || !cohortId}>
                    Actualiser
                  </Button>
                  <Button type="button" size="sm" onClick={saveRollWeek} disabled={saving || !cohortId || !rollWeek || rollWeek.days.length === 0}>
                    Enregistrer la semaine
                  </Button>
                </>
              )}
            </div>
          </div>
          {presenceMode === 'jour' && (
            <>
              {rollLoading ? (
                <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
              ) : !cohortId ? (
                <p className="text-sm text-[var(--foreground-muted)]">Sélectionnez une classe.</p>
              ) : rollStudents.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">Aucun étudiant inscrit dans cette classe pour cette année.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--surface-secondary)]">
                        <th className="px-3 py-2 text-left">Matricule</th>
                        <th className="px-3 py-2 text-left">Nom</th>
                        <th className="px-3 py-2 text-left">Prénom</th>
                        <th className="px-3 py-2 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rollStudents.map((s) => (
                        <tr key={s.personId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-3 py-2 font-mono">{s.matricule}</td>
                          <td className="px-3 py-2">{s.nom}</td>
                          <td className="px-3 py-2">{s.prenom}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={s.status}
                              onChange={(e) => updateRollStatus(s.personId, e.target.value)}
                              className="min-w-[140px]"
                            >
                              <option value="PRESENT">Présent</option>
                              <option value="ABSENT">Absent</option>
                              <option value="RETARD">Retard</option>
                              <option value="EXCUSE">Excusé</option>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          {presenceMode === 'semaine' && (
            <>
              {rollWeekLoading ? (
                <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
              ) : !cohortId ? (
                <p className="text-sm text-[var(--foreground-muted)]">Sélectionnez une classe.</p>
              ) : !rollWeek || rollWeek.days.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">Aucune donnée pour cette semaine.</p>
              ) : rollWeek.days[0].students.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">Aucun étudiant inscrit dans cette classe pour cette année.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs text-[var(--foreground-muted)] px-3 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    Semaine du <strong>{rollWeek.weekStart}</strong> (lundi–vendredi)
                  </p>
                  <table className="w-full text-xs sm:text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-[var(--surface-secondary)]">
                        <th className="px-2 py-2 text-left sticky left-0 bg-[var(--surface-secondary)] z-[1]">Matricule</th>
                        <th className="px-2 py-2 text-left">Nom</th>
                        {rollWeek.days.map((d) => (
                          <th key={d.date} className="px-1 py-2 text-center min-w-[100px]">
                            <span className="block font-semibold">{d.label}</span>
                            <span className="block font-normal text-[var(--foreground-muted)]">{d.date}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rollWeek.days[0].students.map((row0, rowIdx) => (
                        <tr key={row0.personId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <td className="px-2 py-1 font-mono sticky left-0 bg-[var(--background)]">{row0.matricule}</td>
                          <td className="px-2 py-1">
                            {row0.nom} {row0.prenom}
                          </td>
                          {rollWeek.days.map((d, dayIdx) => {
                            const s = d.students[rowIdx];
                            if (!s) return <td key={d.date} className="px-1 py-1">—</td>;
                            return (
                              <td key={d.date} className="px-1 py-1">
                                <Select
                                  value={s.status}
                                  onChange={(e) => updateRollWeekStatus(dayIdx, s.personId, e.target.value)}
                                  className="min-w-0 w-full text-xs py-1"
                                >
                                  <option value="PRESENT">P</option>
                                  <option value="ABSENT">A</option>
                                  <option value="RETARD">R</option>
                                  <option value="EXCUSE">E</option>
                                </Select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-[var(--foreground-muted)] px-3 py-2">
                    P = présent, A = absent, R = retard, E = excusé
                  </p>
                </div>
              )}
            </>
          )}
        </FormSectionCard>
      )}

      {tab === 'evaluations' && (
        <FormSectionCard
          title="Évaluations (Devoir 1, Devoir 2, TP, examens)"
          description="Grille unique par EC : une colonne par type d’évaluation standard. Seules les cellules renseignées sont enregistrées (0–20)."
        >
          {!ecId ? (
            <p className="text-sm text-[var(--foreground-muted)]">Sélectionnez un EC ci-dessus.</p>
          ) : evalLoading ? (
            <p className="text-sm text-[var(--foreground-muted)]">Chargement de la grille…</p>
          ) : !evalSheet || evalSheet.students.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">Aucun étudiant inscrit sur cet EC pour cette année.</p>
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <Button type="button" onClick={saveEvalSheetAll} disabled={saving}>
                  Enregistrer toute la grille
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-xs sm:text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)]">
                      <th className="px-2 py-2 text-left sticky left-0 bg-[var(--surface-secondary)] z-[1]">Matricule</th>
                      <th className="px-2 py-2 text-left min-w-[120px]">Nom</th>
                      {EVAL_SHEET_COLUMNS.map((col) => (
                        <th key={col.key} className="px-1 py-2 text-center min-w-[88px]">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalSheet.students.map((st) => (
                      <tr key={st.personId} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-2 py-1.5 font-mono sticky left-0 bg-[var(--background)]">{st.matricule}</td>
                        <td className="px-2 py-1.5">{st.nom}</td>
                        {EVAL_SHEET_COLUMNS.map((col) => (
                          <td key={col.key} className="px-1 py-1">
                            <Input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              className="w-full min-w-0 px-1 py-1 text-center"
                              value={evalDrafts[st.personId]?.[col.key] ?? ''}
                              onChange={(e) => setEvalCell(st.personId, col.key, e.target.value)}
                              placeholder="—"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </FormSectionCard>
      )}

      {tab === 'legacy' && (
        <>
          <FilterPanel>
            <FormGroup label="Évaluation (préréglages)" className="min-w-[240px]">
              <Select
                value={`${evaluationType}|||${evaluationLibelle}`}
                onChange={(e) => {
                  const v = e.target.value.split('|||');
                  setEvaluationType(v[0] || 'EXAMEN');
                  setEvaluationLibelle(v[1] || 'Session');
                }}
              >
                {evalPresets.map((p) => (
                  <option key={`${p.evaluationType}-${p.evaluationLibelle}`} value={`${p.evaluationType}|||${p.evaluationLibelle}`}>
                    {p.evaluationType} — {p.evaluationLibelle}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="Type (personnaliser)" className="min-w-[140px]">
              <Select value={evaluationType} onChange={(e) => setEvaluationType(e.target.value)}>
                <option value="EXAMEN">Examen</option>
                <option value="DEVOIR">Devoir</option>
                <option value="CONTROLE">Contrôle</option>
                <option value="TP">TP / Pratique</option>
              </Select>
            </FormGroup>
            <FormGroup label="Libellé" className="min-w-[180px]">
              <Input
                value={evaluationLibelle}
                onChange={(e) => setEvaluationLibelle(e.target.value)}
                placeholder="Session, Devoir 2…"
              />
            </FormGroup>
          </FilterPanel>

          {ecId && (
            <FormSectionCard
              title="Saisie par colonne unique"
              description={`Notes pour : ${evaluationType} — ${evaluationLibelle} (session ${session}, ${anneeUniv}).`}
            >
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-[var(--foreground-muted)]">{students.length} étudiant(s) dans cet EC.</p>
                <Button type="button" size="sm" onClick={handleSaveAll} disabled={saving}>
                  Enregistrer tout
                </Button>
              </div>

              <DataTableShell
                title="Liste des étudiants"
                description={`${students.length} étudiant(s) — ${evaluationType} / ${evaluationLibelle}`}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left">Matricule</th>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left w-32">Note (0–20)</th>
                      <th className="px-3 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr
                        key={s.personId}
                        className="border-b last:border-0 hover:bg-[var(--surface-secondary)]"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="px-3 py-2 font-mono text-[var(--foreground)]">{s.matricule}</td>
                        <td className="px-3 py-2 text-[var(--foreground)]">{s.nom}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            step={0.01}
                            value={noteValues[s.personId] ?? ''}
                            onChange={(e) => setNoteValues((prev) => ({ ...prev, [s.personId]: e.target.value }))}
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => handleSave(s.personId)} disabled={saving}>
                            Enregistrer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTableShell>
            </FormSectionCard>
          )}
        </>
      )}
    </div>
  );
}
