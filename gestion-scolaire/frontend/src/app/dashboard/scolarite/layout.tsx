'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { normalizeRole } from '@/lib/role-normalize';

const SCOLARITE_ROLES = ['SCOLARITE', 'SERVICE_PEDAGOGIQUE', 'RESPONSABLE_PEDAGOGIQUE', 'AGENT_PEDAGOGIQUE', 'ADMIN', 'SUPER_ADMIN'];

// La gestion des classes et des emplois du temps est réservée à la Pédagogie.
// Le rôle SCOLARITE seul ne doit pas y avoir accès.
const PEDAGOGIE_ONLY_PATHS = ['/dashboard/scolarite/emploi-du-temps'];

export default function ScolariteLayout({
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
      const canAccessScolarite = roleNorm ? (SCOLARITE_ROLES as readonly string[]).includes(roleNorm) : false;
      if (!canAccessScolarite) {
        setAllowed(false);
        return;
      }
      // SCOLARITE seul ne peut pas accéder aux pages réservées à la Pédagogie (emploi du temps, etc.)
      const isPedagogieOnlyPath = PEDAGOGIE_ONLY_PATHS.some((p) => pathname?.startsWith(p));
      if (isPedagogieOnlyPath && roleNorm === 'SCOLARITE') {
        setAllowed(null);
        router.replace('/dashboard/scolarite');
        return;
      }
      setAllowed(true);
    } catch {
      setAllowed(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (allowed === false) router.replace('/dashboard');
  }, [allowed, router]);

  if (allowed === null) return <p className="text-slate-500 p-6">Chargement...</p>;
  if (!allowed) return null;
  return <>{children}</>;
}
