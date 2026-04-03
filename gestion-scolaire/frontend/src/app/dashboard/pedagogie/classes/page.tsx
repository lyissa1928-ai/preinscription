'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BackLink } from '@/components/ui/back-link';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormGroup } from '@/components/ui/form-group';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Formation = { id: string; code: string; nom: string };
type Campus = { id: string; code: string; nom: string; regionNom?: string | null; departementNom?: string | null };
type Cohort = { id: string; nom: string; section?: string; annee: number; effectifMax?: number | null; campusId?: string | null; formation?: Formation; campus?: Campus | null };

function parseCsvClasses(text: string): Array<{ formationCode: string; annee: number; nom: string; section?: string; effectifMax?: number }> {
  const lines = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const get = (row: string[], key: string) => (row[idx(key)] ?? '').trim();
  return lines.slice(1).map((line) => {
    const row = line.split(';').map((c) => c.trim());
    const eff = parseInt(get(row, 'effectifmax'), 10);
    return {
      formationCode: get(row, 'formationcode'),
      annee: parseInt(get(row, 'annee'), 10) || new Date().getFullYear(),
      nom: get(row, 'nom'),
      section: get(row, 'section') || undefined,
      effectifMax: Number.isFinite(eff) && eff >= 1 ? eff : undefined,
    };
  }).filter((r) => r.nom && r.formationCode);
}

