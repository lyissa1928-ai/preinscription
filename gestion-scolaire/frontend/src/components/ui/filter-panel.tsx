'use client';

import type { ReactNode } from 'react';

type FilterPanelProps = {
  children: ReactNode;
  onReset?: () => void;
  className?: string;
};

/**
 * Barre de filtres réutilisable — alignée sur le design Power BI.
 */
export function FilterPanel({ children, onReset, className = '' }: FilterPanelProps) {
  return (
    <div
      data-erp-filter-panel
      className={`flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border p-4 ${className}`}
      style={{
        backgroundColor: 'var(--surface-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-1 flex-wrap items-end gap-3 min-w-0">{children}</div>
      {onReset != null && (
        <button
          type="button"
          onClick={onReset}
          className="shrink-0 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

