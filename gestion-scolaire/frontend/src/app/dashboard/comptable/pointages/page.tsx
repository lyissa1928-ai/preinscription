'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CAN_ACCESS = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];

type Attendance = {
  id: string;
  date: string;
  heureArrivee: string;
  heureDepart: string | null;
  statut: string;
  person: { matricule: string; user?: { firstName: string; lastName: string } };
  course: { ec: { code: string }; type: string } | null;
};

export default function PointagesComptablePage() {
  const router = useRouter();
  const toast = useToast();
  const [userRole, setUserRole] = useState<string>('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [filter, setFilter] = useState<'PENDING' | ''>('PENDING');

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
    api<Attendance[]>(`/attendance?mois=${mois}&annee=${annee}${filter ? `&statut=${filter}` : ''}`)
      .then(setAttendances)
      .catch(() => setAttendances([]))
      .finally(() => setLoading(false));
  }, [mois, annee, filter]);

  const handleValidate = async (id: string, statut: 'VALIDE' | 'NON_REMUNERE' | 'REFUSE') => {
    try {
      await api(`/attendance/${id}/validate`, {
        method: 'PATCH',
        body: JSON.stringify({ statut }),
      });
      setAttendances((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const getHeures = (a: Attendance) => {
    if (!a.heureDepart) return '-';
    const d = (new Date(a.heureDepart).getTime() - new Date(a.heureArrivee).getTime()) / (1000 * 60 * 60);
    return d.toFixed(2) + ' h';
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
      <h1 className="text-2xl font-bold text-slate-800">Pointages à valider</h1>
      <div className="mt-4 flex gap-4">
        <select
          value={mois}
          onChange={(e) => setMois(+e.target.value)}
          className="px-3 py-2 border rounded"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={annee}
          onChange={(e) => setAnnee(+e.target.value)}
          className="px-3 py-2 border rounded"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
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
          Tous
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Enseignant</th>
              <th className="text-left p-3">Cours</th>
              <th className="text-left p-3">Arrivée</th>
              <th className="text-left p-3">Départ</th>
              <th className="text-left p-3">Heures</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {attendances.length === 0 ? (
              <tr><td colSpan={8} className="p-4 text-slate-500">Aucun pointage</td></tr>
            ) : (
              attendances.map((a) => (
                <tr key={a.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3">{a.person.matricule} - {a.person.user ? `${a.person.user.firstName} ${a.person.user.lastName}` : ''}</td>
                  <td className="p-3">{a.course ? `${a.course.ec.code} ${a.course.type}` : '-'}</td>
                  <td className="p-3">{new Date(a.heureArrivee).toLocaleTimeString('fr-FR')}</td>
                  <td className="p-3">{a.heureDepart ? new Date(a.heureDepart).toLocaleTimeString('fr-FR') : '-'}</td>
                  <td className="p-3">{getHeures(a)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      a.statut === 'VALIDE' ? 'bg-green-100' :
                      a.statut === 'NON_REMUNERE' ? 'bg-amber-100' :
                      a.statut === 'REFUSE' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>{a.statut}</span>
                  </td>
                  <td className="p-3">
                    {a.statut === 'PENDING' && (
                      <>
                        <button onClick={() => handleValidate(a.id, 'VALIDE')} className="text-green-600 text-sm hover:underline mr-2">Valider</button>
                        <button onClick={() => handleValidate(a.id, 'NON_REMUNERE')} className="text-amber-600 text-sm hover:underline mr-2">Non rémunéré</button>
                        <button onClick={() => handleValidate(a.id, 'REFUSE')} className="text-red-600 text-sm hover:underline">Refuser</button>
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
