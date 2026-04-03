'use client';

import type { IconName } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icons';

export type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconName;
  accent?: 'blue' | 'emerald' | 'amber' | 'slate';
};

const accentClasses = {
  blue: 'bg-blue-50 text-blue-600 [&>svg]:text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600 [&>svg]:text-emerald-600',
  amber: 'bg-amber-50 text-amber-600 [&>svg]:text-amber-600',
  slate: 'bg-slate-100 text-slate-600 [&>svg]:text-slate-600',
};

export function StatCard({ label, value, sub, icon, accent = 'slate' }: StatCardProps) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
          {sub != null && sub !== '' && (
            <p className="mt-0.5 text-sm text-slate-500">{sub}</p>
          )}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClasses[accent]}`}
          aria-hidden
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
