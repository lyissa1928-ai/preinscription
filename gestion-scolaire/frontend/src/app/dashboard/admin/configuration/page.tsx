'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ConfigurationPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div>
      <Link href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-800 mb-2 inline-block">
        ← Retour
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Configuration</h1>
      <p className="mt-2 text-slate-600 text-sm">Paramètres système</p>

      <div className="mt-6 space-y-6">
        <section className="bg-white rounded-lg border border-slate-200 p-4 max-w-md">
          <h2 className="font-semibold text-slate-800 mb-3">Année universitaire</h2>
          <p className="text-slate-600 text-sm">
            Année en cours : <strong>{currentYear}</strong> / {currentYear + 1}
          </p>
          <p className="text-slate-500 text-xs mt-2">
            La configuration avancée (dates limites notes, etc.) sera disponible dans une prochaine version.
          </p>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-4 max-w-md">
          <h2 className="font-semibold text-slate-800 mb-3">Liens utiles</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/dashboard/comptable/tarifs" className="text-blue-600 hover:text-blue-700">Tarifs étudiants</Link></li>
            <li><Link href="/dashboard/comptable/taux-horaires" className="text-blue-600 hover:text-blue-700">Taux horaires paie</Link></li>
            <li><Link href="/api/docs" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">Documentation API (Swagger)</Link></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
