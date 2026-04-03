'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, downloadPdf, downloadFile } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'AUDITOR'];

type Effectifs = {
  anneeUniv: number;
  total: number;
  parFormation: { code: string; nom: string; count: number }[];
};

type Recettes = {
  annee: number;
  total: number;
  parType: Record<string, number>;
  nbTransactions: number;
};

type TauxReussite = {
  anneeUniv: number;
  session: number;
  global: { total: number; reussis: number; taux: number };
  parFormation: { formationId: string; total: number; reussis: number; taux: number }[];
};

export default function RapportsPage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [effectifs, setEffectifs] = useState<Effectifs | null>(null);
  const [recettes, setRecettes] = useState<Recettes | null>(null);
  const [tauxReussite, setTauxReussite] = useState<TauxReussite | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_ACCESS.includes(userRole)) {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api<Effectifs>(`/reports/effectifs?anneeUniv=${annee}`),
      api<Recettes>(`/reports/recettes?annee=${annee}`),
      api<TauxReussite>(`/reports/taux-reussite?anneeUniv=${annee}`),
    ])
      .then(([e, r, t]) => {
        setEffectifs(e);
        setRecettes(r);
        setTauxReussite(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [annee]);

  const handleExportPdf = () => {
    setExporting('pdf');
    downloadPdf(`/reports/export/pdf?anneeUniv=${annee}`, `rapport-synthese-${annee}.pdf`)
      .catch((e) => toast.error(e?.message || 'Erreur export PDF'))
      .finally(() => setExporting(null));
  };

  const handleExportExcel = () => {
    setExporting('excel');
    downloadFile(`/reports/export/csv?anneeUniv=${annee}`, `rapport-synthese-${annee}.xlsx`)
      .catch((e) => toast.error(e?.message || 'Erreur export Excel'))
      .finally(() => setExporting(null));
  };

  if (userRole && !CAN_ACCESS.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Rapports</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-600">
            Année :
            <select
              value={annee}
              onChange={(e) => setAnnee(+e.target.value)}
              className="ml-2 border border-slate-300 rounded px-2 py-1"
            >
              {[annee - 2, annee - 1, annee, annee + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            onClick={handleExportPdf}
            disabled={!!exporting}
            className="px-3 py-1.5 bg-slate-700 text-white rounded text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Export...' : 'Export PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!!exporting}
            className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting === 'excel' ? 'Export...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Effectifs ({effectifs?.anneeUniv})</h2>
            <p className="text-slate-600">
              Total inscrits : <strong>{effectifs?.total ?? 0}</strong>
            </p>
            {effectifs?.parFormation && effectifs.parFormation.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2">Formation</th>
                    <th className="text-right py-2">Effectif</th>
                  </tr>
                </thead>
                <tbody>
                  {effectifs.parFormation.map((f) => (
                    <tr key={f.code} className="border-b border-slate-100">
                      <td className="py-2">{f.code} — {f.nom}</td>
                      <td className="text-right py-2">{f.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Recettes ({recettes?.annee})</h2>
            <p className="text-slate-600">
              Total : <strong>{recettes?.total?.toLocaleString() ?? 0} FCFA</strong>
            </p>
            <p className="text-slate-600 text-sm">Transactions : {recettes?.nbTransactions ?? 0}</p>
            {recettes?.parType && Object.keys(recettes.parType).length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(recettes.parType).map(([type, montant]) => (
                    <tr key={type} className="border-b border-slate-100">
                      <td className="py-2">{type}</td>
                      <td className="text-right py-2">{montant.toLocaleString()} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800 mb-3">Taux de réussite ({tauxReussite?.anneeUniv}, session {tauxReussite?.session})</h2>
            <p className="text-slate-600">
              Global : <strong>{tauxReussite?.global.taux ?? 0}%</strong> ({tauxReussite?.global.reussis}/{tauxReussite?.global.total})
            </p>
            {tauxReussite?.parFormation && tauxReussite.parFormation.length > 0 && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2">Formation</th>
                    <th className="text-right py-2">Réussis</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {tauxReussite.parFormation.map((f) => (
                    <tr key={f.formationId} className="border-b border-slate-100">
                      <td className="py-2">{f.formationId}</td>
                      <td className="text-right py-2">{f.reussis}</td>
                      <td className="text-right py-2">{f.total}</td>
                      <td className="text-right py-2">{f.taux}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      <p className="mt-6">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
          ← Retour au tableau de bord
        </Link>
      </p>
    </div>
  );
}
