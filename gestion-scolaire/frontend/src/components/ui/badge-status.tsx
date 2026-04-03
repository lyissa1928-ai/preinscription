import type { ReactNode } from 'react';

type BadgeStatusProps = {
  status: string;
  children?: ReactNode;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  INSCRIT: 'bg-amber-50 text-amber-800 ring-amber-200',
  PROVISOIRE: 'bg-slate-100 text-slate-700 ring-slate-200',
  CONFIRMEE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  VALIDE: 'bg-green-50 text-green-800 ring-green-200',
  ANNULEE: 'bg-red-50 text-red-700 ring-red-200',
  VALIDATED: 'bg-green-50 text-green-800 ring-green-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  en_attente: 'bg-amber-50 text-amber-800 ring-amber-200',
  valide: 'bg-green-50 text-green-800 ring-green-200',
};

export function BadgeStatus({ status, children, className = '' }: BadgeStatusProps) {
  const key = status as keyof typeof STATUS_STYLES;
  const style = STATUS_STYLES[key] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style} ${className}`}
      title={status}
    >
      {children ?? status}
    </span>
  );
}

