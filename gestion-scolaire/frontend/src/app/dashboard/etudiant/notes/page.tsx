'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Grade = {
  id: string;
  note: number;
  session: number;
  anneeUniv: number;
  ec: { code: string; nom: string; ue: { code: string } };
};

export default function NotesEtudiantPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [anneeUniv, setAnneeUniv] = useState(new Date().getFullYear());

  useEffect(() => {
    api<Grade[]>(`/grades/me?anneeUniv=${anneeUniv}`)
      .then(setGrades)
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, [anneeUniv]);

  if (loading) return <p className="text-slate-500">Chargement...</p>;

  return (
    <div>
      <Link href="/dashboard/etudiant" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Mes notes</h1>
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
      <div className="mt-6 bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3">EC</th>
              <th className="text-left p-3">UE</th>
              <th className="text-left p-3">Session</th>
              <th className="text-right p-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {grades.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-slate-500">Aucune note</td></tr>
            ) : (
              grades.map((g) => (
                <tr key={g.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{g.ec.code} - {g.ec.nom}</td>
                  <td className="p-3">{g.ec.ue.code}</td>
                  <td className="p-3">Session {g.session}</td>
                  <td className="p-3 text-right font-medium">{g.note}/20</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
