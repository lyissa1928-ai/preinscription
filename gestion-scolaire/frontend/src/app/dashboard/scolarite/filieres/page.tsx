'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/contexts/ToastContext';
import { canWriteStructure, canLock as canLockFiliere } from '@/config/rbac';
import { normalizeFiliereList, type FiliereListItem } from '@/lib/api-list';

const INCLUDE_PENDING_ROLES = new Set([
  'SCOLARITE',
  'SERVICE_PEDAGOGIQUE',
  'RESPONSABLE_PEDAGOGIQUE',
  'ADMIN',
  'SUPER_ADMIN',
]);

function queryIncludePending(role: string | null) {
  if (!role) return '';
  return INCLUDE_PENDING_ROLES.has(role) ? '?includePending=true' : '';
}

export default function FilieresPage() {
  const { role: userRole, loading: roleLoading } = useUserRole();
  const toast = useToast();
  const [filieres, setFilieres] = useState<FiliereListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', nom: '' });
  const initialFetchDone = useRef(false);
  const canWrite = canWriteStructure(userRole);
  const canLock = canLockFiliere(userRole);

  const load = useCallback(() => {
    if (roleLoading) return;
    const isFirst = !initialFetchDone.current;
    if (isFirst) setLoading(true);
    setLoadError(null);
    const q = queryIncludePending(userRole);
    api<unknown>(`/filieres${q}`)
      .then((raw) => {
        setFilieres(normalizeFiliereList(raw));
        initialFetchDone.current = true;
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Erreur de chargement';
        setLoadError(msg);
        setFilieres([]);
      })
      .finally(() => setLoading(false));
  }, [userRole, roleLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleVerrouille = async (id: string) => {
    try {
      await api(`/filieres/${id}/verrouiller`, { method: 'PATCH' });
      load();
      toast.success('Statut mis à jour.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDelete = async (f: FiliereListItem) => {
    if (!confirm(`Supprimer la filière « ${f.nom} » et tout son contenu (formations, semestres, maquettes) ? Cette action est irréversible.`)) return;
    try {
      await api(`/filieres/${f.id}`, { method: 'DELETE' });
      load();
      toast.success('Filière supprimée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api<FiliereListItem>('/filieres', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ code: '', nom: '' });
      load();
      toast.success('Filière créée. Vous pouvez créer un parcours Licence ou Master dans Formations.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (roleLoading || (loading && !initialFetchDone.current)) {
    return (
      <div className="space-y-4">
        <BackLink href="/dashboard/scolarite" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-2 inline-block">← Retour scolarité</BackLink>
        <p className="text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BackLink href="/dashboard/scolarite" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] inline-block">← Retour scolarité</BackLink>

      <PageHeader
        title="Filières"
        description="Domaine ou spécialité (ex. Informatique, Génie civil). Ensuite, créez les parcours Licence / Master depuis Scolarité → Formations."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="md" leftIcon={<Icon name="arrow-path" className="w-4 h-4" />} onClick={() => load()} title="Recharger la liste">
            Actualiser
          </Button>
          <Link href="/dashboard/scolarite/formations">
            <Button variant="secondary" size="md" leftIcon={<Icon name="graduation-cap" className="w-4 h-4" />}>
              Formations (parcours L/M)
            </Button>
          </Link>
          {canWrite && (
            <Link href="/dashboard/scolarite/formations/import">
              <Button variant="secondary" size="md" leftIcon={<Icon name="arrow-down-tray" className="w-4 h-4" />}>
                Import Excel
              </Button>
            </Link>
          )}
          {canWrite && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Icon name="plus" className="w-4 h-4" />}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Annuler' : 'Nouvelle filière'}
            </Button>
          )}
        </div>
      </PageHeader>

      {loadError && (
        <div
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p className="font-medium">Impossible de charger les filières</p>
          <p className="mt-1 opacity-90">{loadError}</p>
          <p className="mt-2 text-xs opacity-80">
            Vérifiez que l’API tourne sur <code className="rounded bg-black/10 px-1">http://localhost:3000</code> (ou la valeur de{' '}
            <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_API_URL</code>).
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => load()}>
            Réessayer
          </Button>
        </div>
      )}

      {canWrite && showForm && (
        <Card title="Créer une filière" description="Saisissez le code et le nom de la filière.">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Code</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]"
                  style={{ borderColor: 'var(--color-border)' }}
                  placeholder="ex: INFO"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Nom</label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]"
                  style={{ borderColor: 'var(--color-border)' }}
                  placeholder="ex: Informatique"
                  required
                />
              </div>
            </div>
            <Button type="submit" variant="primary" size="md" leftIcon={<Icon name="plus" className="w-4 h-4" />}>
              Créer la filière
            </Button>
          </form>
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Liste des filières</h2>
        {filieres.length === 0 ? (
          <Card>
            <p className="text-[var(--foreground-muted)] py-4">
              {loadError
                ? 'Liste non disponible (erreur réseau ou API). Corrigez le problème puis cliquez sur « Réessayer » ou « Actualiser ».'
                : 'Aucune filière. Créez-en une ci-dessus ou importez depuis Excel, puis allez dans '}
              {!loadError && (
                <>
                  <Link href="/dashboard/scolarite/formations" className="text-[var(--color-primary)] font-medium hover:underline">
                    Formations
                  </Link>{' '}
                  pour générer Licence ou Master.
                </>
              )}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1">
            {filieres.map((f) => (
              <div
                key={f.id}
                className="group rounded-xl border bg-[var(--surface)] transition-shadow hover:shadow-md"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/dashboard/scolarite/filieres/${f.id}`}
                        className="font-semibold text-lg text-[var(--foreground)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {f.nom}
                      </Link>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--surface-secondary)] text-[var(--foreground-muted)]"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {f.code}
                      </span>
                      {f.verrouille && (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-sm" title="Verrouillée">
                          <Icon name="lock-closed" className="w-4 h-4" /> Verrouillée
                        </span>
                      )}
                      {f.statut === 'PENDING' && (
                        <span className="text-amber-600 text-sm">(En attente de validation)</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--foreground-muted)] flex items-center gap-1">
                      <Icon name="graduation-cap" className="w-4 h-4 flex-shrink-0" />
                      {(f.formations ?? []).length} formation(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {canWrite && !f.verrouille && (
                      <>
                        <Link href={`/dashboard/scolarite/filieres/${f.id}`}>
                          <Button variant="secondary" size="sm" leftIcon={<Icon name="pencil" className="w-3.5 h-3.5" />}>
                            Modifier
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Icon name="trash" className="w-3.5 h-3.5" />}
                          onClick={() => handleDelete(f)}
                        >
                          Supprimer
                        </Button>
                      </>
                    )}
                    {canLock && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Icon name="lock-closed" className="w-3.5 h-3.5" />}
                        onClick={() => handleToggleVerrouille(f.id)}
                        title={f.verrouille ? 'Déverrouiller' : 'Verrouiller'}
                      >
                        {f.verrouille ? 'Déverrouiller' : 'Verrouiller'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
