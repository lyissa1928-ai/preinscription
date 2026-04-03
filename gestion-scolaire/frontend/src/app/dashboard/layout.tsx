'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { clearSession, isSessionValid, isTokenNotExpired } from '@/lib/session';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{
    role: string;
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string | null;
    id?: string;
    email?: string;
  } | null>(null);
  const [notifCount, setNotifCount] = useState(0);

  useIdleTimeout(!!user);

  useEffect(() => {
    if (!isSessionValid()) {
      router.push('/login');
      return;
    }
    if (!isTokenNotExpired()) {
      clearSession();
      router.push('/login?expired=1');
      return;
    }
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    api<{
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
      profilePhotoUrl?: string | null;
    }>('/auth/me')
      .then((me) => {
        setUser((prev) => ({ ...prev, ...me }));
        try {
          const stored = localStorage.getItem('user');
          const parsed = stored ? JSON.parse(stored) : {};
          localStorage.setItem('user', JSON.stringify({ ...parsed, ...me }));
        } catch {
          localStorage.setItem(
            'user',
            JSON.stringify({
              id: me.id,
              email: me.email,
              role: me.role,
              firstName: me.firstName,
              lastName: me.lastName,
              profilePhotoUrl: me.profilePhotoUrl,
            }),
          );
        }
      })
      .catch(() => {});
  }, [router, pathname]);

  const refreshNotifCount = () => {
    api<number>('/notifications/count').then(setNotifCount).catch(() => setNotifCount(0));
  };

  useEffect(() => {
    if (!user) return;
    refreshNotifCount();
    const interval = setInterval(refreshNotifCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user) refreshNotifCount();
  }, [pathname, user]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
    router.refresh();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--foreground-muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <AppShell user={user} notifCount={notifCount} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
