'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

type SectionCardProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  description,
  actionLabel,
  actionHref,
  children,
  className = '',
}: SectionCardProps) {
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
        className="px-5 py-4 border-b flex items-start justify-between gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{description}</p>
          )}
        </div>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline shrink-0"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
