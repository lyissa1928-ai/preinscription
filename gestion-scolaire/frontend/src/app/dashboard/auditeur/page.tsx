'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';

export default function AuditeurDashboard() {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Tableau de bord Auditeur"
        description="Consultation du journal d'audit, traçabilité."
      />

      <Card title="Accès rapide" description="Modules audit.">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <NavCard href="/dashboard/auditeur/journal" title="Journal d'audit" description="Historique des actions sensibles, filtres, export CSV" variant="blue" icon="document-magnifying-glass" />
        </div>
      </Card>
    </div>
  );
}
