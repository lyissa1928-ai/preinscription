'use client';

import type { ReactNode } from 'react';
import type { IconName } from './icons';
import { Icon } from './icons';

type KpiCardProps = {
  label: string;
  value: ReactNode;
  sub?: string;
  suffix?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'accent';
  icon?: IconName;
};

const accentBorderColors: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'var(--color-primary)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  accent: 'var(--color-accent)',
};

const valueColors: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'text-[var(--foreground)]',
  success: 'text-[var(--color-success)]',
  danger: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
  accent: 'text-[var(--color-accent)]',
};

const iconBgColors: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'bg-[var(--color-primary-soft)] [&>svg]:text-[var(--color-primary)]',
  success: 'bg-[var(--color-success-soft)] [&>svg]:text-[var(--color-success)]',
  danger: 'bg-[var(--color-danger-soft)] [&>svg]:text-[var(--color-danger)]',
  warning: 'bg-[var(--color-warning-soft)] [&>svg]:text-[var(--color-warning)]',
  info: 'bg-[var(--color-info-soft)] [&>svg]:text-[var(--color-info)]',
  accent: 'bg-[var(--color-accent-soft)] [&>svg]:text-[var(--color-accent)]',
};

/** Carte KPI style Power BI : barre d'accent à gauche, grande valeur, label discret. */
export function KpiCard({ label, value, sub, suffix, variant = 'default', icon }: KpiCardProps) {
  return (
    <div
      data-erp-card
      className="rounded-[var(--radius-lg)] border pl-5 pr-4 py-4 min-h-[96px] flex flex-col justify-center border-l-4"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--color-border)',
        borderLeftColor: accentBorderColors[variant],
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--foreground-muted)]">{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${iconBgColors[variant]}`}
            aria-hidden
          >
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-2 text-[28px] font-bold leading-tight tabular-nums ${valueColors[variant]}`}>
        {value}
        {suffix != null && suffix !== '' && <span className="text-lg font-semibold text-[var(--foreground-muted)] ml-1">{suffix}</span>}
      </p>
      {sub != null && sub !== '' && (
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{sub}</p>
      )}
    </div>
  );
}
