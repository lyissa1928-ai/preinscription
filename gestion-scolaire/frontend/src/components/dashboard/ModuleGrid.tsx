'use client';

import type { ReactNode } from 'react';

type ModuleGridProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function ModuleGrid({ title, description, children }: ModuleGridProps) {
  return (
    <section>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {children}
      </div>
    </section>
  );
}