export default function PedagogieClassesPage() {
  const toast = useToast();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [createForm, setCreateForm] = useState({ nom: '', section: '', formationId: '', campusId: '', annee: new Date().getFullYear(), effectifMax: 30 });
  const [bulkCohortId, setBulkCohortId] = useState('');
  const [numeroCartesText, setNumeroCartesText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ updated: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nom: '', section: '', formationId: '', campusId: '', annee: new Date().getFullYear(), effectifMax: 30 });
  const [importCsv, setImportCsv] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [anneeFilter, setAnneeFilter] = useState<string>('');

  const filtered = useMemo(() => {
    let list = cohorts;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          (c.section && c.section.toLowerCase().includes(q)) ||
          (c.formation?.code?.toLowerCase().includes(q)) ||
          (c.formation?.nom?.toLowerCase().includes(q)),
      );
    }
    if (formationFilter) list = list.filter((c) => c.formation?.id === formationFilter);
    if (campusFilter) list = list.filter((c) => c.campusId === campusFilter);
    if (anneeFilter) {
      const y = parseInt(anneeFilter, 10);
      if (!Number.isNaN(y)) list = list.filter((c) => c.annee === y);
    }
    return list;
  }, [cohorts, search, formationFilter, campusFilter, anneeFilter]);

  const kpis = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYear = cohorts.filter((c) => c.annee === currentYear).length;
    return { total: cohorts.length, thisYear };
  }, [cohorts]);

  const loadCohorts = () => {
    api<Cohort[]>('/inscriptions/cohorts')
      .then(setCohorts)
      .catch(() => setCohorts([]));
  };

  const loadFormations = () => {
    api<Formation[]>('/formations?includePending=true')
      .then((f) => setFormations(Array.isArray(f) ? f : []))
      .catch(() => setFormations([]));
  };

  useEffect(() => {
    Promise.all([
      api<Formation[]>('/formations?includePending=true'),
      api<Cohort[]>('/inscriptions/cohorts'),
      api<Campus[]>('/campuses'),
    ])
      .then(([f, c, camp]) => {
        setFormations(Array.isArray(f) ? f : []);
        setCohorts(Array.isArray(c) ? c : []);
        setCampuses(Array.isArray(camp) ? camp : []);
      })
      .catch(() => {
        setFormations([]);
        setCohorts([]);
        setCampuses([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.formationId || !createForm.nom.trim()) {
      toast.error('Nom et formation requis.');
      return;
    }
    const effectifMax = createForm.effectifMax >= 1 ? createForm.effectifMax : 30;
    try {
      await api('/inscriptions/cohorts', {
        method: 'POST',
        body: JSON.stringify({
          nom: createForm.nom.trim(),
          section: createForm.section.trim() || undefined,
          formationId: createForm.formationId,
          campusId: createForm.campusId || null,
          annee: createForm.annee,
          effectifMax,
        }),
      });
      setShowCreate(false);
      setCreateForm({ nom: '', section: '', formationId: '', campusId: '', annee: new Date().getFullYear(), effectifMax: 30 });
      loadCohorts();
      toast.success('Classe créée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = numeroCartesText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!bulkCohortId || lines.length === 0) {
      toast.error('Sélectionnez une classe et saisissez au moins un numéro de carte étudiant.');
      return;
    }
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await api<{ updated: number }>('/inscriptions/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ cohortId: bulkCohortId, numeroCartes: lines }),
      });
      setBulkResult(res);
      setNumeroCartesText('');
      toast.success(`${res.updated} inscription(s) assignée(s) à la classe.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadFile('/inscriptions/cohorts/template', 'template-classes.xlsx').then(() => toast.success('Modèle téléchargé')).catch((e) => toast.error(e?.message || 'Erreur'));
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = parseCsvClasses(importCsv);
    if (items.length === 0) {
      toast.error('Aucune ligne valide (colonnes : formationCode;annee;nom;section)');
      return;
    }
    try {
      const res = await api<{ created: number; errors: string[] }>('/inscriptions/cohorts/bulk', { method: 'POST', body: JSON.stringify({ items }) });
      setImportResult(res);
      setImportCsv('');
      loadCohorts();
      toast.success(`${res.created} classe(s) créée(s).${res.errors?.length ? ` ${res.errors.length} erreur(s).` : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleUpdateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const effectifMax = editForm.effectifMax >= 1 ? editForm.effectifMax : undefined;
    try {
      await api(`/inscriptions/cohorts/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ nom: editForm.nom, section: editForm.section || undefined, formationId: editForm.formationId, campusId: editForm.campusId || null, annee: editForm.annee, effectifMax }),
      });
      setEditingId(null);
      loadCohorts();
      toast.success('Classe modifiée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteCohort = async (id: string) => {
    if (!confirm('Supprimer cette classe ?')) return;
    try {
      await api(`/inscriptions/cohorts/${id}`, { method: 'DELETE' });
      loadCohorts();
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
      toast.success('Classe supprimée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error('Aucune classe sélectionnée.'); return; }
    if (!confirm(`Supprimer ${ids.length} classe(s) ?`)) return;
    try {
      const res = await api<{ deleted: number }>('/inscriptions/cohorts/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) });
      setSelectedIds(new Set());
      loadCohorts();
      toast.success(`${res.deleted} classe(s) supprimée(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const hasActiveFilters =
    search.trim() !== '' || formationFilter !== '' || campusFilter !== '' || anneeFilter !== '';
  const resetFilters = () => {
    setSearch('');
    setFormationFilter('');
    setCampusFilter('');
    setAnneeFilter('');
  };
  const anneesUniques = useMemo(
    () => [...new Set(cohorts.map((c) => c.annee))].sort((a, b) => b - a),
    [cohorts],
  );

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink href="/dashboard/pedagogie" className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
          ← Retour pédagogie
        </BackLink>
        <p className="text-sm text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <BackLink href="/dashboard/pedagogie" className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
        ← Retour pédagogie
      </BackLink>
      <PageHeader
        title="Classes"
        description="Création de classes (cohortes), import groupé et assignation d'étudiants validés."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
            Modèle CSV
          </Button>
          <Button
            variant={showCreate ? 'secondary' : 'primary'}
            onClick={() => {
              setShowCreate(!showCreate);
              if (!showCreate) loadFormations();
            }}
          >
            {showCreate ? 'Annuler' : '+ Créer une classe'}
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <KpiCard label="Total classes" value={kpis.total.toLocaleString('fr-FR')} icon="table-cells" variant="default" />
        <KpiCard
          label={`Classes ${new Date().getFullYear()}`}
          value={kpis.thisYear.toLocaleString('fr-FR')}
          icon="calendar-days"
          variant="accent"
        />
      </div>

      <FilterPanel onReset={hasActiveFilters ? resetFilters : undefined}>
        <FormGroup label="Recherche" className="min-w-[180px]">
          <Input placeholder="Nom, section, formation..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </FormGroup>
        <FormGroup label="Formation" className="min-w-[180px]">
          <Select value={formationFilter} onChange={(e) => setFormationFilter(e.target.value)}>
            <option value="">Toutes</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{[f.code, f.nom].filter(Boolean).join(' – ')}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Campus" className="min-w-[160px]">
          <Select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)}>
            <option value="">Tous</option>
            {campuses.map((camp) => (
              <option key={camp.id} value={camp.id}>{camp.code} – {camp.nom}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup label="Année" className="min-w-[100px]">
          <Select value={anneeFilter} onChange={(e) => setAnneeFilter(e.target.value)}>
            <option value="">Toutes</option>
            {anneesUniques.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </Select>
        </FormGroup>
      </FilterPanel>

      {showCreate && (
        <FormSectionCard title="Nouvelle classe" description="Nom, section, formation et campus. Effectif max : création auto de sections (B, C…).">
          <form onSubmit={handleCreateCohort} className="space-y-4">
          {formations.length === 0 && (
            <p className="mb-3 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Aucune formation disponible. Créez d’abord une formation dans <Link href="/dashboard/scolarite/formations" className="font-medium underline">Scolarité → Filières et formations</Link>.
            </p>
          )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormGroup label="Nom" required>
                <Input value={createForm.nom} onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))} placeholder="L1 Génie Civil" />
              </FormGroup>
              <FormGroup label="Section">
                <Input value={createForm.section} onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))} placeholder="A ou B" />
              </FormGroup>
              <FormGroup label="Formation" required>
                <Select value={createForm.formationId} onChange={(e) => setCreateForm((f) => ({ ...f, formationId: e.target.value }))} required>
                  <option value="">— Choisir —</option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>{[f.code, f.nom].filter(Boolean).join(' – ')}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Campus">
                <Select value={createForm.campusId} onChange={(e) => setCreateForm((f) => ({ ...f, campusId: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {campuses.map((camp) => (
                    <option key={camp.id} value={camp.id}>{camp.code} – {camp.nom}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Année">
                <Input type="number" value={createForm.annee} onChange={(e) => setCreateForm((f) => ({ ...f, annee: parseInt(e.target.value, 10) || new Date().getFullYear() }))} />
              </FormGroup>
              <FormGroup label="Effectif maximum" required hint="Nouvelle section auto si plein.">
                <Input type="number" min={1} value={createForm.effectifMax} onChange={(e) => setCreateForm((f) => ({ ...f, effectifMax: parseInt(e.target.value, 10) || 30 }))} />
              </FormGroup>
            </div>
            <Button type="submit">Créer</Button>
          </form>
        </FormSectionCard>
      )}

      {editingId && (
        <FormSectionCard title="Modifier la classe">
          <form onSubmit={handleUpdateCohort} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormGroup label="Nom" required>
                <Input value={editForm.nom} onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))} required />
              </FormGroup>
              <FormGroup label="Section">
                <Input value={editForm.section} onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))} />
              </FormGroup>
              <FormGroup label="Formation" required>
                <Select value={editForm.formationId} onChange={(e) => setEditForm((f) => ({ ...f, formationId: e.target.value }))} required>
                  <option value="">— Choisir —</option>
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>{f.code} – {f.nom}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Campus">
                <Select value={editForm.campusId} onChange={(e) => setEditForm((f) => ({ ...f, campusId: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {campuses.map((camp) => (
                    <option key={camp.id} value={camp.id}>{camp.code} – {camp.nom}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Année">
                <Input type="number" value={editForm.annee} onChange={(e) => setEditForm((f) => ({ ...f, annee: parseInt(e.target.value, 10) || new Date().getFullYear() }))} />
              </FormGroup>
              <FormGroup label="Effectif maximum">
                <Input type="number" min={1} value={editForm.effectifMax} onChange={(e) => setEditForm((f) => ({ ...f, effectifMax: parseInt(e.target.value, 10) || 30 }))} />
              </FormGroup>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Enregistrer</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Annuler</Button>
            </div>
          </form>
        </FormSectionCard>
      )}

      <DataTableShell
        title="Liste des classes"
        description={`${filtered.length} classe(s)${hasActiveFilters ? ' (filtres actifs)' : ''}`}
        toolbar={selectedIds.size > 0 ? <Button variant="danger" size="sm" onClick={handleBulkDelete}>Supprimer ({selectedIds.size})</Button> : undefined}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-medium text-[var(--foreground-muted)]" style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} aria-label="Tout sélectionner" /></th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3">Formation</th>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Année</th>
                <th className="px-4 py-3">Effectif max</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">Aucune classe{hasActiveFilters ? ' pour ces critères.' : ''}</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-[var(--surface-secondary)]" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} aria-label={`Sélectionner ${c.nom}${c.section ? ` ${c.section}` : ''}`} /></td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{c.nom}{c.section ? ` ${c.section}` : ''}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.formation ? `${c.formation.code} – ${c.formation.nom}` : '-'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.campus ? `${c.campus.code} – ${c.campus.nom}` : '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.annee}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.effectifMax != null ? c.effectifMax : '–'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => { setEditingId(c.id); setEditForm({ nom: c.nom, section: c.section ?? '', formationId: c.formation?.id ?? '', campusId: c.campusId ?? '', annee: c.annee, effectifMax: c.effectifMax ?? 30 }); }} className="mr-2 text-sm text-[var(--color-primary)] hover:underline">Modifier</button>
                      <button type="button" onClick={() => handleDeleteCohort(c.id)} className="text-sm text-[var(--color-danger)] hover:underline">Supprimer</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <FormSectionCard title="Import par lot (CSV)" description="Colonnes : formationCode ; annee ; nom ; section. Utilisez le code de la formation (ex. L1-GC).">
        <form onSubmit={handleImportCsv} className="space-y-4">
          <FormGroup label="Contenu CSV (point-virgule)">
            <textarea value={importCsv} onChange={(e) => setImportCsv(e.target.value)} className="w-full rounded-[var(--radius-input)] border px-3 py-2 font-mono text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--surface)', minHeight: 140 }} rows={6} placeholder="formationCode;annee;nom;section&#10;L1-GC;2024;L1 Génie Civil;A" />
          </FormGroup>
          <Button type="submit">Importer</Button>
        </form>
        {importResult && (
          <div className="mt-4 rounded-lg border p-3 text-sm" style={{ backgroundColor: 'var(--surface-secondary)', borderColor: 'var(--color-border)' }}>
            <p className="text-[var(--foreground)]"><strong>{importResult.created}</strong> classe(s) créée(s).</p>
            {importResult.errors?.length ? <p className="mt-1 text-[var(--color-danger)]">{importResult.errors.join(' ')}</p> : null}
          </div>
        )}
      </FormSectionCard>

      <FormSectionCard title="Assigner des étudiants à une classe" description="Numéros de carte (un par ligne ou virgules). Inscriptions VALIDE uniquement. Nouvelles sections auto si effectif max atteint.">
        <form onSubmit={handleBulkAssign} className="space-y-4">
          <FormGroup label="Classe cible" className="max-w-md">
            <Select value={bulkCohortId} onChange={(e) => setBulkCohortId(e.target.value)} required>
              <option value="">— Choisir une classe —</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}{c.section ? ` ${c.section}` : ''} ({c.annee})</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup label="Numéros de carte étudiant" className="max-w-md">
            <textarea value={numeroCartesText} onChange={(e) => setNumeroCartesText(e.target.value)} className="w-full rounded-[var(--radius-input)] border px-3 py-2 font-mono text-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--surface)', minHeight: 120 }} rows={5} placeholder="2024-001234&#10;2024-001235" />
          </FormGroup>
          <Button type="submit" disabled={bulkLoading}>{bulkLoading ? 'Assignation...' : 'Assigner à la classe'}</Button>
        </form>
        {bulkResult !== null && (
          <div className="mt-4 rounded-lg border border-[var(--color-success)] bg-[var(--color-success-soft)] p-3 text-sm text-[var(--color-success)]">
            <strong>{bulkResult.updated}</strong> inscription(s) assignée(s) à la classe.
          </div>
        )}
      </FormSectionCard>
    </div>
  );
}
