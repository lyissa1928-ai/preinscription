'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Personnel = { personId: string; matricule: string; nom: string; type: string; present: boolean; heureArrivee: string | null };
type PresenceData = { date: string; presentCount: number; absentCount: number; total: number; personnel: Personnel[] };

export default function VigilancePage() {
  const [data, setData] = useState<PresenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'TEACHER' | 'STAFF'>('all');
  const [search, setSearch] = useState('');

  const load = () => {
    api<PresenceData>(`/vigilance/presence${filter !== 'all' ? `?type=${filter}` : '?type=all'}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const personnel = data?.personnel ?? [];
  const filtered = search.trim()
    ? personnel.filter(
        (p) =>
          p.nom.toLowerCase().includes(search.toLowerCase()) ||
          p.matricule.toLowerCase().includes(search.toLowerCase()),
      )
    : personnel;

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Tableau de bord Vigilance</h1>
      <p className="mt-2 text-slate-600">
        Présence temps réel — Mise à jour automatique toutes les 30 s
      </p>

      <div className="mt-4 flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher (nom, matricule)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded w-64"
        />
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Tous
        </button>
        <button
          onClick={() => setFilter('TEACHER')}
          className={`px-4 py-2 rounded ${filter === 'TEACHER' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Enseignants
        </button>
        <button
          onClick={() => setFilter('STAFF')}
          className={`px-4 py-2 rounded ${filter === 'STAFF' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}
        >
          Personnel
        </button>
      </div>

      {data && (
        <div className="mt-4 flex gap-6 text-lg">
          <span className="text-green-600 font-medium">
            {data.presentCount} présent{data.presentCount > 1 ? 's' : ''}
          </span>
          <span className="text-red-600 font-medium">
            {data.absentCount} absent{data.absentCount > 1 ? 's' : ''}
          </span>
          <span className="text-slate-600">
            {data.total} total
          </span>
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-slate-500">Chargement...</p>
      ) : (
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.personId}
              className={`p-4 rounded-lg border flex items-center gap-3 ${
                p.present ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full shrink-0 ${
                  p.present ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={p.present ? 'Présent' : 'Absent'}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.nom}</div>
                <div className="text-sm text-slate-600">
                  {p.matricule} • {p.type === 'TEACHER' ? 'Enseignant' : 'Personnel'}
                </div>
                {p.present && p.heureArrivee && (
                  <div className="text-xs text-green-700 mt-1">
                    Arrivée : {new Date(p.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="mt-6 text-slate-500">Aucun personnel trouvé.</p>
      )}
    </div>
  );
}
