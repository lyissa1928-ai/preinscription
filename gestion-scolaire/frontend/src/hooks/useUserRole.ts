'use client';

import { useEffect, useState } from 'react';
import { normalizeRole } from '@/lib/role-normalize';

export type UserInfo = { role?: string; [key: string]: unknown };

export { normalizeRole };

/**
 * Hook pour récupérer le rôle (et l’utilisateur) depuis localStorage.
 * Une seule source de vérité au lieu de répéter localStorage.getItem('user') partout.
 */
export function useUserRole(): { role: string | null; user: UserInfo | null; loading: boolean } {
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (raw) {
        const parsed = JSON.parse(raw) as UserInfo;
        setUser(parsed);
        setRole(normalizeRole(parsed?.role as string | undefined));
      } else {
        setUser(null);
        setRole(null);
      }
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { role, user, loading };
}
