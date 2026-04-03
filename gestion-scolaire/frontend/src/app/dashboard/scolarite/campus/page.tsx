'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BackLink } from '@/components/ui/back-link';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormGroup } from '@/components/ui/form-group';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { REGIONS_SENEGAL, type Region } from '@/lib/senegal-regions-communes';
import { canManageCampus } from '@/config/rbac';
import { getDashboardForRole } from '@/lib/role-dashboard';

type Campus = {
  id: string;
  code: string;
  nom: string;
  adresse: string | null;
  region: string | null;
  departement: string | null;
  commune: string | null;
  telDirection: string | null;
  responsablePedagogiqueId?: string | null;
  responsablePedagogique?: { id: string; firstName: string; lastName: string; email: string } | null;
  agentPedagogiqueId?: string | null;
  agentPedagogique?: { id: string; firstName: string; lastName: string; email: string } | null;
  regionNom?: string | null;
  departementNom?: string | null;
  _count?: { salles: number };
};

type ResponsableOption = { id: string; firstName: string; lastName: string; email: string; role?: string };

/** SCOLARITE ne peut pas créer/modifier/supprimer les campus. */
const CAN_MANAGE = ['SERVICE_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'];

const emptyForm = {
  code: '',
  nom: '',
  adresse: '',
  region: '',
  departement: '',
  commune: '',
  telDirection: '',
  responsablePedagogiqueId: '',
  agentPedagogiqueId: '',
  nombreSalles: 0,
};

