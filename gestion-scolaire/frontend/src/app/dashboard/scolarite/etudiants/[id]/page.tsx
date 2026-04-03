'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Person = {
  id: string;
  matricule: string;
  type: string;
  dateNaissance?: string;
  user?: { email: string; firstName: string; lastName: string };
};

type Inscription = {
  id: string;
  anneeUniv: number;
  statut: string;
  formation: { code: string; nom: string };
  maquette: { code: string };
  semestre: { numero: number };
  cohort?: { nom: string };
};

type StatutFinancier = {
  enRegle: boolean;
  raison: string;
  totalDu?: number;
  totalPaye?: number;
};

type Payment = {
  id: string;
  montant: number;
  type: string;
  datePaiement: string;
  statut: string;
  inscription?: { formation: { code: string } };
};

export default function FicheEtudiantPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [person, setPerson] = useState<Person | null>(null);
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [statut, setStatut] = useState<StatutFinancier | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api<Person>(`/persons/${id}`).catch(() => null),
      api<Inscription[]>(`/inscriptions/person/${id}`).catch(() => []),
      api<StatutFinancier>(`/finance/statut/${id}?anneeUniv=${anneeUniv}`).catch(() => null),
      api<Payment[]>(`/finance/payments?personId=${id}`).catch(() => []),
    ])
      .then(([p, ins, st, pay]) => {
        setPerson(p ?? null);
        setInscriptions(Array.isArray(ins) ? ins : []);
        setStatut(st ?? null);
        setPayments(Array.isArray(pay) ? pay : []);
      })
      .finally(() => setLoading(false));
  }, [id, anneeUniv]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div>
        <p className="text-slate-500">Étudiant non trouvé.</p>
        <Link href="/dashboard/scolarite/etudiants" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/dashboard/scolarite/etudiants" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Retour à la liste
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">
            {person.user ? `${person.user.firstName} ${person.user.lastName}` : person.matricule}
          </h1>
          <p className="text-slate-600 mt-1">
            Matricule : <span className="font-mono">{person.matricule}</span>
            {person.user?.email && ` • ${person.user.email}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Statut financier</h2>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm text-slate-600">Année :</label>
            <select
              value={anneeUniv}
              onChange={(e) => setAnneeUniv(+e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {[anneeUniv - 1, anneeUniv, anneeUniv + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {statut ? (
            <div>
              <p className={`font-medium ${statut.enRegle ? 'text-green-600' : 'text-red-600'}`}>
                {statut.enRegle ? '✓ En règle' : '✗ Non en règle'}
              </p>
              <p className="text-sm text-slate-600 mt-1">{statut.raison}</p>
              {statut.totalDu != null && (
                <p className="text-sm mt-1">
                  Dû : {statut.totalDu?.toLocaleString()} FCFA • Payé : {statut.totalPaye?.toLocaleString()} FCFA
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Aucune inscription pour cette année</p>
          )}
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-800 mb-3">Inscriptions</h2>
          {inscriptions.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucune inscription</p>
          ) : (
            <ul className="space-y-2">
              {inscriptions.map((i) => (
                <li key={i.id} className="flex justify-between items-center text-sm">
                  <span>
                    {i.formation.code} — {i.anneeUniv} (S{i.semestre.numero}) — {i.statut}
                  </span>
                  <Link
                    href="/dashboard/scolarite/inscriptions"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Voir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-800 mb-3">Paiements</h2>
        {payments.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun paiement</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Montant</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2">{p.type}</td>
                  <td className="py-2">{p.montant.toLocaleString()} FCFA</td>
                  <td className="py-2">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2">
                    <span className={p.statut === 'VALIDATED' ? 'text-green-600' : 'text-amber-600'}>
                      {p.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
