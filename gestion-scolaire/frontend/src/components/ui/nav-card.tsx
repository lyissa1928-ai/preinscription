import Link from 'next/link';
import type { ReactNode } from 'react';
import type { IconName } from './icons';
import { Icon } from './icons';

type NavCardProps = {
  href: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  variant?: 'default' | 'blue' | 'emerald' | 'amber' | 'red';
  icon?: IconName;
};

const borderClasses: Record<NonNullable<NavCardProps['variant']>, string> = {
  default: 'border-slate-200 hover:border-slate-400',
  blue: 'border-blue-200 hover:border-blue-400',
  emerald: 'border-emerald-200 hover:border-emerald-400',
  amber: 'border-amber-200 hover:border-amber-400',
  red: 'border-red-100 hover:border-red-300',
};

export function NavCard({ href, title, description, badge, variant = 'default', icon }: NavCardProps) {
  return (
    <Link
      href={href}
      data-erp-card
      className={`block rounded-[var(--radius-lg)] border-2 p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${borderClasses[variant]}`}
      style={{ backgroundColor: 'var(--color-sidebar)' }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-3 min-w-0">
          {icon && (
            <span className="flex-shrink-0 text-[var(--foreground-muted)] [&>svg]:w-5 [&>svg]:h-5" aria-hidden>
              <Icon name={icon} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{description}</p>}
          </div>
        </div>
        {badge != null && <span className="flex-shrink-0">{badge}</span>}
      </div>
    </Link>
  );
}
