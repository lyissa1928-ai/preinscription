'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/contexts/ToastContext';
import { canWriteStructure } from '@/config/rbac';
import {
  normalizeFiliereList,
  normalizeFormationList,
  type FiliereListItem,
  type FormationListItem,
} from '@/lib/api-list';

/** Voir aussi les filières / formations en attente de validation (hors enseignants / étudiants). */
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

function hasAutoLicenceForFiliere(rows: FormationListItem[], filiereId: string) {
  return rows.some((f) => f.filiereId === filiereId && /^L[123]-/.test(f.code));
}

function hasAutoMasterForFiliere(rows: FormationListItem[], filiereId: string) {
  return rows.some((f) => f.filiereId === filiereId && /^M[12]-/.test(f.code));
}

export default function FormationsPage() {
  const { role: userRole, loading: roleLoading } = useUserRole();
  const toast = useToast();
  const [filieres, setFilieres] = useState<FiliereListItem[]>([]);
  const [formations, setFormations] = useState<FormationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filiereId, setFiliereId] = useState('');
  const [diplomaType, setDiplomaType] = useState<'LICENCE' | 'MASTER'>('LICENCE');
  const initialFetchDone = useRef(false);

  const canWrite = canWriteStructure(userRole);

  const loadAll = useCallback(() => {
    if (roleLoading) return;

    const q = queryIncludePending(userRole);
    const isFirst = !initialFetchDone.current;
    if (isFirst) setLoading(true);
    setLoadError(null);

    void Promise.allSettled([
      api<unknown>(`/filieres${q}`),
      api<unknown>(`/formations${q}`),
    ]).then((results) => {
      const errs: string[] = [];
      let fList: FiliereListItem[] = [];
      let mList: FormationListItem[] = [];

      const [rF, rM] = results;
      if (rF.status === 'fulfilled') {
        fList = normalizeFiliereList(rF.value);
      } else {
        const msg = rF.reason instanceof Error ? rF.reason.message : 'Erreur filières';
        errs.push(`Filières : ${msg}`);
      }
      if (rM.status === 'fulfilled') {
        mList = normalizeFormationList(rM.value);
      } else {
        const msg = rM.reason instanceof Error ? rM.reason.message : 'Erreur formations';
        errs.push(`Formations : ${msg}`);
      }

      setFilieres(fList);
      setFormations(mList);

      if (errs.length > 0) {
        setLoadError(errs.join(' · '));
      }
      initialFetchDone.current = true;
    }).finally(() => {
      setLoading(false);
    });
  }, [userRole, roleLoading]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') loadAll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadAll]);

  const selectedFiliere = useMemo(
    () => filieres.find((f) => f.id === filiereId) ?? null,
    [filieres, filiereId],
  );

  const duplicateBlocked = useMemo(() => {
    if (!filiereId) return false;
    if (diplomaType === 'LICENCE') return hasAutoLicenceForFiliere(formations, filiereId);
    return hasAutoMasterForFiliere(formations, filiereId);
  }, [filiereId, diplomaType, formations]);

  const filieresDisponibles = useMemo(
    () => filieres.filter((f) => !f.verrouille && f.statut !== 'REJECTED'),
    [filieres],
  );

  const handleCreateParcours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filiereId) {
      toast.error('Veuillez sélectionner une filière.');
      return;
    }
    if (duplicateBlocked) {
      toast.error(
        diplomaType === 'LICENCE'
          ? 'Un parcours Licence (L1–L3) existe déjà pour cette filière.'
          : 'Un parcours Master (M1–M2) existe déjà pour cette filière.',
      );
      return;
    }
    if (selectedFiliere?.verrouille) {
      toast.error('Cette filière est verrouillée.');
      return;
    }

    setSubmitting(true);
    try {
      await api(`/filieres/${filiereId}/structure/diplome-type`, {
        method: 'POST',
        body: JSON.stringify({ type: diplomaType }),
      });
      toast.success(
        diplomaType === 'LICENCE'
          ? 'Parcours Licence créé : L1, L2, L3 avec semestres 1 et 2 et maquettes pour l’année en cours.'
          : 'Parcours Master créé : M1, M2 avec semestres 1 et 2 et maquettes pour l’année en cours.',
      );
      setFiliereId('');
      initialFetchDone.current = true;
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const showGlobalLoader = roleLoading || (loading && !initialFetchDone.current);

  if (showGlobalLoader) {
    return (
      <div className="space-y-4 max-w-4xl">
        <BackLink href="/dashboard/scolarite" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-2 inline-block">
          ← Retour scolarité
        </BackLink>
        <p className="text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BackLink href="/dashboard/scolarite" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] inline-block">
        ← Retour scolarité
      </BackLink>

      <PageHeader
        title="Formations"
        description="Étape 1 : créez les filières (domaines). Étape 2 : ici, choisissez une filière et un type (Licence ou Master) — les niveaux et semestres sont générés automatiquement."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/scolarite/filieres">
            <Button variant="secondary" size="md" leftIcon={<Icon name="academic-cap" className="w-4 h-4" />}>
              Gérer les filières
            </Button>
          </Link>
          <Button variant="ghost" size="md" leftIcon={<Icon name="arrow-path" className="w-4 h-4" />} onClick={() => loadAll()} title="Recharger les listes">
            Actualiser
          </Button>
          {canWrite && (
            <Link href="/dashboard/scolarite/formations/import">
              <Button variant="ghost" size="md" leftIcon={<Icon name="arrow-down-tray" className="w-4 h-4" />}>
                Import Excel
              </Button>
            </Link>
          )}
        </div>
      </PageHeader>

      {loadError && (
        <div
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          <p className="font-medium">Problème de chargement des données</p>
          <p className="mt-1 opacity-90">{loadError}</p>
          <p className="mt-2 text-xs opacity-80">
            Vérifiez que l’API est démarrée (souvent <code className="rounded bg-black/10 px-1">http://localhost:3000</code>) et que{' '}
            <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_API_URL</code> est correct dans le frontend.
          </p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => loadAll()}>
            Réessayer
          </Button>
        </div>
      )}

      {canWrite && (
        <Card
          title="Créer un parcours (formations)"
          description="Une formation est toujours rattachée à une filière. Sélectionnez la filière, puis le type : le système crée les niveaux (L1–L3 ou M1–M2), le nom « Niveau + filière », et pour chaque niveau les semestres 1 et 2 avec une maquette."
        >
          {filieres.length === 0 && !loadError ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--foreground)]">
              <p className="font-medium">Aucune filière disponible</p>
              <p className="mt-1 text-[var(--foreground-muted)]">
                Veuillez d’abord créer une filière avant de créer un parcours Licence ou Master.
              </p>
              <Link
                href="/dashboard/scolarite/filieres"
                className="mt-3 inline-flex items-center gap-1 text-[var(--color-primary)] font-medium hover:underline"
              >
                <Icon name="plus" className="w-4 h-4" />
                Créer une filière
              </Link>
            </div>
          ) : filieres.length === 0 && loadError ? (
            <p className="text-sm text-[var(--foreground-muted)]">Impossible d’afficher le formulaire tant que la liste des filières n’est pas chargée.</p>
          ) : filieresDisponibles.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)] py-2">
              Toutes les filières sont verrouillées ou rejetées. Déverrouillez une filière ou créez-en une nouvelle depuis{' '}
              <Link href="/dashboard/scolarite/filieres" className="text-[var(--color-primary)] underline">
                Filières
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={handleCreateParcours} className="space-y-5">
              <div>
                <label htmlFor="formation-filiere" className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">
                  Filière <span className="text-red-500">*</span>
                </label>
                <select
                  id="formation-filiere"
                  required
                  value={filiereId}
                  onChange={(e) => setFiliereId(e.target.value)}
                  className="w-full max-w-md px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <option value="">— Choisir une filière —</option>
                  {filieres.map((f) => (
                    <option key={f.id} value={f.id} disabled={Boolean(f.verrouille) || f.statut === 'REJECTED'}>
                      {f.nom} ({f.code})
                      {f.verrouille ? ' — verrouillée' : ''}
                      {f.statut === 'PENDING' ? ' — en attente' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                  Après création d’une filière, cliquez sur <strong>Actualiser</strong> ou revenez sur cette page pour mettre à jour la liste.
                </p>
              </div>

              <div>
                <span className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                  Type de formation <span className="text-red-500">*</span>
                </span>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="diplomaType"
                      checked={diplomaType === 'LICENCE'}
                      onChange={() => setDiplomaType('LICENCE')}
                      className="rounded-full border-[var(--color-border)]"
                    />
                    <span>Licence (L1, L2, L3)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="diplomaType"
                      checked={diplomaType === 'MASTER'}
                      onChange={() => setDiplomaType('MASTER')}
                      className="rounded-full border-[var(--color-border)]"
                    />
                    <span>Master (M1, M2)</span>
                  </label>
                </div>
              </div>

              {filiereId && duplicateBlocked && (
                <p className="text-sm text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                  {diplomaType === 'LICENCE'
                    ? 'Ce parcours Licence existe déjà pour cette filière (niveaux L1–L3). Supprimez les formations concernées depuis la fiche filière si vous devez repartir de zéro.'
                    : 'Ce parcours Master existe déjà pour cette filière (niveaux M1–M2).'}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                leftIcon={<Icon name="plus" className="w-4 h-4" />}
                disabled={!filiereId || duplicateBlocked || submitting || Boolean(selectedFiliere?.verrouille)}
              >
                {submitting ? 'Création en cours…' : 'Générer les formations et semestres'}
              </Button>
            </form>
          )}
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Toutes les formations</h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          Accès aux détails, semestres et maquettes (UE / EC). Groupées par filière.
        </p>
        {formations.length === 0 ? (
          <Card>
            <p className="text-[var(--foreground-muted)] py-4">
              {loadError
                ? 'Les formations n’ont pas pu être chargées. Utilisez « Réessayer » ou « Actualiser » ci-dessus.'
                : filieres.length === 0
                  ? 'Aucune formation. Créez d’abord une filière, puis un parcours Licence ou Master ci-dessus.'
                  : 'Aucune formation pour l’instant. Utilisez le formulaire ci-dessus pour générer un parcours, ou l’import Excel (si vous en avez les droits).'}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filieres.map((fil) => {
              const list = formations.filter((x) => x.filiereId === fil.id).sort((a, b) => a.code.localeCompare(b.code));
              if (list.length === 0) return null;
              return (
                <div key={fil.id}>
                  <h3 className="text-sm font-semibold text-[var(--foreground-muted)] mb-2 flex items-center gap-2">
                    <span>{fil.nom}</span>
                    <span className="font-normal text-xs">({fil.code})</span>
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-1">
                    {list.map((fo) => (
                      <li key={fo.id}>
                        <Link
                          href={`/dashboard/scolarite/formations/${fo.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-[var(--surface)] px-4 py-3 transition-shadow hover:shadow-md"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <span className="font-medium text-[var(--foreground)]">{fo.nom}</span>
                          <span className="text-xs text-[var(--foreground-muted)]">
                            {fo.code}
                            {fo.structureManaged && (
                              <span className="ml-2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5">
                                Normalisé
                              </span>
                            )}
                            {fo.statut === 'PENDING' && <span className="ml-2 text-amber-600">En attente</span>}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {formations.some((fo) => !filieres.some((f) => f.id === fo.filiereId)) && (
              <div>
                <h3 className="text-sm font-semibold text-amber-700 mb-2">Autres formations</h3>
                <ul className="grid gap-2">
                  {formations
                    .filter((fo) => !filieres.some((f) => f.id === fo.filiereId))
                    .map((fo) => (
                      <li key={fo.id}>
                        <Link
                          href={`/dashboard/scolarite/formations/${fo.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <span>{fo.nom}</span>
                          <span className="text-xs text-[var(--foreground-muted)]">{fo.filiere?.nom ?? 'Filière'}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
