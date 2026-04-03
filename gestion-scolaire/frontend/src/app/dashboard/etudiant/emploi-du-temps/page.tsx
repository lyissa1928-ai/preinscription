'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { JOURS_EDT, JOUR_INDICES_EDT, heuresGrilleEdt } from '@/lib/edt-constants';

type Course = {
  id: string;
  jour: number;
  heureDebut: number;
  heureFin: number;
  type: string;
  ec: { code: string; nom: string };
  salle: { nom: string };
  teacher: { person: { user?: { firstName: string; lastName: string } } };
};

export default function EmploiDuTempsEtudiantPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());

  useEffect(() => {
    api<Course[]>(`/courses/me?anneeUniv=${anneeUniv}`)
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [anneeUniv]);

  const getCourseAt = (jour: number, heure: number) =>
    courses.find((c) => c.jour === jour && c.heureDebut <= heure && c.heureFin > heure);

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/etudiant" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Mon emploi du temps</h1>
      <div className="mt-2">
        <select
          value={anneeUniv}
          onChange={(e) => setAnneeUniv(+e.target.value)}
          className="px-3 py-2 border rounded"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full bg-white rounded-lg shadow border text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 w-24 text-left">Heure</th>
              {JOUR_INDICES_EDT.map((j) => (
                <th key={j} className="p-2 min-w-[120px] text-left">{JOURS_EDT[j]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heuresGrilleEdt().map((h) => (
              <tr key={h} className="border-b">
                <td className="p-2 font-medium">{h}h</td>
                {JOUR_INDICES_EDT.map((j) => {
                  const c = getCourseAt(j, h);
                  if (!c) return <td key={j} className="p-2 bg-slate-50"></td>;
                  if (c.heureDebut !== h) return <td key={j} className="p-2"></td>;
                  const span = c.heureFin - c.heureDebut;
                  return (
                    <td key={j} rowSpan={span} className="p-2 align-top border-l">
                      <div className="bg-blue-50 rounded p-2 text-xs">
                        <div className="font-medium">{c.ec.code} {c.type}</div>
                        <div>{c.ec.nom}</div>
                        <div>{c.salle.nom}</div>
                        <div>
                          {c.teacher?.person?.user
                            ? `${c.teacher.person.user.firstName} ${c.teacher.person.user.lastName}`
                            : ''}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
