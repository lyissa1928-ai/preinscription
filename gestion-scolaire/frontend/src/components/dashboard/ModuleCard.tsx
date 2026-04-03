'use client';

import Link from 'next/link';
import type { IconName } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icons';

export type ModuleCardItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: IconName;
  badge?: number | null;
};

type ModuleCardProps = ModuleCardItem;

export function ModuleCard({ title, description, href, icon, badge }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-[var(--color-primary-soft)] group-hover:text-[var(--color-primary)]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 group-hover:text-[var(--color-primary)]">{title}</h3>
          {badge != null && badge > 0 && (
            <span className="shrink-0 rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-xs font-medium text-white">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
