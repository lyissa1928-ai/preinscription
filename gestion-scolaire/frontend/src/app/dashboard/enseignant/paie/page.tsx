'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, downloadPdf } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Payroll = {
  id: string;
  mois: number;
  annee: number;
  heuresCm: number;
  heuresTd: number;
  heuresTp: number;
  heuresTpe: number;
  montant: number;
  statut: string;
  paySlips: { id: string }[];
};

type TeacherMe = { teacher: { typeContrat?: string | null }; person: unknown; user: unknown };

export default function PaieEnseignantPage() {
  const toast = useToast();
  const [teacherMe, setTeacherMe] = useState<TeacherMe | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState<number | ''>('');
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const isVacataire = teacherMe?.teacher?.typeContrat === 'VACATAIRE';

  useEffect(() => {
    api<TeacherMe>('/persons/teachers/me').then(setTeacherMe).catch(() => setTeacherMe(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (mois) params.set('mois', String(mois));
    if (annee) params.set('annee', String(annee));
    api<Payroll[]>(`/payroll/me?${params}`)
      .then(setPayrolls)
      .catch(() => setPayrolls([]))
      .finally(() => setLoading(false));
  }, [mois, annee]);

  const handleDownload = (payrollId: string) => {
    downloadPdf(`/payroll/me/bulletin/${payrollId}`, `bulletin-${payrollId}.pdf`).catch((e) => toast.error(e?.message ?? 'Téléchargement impossible'));
  };

  return (
    <div>
      <Link href="/dashboard/enseignant" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      {isVacataire ? (
        <>
          <h1 className="text-2xl font-bold text-slate-800">État des paiements (honoraires)</h1>
          <p className="mt-2 text-slate-600">
            Consultez l&apos;état de vos paiements et honoraires.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-slate-800">Bulletins de salaire dématérialisés</h1>
          <p className="mt-2 text-slate-600">
            Réception et téléchargement de vos bulletins de salaire. Le mot de passe pour ouvrir le PDF est votre matricule.
          </p>
        </>
      )}
      <div className="mt-4 flex gap-4">
        <select value={mois} onChange={(e) => setMois(e.target.value ? +e.target.value : '')} className="px-3 py-2 border rounded">
          <option value="">Tous les mois</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={annee} onChange={(e) => setAnnee(+e.target.value)} className="px-3 py-2 border rounded">
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : payrolls.length === 0 ? (
        <p className="mt-6 text-slate-500">
          {isVacataire ? 'Aucun paiement enregistré pour cette période.' : 'Aucun bulletin disponible pour cette période.'}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {payrolls.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-lg shadow border flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-medium">{p.mois}/{p.annee} — {p.montant.toLocaleString()} FCFA</div>
                <div className="text-sm text-slate-600 mt-1">
                  CM: {p.heuresCm}h | TD: {p.heuresTd}h | TP: {p.heuresTp}h | TPE: {p.heuresTpe}h
                </div>
                <div className="text-sm text-slate-500 mt-1">Statut : {p.statut}</div>
              </div>
              {!isVacataire && p.paySlips.length > 0 ? (
                <button
                  onClick={() => handleDownload(p.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Télécharger bulletin PDF
                </button>
              ) : isVacataire ? (
                <span className="text-slate-600 text-sm">Consultation</span>
              ) : (
                <span className="text-slate-400 text-sm">En attente</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
