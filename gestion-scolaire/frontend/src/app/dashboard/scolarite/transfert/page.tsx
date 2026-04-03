'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Formation = { id: string; code: string; nom: string };

export default function TransfertPage() {
  const toast = useToast();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());
  const [formationId, setFormationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number } | null>(null);

  useEffect(() => {
    api<Formation[]>('/formations')
      .then(setFormations)
      .catch(() => setFormations([]));
  }, []);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Clôturer les inscriptions : passer INSCRIT/CONFIRMEE → VALIDE pour cette année' + (formationId ? ' et cette formation' : ' (toutes formations)') + ' ?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api<{ updated: number }>('/inscriptions/close', {
        method: 'POST',
        body: JSON.stringify({ anneeUniv, formationId: formationId || undefined }),
      });
      setResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackLink href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">← Retour scolarité</BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Clôture des inscriptions (transfert)</h1>
      <p className="mt-1 text-slate-600 text-sm">Passe les inscriptions en statut INSCRIT (ou CONFIRMEE) vers VALIDE pour l&apos;année choisie.</p>

      <form onSubmit={handleClose} className="mt-6 p-6 bg-white rounded-lg shadow border max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Année universitaire</label>
          <input
            type="number"
            value={anneeUniv}
            onChange={(e) => setAnneeUniv(parseInt(e.target.value, 10) || new Date().getFullYear())}
            className="w-full px-3 py-2 border rounded"
            min={2000}
            max={2100}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Formation (optionnel)</label>
          <select value={formationId} onChange={(e) => setFormationId(e.target.value)} className="w-full px-3 py-2 border rounded">
            <option value="">Toutes les formations</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.code} – {f.nom}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">
          {loading ? 'Clôture...' : 'Clôturer les inscriptions'}
        </button>
      </form>

      {result !== null && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded text-green-800">
          <strong>{result.updated}</strong> inscription(s) passée(s) en statut VALIDE.
        </div>
      )}
    </div>
  );
}
