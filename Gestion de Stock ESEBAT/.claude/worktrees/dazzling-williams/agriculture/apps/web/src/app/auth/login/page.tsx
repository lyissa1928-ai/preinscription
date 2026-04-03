'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, AlertCircle, Eye, EyeOff, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema } from '@agriculture/shared';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function getDefaultRoute(role: string): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'AGRONOMIST') return '/dashboard';
  if (role === 'TECHNICIAN') return '/dashboard';
  return '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [timeoutMessage, setTimeoutMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('reason') === 'timeout') {
      setTimeoutMessage(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message || 'Données invalides');
      return;
    }
    setIsLoading(true);
    try {
      const user = await login(email, password);
      router.push(getDefaultRoute(user.role));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed') || msg.includes('Load failed')) {
        setError('Impossible de joindre le serveur. Vérifiez que l\'API tourne (port 4000) et que Docker est démarré pour PostgreSQL et Redis.');
      } else if (msg.includes('Session expirée')) {
        setError('Session expirée. Reconnectez-vous.');
      } else {
        setError(msg || 'La connexion ne passe pas. Vérifiez votre email et mot de passe puis réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Fond décoratif */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50/50" />
      <div className="fixed top-0 left-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-green-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-900/10 border border-emerald-100/50 p-8 md:p-10 relative">
          <div className="absolute top-6 right-6">
            <LanguageSwitcher />
          </div>
          <div className="flex flex-col items-center mb-8 pt-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
              <Leaf className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-stone-800">Agriculture Intelligente</h1>
            <p className="text-stone-500 mt-1">Plateforme e-agricole · Sénégal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {timeoutMessage && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200/80">
                <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{t('sessionTimeout')}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200/80">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white/80"
                placeholder="votre@email.com"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white/80"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-stone-400">
                Attention à la casse (majuscules/minuscules) et aux caractères spéciaux.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? t('loginLoading') : t('loginButton')}
            </button>
          </form>

          <p className="mt-6 text-center">
            <Link href="/auth/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
              {t('forgotPassword')}
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-stone-400">
            {t('accountsNote')}
          </p>
          <p className="mt-2 text-center text-xs text-emerald-600/80 bg-emerald-50/50 rounded-lg px-3 py-2">
            Compte admin (après seed) : lyissa1928@gmail.com / Passer@12345
          </p>
          <p className="mt-2 text-center text-xs text-stone-500">
            Si la connexion échoue : 1) Démarrer Docker Desktop 2) <code>pnpm dev</code> 3) <code>pnpm db:seed</code>
          </p>
        </div>

        <p className="mt-8 text-center">
          <Link href="/" className="text-stone-500 hover:text-emerald-600 text-sm font-medium transition">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </main>
  );
}
