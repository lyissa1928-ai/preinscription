'use client';

import Link from 'next/link';

type BackLinkProps = {
  href: string;
  children?: React.ReactNode;
  className?: string;
};

const defaultClass = 'text-sm text-slate-600 hover:text-slate-800 inline-block';

/**
 * Lien « Retour » uniforme pour toutes les pages.
 */
export function BackLink({ href, children = '← Retour', className }: BackLinkProps) {
  return (
    <Link href={href} className={className ?? defaultClass}>
      {children}
    </Link>
  );
}
