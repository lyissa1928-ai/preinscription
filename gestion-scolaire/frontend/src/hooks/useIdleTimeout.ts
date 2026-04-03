'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { expireSessionForIdle } from '@/lib/session';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

/**
 * Hook de détection d'inactivité.
 * Après 15 minutes sans activité (souris, clic, clavier, scroll, touch),
 * invalide la session et redirige vers la page de connexion avec notification.
 */
export function useIdleTimeout(enabled: boolean) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timeoutRef.current = setTimeout(() => {
      expireSessionForIdle();
      router.replace('/login?expired=1');
      router.refresh();
    }, IDLE_TIMEOUT_MS);
  }, [router]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    resetTimer();

    const handleActivity = () => {
      resetTimer();
    };

    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, handleActivity);
    });

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, resetTimer]);
}
