'use client';

import type { ReactNode } from 'react';

type DataTableShellProps = {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  className?: string;
};

/**
 * Enveloppe de tableau style Power BI :
 * en-tête avec titre / description / toolbar, corps avec table, footer pagination.
 */
export function DataTableShell({
  title,
  description,
  toolbar,
  children,
  pagination,
  className = '',
}: DataTableShellProps) {
  return (
    <section
      data-erp-card
      className={`rounded-[var(--radius-lg)] border overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {(title || description || toolbar) && (
        <div
          className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-6 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            {title && (
              <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{description}</p>
            )}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}
      <div className="overflow-x-auto" data-powerbi-table>
        {children}
      </div>
      {pagination && (
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {pagination}
        </div>
      )}
    </section>
  );
}

