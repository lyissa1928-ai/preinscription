'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

/** Durée d'inactivité avant déconnexion automatique (30 minutes par défaut) */
const INACTIVITY_TIMEOUT_MS = parseInt(
  process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '30',
  10
) * 60 * 1000;

/** Intervalle de vérification (1 minute) */
const CHECK_INTERVAL_MS = 60 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef<number>(Date.now());

  const disconnect = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    router.replace('/auth/login?reason=timeout');
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasSession = () => !!localStorage.getItem(REFRESH_KEY) || !!localStorage.getItem(ACCESS_KEY);
    const isAuthPage = pathname?.startsWith('/auth/');
    if (!hasSession() || isAuthPage) return;

    lastActivityRef.current = Date.now();

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = () => {
      if (!hasSession() || pathname?.startsWith('/auth/')) return;
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        disconnect();
      }
    };

    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, onActivity);
    });

    const interval = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, onActivity);
      });
      clearInterval(interval);
    };
  }, [disconnect, pathname]);

  return <>{children}</>;
}
