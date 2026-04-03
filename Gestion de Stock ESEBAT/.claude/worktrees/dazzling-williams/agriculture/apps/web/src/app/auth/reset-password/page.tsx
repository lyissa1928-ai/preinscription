'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Lien invalide. Veuillez demander un nouveau lien.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return;
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-700 mb-4">Mot de passe mis à jour</h1>
        <p className="text-gray-600">Redirection vers la connexion...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Lien invalide</h1>
        <p className="text-gray-600 mb-6">
          Ce lien est invalide ou a expiré. Veuillez demander un nouveau lien.
        </p>
        <Link
          href="/auth/forgot-password"
          className="inline-block py-2.5 px-6 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
        >
          Nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8">
      <h1 className="text-2xl font-bold text-center text-stone-800 mb-6">Nouveau mot de passe</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            minLength={8}
            required
          />
          <p className="mt-1 text-xs text-gray-500">Minimum 8 caractères</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            minLength={8}
            required
          />
        </div>
          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
          >
          Réinitialiser le mot de passe
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">
        <Link href="/auth/login" className="text-emerald-600 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50 px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8 text-center text-stone-500">Chargement...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
