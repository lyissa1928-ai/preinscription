'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BackLink } from '@/components/ui/back-link';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormGroup } from '@/components/ui/form-group';
import { FormSectionCard } from '@/components/ui/form-section-card';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { canManageTeachers } from '@/config/rbac';
import { Card } from '@/components/ui/card';

type Person = {
  id: string;
  matricule: string;
  user?: { email: string; firstName: string; lastName: string; phone?: string; address?: string };
  teacher?: { typeContrat: string; niveauEtude?: string; articlesPublies?: number; rangGrade?: string };
};

const PEDAGOGIE_ROLES = new Set(['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'AGENT_PEDAGOGIQUE']);

export default function EnseignantsPage() {
  const toast = useToast();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [typeContratFilter, setTypeContratFilter] = useState<string>('');
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: 'password123',
    typeContrat: 'VACATAIRE',
    niveauEtude: '',
    articlesPublies: '' as string | number,
    rangGrade: '',
    address: '',
    phone: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);
  const canEditTeachers = canManageTeachers(userRole);
  const backHref =
    userRole && PEDAGOGIE_ROLES.has(userRole) ? '/dashboard/pedagogie' : '/dashboard/scolarite';
  const backLabel = backHref === '/dashboard/pedagogie' ? '← Retour pédagogie' : '← Retour scolarité';

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

  const loadPersons = () => {
    api<Person[]>('/persons?type=TEACHER').then(setPersons).catch(() => setPersons([]));
  };

  useEffect(() => {
    api<Person[]>('/persons?type=TEACHER')
      .then(setPersons)
      .catch(() => setPersons([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = persons;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.matricule.toLowerCase().includes(q) ||
          (p.user && `${p.user.lastName} ${p.user.firstName}`.toLowerCase().includes(q)) ||
          (p.user?.email && p.user.email.toLowerCase().includes(q)),
      );
    }
    if (typeContratFilter === 'VACATAIRE' || typeContratFilter === 'PERMANENT') {
      list = list.filter((p) => p.teacher?.typeContrat === typeContratFilter);
    }
    return list;
  }, [persons, search, typeContratFilter]);

  const kpis = useMemo(() => {
    const vacataires = persons.filter((p) => p.teacher?.typeContrat === 'VACATAIRE').length;
    const permanents = persons.filter((p) => p.teacher?.typeContrat === 'PERMANENT').length;
    return { total: persons.length, vacataires, permanents };
  }, [persons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api<Person>('/persons/teachers', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          password: form.password,
          typeContrat: form.typeContrat,
          niveauEtude: form.niveauEtude || undefined,
          articlesPublies: form.articlesPublies === '' ? undefined : Number(form.articlesPublies),
          rangGrade: form.rangGrade || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
        }),
      });
      setPersons((prev) => [...prev, created]);
      setShowForm(false);
      setForm({
        email: '',
        firstName: '',
        lastName: '',
        password: 'password123',
        typeContrat: 'VACATAIRE',
        niveauEtude: '',
        articlesPublies: '',
        rangGrade: '',
        address: '',
        phone: '',
      });
      toast.success('Enseignant créé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm('Supprimer cet enseignant ?')) return;
    try {
      await api(`/persons/${id}`, { method: 'DELETE' });
      setPersons((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      toast.success('Enseignant supprimé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error('Aucun enseignant sélectionné.');
      return;
    }
    if (!confirm(`Supprimer ${ids.length} enseignant(s) ?`)) return;
    try {
      const res = await api<{ deleted: number }>('/persons/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      setSelectedIds(new Set());
      loadPersons();
      toast.success(`${res.deleted} enseignant(s) supprimé(s).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const resetFilters = () => {
    setSearch('');
    setTypeContratFilter('');
  };

  const hasActiveFilters = search.trim() !== '' || typeContratFilter !== '';

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <BackLink href={backHref} className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
          {backLabel}
        </BackLink>
        <p className="text-sm text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <BackLink
        href={backHref}
        className="mb-2 inline-block text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
      >
        {backLabel}
      </BackLink>
      <PageHeader
        title="Enseignants"
        description="Effectif, contrats et affectations. Le matricule est généré automatiquement (TCH-Année-XXXX). Création et suppression réservées au service pédagogique, au responsable pédagogique ou à un administrateur."
      >
        {canEditTeachers && (
          <Button
            type="button"
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Annuler' : '+ Nouvel enseignant'}
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard
          label="Total enseignants"
          value={kpis.total.toLocaleString('fr-FR')}
          icon="users"
          variant="default"
        />
        <KpiCard
          label="Vacataires"
          value={kpis.vacataires.toLocaleString('fr-FR')}
          icon="briefcase"
          variant="info"
        />
        <KpiCard
          label="Permanents"
          value={kpis.permanents.toLocaleString('fr-FR')}
          icon="user"
          variant="accent"
        />
      </div>

      <FilterPanel onReset={hasActiveFilters ? resetFilters : undefined}>
        <FormGroup label="Recherche" className="min-w-[200px]">
          <Input
            placeholder="Matricule, nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormGroup>
        <FormGroup label="Type de contrat" className="min-w-[160px]">
          <Select
            value={typeContratFilter}
            onChange={(e) => setTypeContratFilter(e.target.value)}
          >
            <option value="">Tous</option>
            <option value="VACATAIRE">Vacataire</option>
            <option value="PERMANENT">Permanent</option>
          </Select>
        </FormGroup>
      </FilterPanel>

      {!canEditTeachers && userRole === 'SCOLARITE' && (
        <Card title="Consultation seule" description="">
          <p className="text-sm text-[var(--foreground-muted)]">
            La <strong>création</strong> et la <strong>suppression</strong> de comptes enseignants sont réservées au{' '}
            <strong>service pédagogique</strong>, au <strong>responsable pédagogique</strong> ou à un{' '}
            <strong>administrateur</strong>. Vous pouvez consulter la liste et les fiches.
          </p>
        </Card>
      )}

      {canEditTeachers && showForm && (
        <FormSectionCard
          title="Créer un enseignant"
          description="Nom, prénom, email, type de contrat. Le prix horaire dépend de l'EC (configuration Tarifs)."
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormGroup label="Nom" required>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup label="Prénom" required>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </FormGroup>
              <FormGroup label="Téléphone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+221..."
                />
              </FormGroup>
              <FormGroup label="Adresse" className="md:col-span-2">
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ville, rue..."
                />
              </FormGroup>
              <FormGroup label="Niveau d'étude">
                <Input
                  value={form.niveauEtude}
                  onChange={(e) => setForm({ ...form, niveauEtude: e.target.value })}
                  placeholder="Doctorat, Master..."
                />
              </FormGroup>
              <FormGroup label="Type de contrat">
                <Select
                  value={form.typeContrat}
                  onChange={(e) => setForm({ ...form, typeContrat: e.target.value })}
                >
                  <option value="VACATAIRE">Vacataire</option>
                  <option value="PERMANENT">Permanent</option>
                </Select>
              </FormGroup>
              <FormGroup label="Rang / Grade">
                <Input
                  value={form.rangGrade}
                  onChange={(e) => setForm({ ...form, rangGrade: e.target.value })}
                  placeholder="MCF, PR..."
                />
              </FormGroup>
              <FormGroup label="Articles publiés">
                <Input
                  type="number"
                  min={0}
                  value={form.articlesPublies === '' ? '' : form.articlesPublies}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      articlesPublies: e.target.value === '' ? '' : +e.target.value,
                    })
                  }
                />
              </FormGroup>
              <FormGroup label="Mot de passe (défaut)" hint="Sera utilisé à la première connexion.">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormGroup>
            </div>
            <Button type="submit" variant="primary">
              Créer
            </Button>
          </form>
        </FormSectionCard>
      )}

      <DataTableShell
        title="Liste des enseignants"
        description={`${filtered.length} enseignant(s)${hasActiveFilters ? ' (filtres actifs)' : ''}`}
        toolbar={
          canEditTeachers ? (
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 && (
                <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                  Supprimer ({selectedIds.size})
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left font-medium text-[var(--foreground-muted)]"
                style={{
                  backgroundColor: 'var(--surface-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {canEditTeachers ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked ? new Set(filtered.map((p) => p.id)) : new Set(),
                        )
                      }
                      aria-label="Tout sélectionner"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Nom - Prénom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Contrat</th>
                <th className="px-4 py-3">Rang / Grade</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEditTeachers ? 7 : 6}
                    className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]"
                  >
                    Aucun enseignant
                    {hasActiveFilters ? ' pour ces critères.' : ''}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-[var(--surface-secondary)]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {canEditTeachers ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          aria-label={`Sélectionner ${p.user ? `${p.user.lastName} ${p.user.firstName}` : p.matricule}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                      {p.matricule}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/scolarite/enseignants/${p.id}`}
                        className="font-medium text-[var(--color-primary)] hover:underline"
                      >
                        {p.user ? `${p.user.lastName} ${p.user.firstName}` : '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {p.user?.email ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {p.teacher?.typeContrat ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {p.teacher?.rangGrade ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      {canEditTeachers ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteOne(p.id)}
                          className="text-sm text-[var(--color-danger)] hover:underline"
                        >
                          Supprimer
                        </button>
                      ) : (
                        <span className="text-sm text-[var(--foreground-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </div>
  );
}
