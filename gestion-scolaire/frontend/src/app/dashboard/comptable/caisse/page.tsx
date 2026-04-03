'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_CAISSE = ['CAISSIER', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type Transaction = {
  id: string;
  montant: number;
  date: string;
  libelle: string;
  statut: string;
  typePaiement: string;
  receipt?: { id: string };
};

export default function CaissePage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [brouillard, setBrouillard] = useState<{ transactions: Transaction[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [montant, setMontant] = useState('');
  const [libelle, setLibelle] = useState('');
  const [typePaiement, setTypePaiement] = useState('ESPECES');
  const [referenceExterne, setReferenceExterne] = useState('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_CAISSE.includes(userRole)) {
      router.replace('/dashboard/comptable');
    }
  }, [userRole, router]);

  const load = () => {
    setLoading(true);
    api<{ transactions: Transaction[]; total: number }>(`/financial/brouillard?date=${date}`)
      .then(setBrouillard)
      .catch(() => setBrouillard({ transactions: [], total: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [date]);

  const handleEncaissement = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(montant);
    if (!m || m <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!libelle.trim()) {
      toast.error('Libellé obligatoire');
      return;
    }
    setSaving(true);
    try {
      await api('/financial/encaissements', {
        method: 'POST',
        body: JSON.stringify({
          montant: m,
          libelle: libelle.trim(),
          typePaiement,
          referenceExterne: referenceExterne.trim() || undefined,
        }),
      });
      setMontant('');
      setLibelle('');
      setReferenceExterne('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleCloture = async () => {
    if (!confirm('Clôturer les transactions du jour ? Elles ne pourront plus être modifiées.')) return;
    setSaving(true);
    try {
      await api('/financial/cloture-journaliere', {
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

  if (userRole && !CAN_CAISSE.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  return (
    <div>
      <BackLink href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Brouillard de caisse</h1>
      <p className="mt-2 text-slate-600">Encaissements du jour (non clôturés)</p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded"
        />
      </div>

      <div className="mt-6 bg-white p-6 rounded-lg shadow border max-w-xl">
        <h2 className="font-medium text-slate-800 mb-4">Nouvel encaissement</h2>
        <form onSubmit={handleEncaissement} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Montant (FCFA)</label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="px-3 py-2 border rounded w-full"
              required
              min="1"
              step="1"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Libellé</label>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="px-3 py-2 border rounded w-full"
              placeholder="Ex: Paiement inscription étudiant"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Type de paiement</label>
            <select
              value={typePaiement}
              onChange={(e) => setTypePaiement(e.target.value)}
              className="px-3 py-2 border rounded w-full"
            >
              <option value="ESPECES">Espèces</option>
              <option value="VIREMENT">Virement</option>
              <option value="CHEQUE">Chèque</option>
              <option value="CARTE">Carte</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Référence externe (optionnel)</label>
            <input
              type="text"
              value={referenceExterne}
              onChange={(e) => setReferenceExterne(e.target.value)}
              className="px-3 py-2 border rounded w-full"
              placeholder="N° chèque, référence virement..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer (génère un reçu)'}
          </button>
        </form>
      </div>

      <div className="mt-6 bg-white p-6 rounded-lg shadow border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-slate-800">Transactions du jour (non clôturées)</h2>
          <button
            onClick={handleCloture}
            disabled={saving || !brouillard?.transactions.length}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
          >
            Clôture journalière
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Date/Heure</th>
                  <th className="text-left p-3">Libellé</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Montant</th>
                  <th className="text-left p-3">Reçu (UUID)</th>
                </tr>
              </thead>
              <tbody>
                {brouillard?.transactions.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm">{new Date(t.date).toLocaleString('fr-FR')}</td>
                    <td className="p-3">{t.libelle}</td>
                    <td className="p-3">{t.typePaiement}</td>
                    <td className="p-3 text-right font-medium">{t.montant.toLocaleString()} FCFA</td>
                    <td className="p-3 text-xs font-mono">{t.receipt?.id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {brouillard && brouillard.transactions.length > 0 && (
              <p className="mt-4 font-semibold text-right">
                Total : {brouillard.total.toLocaleString()} FCFA
              </p>
            )}
            {brouillard && brouillard.transactions.length === 0 && (
              <p className="p-4 text-slate-500">Aucune transaction non clôturée pour cette date</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
