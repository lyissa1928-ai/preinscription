'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_DAF = ['DAF', 'ADMIN', 'SUPER_ADMIN'];

type TableauDeBord = {
  exercice: number;
  tauxRecouvrement: number;
  soldeTresorerie: number;
  totalEncaissements: number;
  totalDecaissements: number;
  totalBudgetAlloue: number;
  totalBudgetConsomme: number;
  ecartBudgetReel: number;
};

type Demande = {
  id: string;
  montant: number;
  libelle: string;
  statut: string;
  budget: { departement: string; exercice: number };
  initiePar: { firstName: string; lastName: string };
};

export default function DafPage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [tableau, setTableau] = useState<TableauDeBord | null>(null);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadTableau = () => {
    api<TableauDeBord>(`/financial/daf/tableau-de-bord?exercice=${exercice}`)
      .then(setTableau)
      .catch(() => setTableau(null));
  };

  const loadDemandes = () => {
    api<Demande[]>('/financial/daf/demandes-en-attente')
      .then(setDemandes)
      .catch(() => setDemandes([]));
  };

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_DAF.includes(userRole)) {
      router.replace('/dashboard/comptable');
    }
  }, [userRole, router]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTableau(), loadDemandes()]).finally(() => setLoading(false));
  }, [exercice]);

  const handleApprouver = async (id: string, decision: 'APPROUVEE' | 'REJETEE') => {
    let motifRejet: string | undefined;
    if (decision === 'REJETEE') {
      motifRejet = window.prompt('Motif du rejet (obligatoire) :') ?? undefined;
      if (!motifRejet?.trim()) {
        toast.error('Motif obligatoire');
        return;
      }
    }
    setProcessing(id);
    try {
      await api(`/financial/daf/demandes/${id}/approver`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          motifRejet,
        }),
      });
      loadDemandes();
      loadTableau();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setProcessing(null);
    }
  };

  if (userRole && !CAN_DAF.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  return (
    <div>
      <BackLink href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord DAF</h1>
      <p className="mt-2 text-slate-600">Taux de recouvrement, trésorerie, approbation des dépenses</p>

      <div className="mt-4">
        <label className="block text-sm text-slate-600 mb-1">Exercice</label>
        <input
          type="number"
          value={exercice}
          onChange={(e) => setExercice(+e.target.value)}
          className="px-3 py-2 border rounded w-32"
        />
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : tableau ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Taux de recouvrement</h3>
            <p className="text-2xl font-bold text-blue-600">{tableau.tauxRecouvrement}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Solde trésorerie consolidé</h3>
            <p className={`text-2xl font-bold ${tableau.soldeTresorerie >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tableau.soldeTresorerie.toLocaleString()} FCFA
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Écart budget vs réel</h3>
            <p className="text-2xl font-bold">{tableau.ecartBudgetReel.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Total encaissements</h3>
            <p className="text-xl font-semibold">{tableau.totalEncaissements.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Total décaissements</h3>
            <p className="text-xl font-semibold">{tableau.totalDecaissements.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <h3 className="text-sm text-slate-500">Budget consommé</h3>
            <p className="text-xl font-semibold">{tableau.totalBudgetConsomme.toLocaleString()} / {tableau.totalBudgetAlloue.toLocaleString()} FCFA</p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 bg-white p-6 rounded-lg shadow border">
        <h2 className="font-medium text-slate-800 mb-4">Demandes de décaissement en attente</h2>
        {demandes.length === 0 ? (
          <p className="text-slate-500">Aucune demande en attente</p>
        ) : (
          <div className="space-y-4">
            {demandes.map((d) => (
              <div key={d.id} className="p-4 border rounded bg-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{d.libelle}</p>
                    <p className="text-sm text-slate-600">
                      {d.montant.toLocaleString()} FCFA — {d.budget.departement} ({d.budget.exercice})
                    </p>
                    <p className="text-xs text-slate-500">Initée par {d.initiePar.firstName} {d.initiePar.lastName}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handleApprouver(d.id, 'APPROUVEE')}
                      disabled={!!processing}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => handleApprouver(d.id, 'REJETEE')}
                      disabled={!!processing}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
