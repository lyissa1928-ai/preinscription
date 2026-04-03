'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type BreachRequest = {
  id: string;
  justification: string;
  statut: string;
  commentaire: string | null;
  financialStatus: { date: string; totalEncaissements: number; totalDepenses: number; solde: number };
  demandeur: { firstName: string; lastName: string };
  approuvePar?: { firstName: string; lastName: string };
};

type FinancialStatus = {
  id: string;
  date: string;
  totalEncaissements: number;
  totalDepenses: number;
  solde: number;
  statut: string;
  validePar?: { firstName: string; lastName: string };
};

export default function GouvernanceAdminPage() {
  const router = useRouter();
  const toast = useToast();
  const [pendingBreaches, setPendingBreaches] = useState<BreachRequest[]>([]);
  const [statuses, setStatuses] = useState<FinancialStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState<Record<string, string>>({});

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const { role } = JSON.parse(u);
      if (role === 'SUPER_ADMIN') router.replace('/dashboard/admin');
    }
  }, [router]);

  const load = () => {
    Promise.all([
      api<BreachRequest[]>('/governance/breach-requests/pending'),
      api<FinancialStatus[]>('/governance/financial-statuses'),
    ])
      .then(([breaches, st]) => {
        setPendingBreaches(breaches);
        setStatuses(st.slice(0, 10));
      })
      .catch(() => {
        setPendingBreaches([]);
        setStatuses([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await api(`/governance/breach-requests/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    setApproving(id);
    try {
      await api(`/governance/breach-requests/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ commentaire: rejectComment[id] || undefined }),
      });
      setRejectComment((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setApproving(null);
    }
  };

  return (
    <div>
      <BackLink href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Gouvernance financière</h1>
      <p className="mt-2 text-slate-600">
        États validés, demandes de brèche en attente
      </p>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : (
        <>
          {pendingBreaches.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Demandes de brèche en attente</h2>
              <div className="space-y-4">
                {pendingBreaches.map((b) => (
                  <div key={b.id} className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="font-medium">
                      État du {new Date(b.financialStatus.date).toLocaleDateString('fr-FR')} — {b.financialStatus.totalEncaissements.toLocaleString()} FCFA encaissements, {b.financialStatus.totalDepenses.toLocaleString()} FCFA dépenses
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      Demandé par {b.demandeur.firstName} {b.demandeur.lastName}
                    </div>
                    <div className="mt-2 p-2 bg-white rounded">
                      <strong>Justification :</strong> {b.justification}
                    </div>
                    <div className="mt-3 flex gap-2 items-center">
                      <button
                        onClick={() => handleApprove(b.id)}
                        disabled={!!approving}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Approuver
                      </button>
                      <input
                        type="text"
                        placeholder="Commentaire (optionnel)"
                        value={rejectComment[b.id] || ''}
                        onChange={(e) => setRejectComment((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        className="px-3 py-2 border rounded w-48"
                      />
                      <button
                        onClick={() => handleReject(b.id)}
                        disabled={!!approving}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">États financiers récents</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow border">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Encaissements</th>
                    <th className="text-right p-3">Dépenses</th>
                    <th className="text-right p-3">Solde</th>
                    <th className="text-left p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-3">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3 text-right">{s.totalEncaissements.toLocaleString()} FCFA</td>
                      <td className="p-3 text-right">{s.totalDepenses.toLocaleString()} FCFA</td>
                      <td className="p-3 text-right font-medium">{s.solde.toLocaleString()} FCFA</td>
                      <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${s.statut === 'VALIDATED' ? 'bg-green-100' : s.statut === 'BREACH_REQUESTED' ? 'bg-amber-100' : 'bg-slate-100'}`}>{s.statut}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