export default function CampusPage() {
  const toast = useToast();
  const [regions, setRegions] = useState<Region[]>(REGIONS_SENEGAL);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [responsablesOptions, setResponsablesOptions] = useState<ResponsableOption[]>([]);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const canManage = canManageCampus(userRole);
  const backHref = userRole ? getDashboardForRole(userRole) : '/dashboard/scolarite';

  const filtered = useMemo(() => {
    let list = campuses;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.nom.toLowerCase().includes(q) ||
          (c.regionNom && c.regionNom.toLowerCase().includes(q)),
      );
    }
    if (regionFilter) list = list.filter((c) => c.region === regionFilter);
    return list;
  }, [campuses, search, regionFilter]);

  const kpis = useMemo(() => {
    const totalSalles = campuses.reduce((acc, c) => acc + (c._count?.salles ?? 0), 0);
    return { total: campuses.length, totalSalles };
  }, [campuses]);

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

  const departementsForRegion = form.region
    ? (regions.find((r) => r.code === form.region)?.departements ?? [])
    : [];
  const communesForDepartement = form.departement && form.region
    ? (regions.find((r) => r.code === form.region)?.departements.find((d) => d.code === form.departement)?.communes ?? [])
    : [];

  const load = () => {
    api<Campus[]>('/campuses')
      .then(setCampuses)
      .catch(() => setCampuses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<{ regions: Region[] }>('/campuses/regions').then((d) => d.regions ?? []).catch(() => []),
      api<Campus[]>('/campuses').catch(() => []),
    ]).then(([regionsData, campusesData]) => {
      const hasDepartements = Array.isArray(regionsData) && regionsData.length > 0 && regionsData[0]?.departements?.length != null;
      setRegions(hasDepartements ? regionsData : REGIONS_SENEGAL);
      setCampuses(Array.isArray(campusesData) ? campusesData : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (canManage && showForm) {
      api<ResponsableOption[]>('/campuses/responsables-options').then(setResponsablesOptions).catch(() => setResponsablesOptions([]));
    }
  }, [canManage, showForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const body = {
        code: form.code,
        nom: form.nom,
        adresse: form.adresse || undefined,
        region: form.region || undefined,
        departement: form.departement || undefined,
        commune: form.commune || undefined,
        telDirection: form.telDirection || undefined,
        responsablePedagogiqueId: form.responsablePedagogiqueId || null,
        agentPedagogiqueId: form.agentPedagogiqueId || null,
        nombreSalles: form.nombreSalles,
      };
      if (editingId) {
        await api(`/campuses/${editingId}`, { method: 'PATCH', body: JSON.stringify(body), token: token || undefined });
      } else {
        await api<Campus>('/campuses', { method: 'POST', body: JSON.stringify(body), token: token || undefined });
      }
      load();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      if (msg === 'Failed to fetch' || (err instanceof TypeError && (err as Error).message?.includes('fetch'))) {
        toast.error('Serveur inaccessible. Démarrez le backend (port 3000) puis réessayez.');
      } else {
        toast.error(msg);
      }
    }
  };

  const startEdit = (c: Campus) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      nom: c.nom,
      adresse: c.adresse || '',
      region: c.region || '',
      departement: c.departement || '',
      commune: c.commune || '',
      telDirection: c.telDirection || '',
      responsablePedagogiqueId: c.responsablePedagogiqueId ?? '',
      agentPedagogiqueId: c.agentPedagogiqueId ?? '',
      nombreSalles: c._count?.salles ?? 0,
    });
    setShowForm(true);
  };

  const getRegionNom = (code: string | null) => (code ? regions.find((r) => r.code === code)?.nom ?? code : '');
  const getDepartementNom = (regionCode: string | null, deptCode: string | null) => {
    if (!regionCode || !deptCode) return deptCode ?? '';
    const reg = regions.find((r) => r.code === regionCode);
    return reg?.departements.find((d) => d.code === deptCode)?.nom ?? deptCode;
  };
  const getCommuneNom = (regionCode: string | null, deptCode: string | null, communeCode: string | null) => {
    if (!regionCode || !deptCode || !communeCode) return communeCode ?? '';
    const dept = regions.find((r) => r.code === regionCode)?.departements.find((d) => d.code === deptCode);
    return dept?.communes.find((c) => c.code === communeCode)?.nom ?? communeCode;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce campus ? (Les salles devront être réaffectées ou supprimées.)')) return;
    try {
      await api(`/campuses/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const hasActiveFilters = search.trim() !== '' || regionFilter !== '';
  const resetFilters = () => { setSearch(''); setRegionFilter(''); };

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink href={backHref} className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">← Retour</BackLink>
        <p className="text-sm text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <BackLink href={backHref} className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">← Retour</BackLink>
      <PageHeader
        title="Campus"
        description="Chaque campus regroupe des salles. Région → Département → Commune : découpage administratif du Sénégal."
      >
        {canManage && (
          <Button
            variant={showForm && !editingId ? 'secondary' : 'primary'}
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
          >
            {showForm && !editingId ? 'Annuler' : '+ Nouveau campus'}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <KpiCard label="Total campus" value={kpis.total.toLocaleString('fr-FR')} icon="building-office-2" variant="default" />
        <KpiCard label="Total salles" value={kpis.totalSalles.toLocaleString('fr-FR')} icon="table-cells" variant="accent" sub="Tous campus" />
      </div>

      <FilterPanel onReset={hasActiveFilters ? resetFilters : undefined}>
        <FormGroup label="Recherche" className="min-w-[200px]">
          <Input placeholder="Code, nom, région..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </FormGroup>
        <FormGroup label="Région" className="min-w-[180px]">
          <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
            <option value="">Toutes</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.nom}</option>
            ))}
          </Select>
        </FormGroup>
      </FilterPanel>

      {canManage && showForm && (
        <form onSubmit={handleSubmit} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">{editingId ? 'Modifier le campus' : 'Créer un campus'}</h3>
          <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded">
            <strong>Localisation :</strong> Choisir dans l’ordre 1️⃣ Région → 2️⃣ Département → 3️⃣ Commune (118 communes du Sénégal).
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="EX: CAMPUS-A"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nom</label>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Campus principal"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">1. Région (Sénégal)</label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value, departement: '', commune: '' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">— Choisir une région —</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>{r.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">2. Département</label>
              <select
                value={form.departement}
                onChange={(e) => setForm({ ...form, departement: e.target.value, commune: '' })}
                className="w-full px-3 py-2 border rounded"
                disabled={!form.region}
              >
                <option value="">— Choisir un département —</option>
                {departementsForRegion.map((d) => (
                  <option key={d.code} value={d.code}>{d.nom}</option>
                ))}
              </select>
              {!form.region && <p className="text-xs text-amber-600 mt-1">Sélectionnez d’abord une région</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">3. Commune</label>
              <select
                value={form.commune}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                disabled={!form.departement}
              >
                <option value="">— Choisir une commune —</option>
                {communesForDepartement.map((c) => (
                  <option key={c.code} value={c.code}>{c.nom}</option>
                ))}
              </select>
              {!form.departement && <p className="text-xs text-amber-600 mt-1">Sélectionnez d’abord un département</p>}
              {form.departement && communesForDepartement.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{communesForDepartement.length} commune(s) disponible(s)</p>
              )}
              {form.departement && !communesForDepartement.length && (
                <p className="text-xs text-slate-500 mt-1">Aucune commune pour ce département</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Tél. direction</label>
              <input
                value={form.telDirection}
                onChange={(e) => setForm({ ...form, telDirection: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="+221 33 123 45 67"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm text-slate-600 mb-1">Adresse (optionnel)</label>
              <input
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="123 rue..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Responsable pédagogique (campus)</label>
              <select
                value={form.responsablePedagogiqueId}
                onChange={(e) => setForm({ ...form, responsablePedagogiqueId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">— Aucun —</option>
                {responsablesOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email}){u.role ? ` – ${u.role}` : ''}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Voit tout ce que fait l’agent du campus. Le directeur (Service pédagogique) fédère tous les campus.</p>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Agent pédagogique (campus)</label>
              <select
                value={form.agentPedagogiqueId}
                onChange={(e) => setForm({ ...form, agentPedagogiqueId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">— Aucun —</option>
                {responsablesOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({u.email}){u.role ? ` – ${u.role}` : ''}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Un agent par campus : génère l’emploi du temps du campus.</p>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nombre de salles</label>
              <input
                type="number"
                min={0}
                max={500}
                value={form.nombreSalles}
                onChange={(e) => setForm({ ...form, nombreSalles: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 border rounded"
                placeholder="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                {editingId
                  ? 'Augmentez le nombre pour ajouter des salles (Salle n+1, …). Pour en retirer, supprimez-les depuis la page Salles.'
                  : 'Les salles seront créées automatiquement (Salle 1, Salle 2, …). Vous pourrez les modifier ensuite.'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false); }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      <DataTableShell
        title="Liste des campus"
        description={filtered.length === 0 && !hasActiveFilters ? 'Aucun campus. Créez-en un (nombre de salles créées automatiquement).' : `${filtered.length} campus${hasActiveFilters ? ' (filtres actifs)' : ''}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-medium text-[var(--foreground-muted)]" style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3">Campus</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Région</th>
                <th className="px-4 py-3">Département</th>
                <th className="px-4 py-3">Commune</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Salles</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">
                    Aucun campus{hasActiveFilters ? ' pour ces critères.' : ''}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-[var(--surface-secondary)]" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{c.nom}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.code}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.regionNom ?? getRegionNom(c.region) ?? '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.departementNom ?? getDepartementNom(c.region, c.departement) ?? '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.commune ? getCommuneNom(c.region, c.departement, c.commune) : '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.responsablePedagogique ? `${c.responsablePedagogique.lastName} ${c.responsablePedagogique.firstName}` : '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c.agentPedagogique ? `${c.agentPedagogique.lastName} ${c.agentPedagogique.firstName}` : '–'}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{c._count?.salles ?? 0}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/scolarite/salles?campusId=${c.id}`} className="mr-2 text-sm text-[var(--color-primary)] hover:underline">Salles</Link>
                        <button type="button" onClick={() => startEdit(c)} className="mr-2 text-sm text-[var(--foreground-muted)] hover:underline">Modifier</button>
                        <button type="button" onClick={() => handleDelete(c.id)} className="text-sm text-[var(--color-danger)] hover:underline">Supprimer</button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <Card title="Fiches détaillées" description="Vue par campus avec lien vers les salles.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full text-sm text-[var(--foreground-muted)]">Aucun campus à afficher.</p>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="rounded-[var(--radius-lg)] border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--color-border)' }}>
                <h3 className="font-medium text-[var(--foreground)]">{c.nom}</h3>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">Code : {c.code}</p>
                {(c.region || c.departement || c.commune) && (
                  <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                    {c.region && <>Région : {c.regionNom ?? getRegionNom(c.region)}</>}
                    {c.departement && <> • Département : {c.departementNom ?? getDepartementNom(c.region, c.departement)}</>}
                    {c.commune && <> • Commune : {getCommuneNom(c.region, c.departement, c.commune)}</>}
                  </p>
                )}
                {c.telDirection && <p className="mt-1 text-sm text-[var(--foreground-muted)]">Tél. : {c.telDirection}</p>}
                {c.adresse && <p className="text-sm text-[var(--foreground-muted)]">{c.adresse}</p>}
                {c.responsablePedagogique && <p className="mt-1 text-sm text-[var(--foreground-muted)]">Responsable : {c.responsablePedagogique.lastName} {c.responsablePedagogique.firstName}</p>}
                {c.agentPedagogique && <p className="mt-1 text-sm text-[var(--foreground-muted)]">Agent : {c.agentPedagogique.lastName} {c.agentPedagogique.firstName}</p>}
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">{c._count?.salles ?? 0} salle(s)</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/dashboard/scolarite/salles?campusId=${c.id}`} className="text-sm text-[var(--color-primary)] hover:underline">Voir les salles →</Link>
                  {canManage && (
                    <>
                      <button type="button" onClick={() => startEdit(c)} className="text-sm text-[var(--foreground-muted)] hover:underline">Modifier</button>
                      <button type="button" onClick={() => handleDelete(c.id)} className="text-sm text-[var(--color-danger)] hover:underline">Supprimer</button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
