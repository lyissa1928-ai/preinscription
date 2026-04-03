'use client';

import Link from 'next/link';

type BreadcrumbItem = {
  href: string;
  label: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

const SCOLARITE_LABELS: Record<string, string> = {
  scolarite: 'Scolarité',
  etudiants: 'Étudiants',
  enseignants: 'Enseignants',
  campus: 'Campus',
  salles: 'Salles',
  inscriptions: 'Inscriptions',
  transfert: 'Transfert & clôture',
  'scan-badge': 'Scan présence badge',
  classes: 'Classes',
  'emploi-du-temps': 'Emploi du temps',
  notes: 'Notes',
  maquettes: 'Maquette',
  edit: 'Modifier',
};

const PEDAGOGIE_LABELS: Record<string, string> = {
  classes: 'Classes',
  'emploi-du-temps': 'Emploi du temps',
  indisponibilites: 'Indisponibilités',
  enseignants: 'Enseignants',
  notes: 'Évaluations & notes',
  examens: 'Évaluations & notes',
  audit: 'Audit pédagogique',
  rapports: 'Rapports',
  'journal-scans-badge': 'Journal scans badges',
};

function getLabel(segment: string, labels: Record<string, string>, isId = false): string {
  if (isId) return 'Détail';
  return labels[segment] ?? segment;
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items.length) return null;
  return (
    <nav aria-label="Fil d’ariane" className="text-xs sm:text-sm text-[var(--foreground-muted)]">
      <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {index > 0 && <span className="text-[var(--foreground-muted)]">/</span>}
              {isLast ? (
                <span className="font-medium text-[var(--foreground)] truncate max-w-[140px] sm:max-w-[220px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-[var(--color-primary)] truncate max-w-[120px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function getPedagogieBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  if (!pathname.startsWith('/dashboard/pedagogie')) return [];
  const segments = pathname.replace('/dashboard/pedagogie', '').split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [
    { href: '/dashboard/pedagogie', label: 'Pédagogie' },
  ];

  let currentPath = '/dashboard/pedagogie';
  segments.forEach((seg, index) => {
    currentPath += `/${seg}`;
    const isId = index === segments.length - 1 && seg.length > 10;
    const label = getLabel(seg, PEDAGOGIE_LABELS, isId);
    items.push({ href: currentPath, label });
  });

  return items;
}

