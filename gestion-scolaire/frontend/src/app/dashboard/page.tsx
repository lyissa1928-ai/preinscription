'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardForRole } from '@/lib/role-dashboard';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) {
      try {
        const { role } = JSON.parse(u);
        router.replace(getDashboardForRole(role || ''));
      } catch {
        router.replace('/dashboard/profil');
      }
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-[var(--foreground-muted)]">Redirection...</p>
    </div>
  );
}
