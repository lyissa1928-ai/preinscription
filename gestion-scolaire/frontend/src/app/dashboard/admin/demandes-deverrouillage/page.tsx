'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type DemandeDeverrouillage = {
  id: string;
  motif: string | null;
  statut: string;
  createdAt: string;
  maquette: {
    id: string;
    code: string;
    anneeRef: number;
    semestre: {
      numero: number;
      formation: {
        id: string;
        code: string;
        nom: string;
        filiere: { code: string; nom: string };
      };
    };
  };
  demandeur: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

export default function DemandesDeverrouillagePage() {
  const router = useRouter();
  const toast = useToast();
  const [demandes, setDemandes] = useState<DemandeDeverrouillage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const { role: r } = JSON.parse(u);
      setRole(r);
      if (r !== 'SUPER_ADMIN') router.replace('/dashboard/admin');
    }
  }, [router]);

  const load = () => {
    api<DemandeDeverrouillage[]>('/formations/demandes-deverrouillage/pending')
      .then(setDemandes)
      .catch(() => setDemandes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (role === 'SUPER_ADMIN') load();
  }, [role]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api(`/formations/demandes-deverrouillage/${id}/approve`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await api(`/formations/demandes-deverrouillage/${id}/reject`, { method: 'PATCH' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  if (role !== 'SUPER_ADMIN') return null;

  return (
    <div>
      <BackLink href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Demandes de déverrouillage</h1>
      <p className="mt-2 text-slate-600">
        Demandes en attente de validation — Seul le Super Admin peut approuver ou rejeter
      </p>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : demandes.length === 0 ? (
        <p className="mt-6 text-slate-500">Aucune demande en attente</p>
      ) : (
        <div className="mt-6 space-y-4">
          {demandes.map((d) => (
            <div key={d.id} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="font-medium">
                Maquette {d.maquette.code} — Semestre {d.maquette.semestre.numero} — {d.maquette.semestre.formation.code} ({d.maquette.anneeRef})
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {d.maquette.semestre.formation.filiere.code} — {d.maquette.semestre.formation.filiere.nom}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Demandé par {d.demandeur.firstName} {d.demandeur.lastName} ({d.demandeur.email}) — {new Date(d.createdAt).toLocaleString('fr-FR')}
              </div>
              {d.motif && (
                <div className="mt-2 p-2 bg-white rounded">Motif : {d.motif}</div>
              )}
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/dashboard/scolarite/formations/${d.maquette.semestre.formation.id}/maquettes/${d.maquette.id}`}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-sm"
                >
                  Voir la maquette
                </Link>
                <button
                  onClick={() => handleApprove(d.id)}
                  disabled={!!processing}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Approuver
                </button>
                <button
                  onClick={() => handleReject(d.id)}
                  disabled={!!processing}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
