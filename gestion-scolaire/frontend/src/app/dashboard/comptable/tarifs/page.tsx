'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN', 'SCOLARITE', 'DAF', 'CAISSIER', 'DEPT_HEAD', 'TEACHER', 'STUDENT'];
const CAN_WRITE_TARIFS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type Formation = { id: string; code: string; nom: string };
type FeeConfig = {
  id: string;
  formationId: string;
  formation: Formation;
  fraisInscription: number;
  mensualite: number;
  nbMois: number;
  fraisSoutenanceL3: number;
  fraisSoutenanceM2: number;
  anneeUniv: number;
};

export default function TarifsPage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [configs, setConfigs] = useState<FeeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  useEffect(() => {
    if (userRole && !CAN_ACCESS.includes(userRole)) {
      router.replace('/dashboard/comptable');
    }
  }, [userRole, router]);

  const canWriteTarifs = CAN_WRITE_TARIFS.includes(userRole);
  const [form, setForm] = useState({
    formationId: '',
    anneeUniv: new Date().getFullYear(),
    fraisInscription: 0,
    mensualite: 0,
    nbMois: 10,
    fraisSoutenanceL3: 0,
    fraisSoutenanceM2: 0,
  });

  useEffect(() => {
    Promise.all([
      api<Formation[]>('/formations'),
      api<FeeConfig[]>('/finance/fee-configs'),
    ])
      .then(([f, c]) => {
        setFormations(f);
        setConfigs(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api<FeeConfig>('/finance/fee-configs', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setConfigs((prev) => {
        const idx = prev.findIndex((x) => x.formationId === created.formationId && x.anneeUniv === created.anneeUniv);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = created;
          return next;
        }
        return [created, ...prev];
      });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-800">Configuration des tarifs</h1>
        </div>
        {canWriteTarifs && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Annuler' : '+ Nouvelle config'}
          </button>
        )}
      </div>

      {showForm && canWriteTarifs && (
        <form onSubmit={handleSubmit} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">Tarifs par formation et année</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Formation</label>
              <select
                value={form.formationId}
                onChange={(e) => setForm({ ...form, formationId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                required
              >
                <option value="">-- Sélectionner --</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Année universitaire</label>
              <input
                type="number"
                value={form.anneeUniv}
                onChange={(e) => setForm({ ...form, anneeUniv: +e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min={2020}
                max={2030}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Frais d&apos;inscription (FCFA)</label>
              <input
                type="number"
                value={form.fraisInscription || ''}
                onChange={(e) => setForm({ ...form, fraisInscription: +e.target.value || 0 })}
                className="w-full px-3 py-2 border rounded"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Mensualité (FCFA)</label>
              <input
                type="number"
                value={form.mensualite || ''}
                onChange={(e) => setForm({ ...form, mensualite: +e.target.value || 0 })}
                className="w-full px-3 py-2 border rounded"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Nombre de mois</label>
              <input
                type="number"
                value={form.nbMois}
                onChange={(e) => setForm({ ...form, nbMois: +e.target.value })}
                className="w-full px-3 py-2 border rounded"
                min={1}
                max={12}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Frais soutenance L3 (FCFA)</label>
              <input
                type="number"
                value={form.fraisSoutenanceL3 || ''}
                onChange={(e) => setForm({ ...form, fraisSoutenanceL3: +e.target.value || 0 })}
                className="w-full px-3 py-2 border rounded"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Frais soutenance M2 (FCFA)</label>
              <input
                type="number"
                value={form.fraisSoutenanceM2 || ''}
                onChange={(e) => setForm({ ...form, fraisSoutenanceM2: +e.target.value || 0 })}
                className="w-full px-3 py-2 border rounded"
                min={0}
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
              <th className="text-left p-3">Formation</th>
              <th className="text-left p-3">Année</th>
              <th className="text-right p-3">Inscription</th>
              <th className="text-right p-3">Mensualité</th>
              <th className="text-right p-3">Nb mois</th>
              <th className="text-right p-3">Sout. L3</th>
              <th className="text-right p-3">Sout. M2</th>
            </tr>
          </thead>
          <tbody>
            {configs.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-slate-500">Aucune configuration</td></tr>
            ) : (
              configs.map((c) => (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{c.formation.code}</td>
                  <td className="p-3">{c.anneeUniv}</td>
                  <td className="p-3 text-right">{c.fraisInscription.toLocaleString()}</td>
                  <td className="p-3 text-right">{c.mensualite.toLocaleString()}</td>
                  <td className="p-3 text-right">{c.nbMois}</td>
                  <td className="p-3 text-right">{c.fraisSoutenanceL3.toLocaleString()}</td>
                  <td className="p-3 text-right">{c.fraisSoutenanceM2.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
