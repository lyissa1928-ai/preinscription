'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getDashboardForRole } from '@/lib/role-dashboard';
import { consumeSessionExpiredFlag, isSessionValid, isTokenNotExpired } from '@/lib/session';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeImage } from '@/components/ui/theme-image';
import { getThemeImageSrc, DEFAULT_LOGO_LOGIN_PATH } from '@/lib/theme-images';
import { DEFAULT_APP_NAME, getBrandMonogram } from '@/lib/branding';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useTheme();
  const logoLoginSrc = getThemeImageSrc(
    settings?.logoLoginUrl?.trim() || DEFAULT_LOGO_LOGIN_PATH,
  );
  const displayName = settings?.appName?.trim() || DEFAULT_APP_NAME;
  const monogram = getBrandMonogram(displayName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpiredMsg(true);
      consumeSessionExpiredFlag();
      setCheckingSession(false);
      return;
    }
    if (isSessionValid() && isTokenNotExpired()) {
      const u = localStorage.getItem('user');
      if (u) {
        const { role } = JSON.parse(u);
        router.replace(getDashboardForRole(role));
        return;
      }
    }
    setCheckingSession(false);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSessionExpiredMsg(false);
    setLoading(true);
    try {
      const res = await api<{
        access_token: string;
        user: {
          id: string;
          role: string;
          firstName?: string;
          lastName?: string;
          email?: string;
          profilePhotoUrl?: string | null;
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', res.access_token);
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      const dashboard = getDashboardForRole(res.user.role);
      router.push(dashboard);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      if (msg === 'Failed to fetch' || (err instanceof TypeError && err.message?.includes('fetch'))) {
        setError('Serveur inaccessible. Vérifiez que le backend est démarré (port 3000).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Vérification de la session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5 min-h-[4rem]">
              <ThemeImage
                src={logoLoginSrc || undefined}
                alt=""
                className="max-h-16 max-w-[200px] object-contain"
                placeholderClassName="bg-slate-200 animate-pulse min-h-[64px] min-w-[160px] rounded"
                fallback={
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                    {monogram}
                  </div>
                }
              />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Connexion à l&apos;espace de travail
            </p>
          </div>

          {sessionExpiredMsg && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Votre session a expiré pour des raisons de sécurité.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-shadow duration-150"
                placeholder="vous@etablissement.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-shadow duration-150"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-150"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-5 text-center">
            <Link
              href="/vigile"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              Mode kiosque vigile →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Chargement...</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
