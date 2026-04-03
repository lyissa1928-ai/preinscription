'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BadgeScanLogsTable } from '@/components/badges/BadgeScanLogsTable';
import { canReadBadgeScanLogs } from '@/lib/badges-rbac';

export default function JournalScansBadgePage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      setRole(u ? ((JSON.parse(u) as { role?: string }).role ?? null) : null);
    } catch {
      setRole(null);
    }
  }, []);

  const allowed = canReadBadgeScanLogs(role);

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Journal des scans de badges"
        description="Historique des tentatives de pointage via QR enseignant (supervision)."
      />
      <nav className="text-sm text-[var(--foreground-muted)]">
        <Link href="/dashboard/pedagogie" className="hover:text-[var(--color-primary)]">
          ← Pédagogie
        </Link>
      </nav>

      {!allowed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Réservé au service pédagogique, aux responsables pédagogiques et aux administrateurs.
        </p>
      ) : (
        <BadgeScanLogsTable />
      )}
    </div>
  );
}
