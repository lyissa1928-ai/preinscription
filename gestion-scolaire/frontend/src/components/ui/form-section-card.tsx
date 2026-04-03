'use client';

import type { ReactNode } from 'react';

type FormSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Section de formulaire dans une carte — utilisée pour les écrans complexes (style Power BI).
 */
export function FormSectionCard({
  title,
  description,
  children,
  className = '',
}: FormSectionCardProps) {
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
      <div
        className="px-4 py-3 sm:px-6 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">{description}</p>
        )}
      </div>
      <div className="p-4 sm:p-6 space-y-4">{children}</div>
    </section>
  );
}

