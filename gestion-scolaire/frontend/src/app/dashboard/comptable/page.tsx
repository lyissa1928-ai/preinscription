'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { NavCard } from '@/components/ui/nav-card';

const CAN_CAISSE = ['CAISSIER', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
const CAN_COMPTABILITE = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_DAF = ['DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_CLOTURE = ['CAISSIER', 'CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];
const CAN_TARIFS = ['SCOLARITE', 'CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN', 'DAF', 'CAISSIER', 'DEPT_HEAD', 'TEACHER', 'STUDENT'];
const CAN_TARIFS_PAIEMENTS_PAIE = ['CHEF_COMPTABLE', 'ADMIN', 'SUPER_ADMIN'];
const CAN_RAPPORTS = ['CHEF_COMPTABLE', 'DAF', 'ADMIN', 'SUPER_ADMIN'];

export default function ComptableDashboard() {
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUserRole((JSON.parse(u) as { role?: string }).role || '');
  }, []);

  const can = (list: string[]) => list.includes(userRole);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Tableau de bord Comptable"
        description="Finances, tarifs, clôture journalière, paie."
      />

      <Card title="Accès rapide" description="Modules selon vos droits.">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {can(CAN_TARIFS) && <NavCard href="/dashboard/comptable/tarifs" title="Tarifs" description={`Configuration frais, mensualités, soutenances${!can(CAN_TARIFS_PAIEMENTS_PAIE) ? ' (lecture seule)' : ''}`} variant="blue" icon="currency" />}
          {can(CAN_TARIFS_PAIEMENTS_PAIE) && (
            <>
              <NavCard href="/dashboard/comptable/paiements" title="Paiements" description="Encaissements, validation des paiements" variant="blue" icon="banknotes" />
              <NavCard href="/dashboard/comptable/recouvrement" title="Recouvrement" description="Reste à recouvrer par formation et cohorte" variant="amber" icon="arrow-trending-up" />
              <NavCard href="/dashboard/comptable/pointages" title="Pointages" description="Validation des pointages enseignants" variant="default" icon="clock" />
              <NavCard href="/dashboard/comptable/paie" title="Paie" description="Calcul paie, bulletins enseignants" variant="default" icon="briefcase" />
              <NavCard href="/dashboard/comptable/taux-horaires" title="Taux horaires" description="CM/TD/TP/TPE pour calcul paie" variant="default" icon="clock" />
            </>
          )}
          {can(CAN_CAISSE) && <NavCard href="/dashboard/comptable/caisse" title="Caisse (Brouillard)" description="Encaissements, brouillard, clôture journalière" variant="default" icon="banknotes" />}
          {can(CAN_COMPTABILITE) && <NavCard href="/dashboard/comptable/comptabilite" title="Comptabilité" description="Balance, Grand-Livre, écritures" variant="default" icon="table-cells" />}
          {can(CAN_DAF) && <NavCard href="/dashboard/comptable/daf" title="Tableau de bord DAF" description="Taux recouvrement, trésorerie, approbation" variant="blue" icon="chart" />}
          {can(CAN_CLOTURE) && <NavCard href="/dashboard/comptable/cloture" title="Clôture journalière" description="État financier du jour, validation, demande de brèche" variant="default" icon="calendar-days" />}
          {can(CAN_RAPPORTS) && <NavCard href="/dashboard/rapports" title="Rapports" description="Effectifs, recettes, taux de réussite, export" variant="default" icon="chart" />}
        </div>
      </Card>
    </div>
  );
}
