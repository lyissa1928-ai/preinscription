'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50/30 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
          <h1 className="text-xl font-semibold text-stone-800 mb-2">Inscription désactivée</h1>
          <p className="text-stone-600 mb-6">
            Les comptes sont créés par l&apos;administrateur. Contactez-le pour obtenir un accès.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </main>
  );
}
