'use client';

import type { ReactNode } from 'react';

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function DashboardPageHeader({ title, description, actions }: DashboardPageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
