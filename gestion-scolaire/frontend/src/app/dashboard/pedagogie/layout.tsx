'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Breadcrumb, getPedagogieBreadcrumbItems } from '@/components/ui/breadcrumb';
import { normalizeRole } from '@/lib/role-normalize';

const PEDAGOGIE_ROLES = ['SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'AGENT_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'];

export default function PedagogieLayout({
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
    try {
      const { role } = JSON.parse(u) as { role?: string };
      const roleNorm = normalizeRole(role);
      const isAllowed = roleNorm ? (PEDAGOGIE_ROLES as readonly string[]).includes(roleNorm) : false;
      setAllowed(isAllowed);
      if (!isAllowed) {
        router.replace('/dashboard');
      }
    } catch {
      setAllowed(false);
      router.replace('/dashboard');
    }
  }, [router, pathname]);

  if (allowed === null) return <p className="text-slate-500 p-6">Chargement...</p>;
  if (!allowed) return null;

  const breadcrumbItems = pathname && pathname !== '/dashboard/pedagogie' && pathname.startsWith('/dashboard/pedagogie')
    ? getPedagogieBreadcrumbItems(pathname)
    : [];

  return (
    <>
      {breadcrumbItems.length > 0 && (
        <div className="mb-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      )}
      {children}
    </>
  );
}
