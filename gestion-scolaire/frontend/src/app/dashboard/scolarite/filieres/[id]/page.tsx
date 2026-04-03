'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { canWriteStructure, canManualFormationLegacy, canLock as canLockFiliere } from '@/config/rbac';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';

type Formation = {
  id: string;
  code: string;
  nom: string;
  cycle: string;
  dureeSemestres: number;
  structureManaged?: boolean;
  verrouille?: boolean;
  statut?: string;
  semestres: { id: string; numero: number; maquettes: { id: string }[] }[];
};

function filiereHasAutoLicence(formations: { code: string }[]) {
  return formations.some((f) => /^L[123]-/.test(f.code));
}

function filiereHasAutoMaster(formations: { code: string }[]) {
  return formations.some((f) => /^M[12]-/.test(f.code));
}

type FiliereDetail = {
  id: string;
  code: string;
  nom: string;
  verrouille?: boolean;
  formations: Formation[];
};

export default function FiliereDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const [filiere, setFiliere] = useState<FiliereDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', nom: '', cycle: 'L', dureeSemestres: 6 });
  const [addingDiploma, setAddingDiploma] = useState<'LICENCE' | 'MASTER' | null>(null);
  const [showEditFiliere, setShowEditFiliere] = useState(false);
  const [formFiliere, setFormFiliere] = useState({ code: '', nom: '' });
  const canWrite = canWriteStructure(userRole);
  const canLock = canLockFiliere(userRole);
  const canManualFormation = canManualFormationLegacy(userRole);
  const filiereLocked = filiere?.verrouille;

  const load = () => {
    api<FiliereDetail>(`/filieres/${id}`)
      .then(setFiliere)
      .catch(() => router.push('/dashboard/scolarite/filieres'))
      .finally(() => setLoading(false));
  };

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
    load();
  }, [id]);

  useEffect(() => {
    if (filiere) {
      setFormFiliere({ code: filiere.code, nom: filiere.nom });
    }
  }, [filiere]);

  const handleUpdateFiliere = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/filieres/${id}`, { method: 'PATCH', body: JSON.stringify(formFiliere) });
      setShowEditFiliere(false);
      load();
      toast.success('Filière mise à jour.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteFiliere = async () => {
    if (!confirm('Supprimer cette filière et tout son contenu (formations, semestres, maquettes, etc.) ? Cette action est irréversible.')) return;
    try {
      await api(`/filieres/${id}`, { method: 'DELETE' });
      toast.success('Filière supprimée.');
      router.push('/dashboard/scolarite/filieres');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteFormation = async (formationId: string, code: string, nom: string) => {
    if (!confirm(`Supprimer la formation "${code} — ${nom}" et tout son contenu (semestres, maquettes, UE, EC) ? Cette action est irréversible.`)) return;
    try {
      await api(`/formations/${formationId}`, { method: 'DELETE' });
      load();
      toast.success('Formation supprimée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleCreateFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/filieres/${id}/formations`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ code: '', nom: '', cycle: 'L', dureeSemestres: 6 });
      load();
      toast.success('Formation créée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleToggleFiliereVerrouille = async () => {
    try {
      await api(`/filieres/${id}/verrouiller`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleAddDiplomaStructure = async (type: 'LICENCE' | 'MASTER') => {
    setAddingDiploma(type);
    try {
      await api(`/filieres/${id}/structure/diplome-type`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      load();
      toast.success(type === 'LICENCE' ? 'Parcours Licence (L1–L3) créé avec semestres et maquettes.' : 'Parcours Master (M1–M2) créé avec semestres et maquettes.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAddingDiploma(null);
    }
  };

  const handleToggleFormationVerrouille = async (formationId: string) => {
    try {
      await api(`/formations/${formationId}/verrouiller`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading || !filiere) {
    return (
      <div>
        <Link href="/dashboard/scolarite/filieres" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">← Retour aux filières</Link>
        <p className="mt-4 text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/dashboard/scolarite/filieres" className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] inline-block">← Retour aux filières</Link>

      <PageHeader
        title={filiere.nom}
        description={filiereLocked ? 'Lecture seule — toute l\'arborescence est verrouillée.' : 'Formations de cette filière.'}
      >
        <div className="flex flex-wrap gap-2">
          {canWrite && !filiereLocked && (
            <>
              <Button variant="secondary" size="md" leftIcon={<Icon name="pencil" className="w-4 h-4" />} onClick={() => setShowEditFiliere(true)}>
                Modifier la filière
              </Button>
              <Button variant="danger" size="md" leftIcon={<Icon name="trash" className="w-4 h-4" />} onClick={handleDeleteFiliere}>
                Supprimer la filière
              </Button>
            </>
          )}
          {canLock && (
            <Button variant="ghost" size="md" leftIcon={<Icon name="lock-closed" className="w-4 h-4" />} onClick={handleToggleFiliereVerrouille} title={filiere.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
              {filiere.verrouille ? 'Déverrouiller' : 'Verrouiller'}
            </Button>
          )}
        </div>
      </PageHeader>

      {filiere.verrouille && (
        <p className="flex items-center gap-2 text-amber-600 text-sm">
          <Icon name="lock-closed" className="w-4 h-4" /> Filière verrouillée
        </p>
      )}

      {showEditFiliere && (
        <Card title="Modifier la filière" description="Code et nom de la filière.">
          <form onSubmit={handleUpdateFiliere} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Code</label>
                <input value={formFiliere.code} onChange={(e) => setFormFiliere((prev) => ({ ...prev, code: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Nom</label>
                <input value={formFiliere.nom} onChange={(e) => setFormFiliere((prev) => ({ ...prev, nom: e.target.value }))} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} required />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="md">Enregistrer</Button>
              <Button type="button" variant="secondary" size="md" onClick={() => setShowEditFiliere(false)}>Annuler</Button>
            </div>
          </form>
        </Card>
      )}

      {canWrite && !filiereLocked && (
        <Card
          title="Structure normalisée (Licence / Master)"
          description="Génère automatiquement les niveaux (L1–L3 ou M1–M2), les noms « Niveau + filière », 2 semestres par niveau et une maquette par semestre (année en cours). Une fois créé, un parcours ne peut pas être dupliqué sans suppression préalable."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Icon name="plus" className="w-4 h-4" />}
              disabled={!!addingDiploma || filiereHasAutoLicence(filiere.formations)}
              onClick={() => handleAddDiplomaStructure('LICENCE')}
            >
              {addingDiploma === 'LICENCE' ? 'Création…' : 'Ajouter Licence (L1–L3)'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Icon name="plus" className="w-4 h-4" />}
              disabled={!!addingDiploma || filiereHasAutoMaster(filiere.formations)}
              onClick={() => handleAddDiplomaStructure('MASTER')}
            >
              {addingDiploma === 'MASTER' ? 'Création…' : 'Ajouter Master (M1–M2)'}
            </Button>
          </div>
          {(filiereHasAutoLicence(filiere.formations) || filiereHasAutoMaster(filiere.formations)) && (
            <p className="mt-3 text-sm text-[var(--foreground-muted)]">
              Les boutons grisés indiquent qu’un parcours Licence ou Master a déjà été généré pour cette filière (codes L1–L3 ou M1–M2).
            </p>
          )}
        </Card>
      )}

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Formations</h2>
        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          Formation → Semestre → Maquette. Vous pouvez aussi créer un parcours Licence / Master depuis{' '}
          <Link href="/dashboard/scolarite/formations" className="text-[var(--color-primary)] font-medium hover:underline">
            Scolarité → Formations
          </Link>{' '}
          (liste déroulante des filières). Les raccourcis ci-dessous restent disponibles sur cette fiche.
        </p>

        {filiere.formations.length === 0 ? (
          <Card>
            <p className="text-[var(--foreground-muted)] py-4">
              Aucune formation. Utilisez « Ajouter Licence » ou « Ajouter Master » pour générer la structure.
              {canManualFormation && ' En cas exceptionnel, une formation manuelle est disponible plus bas (admin).'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filiere.formations.map((f) => (
              <div key={f.id} className="rounded-xl border bg-[var(--surface)] transition-shadow hover:shadow-md" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/scolarite/formations/${f.id}`} className="font-semibold text-[var(--foreground)] hover:text-[var(--color-primary)] transition-colors">
                        {f.nom}
                      </Link>
                      {f.code && <span className="text-xs text-[var(--foreground-muted)]">({f.code})</span>}
                      {f.verrouille && <span className="inline-flex items-center gap-1 text-amber-600 text-sm"><Icon name="lock-closed" className="w-4 h-4" /> Verrouillée</span>}
                      {f.statut === 'PENDING' && <span className="text-amber-600 text-sm">(En attente)</span>}
                      {f.structureManaged && (
                        <span className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs px-2 py-0.5 font-medium">Structure normalisée</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
                      Cycle {f.cycle} • {f.dureeSemestres} semestres • {(f.semestres ?? []).length} semestre(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {canWrite && !filiereLocked && !f.verrouille && (
                      <>
                        <Link href={`/dashboard/scolarite/formations/${f.id}`}>
                          <Button variant="secondary" size="sm" leftIcon={<Icon name="pencil" className="w-3.5 h-3.5" />}>Modifier</Button>
                        </Link>
                        <Button variant="danger" size="sm" leftIcon={<Icon name="trash" className="w-3.5 h-3.5" />} onClick={() => handleDeleteFormation(f.id, f.code, f.nom)}>Supprimer</Button>
                      </>
                    )}
                    {canLock && !filiereLocked && (
                      <Button variant="ghost" size="sm" leftIcon={<Icon name="lock-closed" className="w-3.5 h-3.5" />} onClick={() => handleToggleFormationVerrouille(f.id)} title={f.verrouille ? 'Déverrouiller' : 'Verrouiller'}>
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

      {canWrite && !filiereLocked && canManualFormation && (
        <Card title="Formation manuelle (admin)" description="Réservé aux cas exceptionnels. Le flux standard est Licence / Master ci-dessus.">
          {!showForm ? (
            <Button variant="primary" size="md" leftIcon={<Icon name="plus" className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              Ajouter une formation
            </Button>
          ) : (
            <form onSubmit={handleCreateFormation} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Code</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} placeholder="ex: L-INFO" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Nom</label>
                  <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} placeholder="ex: Licence Informatique" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Cycle</label>
                  <select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }}>
                    <option value="L">Licence (L)</option>
                    <option value="M">Master (M)</option>
                    <option value="D">Doctorat (D)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1">Durée (semestres)</label>
                  <input type="number" value={form.dureeSemestres} onChange={(e) => setForm({ ...form, dureeSemestres: +e.target.value })} className="w-full px-3 py-2 rounded-lg border bg-[var(--background)] text-[var(--foreground)]" style={{ borderColor: 'var(--color-border)' }} min={2} max={12} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md" leftIcon={<Icon name="plus" className="w-4 h-4" />}>Créer la formation</Button>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
