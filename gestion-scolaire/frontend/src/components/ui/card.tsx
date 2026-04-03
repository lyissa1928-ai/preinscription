import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
};

export function Card({ title, description, children, className = '', headerRight }: CardProps) {
  return (
    <section
      data-erp-card
      className={`rounded-[var(--radius-lg)] border px-4 py-4 sm:px-6 sm:py-5 ${className}`}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {(title || description || headerRight) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">{title}</h2>}
            {description && <p className="mt-0.5 text-xs sm:text-sm text-[var(--foreground-muted)]">{description}</p>}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

