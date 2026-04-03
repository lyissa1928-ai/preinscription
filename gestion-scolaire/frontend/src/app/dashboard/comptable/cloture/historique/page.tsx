'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type FinancialStatus = {
  id: string;
  date: string;
  totalEncaissements: number;
  totalDepenses: number;
  solde: number;
  statut: string;
  validePar?: { firstName: string; lastName: string };
};

const CAN_VIEW = ['CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];

export default function HistoriqueCloturePage() {
  const toast = useToast();
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [statuses, setStatuses] = useState<FinancialStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u) as { role?: string }).role || '' : '';
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  const canExport = CAN_VIEW.includes(userRole);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    api<FinancialStatus[]>(`/governance/financial-statuses?${params}`)
      .then(setStatuses)
      .catch(() => setStatuses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [userRole]);

  const handleExport = () => {
    setExporting(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    downloadFile(`/governance/financial-statuses/export/csv?${params}`, `etats-financiers-${dateDebut || 'debut'}-${dateFin || 'fin'}.xlsx`)
      .catch((e) => toast.error(e?.message || 'Erreur export'))
      .finally(() => setExporting(false));
  };

  return (
    <div>
      <BackLink href="/dashboard/comptable/cloture" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Historique des états financiers</h1>
      <div className="mt-4 flex flex-wrap gap-4 items-center">
        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="px-3 py-2 border rounded" />
        <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="px-3 py-2 border rounded" />
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Rechercher
        </button>
        {canExport && (
          <button onClick={handleExport} disabled={!!exporting} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {exporting ? 'Export...' : 'Export CSV'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow border">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3">Date</th>
                <th className="text-right p-3">Encaissements</th>
                <th className="text-right p-3">Dépenses</th>
                <th className="text-right p-3">Solde</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-left p-3">Validé par</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <tr key={s.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-right">{s.totalEncaissements.toLocaleString()} FCFA</td>
                  <td className="p-3 text-right">{s.totalDepenses.toLocaleString()} FCFA</td>
                  <td className="p-3 text-right font-medium">{s.solde.toLocaleString()} FCFA</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${s.statut === 'VALIDATED' ? 'bg-green-100' : s.statut === 'BREACH_REQUESTED' ? 'bg-amber-100' : 'bg-slate-100'}`}>{s.statut}</span></td>
                  <td className="p-3 text-sm">{s.validePar ? `${s.validePar.firstName} ${s.validePar.lastName}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {statuses.length === 0 && <p className="p-4 text-slate-500">Aucun état trouvé</p>}
        </div>
      )}
    </div>
  );
}
