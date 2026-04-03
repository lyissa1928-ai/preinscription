'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8 text-center">
            <h1 className="text-2xl font-bold text-emerald-700 mb-4">Email envoyé</h1>
            <p className="text-gray-600 mb-6">
              Si un compte existe avec cet email, vous recevrez un lien pour réinitialiser
              votre mot de passe.
            </p>
            <Link
              href="/auth/login"
              className="inline-block py-2.5 px-6 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-8">
          <h1 className="text-2xl font-bold text-center text-stone-800 mb-6">Mot de passe oublié</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="votre@email.com"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
            >
              Envoyer le lien de réinitialisation
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">
            <Link href="/auth/login" className="text-emerald-600 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
