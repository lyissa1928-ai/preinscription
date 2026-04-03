'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type Person = { id: string; matricule: string; user?: { firstName: string; lastName: string } };
type Formation = { id: string; code: string };
type Inscription = { id: string; person: Person; formation: Formation; anneeUniv: number };
type Payment = {
  id: string;
  montant: number;
  type: string;
  datePaiement: string;
  statut: string;
  person: Person;
  inscription: { formation: Formation };
  mois?: number;
  annee?: number;
};

export default function PaiementsPage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nonEnRegle, setNonEnRegle] = useState<Array<{ personId: string; matricule: string; nom: string; formation: string; statut: { totalDu: number; totalPaye: number } }>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    personId: '',
    inscriptionId: '',
    montant: 0,
    type: 'INSCRIPTION' as string,
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
  });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_ACCESS.includes(userRole)) {
      router.replace('/dashboard/comptable');
    }
  }, [userRole, router]);

  useEffect(() => {
    Promise.all([
      api<Inscription[]>('/inscriptions'),
      api<Payment[]>('/finance/payments'),
      api<typeof nonEnRegle>('/finance/non-en-regle'),
    ])
      .then(([i, p, n]) => {
        setInscriptions(i.filter((x) => x.person && x.formation));
        setPayments(p);
        setNonEnRegle(n);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api<Payment>('/finance/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          mois: form.type === 'MENSUALITE' ? form.mois : undefined,
          annee: form.type === 'MENSUALITE' ? form.annee : undefined,
        }),
      });
      setPayments((prev) => [created, ...prev]);
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const updated = await api<Payment>(`/finance/payments/${id}/validate`, { method: 'PATCH' });
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Rejeter ce paiement ?')) return;
    try {
      const updated = await api<Payment>(`/finance/payments/${id}/reject`, { method: 'PATCH' });
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const activeInscriptions = inscriptions.filter((i) => i.person && i.formation);

  if (userRole && !CAN_ACCESS.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <Link href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
            ← Retour
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Paiements</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Enregistrer paiement'}
        </button>
      </div>

      {nonEnRegle.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-medium text-amber-800">Étudiants non en règle ({nonEnRegle.length})</h3>
          <ul className="mt-2 text-sm text-amber-700">
            {nonEnRegle.slice(0, 10).map((e) => (
              <li key={e.personId}>
                {e.matricule} - {e.nom} ({e.formation}) : dû {e.statut.totalDu.toLocaleString()} FCFA, payé {e.statut.totalPaye.toLocaleString()} FCFA
              </li>
            ))}
            {nonEnRegle.length > 10 && <li>... et {nonEnRegle.length - 10} autres</li>}
          </ul>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">Enregistrer un paiement</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Inscription (étudiant)</label>
              <select
                value={form.inscriptionId}
                onChange={(e) => {
                  const ins = activeInscriptions.find((x) => x.id === e.target.value);
                  setForm({ ...form, inscriptionId: e.target.value, personId: ins?.person?.id || '' });
                }}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {activeInscriptions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.person.matricule} - {i.person.user ? `${i.person.user.firstName} ${i.person.user.lastName}` : ''} ({i.formation.code} {i.anneeUniv})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="INSCRIPTION">Frais d&apos;inscription</option>
                <option value="MENSUALITE">Mensualité</option>
                <option value="SOUTENANCE_L3">Soutenance L3</option>
                <option value="SOUTENANCE_M2">Soutenance M2</option>
              </select>
            </div>
            {form.type === 'MENSUALITE' && (
              <>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Mois</label>
                  <select
                    value={form.mois}
                    onChange={(e) => setForm({ ...form, mois: +e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Année</label>
                  <input
                    type="number"
                    value={form.annee}
                    onChange={(e) => setForm({ ...form, annee: +e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    min={2020}
                    max={2030}
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Montant (FCFA)</label>
              <input
                type="number"
                value={form.montant || ''}
                onChange={(e) => setForm({ ...form, montant: +e.target.value || 0 })}
                className="w-full px-3 py-2 border rounded"
                required
                min={1}
              />
            </div>
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Enregistrer
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Étudiant</th>
              <th className="text-left p-3">Formation</th>
              <th className="text-left p-3">Type</th>
              <th className="text-right p-3">Montant</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-slate-500">Aucun paiement</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    {p.person.matricule} - {p.person.user ? `${p.person.user.firstName} ${p.person.user.lastName}` : ''}
                  </td>
                  <td className="p-3">{p.inscription.formation.code}</td>
                  <td className="p-3">
                    {p.type}
                    {p.type === 'MENSUALITE' && p.mois && p.annee && ` (${p.mois}/${p.annee})`}
                  </td>
                  <td className="p-3 text-right">{p.montant.toLocaleString()}</td>
                  <td className="p-3">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      p.statut === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                      p.statut === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.statut}
                    </span>
                  </td>
                  <td className="p-3">
                    {p.statut === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleValidate(p.id)}
                          className="text-green-600 text-sm hover:underline mr-2"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Rejeter
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
