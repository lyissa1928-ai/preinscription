import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{title}</h1>
        {description && <p className="mt-1 text-sm max-w-2xl text-[var(--foreground-muted)]">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

