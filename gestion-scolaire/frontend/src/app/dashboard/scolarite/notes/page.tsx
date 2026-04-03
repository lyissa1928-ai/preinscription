'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Request = {
  id: string;
  motif: string;
  statut: string;
  nouvelleNote: number | null;
  createdAt: string;
  grade: { note: number; person: { matricule: string; user?: { firstName: string; lastName: string } }; ec: { code: string; nom: string } };
  demandeur: { firstName: string; lastName: string };
};

export default function NotesScolaritePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [configs, setConfigs] = useState<Array<{ anneeUniv: number; session: number; dateLimite: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | ''>('PENDING');
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ anneeUniv: new Date().getFullYear(), session: 1, dateLimite: '' });

  useEffect(() => {
    Promise.all([
      api<Request[]>(`/grades/modification-requests${filter ? `?statut=${filter}` : ''}`),
      api<typeof configs>('/grades/session-configs'),
    ])
      .then(([r, c]) => {
        setRequests(r);
        setConfigs(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      await api(`/grades/modification-requests/${id}/approve`, { method: 'PATCH' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api(`/grades/modification-requests/${id}/reject`, { method: 'PATCH' });
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/grades/session-configs', {
        method: 'POST',
        body: JSON.stringify(configForm),
      });
      setConfigs((prev) => [...prev.filter((c) => !(c.anneeUniv === configForm.anneeUniv && c.session === configForm.session)), configForm]);
      setShowConfig(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/scolarite" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Gestion des notes</h1>
      <p className="mt-2 text-slate-600">Demandes de modification hors délai, configuration des sessions</p>

      <div className="mt-4 flex gap-4">
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded ${filter === 'PENDING' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          En attente
        </button>
        <button
          onClick={() => setFilter('')}
          className={`px-4 py-2 rounded ${filter === '' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Toutes
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Configurer dates limites
        </button>
      </div>

      {showConfig && (
        <form onSubmit={handleSaveConfig} className="mt-4 p-4 bg-white rounded-lg shadow border">
          <h3 className="font-medium mb-4">Date limite de saisie</h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Année</label>
              <input
                type="number"
                value={configForm.anneeUniv}
                onChange={(e) => setConfigForm({ ...configForm, anneeUniv: +e.target.value })}
                className="px-3 py-2 border rounded"
                min={2020}
                max={2030}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Session</label>
              <select
                value={configForm.session}
                onChange={(e) => setConfigForm({ ...configForm, session: +e.target.value })}
                className="px-3 py-2 border rounded"
              >
                <option value={1}>Session 1</option>
                <option value={2}>Session 2</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Date limite</label>
              <input
                type="datetime-local"
                value={configForm.dateLimite}
                onChange={(e) => setConfigForm({ ...configForm, dateLimite: e.target.value })}
                className="px-3 py-2 border rounded"
                required
              />
            </div>
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-green-600 text-white rounded">Enregistrer</button>
        </form>
      )}

      <div className="mt-4">
        <h3 className="font-medium mb-2">Dates limites configurées</h3>
        <ul className="text-sm text-slate-600">
          {configs.map((c) => (
            <li key={`${c.anneeUniv}-${c.session}`}>
              {c.anneeUniv} Session {c.session} : {new Date(c.dateLimite).toLocaleString('fr-FR')}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="font-medium mb-2">Demandes de modification</h3>
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-3">Étudiant</th>
                <th className="text-left p-3">EC</th>
                <th className="text-left p-3">Note actuelle</th>
                <th className="text-left p-3">Nouvelle note</th>
                <th className="text-left p-3">Motif</th>
                <th className="text-left p-3">Demandeur</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-slate-500">Aucune demande</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{r.grade.person.matricule} - {r.grade.person.user ? `${r.grade.person.user.firstName} ${r.grade.person.user.lastName}` : ''}</td>
                    <td className="p-3">{r.grade.ec.code}</td>
                    <td className="p-3">{r.grade.note}/20</td>
                    <td className="p-3">{r.nouvelleNote ?? '-'}/20</td>
                    <td className="p-3 text-sm">{r.motif}</td>
                    <td className="p-3">{r.demandeur.firstName} {r.demandeur.lastName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        r.statut === 'PENDING' ? 'bg-yellow-100' :
                        r.statut === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
                      }`}>{r.statut}</span>
                    </td>
                    <td className="p-3">
                      {r.statut === 'PENDING' && (
                        <>
                          <button onClick={() => handleApprove(r.id)} className="text-green-600 text-sm hover:underline mr-2">Approuver</button>
                          <button onClick={() => handleReject(r.id)} className="text-red-600 text-sm hover:underline">Refuser</button>
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
    </div>
  );
}
