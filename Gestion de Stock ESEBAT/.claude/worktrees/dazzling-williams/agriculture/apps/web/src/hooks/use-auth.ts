'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback, useState } from 'react';
import { authApi } from '@/lib/api';

export type CurrentUser = { id: string; email: string; role: string } | null;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  FARMER: 'Agriculteur',
  AGRONOMIST: 'Agronome',
  TECHNICIAN: 'Technicien',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function useAuth() {
  const router = useRouter();

  const getTokens = useCallback(() => ({
    access: typeof window !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null,
    refresh: typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null,
  }), []);

  const setTokens = useCallback((access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setTokens(res.accessToken, res.refreshToken);
    return res.user;
  }, [setTokens]);

  const register = useCallback(async (email: string, password: string, role?: string) => {
    const res = await authApi.register(email, password, role);
    setTokens(res.accessToken, res.refreshToken);
    return res.user;
  }, [setTokens]);

  const logout = useCallback(async () => {
    const { refresh } = getTokens();
    try {
      await authApi.logout(refresh || undefined);
    } catch {
      // ignore
    }
    clearTokens();
    router.push('/auth/login');
  }, [getTokens, clearTokens, router]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const { refresh } = getTokens();
    if (!refresh) return false;
    try {
      const res = await authApi.refresh(refresh);
      setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }, [getTokens, setTokens, clearTokens]);

  const getUser = useCallback(async () => {
    const { access, refresh } = getTokens();
    if (!access) {
      if (refresh) {
        const ok = await refreshToken();
        if (ok) return authApi.me();
      }
      return null;
    }
    try {
      return await authApi.me();
    } catch {
      return null;
    }
  }, [getTokens, refreshToken]);

  const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>(undefined);

  useEffect(() => {
    getUser().then((u) => setCurrentUser(u ?? null));
  }, [getUser]);

  return { login, register, logout, refreshToken, getTokens, clearTokens, getUser, currentUser };
}

export function useRequireAdmin(onForbidden?: () => void) {
  const { getTokens, refreshToken, getUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { access, refresh } = getTokens();
      if (!access && !refresh) {
        router.replace('/auth/login');
        return;
      }
      if (refresh && !access) {
        const ok = await refreshToken();
        if (!ok) {
          router.replace('/auth/login');
          return;
        }
      }
      const user = await getUser();
      if (!user || user.role !== 'ADMIN') {
        router.replace('/dashboard');
        onForbidden?.();
        return;
      }
    };
    check();
  }, [getTokens, refreshToken, getUser, router, onForbidden]);
}

export function useRequireAuth() {
  const { getTokens, refreshToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { access, refresh } = getTokens();
      if (access) return;
      if (refresh) {
        const ok = await refreshToken();
        if (ok) return;
      }
      router.replace('/auth/login');
    };
    check();
  }, [getTokens, refreshToken, router]);
}
