'use client';

import type { IconName } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icons';
import { SectionCard } from './SectionCard';

export type RecentActivityItem = {
  id: string;
  title: string;
  time: string;
  icon: IconName;
};

type RecentActivityCardProps = {
  items: RecentActivityItem[];
  viewAllHref?: string;
};

export function RecentActivityCard({ items, viewAllHref }: RecentActivityCardProps) {
  return (
    <SectionCard
      title="Activité récente"
      description="Dernières actions sur la plateforme"
      actionLabel="Voir toute l'activité"
      actionHref={viewAllHref ?? '/dashboard/auditeur/journal'}
    >
      <ul className="space-y-0 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
              aria-hidden
            >
              <Icon name={item.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
