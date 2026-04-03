'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_MODIFY = ['CAISSIER', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
const CAN_CLOSE = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_REQUEST_BREACH = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type FinancialStatus = {
  id: string;
  date: string;
  totalEncaissements: number;
  totalDepenses: number;
  solde: number;
  statut: string;
  validePar?: { firstName: string; lastName: string };
  breachRequests: { id: string; justification: string; statut: string }[];
};

export default function CloturePage() {
  const toast = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<FinancialStatus | null>(null);
  const [totalDepenses, setTotalDepenses] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBreach, setShowBreach] = useState(false);
  const [breachJustification, setBreachJustification] = useState('');
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u) as { role?: string }).role || '' : '';
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  const canModify = CAN_MODIFY.includes(userRole);
  const canClose = CAN_CLOSE.includes(userRole);
  const canRequestBreach = CAN_REQUEST_BREACH.includes(userRole);

  const load = () => {
    setLoading(true);
    api<FinancialStatus>(`/governance/financial-status?date=${date}`)
      .then((s) => {
        setStatus(s);
        setTotalDepenses(s.totalDepenses.toString());
      })
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [date, userRole]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/governance/financial-status?date=${date}`, {
        method: 'PATCH',
        body: JSON.stringify({ totalDepenses: parseFloat(totalDepenses) || 0 }),
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    setSaving(true);
    try {
      await api('/governance/financial-status/validate', {
        method: 'POST',
        body: JSON.stringify({ date }),
      });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleBreachSubmit = async () => {
    if (!breachJustification.trim()) {
      toast.error('La justification est obligatoire');
      return;
    }
    setSaving(true);
    try {
      await api('/governance/breach-requests', {
        method: 'POST',
        body: JSON.stringify({ financialStatusId: status?.id, justification: breachJustification }),
      });
      setShowBreach(false);
      setBreachJustification('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !status) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <BackLink href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Clôture journalière</h1>
      <p className="mt-2 text-slate-600">
        Synthèse financière du jour — validation et transmission au Directeur
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded"
        />
      </div>

      {status && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow border max-w-2xl">
          <div className="grid gap-4">
            <div>
              <span className="text-slate-600">Encaissements du jour :</span>
              <span className="ml-2 font-semibold">{status.totalEncaissements.toLocaleString()} FCFA</span>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Dépenses du jour</label>
              <input
                type="number"
                value={totalDepenses}
                onChange={(e) => setTotalDepenses(e.target.value)}
                disabled={status.statut !== 'DRAFT' || !canModify}
                className="px-3 py-2 border rounded w-48"
              />
              <span className="ml-2">FCFA</span>
            </div>
            <div>
              <span className="text-slate-600">Solde :</span>
              <span className="ml-2 font-semibold">{status.solde.toLocaleString()} FCFA</span>
            </div>
            <div>
              <span className="text-slate-600">Statut :</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-sm ${
                status.statut === 'DRAFT' ? 'bg-amber-100' :
                status.statut === 'VALIDATED' ? 'bg-green-100' : 'bg-blue-100'
              }`}>{status.statut}</span>
            </div>
            {status.validePar && (
              <div className="text-sm text-slate-500">
                Validé par {status.validePar.firstName} {status.validePar.lastName}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            {status.statut === 'DRAFT' && (
              <>
                {canModify && (
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-50">
                    Enregistrer
                  </button>
                )}
                {canClose && (
                  <button onClick={handleValidate} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                    Valider et transmettre au Directeur
                  </button>
                )}
              </>
            )}
            {status.statut === 'VALIDATED' && status.breachRequests.filter((b) => b.statut === 'PENDING').length === 0 && canRequestBreach && (
              <button onClick={() => setShowBreach(true)} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
                Demande de brèche
              </button>
            )}
          </div>

          {showBreach && (
            <div className="mt-6 p-4 bg-amber-50 rounded border border-amber-200">
              <h3 className="font-medium mb-2">Demande de brèche</h3>
              <p className="text-sm text-slate-600 mb-2">Justification obligatoire pour corriger une erreur après validation.</p>
              <textarea
                value={breachJustification}
                onChange={(e) => setBreachJustification(e.target.value)}
                placeholder="Décrivez l'erreur et la correction à apporter..."
                className="w-full px-3 py-2 border rounded mb-2"
                rows={3}
              />
              <div className="flex gap-2">
                <button onClick={handleBreachSubmit} disabled={saving} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
                  Envoyer
                </button>
                <button onClick={() => { setShowBreach(false); setBreachJustification(''); }} className="px-4 py-2 bg-slate-200 rounded">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {status.breachRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Demandes de brèche</h3>
              <ul className="space-y-2">
                {status.breachRequests.map((b) => (
                  <li key={b.id} className="text-sm p-2 bg-slate-50 rounded">
                    {b.justification} — <span className={b.statut === 'PENDING' ? 'text-amber-600' : b.statut === 'APPROVED' ? 'text-green-600' : 'text-red-600'}>{b.statut}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <Link href="/dashboard/comptable/cloture/historique" className="text-blue-600 hover:underline">
          Voir l&apos;historique des états financiers →
        </Link>
      </div>
    </div>
  );
}
