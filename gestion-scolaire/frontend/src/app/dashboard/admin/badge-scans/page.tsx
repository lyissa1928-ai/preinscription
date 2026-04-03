'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { BadgeScanLogsTable } from '@/components/badges/BadgeScanLogsTable';

export default function AdminBadgeScansPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Journal des scans de badges"
        description="Traçabilité des lectures de QR enseignant (présence journalière)."
      />
      <nav className="text-sm text-slate-600">
        <Link href="/dashboard/admin" className="hover:underline">
          ← Administration
        </Link>
      </nav>
      <BadgeScanLogsTable />
    </div>
  );
}
