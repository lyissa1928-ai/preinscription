'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const COMPTABLE_ROLES = ['CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];

export default function ComptableLayout({
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
    setAllowed(COMPTABLE_ROLES.includes(role));
  }, [pathname]);

  useEffect(() => {
    if (allowed === false) router.replace('/dashboard');
  }, [allowed, router]);

  if (allowed === null) return <p className="text-slate-500 p-6">Chargement...</p>;
  if (!allowed) return null;
  return <>{children}</>;
}
