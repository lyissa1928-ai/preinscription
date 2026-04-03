'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { TeacherBadgeScanPanel } from '@/components/badges/TeacherBadgeScanPanel';
import { canScanTeacherBadge } from '@/lib/badges-rbac';

export default function ScanBadgeEnseignantPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      setRole(u ? ((JSON.parse(u) as { role?: string }).role ?? null) : null);
    } catch {
      setRole(null);
    }
  }, []);

  const allowed = canScanTeacherBadge(role);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Scan présence — badge enseignant"
        description="Pointage journalier par lecture du QR imprimé sur le badge. Les droits sont contrôlés par le serveur."
      />
      <nav className="text-sm text-[var(--foreground-muted)]">
        <Link href="/dashboard/scolarite" className="hover:text-[var(--color-primary)]">
          ← Scolarité
        </Link>
      </nav>

      {!allowed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Votre rôle ne permet pas d’enregistrer une présence par scan de badge. Contactez un administrateur si besoin.
        </p>
      ) : (
        <TeacherBadgeScanPanel />
      )}
    </div>
  );
}
