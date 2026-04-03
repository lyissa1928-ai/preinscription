'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'ADMIN'];

type TariffRate = {
  id: string;
  formationId: string | null;
  tauxCm: number;
  tauxTd: number;
  tauxTp: number;
  tauxTpe: number;
  dateEffet: string;
};

type Formation = { id: string; code: string; nom: string };

export default function TauxHorairesPage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [rates, setRates] = useState<TariffRate[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ formationId: '', tauxCm: 0, tauxTd: 0, tauxTp: 0, tauxTpe: 0 });
  const [editing, setEditing] = useState<TariffRate | null>(null);

  const load = () => {
    Promise.all([
      api<TariffRate[]>('/tariff-rates'),
      api<Formation[]>('/formations'),
    ])
      .then(([r, f]) => {
        setRates(r);
        setFormations(f);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/tariff-rates', {
        method: 'POST',
        body: JSON.stringify({
          formationId: form.formationId || undefined,
          tauxCm: form.tauxCm,
          tauxTd: form.tauxTd,
          tauxTp: form.tauxTp,
          tauxTpe: form.tauxTpe,
        }),
      });
      load();
      setShowForm(false);
      setForm({ formationId: '', tauxCm: 0, tauxTd: 0, tauxTp: 0, tauxTpe: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await api(`/tariff-rates/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tauxCm: form.tauxCm,
          tauxTd: form.tauxTd,
          tauxTp: form.tauxTp,
          tauxTpe: form.tauxTpe,
        }),
      });
      load();
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const startEdit = (r: TariffRate) => {
    setEditing(r);
    setForm({ formationId: r.formationId || '', tauxCm: r.tauxCm, tauxTd: r.tauxTd, tauxTp: r.tauxTp, tauxTpe: r.tauxTpe });
  };

  const getFormationLabel = (formationId: string | null) => {
    if (!formationId) return 'Global (par défaut)';
    const f = formations.find((x) => x.id === formationId);
    return f ? `${f.code} — ${f.nom}` : formationId;
  };

  if (userRole && !CAN_ACCESS.includes(userRole)) {
    return <p className="text-slate-500">Redirection...</p>;
  }

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/comptable" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Taux horaires</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Annuler' : '+ Nouveau taux'}
        </button>
      </div>
      <p className="mt-2 text-slate-600 text-sm">
        Taux CM/TD/TP/TPE pour le calcul de la paie (FCFA/heure). Le taux global s&apos;applique si aucun taux par formation.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">Créer un taux horaire</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Formation (vide = global)</label>
              <select
                value={form.formationId}
                onChange={(e) => setForm({ ...form, formationId: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Global</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>{f.code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">CM (FCFA/h)</label>
              <input type="number" value={form.tauxCm} onChange={(e) => setForm({ ...form, tauxCm: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TD (FCFA/h)</label>
              <input type="number" value={form.tauxTd} onChange={(e) => setForm({ ...form, tauxTd: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TP (FCFA/h)</label>
              <input type="number" value={form.tauxTp} onChange={(e) => setForm({ ...form, tauxTp: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TPE (FCFA/h)</label>
              <input type="number" value={form.tauxTpe} onChange={(e) => setForm({ ...form, tauxTpe: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Créer</button>
            </div>
          </div>
        </form>
      )}

      {editing && (
        <form onSubmit={handleUpdate} className="mt-6 p-4 bg-white rounded-lg shadow border border-blue-200">
          <h3 className="font-medium mb-4">Modifier : {getFormationLabel(editing.formationId)}</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">CM (FCFA/h)</label>
              <input type="number" value={form.tauxCm} onChange={(e) => setForm({ ...form, tauxCm: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TD (FCFA/h)</label>
              <input type="number" value={form.tauxTd} onChange={(e) => setForm({ ...form, tauxTd: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TP (FCFA/h)</label>
              <input type="number" value={form.tauxTp} onChange={(e) => setForm({ ...form, tauxTp: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">TPE (FCFA/h)</label>
              <input type="number" value={form.tauxTpe} onChange={(e) => setForm({ ...form, tauxTpe: +e.target.value })} className="w-full px-3 py-2 border rounded" min={0} step={100} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border rounded hover:bg-slate-50">Annuler</button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Formation</th>
              <th className="text-right p-3">CM</th>
              <th className="text-right p-3">TD</th>
              <th className="text-right p-3">TP</th>
              <th className="text-right p-3">TPE</th>
              <th className="text-left p-3">Date effet</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-slate-500">Aucun taux configuré</td></tr>
            ) : (
              rates.map((r) => (
                <tr key={r.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{getFormationLabel(r.formationId)}</td>
                  <td className="p-3 text-right">{r.tauxCm.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.tauxTd.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.tauxTp.toLocaleString()}</td>
                  <td className="p-3 text-right">{r.tauxTpe.toLocaleString()}</td>
                  <td className="p-3 text-sm text-slate-600">{new Date(r.dateEffet).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">
                    <button onClick={() => startEdit(r)} className="text-sm text-blue-600 hover:text-blue-700">Modifier</button>
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
