'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';
import { KpiCard } from '@/components/ui/kpi-card';
import { PieChartCard } from '@/components/ui/pie-chart-card';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { PieChartDataItem } from '@/components/ui/pie-chart-card';

type DashboardPayload = {
  comptePedagogiqueActif: boolean;
  statutDossier: string;
  inscription: {
    formation: string;
    formationCode: string;
    filiere: string | null;
    cohorte: string | null;
    campus: string | null;
    anneeUniv: number;
    semestre: number;
    maquette: string | null;
    statutIns: string;
  } | null;
  kpis: {
    documentsDisponibles: number;
    notesPubliees: number;
    prochainsCours: number;
    statutPaiement: string;
  };
  notesRepartition: PieChartDataItem[];
  documentsRepartition: PieChartDataItem[];
  activitesPedagogiques: Array<{
    type: 'cours' | 'note';
    titre: string;
    sousTitre: string;
    detail?: string;
  }>;
};

export default function EtudiantDashboard() {
  const toast = useToast();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardPayload>('/students/me/dashboard')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  const notesPie = useMemo(() => {
    const list = data?.notesRepartition?.filter((n) => n.value > 0) ?? [];
    return list.length ? list : [];
  }, [data]);

  const documentsPie = useMemo(() => {
    const list = data?.documentsRepartition?.filter((n) => n.value > 0) ?? [];
    return list.length ? list : [];
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <p className="text-[var(--foreground-muted)]">Chargement de votre tableau de bord…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl space-y-4">
        <PageHeader title="Tableau de bord Étudiant" description="Vue d’ensemble pédagogique." />
        <p className="text-red-600 text-sm">{error ?? 'Données indisponibles.'}</p>
      </div>
    );
  }

  const k = data.kpis;

  const handleDownloadBadge = () => {
    downloadFile('/persons/me/badge-pdf', 'badge-utilisateur.pdf', { validatePdfMagic: true })
      .then(() => toast.success('Badge téléchargé.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Téléchargement du badge impossible.'));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="Tableau de bord Étudiant"
          description="Vue d’ensemble : inscription, documents, notes, emploi du temps et activités pédagogiques."
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadBadge}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            Télécharger mon badge
          </button>
        </div>
      </div>

      {!data.comptePedagogiqueActif && (
        <div
          className="rounded-[var(--radius-lg)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
          role="status"
        >
          <p className="font-medium text-amber-900 dark:text-amber-100">Dossier en cours de traitement</p>
          <p className="mt-1 text-[var(--foreground-muted)]">
            Votre compte est créé, mais le dossier n’est pas encore validé par la scolarité (statut :{' '}
            <strong>{data.statutDossier}</strong>). Certaines fonctions seront pleinement disponibles après validation
            (matricule définitif, mot de passe mis à jour). Vous pouvez déjà consulter les informations ci-dessous selon
            votre inscription.
          </p>
        </div>
      )}

      {data.inscription && (
        <Card
          title="Mon inscription"
          description={`Année universitaire ${data.inscription.anneeUniv}–${data.inscription.anneeUniv + 1}`}
        >
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-[var(--foreground-muted)]">Formation</dt>
              <dd className="font-medium text-[var(--foreground)]">
                {data.inscription.formationCode} — {data.inscription.formation}
              </dd>
            </div>
            {data.inscription.filiere && (
              <div>
                <dt className="text-[var(--foreground-muted)]">Filière</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.inscription.filiere}</dd>
              </div>
            )}
            {data.inscription.cohorte && (
              <div>
                <dt className="text-[var(--foreground-muted)]">Classe / cohorte</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.inscription.cohorte}</dd>
              </div>
            )}
            {data.inscription.campus && (
              <div>
                <dt className="text-[var(--foreground-muted)]">Campus</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.inscription.campus}</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--foreground-muted)]">Semestre</dt>
              <dd className="font-medium text-[var(--foreground)]">S{data.inscription.semestre}</dd>
            </div>
            {data.inscription.maquette && (
              <div>
                <dt className="text-[var(--foreground-muted)]">Maquette</dt>
                <dd className="font-medium text-[var(--foreground)]">{data.inscription.maquette}</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--foreground-muted)]">Statut administratif</dt>
              <dd className="font-medium text-[var(--foreground)]">{data.inscription.statutIns}</dd>
            </div>
          </dl>
        </Card>
      )}

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Documents disponibles"
          value={k.documentsDisponibles}
          sub="Reçus, proforma, certificat si éligible"
          icon="document-text"
          variant="info"
        />
        <KpiCard
          label="Notes publiées"
          value={k.notesPubliees}
          sub="Sur l’année d’inscription affichée"
          icon="academic-cap"
          variant="accent"
        />
        <KpiCard
          label="Emploi du temps"
          value={k.prochainsCours}
          sub="Créneaux aujourd’hui (lun–ven) ; sinon volume sur la semaine"
          icon="calendar"
          variant="default"
        />
        <KpiCard
          label="Statut paiement"
          value={k.statutPaiement}
          sub="Situation financière"
          icon="banknotes"
          variant="success"
        />
      </section>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <PieChartCard
          title="Répartition des notes"
          description="Par tranche (année d’inscription en cours)"
          data={notesPie}
        />
        <PieChartCard
          title="Documents téléchargeables"
          description="Estimation des pièces disponibles"
          data={documentsPie}
        />
      </div>

      <Card
        title="Activités scolaires et pédagogiques"
        description="Extraits de votre emploi du temps (semestre courant) et notes récemment publiées."
      >
        {data.activitesPedagogiques.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            Aucune activité listée pour l’instant. Vérifiez l’emploi du temps une fois les cours saisis, et vos notes
            après publication par les enseignants.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {data.activitesPedagogiques.map((a, i) => (
              <li key={`${a.type}-${i}`} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start gap-2">
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                      a.type === 'cours'
                        ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                        : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {a.type === 'cours' ? 'Cours' : 'Note'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">{a.titre}</p>
                    <p className="text-[var(--foreground-muted)]">{a.sousTitre}</p>
                    {a.detail && <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{a.detail}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/etudiant/emploi-du-temps"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Voir l’emploi du temps complet →
          </Link>
          <Link
            href="/dashboard/etudiant/notes"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Voir toutes mes notes →
          </Link>
        </div>
      </Card>

      <Card title="Accès rapide" description="Espace documents, EDT et résultats.">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <NavCard
            href="/dashboard/etudiant/documents"
            title="Documents"
            description="Facture proforma, certificat, reçus, fiche d’inscription"
            variant="blue"
            icon="document-text"
          />
          <NavCard
            href="/dashboard/etudiant/emploi-du-temps"
            title="Emploi du temps"
            description="Cours de votre formation"
            variant="default"
            icon="calendar"
          />
          <NavCard
            href="/dashboard/etudiant/notes"
            title="Notes"
            description="Consultation de vos notes"
            variant="default"
            icon="academic-cap"
          />
        </div>
      </Card>
    </div>
  );
}
