import type { ReactNode } from 'react';
import { Icon } from './icons';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-[var(--foreground-muted)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[var(--foreground-muted)] [&>svg]:w-5 [&>svg]:h-5">
        <Icon name="information-circle" />
      </div>
      <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--foreground-muted)] max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

