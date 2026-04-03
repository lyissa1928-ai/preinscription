'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';

type Recouvrement = {
  anneeUniv: number;
  parFormation: Array<{
    formationId: string;
    formationCode: string;
    formationNom: string;
    count: number;
    resteTotal: number;
    etudiants: Array<{ personId: string; matricule: string; nom: string; reste: number }>;
  }>;
  parCohorte: Array<{
    cohortId: string;
    cohortNom: string;
    formationCode: string;
    count: number;
    resteTotal: number;
    etudiants: Array<{ personId: string; matricule: string; nom: string; reste: number }>;
  }>;
};

export default function RecouvrementPage() {
  const [data, setData] = useState<Recouvrement | null>(null);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<Recouvrement>(`/finance/recouvrement?anneeUniv=${anneeUniv}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [anneeUniv]);

  if (loading) return <p className="text-slate-500 p-6">Chargement...</p>;

  return (
    <div>
      <BackLink href="/dashboard/comptable">← Retour</BackLink>
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reste à recouvrer</h1>
        <div>
          <label className="text-sm text-slate-600 mr-2">Année universitaire</label>
          <input
            type="number"
            value={anneeUniv}
            onChange={(e) => setAnneeUniv(parseInt(e.target.value, 10) || new Date().getFullYear())}
            className="px-3 py-2 border rounded"
            min={2020}
            max={2030}
          />
        </div>
      </div>
      <p className="mt-1 text-slate-600 text-sm">Reste à recouvrer par formation et par cohorte pour relancer les étudiants non en règle.</p>

      {!data ? (
        <p className="mt-4 text-slate-500">Aucune donnée.</p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Par formation</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow border">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Formation</th>
                    <th className="text-right p-3">Nombre</th>
                    <th className="text-right p-3">Reste total (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parFormation.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-slate-500">Aucun reste à recouvrer</td></tr>
                  ) : (
                    data.parFormation.map((f) => (
                      <tr key={f.formationId} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{f.formationCode} – {f.formationNom}</td>
                        <td className="p-3 text-right">{f.count}</td>
                        <td className="p-3 text-right font-mono">{Math.round(f.resteTotal).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Par classe (cohorte)</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow border">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Classe</th>
                    <th className="text-left p-3">Formation</th>
                    <th className="text-right p-3">Nombre</th>
                    <th className="text-right p-3">Reste total (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.parCohorte.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-slate-500">Aucun reste à recouvrer</td></tr>
                  ) : (
                    data.parCohorte.map((c) => (
                      <tr key={c.cohortId || c.formationCode + c.cohortNom} className="border-b hover:bg-slate-50">
                        <td className="p-3 font-medium">{c.cohortNom || 'Sans classe'}</td>
                        <td className="p-3">{c.formationCode}</td>
                        <td className="p-3 text-right">{c.count}</td>
                        <td className="p-3 text-right font-mono">{Math.round(c.resteTotal).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
