'use client';

import Link from 'next/link';
import type { IconName } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icons';
import { SectionCard } from './SectionCard';

export type QuickActionItem = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
};

type QuickActionsCardProps = {
  actions: QuickActionItem[];
};

export function QuickActionsCard({ actions }: QuickActionsCardProps) {
  return (
    <SectionCard title="Actions rapides" description="Raccourcis utiles">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600">
              <Icon name={action.icon} className="h-4 w-4" />
            </span>
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
