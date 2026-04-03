'use client';

import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { useRouter } from 'next/navigation';
import { api, downloadPdf } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type PreviewRow = { personId: string; matricule: string; nom: string; heuresCm: number; heuresTd: number; heuresTp: number; heuresTpe: number; montant: number };
type Payroll = { id: string; mois: number; annee: number; montant: number; statut: string; person: { matricule: string; user?: { firstName: string; lastName: string } }; paySlips: { id: string }[] };

export default function PaieComptablePage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'preview' | 'list'>('preview');

  const loadPreview = () => {
    setLoading(true);
    api<PreviewRow[]>(`/payroll/preview?mois=${mois}&annee=${annee}`)
      .then(setPreview)
      .catch(() => setPreview([]))
      .finally(() => { setLoading(false); setStep('preview'); });
  };

  const loadPayrolls = () => {
    setLoading(true);
    api<Payroll[]>(`/payroll?mois=${mois}&annee=${annee}`)
      .then(setPayrolls)
      .catch(() => setPayrolls([]))
      .finally(() => { setLoading(false); setStep('list'); });
  };

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
    setLoading(true);
    api<PreviewRow[]>(`/payroll/preview?mois=${mois}&annee=${annee}`)
      .then(setPreview)
      .catch(() => setPreview([]))
      .finally(() => setLoading(false));
  }, [mois, annee]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      await api(`/payroll/calculate?mois=${mois}&annee=${annee}`);
      loadPayrolls();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api(`/payroll/generate?mois=${mois}&annee=${annee}`);
      loadPayrolls();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (payrollId: string) => {
    downloadPdf(`/payroll/bulletin/${payrollId}`, `bulletin-${payrollId}.pdf`).catch((e) => toast.error(e?.message || 'Erreur'));
  };

  if (userRole && !CAN_ACCESS.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  return (
    <div>
      <BackLink href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </BackLink>
      <h1 className="text-2xl font-bold text-slate-800">Paie enseignants</h1>
      <div className="mt-4 flex gap-4 flex-wrap">
        <select value={mois} onChange={(e) => setMois(+e.target.value)} className="px-3 py-2 border rounded">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={annee} onChange={(e) => setAnnee(+e.target.value)} className="px-3 py-2 border rounded">
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button onClick={loadPreview} disabled={loading} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-50">
          Aperçu
        </button>
        <button onClick={loadPayrolls} disabled={loading} className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 disabled:opacity-50">
          Liste paies
        </button>
        <button onClick={handleCalculate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          Calculer
        </button>
        <button onClick={handleGenerate} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
          Générer bulletins
        </button>
      </div>

      {loading && <p className="mt-4 text-slate-500">Chargement...</p>}

      {!loading && step === 'preview' && preview.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-medium mb-2">Aperçu calcul — {mois}/{annee}</h3>
          <table className="w-full bg-white rounded-lg shadow border">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3">Enseignant</th>
                <th className="text-left p-3">Matricule</th>
                <th className="text-right p-3">CM</th>
                <th className="text-right p-3">TD</th>
                <th className="text-right p-3">TP</th>
                <th className="text-right p-3">TPE</th>
                <th className="text-right p-3">Montant</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.personId} className="border-b">
                  <td className="p-3">{p.nom}</td>
                  <td className="p-3">{p.matricule}</td>
                  <td className="p-3 text-right">{p.heuresCm.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.heuresTd.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.heuresTp.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.heuresTpe.toFixed(2)}</td>
                  <td className="p-3 text-right font-medium">{p.montant.toLocaleString()} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && step === 'preview' && preview.length === 0 && (
        <p className="mt-6 text-slate-500">Aucun pointage validé pour ce mois. Cliquez sur « Aperçu » pour calculer.</p>
      )}

      {!loading && step === 'list' && (
        <div className="mt-6 overflow-x-auto">
          <h3 className="font-medium mb-2">Paies ({mois}/{annee})</h3>
          {payrolls.length === 0 ? (
            <p className="text-slate-500">Aucune paie trouvée. Cliquez sur « Calculer » puis « Générer bulletins ».</p>
          ) : (
            <table className="w-full bg-white rounded-lg shadow border">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3">Enseignant</th>
                  <th className="text-left p-3">Matricule</th>
                  <th className="text-right p-3">Montant</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3"></th>
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-3">{p.person.user ? `${p.person.user.firstName} ${p.person.user.lastName}` : p.person.matricule}</td>
                    <td className="p-3">{p.person.matricule}</td>
                    <td className="p-3 text-right">{p.montant.toLocaleString()} FCFA</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${p.statut === 'GENERATED' ? 'bg-green-100' : 'bg-amber-100'}`}>{p.statut}</span></td>
                    <td className="p-3">
                      {p.paySlips.length > 0 && (
                        <button onClick={() => handleDownload(p.id)} className="text-blue-600 text-sm hover:underline">
                          Télécharger bulletin
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
