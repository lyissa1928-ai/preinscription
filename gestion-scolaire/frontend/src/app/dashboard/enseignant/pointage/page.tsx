'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type Course = { id: string; heureDebut: number; heureFin: number; type: string; ec: { code: string; nom: string }; salle: { nom: string } };
type Attendance = { id: string; courseId: string | null; heureArrivee: string; heureDepart: string | null; course?: Course };

export default function PointageEnseignantPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const badgeToastShown = useRef(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointing, setPointing] = useState<string | null>(null);

  const load = () => {
    const now = new Date();
    Promise.all([
      api<Course[]>('/attendance/my-courses-today'),
      api<Attendance[]>(`/attendance/me?mois=${now.getMonth() + 1}&annee=${now.getFullYear()}`),
    ])
      .then(([c, a]) => {
        setCourses(c);
        const today = new Date().toISOString().slice(0, 10);
        setAttendances((a || []).filter((x) => x.heureArrivee?.startsWith(today)));
      })
      .catch(() => { setCourses([]); setAttendances([]); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (badgeToastShown.current) return;
    if (searchParams.get('from') === 'badge') {
      badgeToastShown.current = true;
      toast.toast(
        'Badge scanné : sélectionnez votre cours du jour, puis « Arrivée » pour marquer le début de séance / présence.',
        'info',
      );
    }
  }, [searchParams, toast]);

  const handleArrivee = async (courseId: string) => {
    setPointing(courseId);
    try {
      await api('/attendance/arrivee', { method: 'POST', body: JSON.stringify({ courseId }) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPointing(null);
    }
  };

  const handleDepart = async (courseId: string) => {
    setPointing(courseId);
    try {
      await api('/attendance/depart', { method: 'POST', body: JSON.stringify({ courseId }) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPointing(null);
    }
  };

  const getAttendanceFor = (courseId: string) =>
    attendances.find((a) => a.courseId === courseId);

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/enseignant" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Pointage</h1>
      <p className="mt-2 text-slate-600">
        Cours du jour — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {courses.length === 0 ? (
        <p className="mt-6 text-slate-500">Aucun cours aujourd&apos;hui</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {courses.map((c) => {
            const att = getAttendanceFor(c.id);
            return (
              <div key={c.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="font-medium">{c.ec.code} {c.type} — {c.ec.nom}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {c.heureDebut}h-{c.heureFin}h • {c.salle.nom}
                </div>
                <div className="mt-3 flex gap-2">
                  {!att ? (
                    <button
                      onClick={() => handleArrivee(c.id)}
                      disabled={!!pointing}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {pointing === c.id ? '...' : 'Arrivée'}
                    </button>
                  ) : !att.heureDepart ? (
                    <button
                      onClick={() => handleDepart(c.id)}
                      disabled={!!pointing}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {pointing === c.id ? '...' : 'Départ'}
                    </button>
                  ) : (
                    <span className="text-green-600 font-medium">
                      Pointé : {new Date(att.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {new Date(att.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-medium mb-2">Historique du jour</h3>
        {attendances.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucun pointage</p>
        ) : (
          <ul className="text-sm space-y-1">
            {attendances.map((a) => (
              <li key={a.id}>
                {a.course?.ec?.code} : {new Date(a.heureArrivee).toLocaleTimeString('fr-FR')}
                {a.heureDepart && ` — ${new Date(a.heureDepart).toLocaleTimeString('fr-FR')}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
