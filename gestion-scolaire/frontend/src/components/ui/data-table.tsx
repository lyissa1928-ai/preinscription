'use client';

import type { ReactNode } from 'react';

export type DataTableColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
  thClassName?: string;
  /** Si true, le header est cliquable pour tri (nécessite sortKey + onSort). */
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  empty?: ReactNode;
  toolbar?: ReactNode;
  pagination?: ReactNode;
  density?: 'default' | 'compact';
  /** Colonne triée (key) */
  sortKey?: string | null;
  /** Direction du tri */
  sortDirection?: 'asc' | 'desc';
  /** Callback au clic sur un header sortable */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
};

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) {
    return (
      <svg className="w-3.5 h-3.5 ml-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return direction === 'asc' ? (
    <svg className="w-3.5 h-3.5 ml-1 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 ml-1 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  empty,
  toolbar,
  pagination,
  density = 'default',
  sortKey = null,
  sortDirection = 'asc',
  onSort,
}: DataTableProps<T>) {
  const cellPadding = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="space-y-2">
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm" style={{ backgroundColor: 'var(--surface)' }}>
          <thead className="sticky top-0 z-10 text-left font-medium text-[var(--foreground-muted)]" style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: '1px solid var(--color-border)' }}>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`${cellPadding} ${col.thClassName ?? ''}`}>
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key, sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="inline-flex items-center hover:text-[var(--foreground)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 rounded"
                    >
                      {col.label}
                      <SortIcon direction={sortKey === col.key ? sortDirection : null} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cellPadding}>
                  {empty ?? <p className="text-[var(--foreground-muted)] py-6 text-center">Aucune donnée</p>}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  data-erp-table-row
                  className="border-t hover:bg-slate-50/80"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${cellPadding} text-[var(--foreground)] ${col.className ?? ''}`}>
                      {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--foreground-muted)]">{pagination}</div>}
    </div>
  );
}
