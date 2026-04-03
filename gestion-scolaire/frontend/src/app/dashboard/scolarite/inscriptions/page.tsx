/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BadgeStatus } from '@/components/ui/badge-status';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { Icon } from '@/components/ui/icons';
import { BackLink } from '@/components/ui/back-link';

const STATUT_LABEL: Record<string, string> = {
  INSCRIT: 'En attente',
  VALIDE: 'Validée',
  CONFIRMEE: 'Confirmée',
  PROVISOIRE: 'Provisoire',
  ANNULEE: 'Annulée',
};

type Formation = { id: string; code: string; nom: string };
type Semestre = { id: string; numero: number };
type Maquette = { id: string; code: string; anneeRef: number; semestre?: Semestre };
type Cohort = { id: string; nom: string; annee: number };
type Person = { id: string; matricule: string; user?: { firstName: string; lastName: string } };
type Inscription = {
  id: string;
  statut: string;
  anneeUniv: number;
  person: Person & { user?: { email: string } };
  formation: Formation;
  maquette: Maquette;
  semestre: Semestre;
};

export default function InscriptionsPage() {
  const toast = useToast();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [maquettes, setMaquettes] = useState<Maquette[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<Person[]>([]);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAnnee, setFilterAnnee] = useState<number | 'all'>('all');
  const [filterFormation, setFilterFormation] = useState<string>('all');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [form, setForm] = useState({
    personId: '',
    formationId: '',
    maquetteId: '',
    semestreId: '',
    cohortId: '',
    anneeUniv: new Date().getFullYear(),
  });

  useEffect(() => {
    Promise.all([
      api<Formation[]>('/formations'),
      api<Cohort[]>('/inscriptions/cohorts'),
      api<Person[]>('/persons?type=STUDENT'),
      api<Inscription[]>('/inscriptions'),
    ])
      .then(([f, c, s, i]) => {
        setFormations(f);
        setCohorts(c);
        setStudents(s);
        setInscriptions(i);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.formationId) return;
    api<{ semestres: { maquettes: (Maquette & { semestre: Semestre })[] }[] }>(`/formations/${form.formationId}`)
      .then((f) => {
        const maqs = (f.semestres || []).flatMap((s) => (s.maquettes || []).map((m) => ({ ...m, semestre: m.semestre || { id: (s as { id?: string }).id || '', numero: (s as { numero?: number }).numero ?? 0 } })));
        setMaquettes(maqs);
        if (maqs[0]) {
          const sem = maqs[0].semestre;
          setForm((prev) => ({ ...prev, maquetteId: maqs[0].id, semestreId: sem?.id || '' }));
        }
      })
      .catch(() => setMaquettes([]));
  }, [form.formationId]);

  useEffect(() => {
    const maq = maquettes.find((m) => m.id === form.maquetteId);
    if (maq?.semestre && form.semestreId !== maq.semestre.id) {
      setForm((prev) => ({ ...prev, semestreId: maq.semestre!.id }));
    }
  }, [form.maquetteId, maquettes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api<Inscription>('/inscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          cohortId: form.cohortId || undefined,
        }),
      });
      setInscriptions((prev) => [created, ...prev]);
      setShowForm(false);
      toast.success('Inscription créée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de l’inscription.');
    }
  };

  const handleAnnuler = async (id: string) => {
    if (!confirm('Annuler cette inscription ?')) return;
    try {
      await api(`/inscriptions/${id}/annuler`, { method: 'PATCH' });
      setInscriptions((prev) => prev.map((i) => (i.id === id ? { ...i, statut: 'ANNULEE' } : i)));
      toast.success('Inscription annulée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’annulation.');
    }
  };

  const filtered = useMemo(() => {
    return inscriptions.filter((i) => {
      if (filterAnnee !== 'all' && i.anneeUniv !== filterAnnee) return false;
      if (filterFormation !== 'all' && i.formation.id !== filterFormation) return false;
      if (filterStatut !== 'all' && i.statut !== filterStatut) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${i.person.matricule} ${i.person.user?.firstName ?? ''} ${i.person.user?.lastName ?? ''} ${i.formation.code}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [inscriptions, filterAnnee, filterFormation, filterStatut, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const availableAnnees = Array.from(new Set(inscriptions.map((i) => i.anneeUniv))).sort((a, b) => b - a);

  const columns: DataTableColumn<Inscription>[] = [
    { key: 'etudiant', label: 'Étudiant', render: (i) => `${i.person.matricule} — ${i.person.user ? `${i.person.user.firstName} ${i.person.user.lastName}` : ''}` },
    { key: 'formation', label: 'Formation', render: (i) => i.formation.code },
    { key: 'maquette', label: 'Maquette', render: (i) => i.maquette.code },
    { key: 'sem', label: 'Sem.', render: (i) => `S${i.semestre.numero}` },
    { key: 'annee', label: 'Année', render: (i) => String(i.anneeUniv) },
    {
      key: 'statut',
      label: 'Statut',
      render: (i) => <BadgeStatus status={i.statut}>{STATUT_LABEL[i.statut] ?? i.statut}</BadgeStatus>,
    },
    {
      key: 'actions',
      label: '',
      render: (i) =>
        i.statut !== 'ANNULEE' ? (
          <button
            type="button"
            onClick={() => handleAnnuler(i.id)}
            className="text-[var(--color-danger)] text-xs sm:text-sm hover:underline"
          >
            Annuler
          </button>
        ) : null,
    },
  ];

  if (loading) return <Spinner label="Chargement des inscriptions..." />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <BackLink href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour scolarité</BackLink>
      <PageHeader
        title="Inscriptions"
        description="Inscrire un étudiant à une formation pour une année universitaire. Une fois validée, l'inscription peut être affectée à une classe (Pédagogie → Classes)."
      >
        <Button variant="primary" size="md" onClick={() => setShowForm(!showForm)} leftIcon={!showForm ? <Icon name="plus" className="w-4 h-4" /> : undefined}>
          {showForm ? 'Fermer le formulaire' : 'Nouvelle inscription'}
        </Button>
      </PageHeader>

      {showForm && (
        <Card
          title="Inscrire un étudiant"
          description="Sélectionnez un étudiant, une formation et la maquette correspondant à l'année universitaire."
        >
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Étudiant</label>
              <select
                value={form.personId}
                onChange={(e) => setForm({ ...form, personId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.matricule} - {s.user ? `${s.user.firstName} ${s.user.lastName}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Formation</label>
              <select
                value={form.formationId}
                onChange={(e) => setForm({ ...form, formationId: e.target.value, maquetteId: '', semestreId: '' })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Maquette</label>
              <select
                value={form.maquetteId}
                onChange={(e) => setForm({ ...form, maquetteId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {maquettes.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} ({m.anneeRef})</option>
                ))}
              </select>
            </div>
            {form.semestreId && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Semestre</label>
                <p className="px-3 py-2 bg-slate-50 rounded text-slate-700">
                  S{maquettes.find((m) => m.id === form.maquetteId)?.semestre?.numero ?? '-'}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Année universitaire</label>
              <input
                type="number"
                value={form.anneeUniv}
                onChange={(e) => setForm({ ...form, anneeUniv: +e.target.value })}
                className="w-full px-3 py-2 border rounded bg-slate-50 text-slate-700"
                min={2020}
                max={2030}
                readOnly
              />
              <p className="mt-1 text-xs text-slate-500">Basée sur l&apos;année de la maquette sélectionnée.</p>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Cohorte (optionnel)</label>
              <select
                value={form.cohortId}
                onChange={(e) => setForm({ ...form, cohortId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- Aucune --</option>
                {cohorts.filter((c) => c.annee === form.anneeUniv).map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          <div className="md:col-span-2 mt-4">
            <Button type="submit">Inscrire</Button>
          </div>
          </form>
        </Card>
      )}

      <Card
        title="Liste des inscriptions"
        description={`${filtered.length} inscription(s)`}
        className="space-y-3"
        headerRight={
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher (nom, matricule, formation)"
              className="w-52 sm:w-64 px-3 py-1.5 rounded-lg border text-sm text-[var(--foreground)]"
              style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-sidebar)' }}
            />
            <select
              className="px-2.5 py-1.5 rounded-lg border text-sm text-[var(--foreground)]"
              style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-sidebar)' }}
              value={filterFormation}
              onChange={(e) => {
                setFilterFormation(e.target.value || 'all');
                setPage(1);
              }}
            >
              <option value="all">Toutes formations</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code}
                </option>
              ))}
            </select>
            <select
              className="px-2.5 py-1.5 rounded-lg border text-sm text-[var(--foreground)]"
              style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-sidebar)' }}
              value={filterAnnee}
              onChange={(e) => {
                const v = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setFilterAnnee(v);
                setPage(1);
              }}
            >
              <option value="all">Toutes années</option>
              {availableAnnees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              className="px-2.5 py-1.5 rounded-lg border text-sm text-[var(--foreground)]"
              style={{ borderColor: 'var(--color-border-subtle)', backgroundColor: 'var(--color-sidebar)' }}
              value={filterStatut}
              onChange={(e) => {
                setFilterStatut(e.target.value || 'all');
                setPage(1);
              }}
            >
              <option value="all">Tous statuts</option>
              {Object.keys(STATUT_LABEL).map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <DataTable<Inscription>
          columns={columns}
          data={paginated}
          keyExtractor={(i) => i.id}
          empty={
            <EmptyState
              title="Aucune inscription"
              description="Aucune inscription ne correspond aux filtres actuels. Créez une nouvelle inscription ou modifiez les filtres."
              action={
                    <Button variant="secondary" size="sm" onClick={() => setShowForm(true)} leftIcon={<Icon name="plus" className="w-3.5 h-3.5" />}>
                        Nouvelle inscription
                      </Button>
              }
            />
          }
          pagination={
            filtered.length > pageSize ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                itemLabel="inscription(s)"
              />
            ) : undefined
          }
        />
      </Card>
    </div>
  );
}
