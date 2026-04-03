'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { canManageSalles } from '@/config/rbac';
import { getDashboardForRole } from '@/lib/role-dashboard';

type Campus = { id: string; code: string; nom: string; regionNom?: string | null; departementNom?: string | null };
type Salle = {
  id: string;
  nom: string;
  code: string | null;
  capacite: number;
  typeSalle: string | null;
  equipements: string | null;
  campus: Campus | null;
};

/** Colonnes attendues : nom;code;capacite;typeSalle;equipements — le campus est choisi sur la page, pas dans le fichier. */
function parseCsvSalles(text: string): Array<{ nom: string; code?: string; capacite?: number; typeSalle?: string; equipements?: string }> {
  const lines = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const get = (row: string[], key: string) => (row[idx(key)] ?? '').trim();
  return lines.slice(1).map((line) => {
    const row = line.split(';').map((c) => c.trim());
    return {
      nom: get(row, 'nom'),
      code: get(row, 'code') || undefined,
      capacite: parseInt(get(row, 'capacite'), 10) || undefined,
      typeSalle: get(row, 'typesalle') || undefined,
      equipements: get(row, 'equipements') || undefined,
    };
  }).filter((r) => r.nom);
}

export default function SallesPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const campusIdFromUrl = searchParams.get('campusId') ?? '';
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterCampusId, setFilterCampusId] = useState('');
  const [form, setForm] = useState({ nom: '', code: '', capacite: 30, campusId: '', equipements: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nom: '', code: '', capacite: 30, campusId: '', equipements: '' });
  const [importCsv, setImportCsv] = useState('');
  const [importResult, setImportResult] = useState<{ created: number; errors: string[]; campusNom?: string; campusCode?: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const canManage = canManageSalles(userRole);
  const backHref = userRole ? getDashboardForRole(userRole) : '/dashboard/scolarite';

  /** Campus pour l’import par lot : filtre OU paramètre d’URL (lien « Salles » depuis Campus). */
  const bulkCampusId = useMemo(() => filterCampusId || campusIdFromUrl, [filterCampusId, campusIdFromUrl]);

  const filtered = useMemo(() => {
    let list = salles;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.nom.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.campus?.nom && s.campus.nom.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [salles, search]);

  const kpis = useMemo(() => {
    const totalCapacite = salles.reduce((acc, s) => acc + s.capacite, 0);
    return { total: salles.length, totalCapacite };
  }, [salles]);

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      try {
        setUserRole((JSON.parse(u) as { role?: string }).role ?? '');
      } catch {
        setUserRole('');
      }
    } else {
      setUserRole('');
    }
  }, []);

  useEffect(() => {
    setFilterCampusId(campusIdFromUrl);
  }, [campusIdFromUrl]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      api<Campus[]>('/campuses', { token: token || undefined }).catch(() => []),
      api<Salle[]>(filterCampusId ? `/salles?campusId=${filterCampusId}` : '/salles', { token: token || undefined }),
    ])
      .then(([c, s]) => {
        setCampuses(Array.isArray(c) ? c : []);
        setSalles(Array.isArray(s) ? s : []);
      })
      .catch(() => setSalles([]))
      .finally(() => setLoading(false));
  }, [filterCampusId]);

  const loadSalles = () => {
    const token = localStorage.getItem('token');
    api<Salle[]>(filterCampusId ? `/salles?campusId=${filterCampusId}` : '/salles', { token: token || undefined })
      .then(setSalles)
      .catch(() => setSalles([]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const created = await api<Salle>('/salles', {
        method: 'POST',
        body: JSON.stringify({
          nom: form.nom,
          code: form.code || undefined,
          capacite: form.capacite,
          campusId: form.campusId || undefined,
          equipements: form.equipements || undefined,
        }),
        token: token || undefined,
      });
      setSalles((prev) => [...prev, created]);
      setShowForm(false);
      setForm({ nom: '', code: '', capacite: 30, campusId: '', equipements: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDownloadTemplate = () => {
    downloadFile('/salles/template', 'template-salles.xlsx').catch((e) => toast.error(e?.message || 'Erreur'));
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCampusId) {
      toast.error(
        'Choisissez un campus (liste « Campus ») ou ouvrez la page Salles depuis le lien du campus (?campusId=…). Une salle doit exister dans un campus déjà créé.',
      );
      return;
    }
    const items = parseCsvSalles(importCsv);
    if (items.length === 0) {
      toast.error('Aucune ligne valide (colonnes : nom;code;capacite;typeSalle;equipements — sans campus dans le fichier).');
      return;
    }
    try {
      const res = await api<{ created: number; errors: string[]; campusNom?: string; campusCode?: string }>('/salles/bulk', {
        method: 'POST',
        body: JSON.stringify({ campusId: bulkCampusId, items }),
      });
      setImportResult(res);
      setImportCsv('');
      loadSalles();
      toast.success(
        `${res.created} salle(s) créée(s) sur ${res.campusNom ?? 'le campus choisi'}${res.errors?.length ? ` — ${res.errors.length} erreur(s).` : '.'}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const importCampusLabel = useMemo(() => {
    if (!bulkCampusId) return null;
    const c = campuses.find((x) => x.id === bulkCampusId);
    return c ? `${c.code} — ${c.nom}` : bulkCampusId;
  }, [bulkCampusId, campuses]);

  const handleUpdateSalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const updated = await api<Salle>(`/salles/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nom: editForm.nom,
          code: editForm.code || undefined,
          capacite: editForm.capacite,
          campusId: editForm.campusId || undefined,
          equipements: editForm.equipements || undefined,
        }),
      });
      setSalles((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteSalle = async (id: string) => {
    if (!confirm('Supprimer cette salle ?')) return;
    try {
      await api(`/salles/${id}`, { method: 'DELETE' });
      setSalles((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((s) => { const n = new Set(s); n.delete(id); return n; });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { toast.error('Aucune salle sélectionnée.'); return; }
    if (!confirm(`Supprimer ${ids.length} salle(s) ?`)) return;
    try {
      const res = await api<{ deleted: number }>('/salles/bulk', { method: 'DELETE', body: JSON.stringify({ ids }) });
      setSelectedIds(new Set());
      loadSalles();
      toast.success(`${res.deleted} salle(s) supprimée(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  if (loading) return <p className="text-[var(--color-muted)]">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <BackLink href={backHref}>Retour</BackLink>
          <PageHeader title="Salles" description="Chaque salle peut être rattachée à un campus." />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="Total salles" value={kpis.total} />
        <KpiCard label="Capacité totale" value={kpis.totalCapacite} suffix="places" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterPanel onReset={search || filterCampusId ? () => { setSearch(''); setFilterCampusId(''); } : undefined}>
          <FormGroup label="Recherche" className="min-w-[200px]">
            <Input placeholder="Nom, code ou campus..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </FormGroup>
          <FormGroup label="Campus" className="min-w-[180px]">
            <Select value={filterCampusId} onChange={(e) => setFilterCampusId(e.target.value)}>
              <option value="">Tous les campus</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}</option>
              ))}
            </Select>
          </FormGroup>
        </FilterPanel>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/scolarite/campus">
            <Button variant="secondary" size="sm">Campus</Button>
          </Link>
          {canManage && (
            <Button type="button" variant="secondary" size="sm" onClick={handleDownloadTemplate}>
              Modèle CSV
            </Button>
          )}
          {canManage && selectedIds.size > 0 && (
            <Button type="button" variant="danger" size="sm" onClick={handleBulkDelete}>
              Supprimer ({selectedIds.size})
            </Button>
          )}
          {canManage && (
            <Button type="button" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Annuler' : '+ Nouvelle salle'}
            </Button>
          )}
        </div>
      </div>

      {editingId && (
        <FormSectionCard title="Modifier la salle" description="Campus, nom, code, capacité et équipements.">
          <form onSubmit={handleUpdateSalle} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormGroup label="Campus">
                <Select value={editForm.campusId} onChange={(e) => setEditForm({ ...editForm, campusId: e.target.value })}>
                  <option value="">Aucun</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Nom" required>
                <Input value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} required />
              </FormGroup>
              <FormGroup label="Code">
                <Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
              </FormGroup>
              <FormGroup label="Capacité">
                <Input type="number" value={editForm.capacite} onChange={(e) => setEditForm({ ...editForm, capacite: +e.target.value })} min={1} />
              </FormGroup>
              <FormGroup label="Équipements" className="md:col-span-2">
                <Input value={editForm.equipements} onChange={(e) => setEditForm({ ...editForm, equipements: e.target.value })} placeholder="Vidéoprojecteur, tableau..." />
              </FormGroup>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Enregistrer</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>Annuler</Button>
            </div>
          </form>
        </FormSectionCard>
      )}

      {canManage && showForm && (
        <FormSectionCard title="Créer une salle" description="Rattachement à un campus, nom, code, capacité et équipements.">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormGroup label="Campus">
                <Select value={form.campusId} onChange={(e) => setForm({ ...form, campusId: e.target.value })}>
                  <option value="">Aucun</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} – {c.nom}{c.departementNom ? ` (${c.departementNom})` : c.regionNom ? ` (${c.regionNom})` : ''}</option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup label="Nom" required>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Ex: Amphi A" />
              </FormGroup>
              <FormGroup label="Code">
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EX: S101" />
              </FormGroup>
              <FormGroup label="Capacité">
                <Input type="number" value={form.capacite} onChange={(e) => setForm({ ...form, capacite: +e.target.value })} min={1} />
              </FormGroup>
              <FormGroup label="Équipements" className="md:col-span-2">
                <Input value={form.equipements} onChange={(e) => setForm({ ...form, equipements: e.target.value })} placeholder="Vidéoprojecteur, tableau..." />
              </FormGroup>
            </div>
            <Button type="submit">Créer</Button>
          </form>
        </FormSectionCard>
      )}

      {canManage && (
        <FormSectionCard
          title="Ajouter par lot (CSV)"
          description="Le fichier ne contient pas le campus : choisissez le campus dans le filtre, ou ouvrez la page avec le lien « Salles » depuis un campus (?campusId=…). Colonnes : nom;code;capacite;typeSalle;equipements (séparateur ;)."
        >
          <form onSubmit={handleImportCsv} className="space-y-4">
            {!bulkCampusId ? (
              <div
                className="rounded-[var(--radius-lg)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]"
                role="status"
              >
                <p className="font-medium text-amber-900 dark:text-amber-100">Campus requis avant l’import</p>
                <p className="mt-1 text-[var(--foreground-muted)]">
                  Créez le campus dans <Link href="/dashboard/scolarite/campus" className="text-[var(--color-primary)] underline">Campus</Link> si besoin, puis choisissez-le dans le filtre <strong>Campus</strong> en haut de page, ou utilisez le lien <strong>Salles</strong> depuis la fiche d’un campus. Sans campus cible, les salles n’ont pas de lieu d’accroche.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">
                Campus cible : <strong className="text-[var(--foreground)]">{importCampusLabel}</strong> — toutes les lignes importées seront rattachées à ce campus.
              </p>
            )}
            <FormGroup label="Contenu CSV">
              <textarea
                value={importCsv}
                onChange={(e) => setImportCsv(e.target.value)}
                disabled={!bulkCampusId}
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border-subtle)] bg-[var(--color-sidebar)] px-[var(--input-px)] py-2 font-mono text-sm text-[var(--foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                rows={5}
                placeholder="nom;code;capacite;typeSalle;equipements"
              />
            </FormGroup>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!bulkCampusId}>
                Importer dans ce campus
              </Button>
            </div>
            {importResult && (
              <div className="text-sm text-[var(--foreground-muted)] space-y-1">
                <p>
                  {importResult.created} salle(s) créée(s)
                  {importResult.campusNom ? ` sur « ${importResult.campusNom} »` : ''}.
                  {importResult.errors?.length ? ` ${importResult.errors.length} erreur(s).` : ''}
                </p>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="list-disc pl-5 text-xs max-h-32 overflow-y-auto">
                    {importResult.errors.slice(0, 15).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {importResult.errors.length > 15 && <li>…</li>}
                  </ul>
                )}
              </div>
            )}
          </form>
        </FormSectionCard>
      )}

      <DataTableShell
        title="Liste des salles"
        description={`${filtered.length} salle(s)${search || filterCampusId ? ' (filtres actifs)' : ''}`}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left font-medium text-[var(--foreground-muted)]"
              style={{
                backgroundColor: 'var(--surface-secondary)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {canManage && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? new Set(filtered.map((s) => s.id)) : new Set())
                    }
                    aria-label="Tout sélectionner"
                  />
                </th>
              )}
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Campus</th>
              <th className="px-4 py-3">Capacité</th>
              <th className="px-4 py-3">Équipements</th>
              {canManage && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 5}
                  className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]"
                >
                  Aucune salle{search || filterCampusId ? ' pour ces critères.' : '. Créez-en une.'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b hover:bg-[var(--surface-secondary)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {canManage && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        aria-label={`Sélectionner ${s.nom}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{s.nom}</td>
                  <td className="px-4 py-3 font-mono text-[var(--foreground)]">{s.code ?? '–'}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{s.campus?.nom ?? '–'}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{s.capacite}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-[var(--foreground-muted)]" title={s.equipements ?? undefined}>
                    {s.equipements ?? '–'}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditForm({
                            nom: s.nom,
                            code: s.code ?? '',
                            capacite: s.capacite,
                            campusId: s.campus?.id ?? '',
                            equipements: s.equipements ?? '',
                          });
                        }}
                        className="text-sm text-[var(--color-primary)] hover:underline mr-2"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSalle(s.id)}
                        className="text-sm text-[var(--color-danger)] hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
