'use client';

import { useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

const REFRESH_KEY = 'refreshToken';
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(REFRESH_KEY);
    if (!token) return;
    try {
      const res = await authApi.refresh(token);
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem(REFRESH_KEY, res.refreshToken);
    } catch {
      // Token invalide - on ne fait rien ici, la prochaine requête api() gérera la déconnexion
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(REFRESH_KEY);
    if (!token) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [refresh]);

  return <>{children}</>;
}
