'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useUserRole } from '@/hooks/useUserRole';
import { canWriteStructure, canLock as canLockFormation } from '@/config/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';

type CohortRow = {
  id: string;
  nom: string;
  section: string;
  annee: number;
  effectifMax: number | null;
  campus: { id: string; code: string; nom: string } | null;
  _count: { inscriptions: number };
};

type FormationWithSemestres = {
  id: string;
  code: string;
  nom: string;
  cycle: string;
  dureeSemestres: number;
  structureManaged?: boolean;
  verrouille?: boolean;
  filiere?: { id: string; code: string; nom: string; verrouille?: boolean };
  cohorts?: CohortRow[];
  semestres: {
    id: string;
    numero: number;
    verrouille?: boolean;
    statut?: string;
    maquettes: {
      id: string;
      code: string;
      anneeRef: number;
      verrouille?: boolean;
      statut?: string;
      statutValidation?: string;
    }[];
  }[];
};

export default function FormationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [formation, setFormation] = useState<FormationWithSemestres | null>(null);
  const [loading, setLoading] = useState(true);
  const { role: userRole } = useUserRole();
  const [showSemestreForm, setShowSemestreForm] = useState(false);
  const [showMaquetteForm, setShowMaquetteForm] = useState<string | null>(null);
  const [formSemestre, setFormSemestre] = useState({ numero: 1 });
  const [formMaquette, setFormMaquette] = useState({
    code: '',
    anneeRef: new Date().getFullYear(),
    statut: 'active' as 'active' | 'archivee',
  });
  const [showEditFormation, setShowEditFormation] = useState(false);
  const [formFormation, setFormFormation] = useState({ code: '', nom: '', cycle: 'L', dureeSemestres: 6 });

  const canWrite = canWriteStructure(userRole);
  const canLockUnlock = canLockFormation(userRole);
  const filiereLocked = formation?.filiere?.verrouille;
  const readOnly = filiereLocked || formation?.verrouille;
  const structureManaged = Boolean(formation?.structureManaged);

  /** Regroupe les cohortes par année : une même année peut avoir plusieurs classes (sections, intitulés différents = plusieurs rentrées). */
  const cohortsByAnnee = useMemo(() => {
    const list = formation?.cohorts ?? [];
    const map = new Map<number, CohortRow[]>();
    for (const c of list) {
      const arr = map.get(c.annee) ?? [];
      arr.push(c);
      map.set(c.annee, arr);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [formation]);

  const load = () => {
    api<FormationWithSemestres>(`/formations/${id}`)
      .then(setFormation)
      .catch(() => router.push('/dashboard/scolarite/formations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (formation) {
      setFormFormation({
        code: formation.code,
        nom: formation.nom,
        cycle: formation.cycle,
        dureeSemestres: formation.dureeSemestres,
      });
    }
  }, [formation]);

  const handleUpdateFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/formations/${id}`, { method: 'PATCH', body: JSON.stringify(formFormation) });
      setShowEditFormation(false);
      load();
      toast.success('Formation mise à jour.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteFormation = async () => {
    if (!confirm('Supprimer cette formation et tout son contenu (semestres, maquettes, UE, EC) ? Cette action est irréversible.')) return;
    try {
      await api(`/formations/${id}`, { method: 'DELETE' });
      toast.success('Formation supprimée.');
      router.push('/dashboard/scolarite/formations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreateSemestre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/formations/${id}/semestres`, { method: 'POST', body: JSON.stringify(formSemestre) });
      setShowSemestreForm(false);
      setFormSemestre({ numero: 1 });
      load();
      toast.success('Semestre créé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreateMaquette = async (e: React.FormEvent, semestreId: string) => {
    e.preventDefault();
    try {
      await api(`/formations/semestres/${semestreId}/maquettes`, {
        method: 'POST',
        body: JSON.stringify({ code: formMaquette.code, anneeRef: formMaquette.anneeRef, statut: formMaquette.statut }),
      });
      setShowMaquetteForm(null);
      setFormMaquette({ code: '', anneeRef: new Date().getFullYear(), statut: 'active' });
      load();
      toast.success(formMaquette.statut === 'active' ? 'Maquette active créée.' : 'Maquette créée (archivée).');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleToggleFormationVerrouille = async () => {
    try {
      await api(`/formations/${id}/verrouiller`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleToggleSemestreVerrouille = async (semestreId: string) => {
    try {
      await api(`/formations/semestres/${semestreId}/verrouiller`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteSemestre = async (semestreId: string) => {
    if (!confirm('Supprimer ce semestre et toutes ses maquettes ?')) return;
    try {
      await api(`/formations/semestres/${semestreId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteMaquette = async (maquetteId: string) => {
    if (!confirm('Supprimer cette maquette et tout son contenu (UE, EC) ?')) return;
    try {
      await api(`/formations/maquettes/${maquetteId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleToggleVerrouille = async (maquetteId: string) => {
    try {
      await api(`/formations/maquettes/${maquetteId}/verrouiller`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const openMaquetteForm = (semestreNumero: number, semestreId: string) => {
    const y = new Date().getFullYear();
    setFormMaquette({ code: `S${semestreNumero}-${y}`, anneeRef: y, statut: 'active' });
    setShowMaquetteForm(semestreId);
  };

  const handleMaquetteStatut = async (maquetteId: string, statut: 'active' | 'archivee') => {
    try {
      await api(`/formations/maquettes/${maquetteId}`, { method: 'PATCH', body: JSON.stringify({ statut }) });
      load();
      toast.success(statut === 'active' ? 'Maquette réactivée.' : 'Maquette archivée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDemandeDeverrouillage = async (maquetteId: string) => {
    const motif = prompt('Motif de la demande (optionnel) :');
    try {
      await api(`/formations/maquettes/${maquetteId}/demande-deverrouillage`, {
        method: 'POST',
        body: JSON.stringify({ motif: motif || undefined }),
      });
      toast.success('Demande envoyée. L\'administrateur sera notifié.');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading || !formation) {
    return (
      <div>
        <Link href="/dashboard/scolarite/formations" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">← Retour aux formations</Link>
        <p className="mt-4 text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/dashboard/scolarite/formations" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] inline-block">← Retour aux formations</Link>

      <PageHeader
        title={`${formation.code} — ${formation.nom}`}
        description={
          readOnly
            ? 'Lecture seule.'
            : structureManaged
              ? `Structure normalisée • Cycle ${formation.cycle} • ${formation.dureeSemestres} semestres par niveau — modifiez les maquettes pour les cours.`
              : `Cycle ${formation.cycle} • ${formation.dureeSemestres} semestres`
        }
      >
        <div className="flex flex-wrap gap-2 items-center">
          {structureManaged && (
            <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-1 font-medium mr-1">Structure normalisée</span>
          )}
          {canWrite && !readOnly && (
            <>
              {!structureManaged && (
                <Button variant="secondary" size="md" leftIcon={<Icon name="pencil" className="w-4 h-4" />} onClick={() => setShowEditFormation(true)}>
                  Modifier la formation
                </Button>
              )}
              <Button variant="danger" size="md" leftIcon={<Icon name="trash" className="w-4 h-4" />} onClick={handleDeleteFormation}>
                Supprimer la formation
              </Button>
            </>
          )}
          {canLockUnlock && !filiereLocked && (
            <Button variant="ghost" size="md" leftIcon={<Icon name="lock-closed" className="w-4 h-4" />} onClick={handleToggleFormationVerrouille} title={formation.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
              {formation.verrouille ? 'Déverrouiller' : 'Verrouiller'}
            </Button>
          )}
        </div>
      </PageHeader>

      {(formation.verrouille || filiereLocked) && (
        <p className="flex items-center gap-2 text-amber-600 text-sm">
          <Icon name="lock-closed" className="w-4 h-4" /> Formation ou filière verrouillée
        </p>
      )}

      {structureManaged && !readOnly && (
        <p className="text-sm text-[var(--foreground-muted)] rounded-lg border p-3" style={{ borderColor: 'var(--color-border)' }}>
          Les niveaux, intitulés, codes et semestres sont imposés par le système. Concentrez-vous sur les <strong>maquettes</strong> (UE / EC) pour chaque semestre.
        </p>
      )}

      {canWrite && showEditFormation && !structureManaged && (
        <Card title="Modifier la formation" description="Code, nom, cycle et durée.">
          <form onSubmit={handleUpdateFormation} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Code</label>
                <input value={formFormation.code} onChange={(e) => setFormFormation((f) => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Nom</label>
                <input value={formFormation.nom} onChange={(e) => setFormFormation((f) => ({ ...f, nom: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Cycle</label>
                <select value={formFormation.cycle} onChange={(e) => setFormFormation((f) => ({ ...f, cycle: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }}>
                  <option value="L">L (Licence)</option>
                  <option value="M">M (Master)</option>
                  <option value="D">D (Doctorat)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Durée (semestres)</label>
                <input type="number" min={1} max={12} value={formFormation.dureeSemestres} onChange={(e) => setFormFormation((f) => ({ ...f, dureeSemestres: +e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="md">Enregistrer</Button>
              <Button type="button" variant="secondary" size="md" onClick={() => setShowEditFormation(false)}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      <section
        className="rounded-xl border bg-[var(--surface)] p-5"
        style={{ borderColor: 'var(--color-border)' }}
        aria-labelledby="formation-cohortes-heading"
      >
        <h2 id="formation-cohortes-heading" className="text-lg font-semibold text-[var(--foreground)] mb-1">
          Cohortes (classes)
        </h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          Liste par <strong>année universitaire</strong>. Si plusieurs cohortes figurent pour la même année (sections A/B/C, ou intitulés distincts), ce sont plusieurs classes / rentrées pour cette formation.
        </p>
        {cohortsByAnnee.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            Aucune cohorte encore créée pour cette formation. Créez des classes dans{' '}
            <Link href="/dashboard/pedagogie/classes" className="text-[var(--color-primary)] underline">
              Pédagogie → Classes / cohortes
            </Link>
            {' '}ou via{' '}
            <Link href="/dashboard/scolarite/inscriptions" className="text-[var(--color-primary)] underline">
              Scolarité → Inscriptions
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-6">
            {cohortsByAnnee.map(([annee, cohorts]) => (
              <div key={annee}>
                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <h3 className="text-base font-medium text-[var(--foreground)]">
                    Année universitaire {annee}–{annee + 1}
                  </h3>
                  {cohorts.length > 1 && (
                    <span className="text-xs font-medium rounded-full bg-violet-500/15 text-violet-800 dark:text-violet-300 px-2 py-0.5">
                      {cohorts.length} cohortes
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-left text-[var(--foreground-muted)]"
                        style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--color-border)' }}
                      >
                        <th className="px-3 py-2 font-medium">Classe</th>
                        <th className="px-3 py-2 font-medium">Section</th>
                        <th className="px-3 py-2 font-medium">Campus</th>
                        <th className="px-3 py-2 font-medium">Effectif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td className="px-3 py-2 text-[var(--foreground)] font-medium">{c.nom}</td>
                          <td className="px-3 py-2 text-[var(--foreground-muted)]">{c.section || '—'}</td>
                          <td className="px-3 py-2 text-[var(--foreground-muted)]">
                            {c.campus ? `${c.campus.code} — ${c.campus.nom}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-[var(--foreground-muted)]">
                            {c._count.inscriptions}
                            {c.effectifMax != null ? ` / ${c.effectifMax} max` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-[var(--foreground-muted)]">
          Gestion des classes :{' '}
          <Link href="/dashboard/pedagogie/classes" className="text-[var(--color-primary)] underline">
            Classes / cohortes
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Semestres &amp; maquettes actives</h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-2">
          Chaque semestre peut avoir plusieurs maquettes (une par année de référence). Les maquettes <strong>actives</strong> servent aux inscriptions et au contenu pédagogique (UE / EC). Ajoutez une maquette par semestre et par année, puis sur la fiche maquette utilisez <strong>Import par lot (Excel / CSV)</strong> ou la saisie individuelle des UE / EC.
        </p>
        {structureManaged && canWrite && !readOnly && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
            Structure Licence/Master : utilisez <strong>Ajouter maquette</strong> sous chaque semestre pour créer une nouvelle maquette (ex. année universitaire suivante). Le code est proposé automatiquement (S1-2026, S2-2026…).
          </p>
        )}

        <div className="space-y-4">
        {formation.semestres.map((s) => (
          <div key={s.id} className="rounded-xl border bg-[var(--surface)] p-5 transition-shadow hover:shadow-md" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
              <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                Semestre {s.numero}
                {s.verrouille && <span className="inline-flex items-center gap-1 text-amber-600 text-sm"><Icon name="lock-closed" className="w-4 h-4" /> Verrouillé</span>}
                {s.statut === 'PENDING' && <span className="text-amber-600 text-sm">(En attente)</span>}
              </h3>
              {canWrite && !readOnly && (
                <div className="flex flex-wrap gap-2">
                  {canLockUnlock && !filiereLocked && !formation.verrouille && (
                    <Button variant="ghost" size="sm" leftIcon={<Icon name="lock-closed" className="w-3.5 h-3.5" />} onClick={() => handleToggleSemestreVerrouille(s.id)} title={s.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
                      {s.verrouille ? 'Déverrouiller' : 'Verrouiller'}
                    </Button>
                  )}
                  {!formation.verrouille && !s.verrouille && !filiereLocked && showMaquetteForm !== s.id && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Icon name="plus" className="w-3.5 h-3.5" />}
                      onClick={() => openMaquetteForm(s.numero, s.id)}
                    >
                      Ajouter maquette
                    </Button>
                  )}
                  {!formation.verrouille && !s.verrouille && !filiereLocked && !structureManaged && (
                    <Button variant="danger" size="sm" leftIcon={<Icon name="trash" className="w-3.5 h-3.5" />} onClick={() => handleDeleteSemestre(s.id)}>
                      Supprimer semestre
                    </Button>
                  )}
                </div>
              )}
            </div>
            {canWrite && showMaquetteForm === s.id && (
              <form onSubmit={(e) => handleCreateMaquette(e, s.id)} className="mb-4 p-4 rounded-lg space-y-3 bg-[var(--surface-secondary)] border" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium text-[var(--foreground)]">Nouvelle maquette pour le semestre {s.numero}</p>
                <div className="flex gap-4 flex-wrap items-end">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Code</label>
                    <input value={formMaquette.code} onChange={(e) => setFormMaquette({ ...formMaquette, code: e.target.value })} placeholder="ex: S1-2026" className="px-3 py-2 rounded-lg border w-36 bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Année de référence</label>
                    <input type="number" value={formMaquette.anneeRef} onChange={(e) => setFormMaquette({ ...formMaquette, anneeRef: +e.target.value })} className="px-3 py-2 rounded-lg border w-28 bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} min={2020} max={2045} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Statut</label>
                    <select
                      value={formMaquette.statut}
                      onChange={(e) => setFormMaquette({ ...formMaquette, statut: e.target.value as 'active' | 'archivee' })}
                      className="px-3 py-2 rounded-lg border min-w-[10rem] bg-[var(--background)] text-[var(--foreground)]"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <option value="active">Active (utilisable)</option>
                      <option value="archivee">Archivée</option>
                    </select>
                  </div>
                  <Button type="submit" variant="primary" size="sm">Créer la maquette</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowMaquetteForm(null);
                      setFormMaquette({ code: '', anneeRef: new Date().getFullYear(), statut: 'active' });
                    }}
                  >
                    Annuler
                  </Button>
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">Une seule maquette par semestre et par année. Les maquettes actives restent visibles pour la saisie des UE / EC.</p>
              </form>
            )}
            <div className="flex flex-wrap gap-2">
              {s.maquettes.length === 0 ? (
                <p className="text-[var(--foreground-muted)] text-sm">
                  Aucune maquette pour ce semestre. Cliquez sur <strong>Ajouter maquette</strong>, ouvrez la maquette puis importez un fichier <strong>Excel ou CSV</strong> (séparateur point-virgule) pour les UE / EC.
                </p>
              ) : (
                s.maquettes.map((m) => {
                  const st = (m.statut || 'active').toLowerCase();
                  const isArchived = st === 'archivee' || st === 'archivée';
                  return (
                  <div key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-[var(--surface-secondary)]" style={{ borderColor: 'var(--color-border)' }}>
                    {m.verrouille && <span className="text-amber-600" title="Verrouillée">🔒</span>}
                    {m.statutValidation === 'PENDING' && <span className="text-amber-600 text-xs">(Validation en attente)</span>}
                    {!isArchived ? (
                      <span className="text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5">Active</span>
                    ) : (
                      <span className="text-xs font-medium rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 px-2 py-0.5">Archivée</span>
                    )}
                    <Link
                      href={`/dashboard/scolarite/formations/${id}/maquettes/${m.id}`}
                      className="font-medium text-blue-600 hover:underline"
                      title="UE / EC, import par lot Excel ou CSV, modification individuelle"
                    >
                      {m.code} ({m.anneeRef})
                    </Link>
                    {canWrite && !readOnly && (
                      <span className="text-xs text-[var(--foreground-muted)] hidden sm:inline">· import lot Excel/CSV sur la fiche</span>
                    )}
                    {canWrite && !readOnly && (
                      <>
                        {canLockUnlock && !filiereLocked && !formation.verrouille && !s.verrouille ? (
                          <button
                            onClick={() => handleToggleVerrouille(m.id)}
                            className="text-amber-600 text-xs hover:underline"
                            title={m.verrouille ? 'Déverrouiller' : 'Verrouiller'}
                          >
                            {m.verrouille ? '🔓 Déverr.' : '🔒 Verr.'}
                          </button>
                        ) : m.verrouille && !filiereLocked && !formation.verrouille && !s.verrouille && (
                          <button
                            onClick={() => handleDemandeDeverrouillage(m.id)}
                            className="text-blue-600 text-xs hover:underline"
                            title="Demander le déverrouillage à l'admin"
                          >
                            Demander déverr.
                          </button>
                        )}
                        {!s.verrouille && !formation.verrouille && !filiereLocked && !m.verrouille && (
                          <>
                            {!isArchived ? (
                              <button type="button" onClick={() => handleMaquetteStatut(m.id, 'archivee')} className="text-slate-600 text-xs hover:underline" title="Retirer des maquettes utilisées par défaut pour les nouvelles actions">
                                Archiver
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleMaquetteStatut(m.id, 'active')} className="text-emerald-700 text-xs hover:underline">
                                Réactiver
                              </button>
                            )}
                            <button onClick={() => handleDeleteMaquette(m.id)} className="text-red-600 text-xs hover:underline">Suppr.</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {canWrite && !readOnly && !structureManaged && (
        <Card title="Ajouter un semestre" description="Numéro du semestre dans la formation.">
          {!showSemestreForm ? (
            <Button variant="primary" size="md" leftIcon={<Icon name="plus" className="w-4 h-4" />} onClick={() => setShowSemestreForm(true)}>
              Ajouter un semestre
            </Button>
          ) : (
            <form onSubmit={handleCreateSemestre} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Numéro</label>
                <input type="number" value={formSemestre.numero} onChange={(e) => setFormSemestre({ numero: +e.target.value })} className="px-3 py-2 rounded-lg border w-24 bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} min={1} max={12} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md">Créer</Button>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowSemestreForm(false)}>Annuler</Button>
              </div>
            </form>
          )}
        </Card>
      )}
      </section>
    </div>
  );
}
