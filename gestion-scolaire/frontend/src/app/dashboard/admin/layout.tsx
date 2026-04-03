'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) {
      setAllowed(false);
      return;
    }
    const { role } = JSON.parse(u);
    if (role === 'SERVICE_PEDAGOGIQUE') {
      router.replace('/dashboard/pedagogie');
      return;
    }
    setAllowed(ADMIN_ROLES.includes(role));
  }, [pathname, router]);

  useEffect(() => {
    if (allowed === false) router.replace('/dashboard');
  }, [allowed, router]);

  if (allowed === null) return <p className="text-slate-500 p-6">Chargement...</p>;
  if (!allowed) return null;
  return <>{children}</>;
}
