'use client';

import { useMemo, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { FilterPanel } from '@/components/ui/filter-panel';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { FormGroup } from '@/components/ui/form-group';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type AuditEntry = {
  id: string;
  date: string;
  utilisateur: string;
  role: string;
  action: string;
  entite: string;
  details: string;
  severite: 'INFO' | 'WARN' | 'CRITIQUE';
};

const MOCK_AUDIT: AuditEntry[] = [
  {
    id: '1',
    date: '2026-03-05T09:15:00Z',
    utilisateur: 'dpedagogique',
    role: 'SERVICE_PEDAGOGIQUE',
    action: 'VALIDATION_NOTES',
    entite: 'L3 INFO A - Session 1',
    details: 'Validation des notes de la session 1 (30 EC).',
    severite: 'INFO',
  },
  {
    id: '2',
    date: '2026-03-04T18:22:00Z',
    utilisateur: 'chefdept-math',
    role: 'DEPT_HEAD',
    action: 'APPROBATION_MODIFICATION_NOTE',
    entite: 'EC: ALG-201 / Étudiant: STU0001',
    details: 'Approbation demande de modification de note (12 → 14).',
    severite: 'WARN',
  },
  {
    id: '3',
    date: '2026-03-01T10:02:00Z',
    utilisateur: 'sc-pedagogie',
    role: 'SERVICE_PEDAGOGIQUE',
    action: 'FORCAGE_EDT',
    entite: 'Emploi du temps / Campus Principal',
    details: 'Créneau ajouté malgré conflit salle (vérifier capacité).',
    severite: 'CRITIQUE',
  },
];

const SEVERITE_LABEL: Record<AuditEntry['severite'], string> = {
  INFO: 'Info',
  WARN: 'Avertissement',
  CRITIQUE: 'Critique',
};

export default function PedagogieAuditPage() {
  const [severiteFilter, setSeveriteFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return MOCK_AUDIT.filter((e) => {
      if (severiteFilter && e.severite !== severiteFilter) return false;
      if (roleFilter && e.role !== roleFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        e.utilisateur.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.entite.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
      );
    });
  }, [severiteFilter, roleFilter, search]);

  const kpis = useMemo(() => {
    const total = MOCK_AUDIT.length;
    const critiques = MOCK_AUDIT.filter((e) => e.severite === 'CRITIQUE').length;
    const warn = MOCK_AUDIT.filter((e) => e.severite === 'WARN').length;
    const info = MOCK_AUDIT.filter((e) => e.severite === 'INFO').length;
    return { total, critiques, warn, info };
  }, []);

  const hasActiveFilters = !!severiteFilter || !!roleFilter || !!search.trim();

  return (
    <div className="space-y-6 max-w-6xl">
      <BackLink href="/dashboard/pedagogie">Pédagogie</BackLink>
      <PageHeader
        title="Audit pédagogique"
        description="Journal (maquette) des actions sensibles : notes, validations, emploi du temps."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Actions récentes"
          value={kpis.total}
          sub="Sur la période mockée"
          icon="clock"
        />
        <KpiCard
          label="Critiques"
          value={kpis.critiques}
          variant="danger"
          icon="x-circle"
        />
        <KpiCard
          label="Avertissements"
          value={kpis.warn}
          variant="warning"
          icon="exclamation-circle"
        />
        <KpiCard
          label="Info"
          value={kpis.info}
          variant="info"
          icon="information-circle"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2.1fr,1.1fr]">
        <section className="space-y-4">
          <FilterPanel onReset={hasActiveFilters ? () => { setSeveriteFilter(''); setRoleFilter(''); setSearch(''); } : undefined}>
            <FormGroup label="Sévérité" className="min-w-[160px]">
              <Select value={severiteFilter} onChange={(e) => setSeveriteFilter(e.target.value)}>
                <option value="">Toutes</option>
                <option value="CRITIQUE">Critique</option>
                <option value="WARN">Avertissement</option>
                <option value="INFO">Info</option>
              </Select>
            </FormGroup>
            <FormGroup label="Rôle" className="min-w-[180px]">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Tous</option>
                <option value="SERVICE_PEDAGOGIQUE">Service pédagogique</option>
                <option value="DEPT_HEAD">Chef de département</option>
              </Select>
            </FormGroup>
            <FormGroup label="Recherche" className="min-w-[220px]">
              <Input
                placeholder="Utilisateur, action, entité..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </FormGroup>
          </FilterPanel>

          <DataTableShell
            title="Journal d’audit (maquette)"
            description={`${filtered.length} action(s) filtrée(s) — données factices pour le design.`}
          >
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">Date / heure</th>
                  <th className="px-3 py-2 text-left">Utilisateur</th>
                  <th className="px-3 py-2 text-left">Rôle</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Entité</th>
                  <th className="px-3 py-2 text-left">Détail</th>
                  <th className="px-3 py-2 text-left">Sévérité</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]"
                    >
                      Aucune action pour ces critères.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b last:border-0 hover:bg-[var(--surface-secondary)]"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <td className="px-3 py-2 text-[var(--foreground)]">
                        {new Date(e.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-2 text-[var(--foreground)]">{e.utilisateur}</td>
                      <td className="px-3 py-2 text-[var(--foreground)]">{e.role}</td>
                      <td className="px-3 py-2 text-[var(--foreground)]">{e.action}</td>
                      <td className="px-3 py-2 text-[var(--foreground)]">{e.entite}</td>
                      <td className="px-3 py-2 text-[var(--foreground-muted)] max-w-[260px] truncate" title={e.details}>
                        {e.details}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            e.severite === 'CRITIQUE'
                              ? 'bg-red-50 text-red-800 ring-red-200'
                              : e.severite === 'WARN'
                              ? 'bg-amber-50 text-amber-800 ring-amber-200'
                              : 'bg-blue-50 text-blue-800 ring-blue-200'
                          }`}
                        >
                          {SEVERITE_LABEL[e.severite]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </DataTableShell>
        </section>

        <section className="space-y-4">
          <Card
            title="Connexion au vrai journal"
            description="Cette page est une maquette alignée sur le design Power BI. Elle sera branchée sur AuditLog côté backend."
          >
            <ul className="mt-2 space-y-1 text-sm text-[var(--foreground-muted)] list-disc list-inside">
              <li>Source cible : modèle <code>AuditLog</code> (backend).</li>
              <li>Filtrage par période, rôle, type d’action, entité.</li>
              <li>Export CSV / Excel pour l’auditeur.</li>
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}
