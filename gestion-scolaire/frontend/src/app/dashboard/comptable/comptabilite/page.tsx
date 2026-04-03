'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_COMPTABILITE = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_ECRITURES_DEMANDE_BUDGETS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type Compte = { id: string; numeroCompte: string; intitule: string };
type Balance = { numeroCompte: string; intitule: string; totalDebit: number; totalCredit: number; solde: number };
type Ecriture = {
  id: string;
  montant: number;
  libelle: string;
  dateEcriture: string;
  compteDebit: Compte;
  compteCredit: Compte;
  transaction: { libelle: string };
};

export default function ComptabilitePage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [budgets, setBudgets] = useState<{ id: string; exercice: number; departement: string; montantAlloue: number; montantConsomme: number }[]>([]);
  const [balance, setBalance] = useState<Balance[]>([]);
  const [grandLivre, setGrandLivre] = useState<Ecriture[]>([]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [compteId, setCompteId] = useState('');
  const [vue, setVue] = useState<'balance' | 'grand-livre' | 'demande' | 'ecritures' | 'budgets'>('balance');
  const [transactionsSansEcritures, setTransactionsSansEcritures] = useState<{ id: string; libelle: string; montant: number; date: string }[]>([]);
  const [transactionsARapprocher, setTransactionsARapprocher] = useState<{ id: string; libelle: string; montant: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [demandeMontant, setDemandeMontant] = useState('');
  const [demandeLibelle, setDemandeLibelle] = useState('');
  const [demandeBudgetId, setDemandeBudgetId] = useState('');
  const [budgetExercice, setBudgetExercice] = useState(new Date().getFullYear());
  const [budgetDepartement, setBudgetDepartement] = useState('');
  const [budgetMontant, setBudgetMontant] = useState('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_COMPTABILITE.includes(userRole)) {
      router.replace('/dashboard/comptable');
    }
  }, [userRole, router]);

  useEffect(() => {
    api<Compte[]>('/financial/comptes').then(setComptes).catch(() => setComptes([]));
    api<typeof budgets>('/financial/budgets').then(setBudgets).catch(() => setBudgets([]));
  }, []);

  const canModify = CAN_ECRITURES_DEMANDE_BUDGETS.includes(userRole);

  useEffect(() => {
    if (vue === 'ecritures') {
      api<{ id: string; libelle: string; montant: number; date: string }[]>('/financial/transactions-sans-ecritures')
        .then(setTransactionsSansEcritures)
        .catch(() => setTransactionsSansEcritures([]));
      api<{ id: string; libelle: string; montant: number }[]>('/financial/transactions-a-rapprocher')
        .then(setTransactionsARapprocher)
        .catch(() => setTransactionsARapprocher([]));
    }
    if (vue === 'budgets') {
      api<typeof budgets>('/financial/budgets').then(setBudgets).catch(() => setBudgets([]));
    }
  }, [vue]);

  const loadBalance = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    api<Balance[]>(`/financial/balance?${params}`)
      .then(setBalance)
      .catch(() => setBalance([]))
      .finally(() => setLoading(false));
  };

  const loadGrandLivre = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (compteId) params.set('compteId', compteId);
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);
    api<Ecriture[]>(`/financial/grand-livre?${params}`)
      .then(setGrandLivre)
      .catch(() => setGrandLivre([]))
      .finally(() => setLoading(false));
  };

  const handleDemande = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(demandeMontant);
    if (!m || m <= 0 || !demandeBudgetId || !demandeLibelle.trim()) {
      toast.error('Remplissez tous les champs');
      return;
    }
    try {
      await api('/financial/demandes-decaissement', {
        method: 'POST',
        body: JSON.stringify({
          budgetId: demandeBudgetId,
          montant: m,
          libelle: demandeLibelle.trim(),
        }),
      });
      setDemandeMontant('');
      setDemandeLibelle('');
      setDemandeBudgetId('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (userRole && !CAN_COMPTABILITE.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  return (
    <div>
      <Link href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Comptabilité</h1>
      <p className="mt-2 text-slate-600">Balance, Grand-Livre, écritures, demandes de décaissement</p>

      <div className="mt-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setVue('balance')}
          className={`px-4 py-2 rounded ${vue === 'balance' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Balance
        </button>
        <button
          onClick={() => setVue('grand-livre')}
          className={`px-4 py-2 rounded ${vue === 'grand-livre' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Grand-Livre
        </button>
        {canModify && (
          <>
            <button
              onClick={() => setVue('demande')}
              className={`px-4 py-2 rounded ${vue === 'demande' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
            >
              Demande décaissement
            </button>
            <button
              onClick={() => setVue('ecritures')}
              className={`px-4 py-2 rounded ${vue === 'ecritures' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
            >
              Générer écritures
            </button>
            <button
              onClick={() => setVue('budgets')}
              className={`px-4 py-2 rounded ${vue === 'budgets' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
            >
              Budgets
            </button>
          </>
        )}
      </div>

      {vue === 'balance' && (
        <div className="mt-6">
          <div className="flex gap-4 mb-4">
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="px-3 py-2 border rounded" />
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="px-3 py-2 border rounded" />
            <button onClick={loadBalance} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
              Charger
            </button>
          </div>
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Compte</th>
                  <th className="text-left p-3">Intitulé</th>
                  <th className="text-right p-3">Débit</th>
                  <th className="text-right p-3">Crédit</th>
                  <th className="text-right p-3">Solde</th>
                </tr>
              </thead>
              <tbody>
                {balance.map((b) => (
                  <tr key={b.numeroCompte} className="border-b">
                    <td className="p-3">{b.numeroCompte}</td>
                    <td className="p-3">{b.intitule}</td>
                    <td className="p-3 text-right">{b.totalDebit.toLocaleString()}</td>
                    <td className="p-3 text-right">{b.totalCredit.toLocaleString()}</td>
                    <td className="p-3 text-right font-medium">{b.solde.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {balance.length === 0 && !loading && <p className="p-4 text-slate-500">Aucune écriture</p>}
          </div>
        </div>
      )}

      {vue === 'grand-livre' && (
        <div className="mt-6">
          <div className="flex gap-4 mb-4 flex-wrap">
            <select value={compteId} onChange={(e) => setCompteId(e.target.value)} className="px-3 py-2 border rounded">
              <option value="">Tous les comptes</option>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>{c.numeroCompte} - {c.intitule}</option>
              ))}
            </select>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="px-3 py-2 border rounded" />
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="px-3 py-2 border rounded" />
            <button onClick={loadGrandLivre} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
              Charger
            </button>
          </div>
          <div className="bg-white rounded-lg shadow border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Libellé</th>
                  <th className="text-left p-3">Compte Débit</th>
                  <th className="text-left p-3">Compte Crédit</th>
                  <th className="text-right p-3">Montant</th>
                </tr>
              </thead>
              <tbody>
                {grandLivre.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-3 text-sm">{new Date(e.dateEcriture).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3">{e.libelle}</td>
                    <td className="p-3">{e.compteDebit.numeroCompte}</td>
                    <td className="p-3">{e.compteCredit.numeroCompte}</td>
                    <td className="p-3 text-right">{e.montant.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {grandLivre.length === 0 && !loading && <p className="p-4 text-slate-500">Aucune écriture</p>}
          </div>
        </div>
      )}

      {vue === 'ecritures' && (
        <div className="mt-6 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="font-medium mb-4">Transactions clôturées sans écritures</h2>
          <p className="text-sm text-slate-600 mb-4">Générer les écritures comptables (Débit/Crédit) pour les transactions validées</p>
          <div className="space-y-2">
            {transactionsSansEcritures.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <span>{new Date(t.date).toLocaleDateString('fr-FR')} — {t.libelle} — {t.montant.toLocaleString()} FCFA</span>
                <button
                  onClick={async () => {
                    try {
                      await api(`/financial/ecritures/generer/${t.id}`, { method: 'POST' });
                      setTransactionsSansEcritures((prev) => prev.filter((x) => x.id !== t.id));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Erreur');
                    }
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Générer
                </button>
              </div>
            ))}
            {transactionsSansEcritures.length === 0 && <p className="text-slate-500">Aucune transaction à traiter</p>}
          </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="font-medium mb-4">Rapprochement (vérification relevé)</h2>
            <div className="space-y-2">
              {transactionsARapprocher.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <span>{t.libelle} — {t.montant.toLocaleString()} FCFA</span>
                  <button
                    onClick={async () => {
                      try {
                        await api(`/financial/transactions/${t.id}/rapprocher`, { method: 'PATCH' });
                        setTransactionsARapprocher((prev) => prev.filter((x) => x.id !== t.id));
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Erreur');
                      }
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Rapprocher
                  </button>
                </div>
              ))}
              {transactionsARapprocher.length === 0 && <p className="text-slate-500">Toutes les transactions sont rapprochées</p>}
            </div>
          </div>
        </div>
      )}

      {vue === 'budgets' && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow border max-w-xl">
          <h2 className="font-medium mb-4">Créer / modifier un budget</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const m = parseFloat(budgetMontant);
              if (!m || m < 0 || !budgetDepartement.trim()) {
                toast.error('Remplissez tous les champs');
                return;
              }
              try {
                await api('/financial/budgets', {
                  method: 'POST',
                  body: JSON.stringify({
                    exercice: budgetExercice,
                    departement: budgetDepartement.trim(),
                    montantAlloue: m,
                  }),
                });
                setBudgetDepartement('');
                setBudgetMontant('');
                api<typeof budgets>('/financial/budgets').then(setBudgets);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Erreur');
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm text-slate-600 mb-1">Exercice</label>
              <input type="number" value={budgetExercice} onChange={(e) => setBudgetExercice(+e.target.value)} className="px-3 py-2 border rounded w-full" />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Département</label>
              <input type="text" value={budgetDepartement} onChange={(e) => setBudgetDepartement(e.target.value)} className="px-3 py-2 border rounded w-full" placeholder="Ex: Informatique" required />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Montant alloué (FCFA)</label>
              <input type="number" value={budgetMontant} onChange={(e) => setBudgetMontant(e.target.value)} className="px-3 py-2 border rounded w-full" required min="0" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
          </form>
          <div className="mt-6">
            <h3 className="font-medium mb-2">Budgets existants</h3>
            <ul className="space-y-2">
              {budgets.map((b) => (
                <li key={b.id} className="text-sm">
                  {b.departement} ({b.exercice}) : {b.montantConsomme.toLocaleString()} / {b.montantAlloue.toLocaleString()} FCFA
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {vue === 'demande' && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow border max-w-xl">
          <h2 className="font-medium mb-4">Demande de décaissement</h2>
          <form onSubmit={handleDemande} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Budget</label>
              <select
                value={demandeBudgetId}
                onChange={(e) => setDemandeBudgetId(e.target.value)}
                className="px-3 py-2 border rounded w-full"
                required
              >
                <option value="">Sélectionner</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.departement} ({b.exercice}) - {b.montantAlloue.toLocaleString()} FCFA (restant: {(b.montantAlloue - b.montantConsomme).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Montant (FCFA)</label>
              <input
                type="number"
                value={demandeMontant}
                onChange={(e) => setDemandeMontant(e.target.value)}
                className="px-3 py-2 border rounded w-full"
                required
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Libellé</label>
              <input
                type="text"
                value={demandeLibelle}
                onChange={(e) => setDemandeLibelle(e.target.value)}
                className="px-3 py-2 border rounded w-full"
                required
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Initier (envoi au DAF)
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
