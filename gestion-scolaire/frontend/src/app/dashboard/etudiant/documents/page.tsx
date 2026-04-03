'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadPdf } from '@/lib/api';

type StatutFinancier = { enRegle: boolean; totalDu: number; totalPaye: number; raison: string };
type Receipt = { id: string; montant: number; type: string; datePaiement: string; formation: string; mois?: number; annee?: number };

export default function DocumentsEtudiantPage() {
  const [statut, setStatut] = useState<StatutFinancier | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      api<StatutFinancier>(`/students/me/statut-financier?anneeUniv=${anneeUniv}`),
      api<Receipt[]>('/students/me/receipts'),
    ])
      .then(([s, r]) => {
        setStatut(s);
        setReceipts(r);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Erreur');
      })
      .finally(() => setLoading(false));
  }, [anneeUniv]);

  const handleFicheInscription = async () => {
    setDownloading('fiche');
    setError(null);
    try {
      await downloadPdf('/students/me/fiche-inscription', 'fiche-inscription.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDownloading(null);
    }
  };

  const handleProforma = async () => {
    setDownloading('proforma');
    setError(null);
    try {
      await downloadPdf(`/students/me/proforma-invoice?anneeUniv=${anneeUniv}`, 'facture-proforma.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDownloading(null);
    }
  };

  const handleCertificat = async () => {
    setDownloading('certificat');
    setError(null);
    try {
      await downloadPdf(`/students/me/certificate?anneeUniv=${anneeUniv}`, 'certificat-scolarite.pdf');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Certificat non disponible (vérifiez votre statut financier)');
    } finally {
      setDownloading(null);
    }
  };

  const handleReceipt = async (id: string) => {
    setDownloading(id);
    setError(null);
    try {
      await downloadPdf(`/students/me/receipts/${id}`, `recu-${id.slice(-8)}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/etudiant" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Mes documents</h1>
      <p className="mt-2 text-slate-600">
        Fiche d&apos;inscription, facture proforma, certificat de scolarité, reçus de paiement
      </p>

      <div className="mt-4">
        <label className="block text-sm text-slate-600 mb-1">Année universitaire</label>
        <select
          value={anneeUniv}
          onChange={(e) => setAnneeUniv(+e.target.value)}
          className="px-3 py-2 border rounded w-32"
        >
          {[2022, 2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {statut && (
        <div className={`mt-4 p-4 rounded-lg border ${statut.enRegle ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <h3 className="font-medium">Statut financier</h3>
          <p className="text-sm mt-1">
            {statut.enRegle ? (
              <span className="text-green-700">En règle</span>
            ) : (
              <span className="text-amber-700">
                Non en règle : {statut.raison}
                {(statut.totalDu != null || statut.totalPaye != null) && (
                  <> — Dû : {(statut.totalDu ?? 0).toLocaleString()} FCFA, Payé : {(statut.totalPaye ?? 0).toLocaleString()} FCFA</>
                )}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-medium text-slate-800">Fiche d&apos;inscription</h3>
          <p className="text-sm text-slate-500 mt-1">
            Logo de l&apos;établissement, votre photo et les informations du dossier (PDF).
          </p>
          <button
            type="button"
            onClick={handleFicheInscription}
            disabled={!!downloading}
            className="mt-3 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50"
          >
            {downloading === 'fiche' ? 'Téléchargement...' : 'Télécharger le PDF'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-medium text-slate-800">Facture Proforma</h3>
          <p className="text-sm text-slate-500 mt-1">Détail des frais pour l&apos;année</p>
          <button
            onClick={handleProforma}
            disabled={!!downloading}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {downloading === 'proforma' ? 'Téléchargement...' : 'Générer PDF'}
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-medium text-slate-800">Certificat de scolarité</h3>
          <p className="text-sm text-slate-500 mt-1">
            {statut?.enRegle ? 'Disponible (vous êtes en règle)' : 'Réservé aux étudiants en règle'}
          </p>
          <button
            onClick={handleCertificat}
            disabled={!!downloading || !statut?.enRegle}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading === 'certificat' ? 'Téléchargement...' : 'Télécharger'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-medium text-slate-800 mb-3">Reçus de paiement</h3>
        {receipts.length === 0 ? (
          <p className="text-slate-500">Aucun reçu disponible</p>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Montant</th>
                  <th className="text-left p-3"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{new Date(r.datePaiement).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3">
                      {r.type}
                      {r.mois && r.annee && ` (${r.mois}/${r.annee})`}
                    </td>
                    <td className="p-3 text-right">{r.montant.toLocaleString()} FCFA</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleReceipt(r.id)}
                        disabled={!!downloading}
                        className="text-blue-600 text-sm hover:underline disabled:opacity-50"
                      >
                        {downloading === r.id ? '...' : 'Télécharger'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
