'use client';

import { Button } from './button';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Texte personnalisé, ex. "inscription(s)" */
  itemLabel?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'élément(s)',
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--foreground-muted)]">
      <span>
        Affichage de <span className="font-medium text-[var(--foreground)]">{start}–{end}</span> sur{' '}
        <span className="font-medium text-[var(--foreground)]">{totalItems}</span> {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Précédent
        </Button>
        <span>
          Page <span className="font-medium text-[var(--foreground)]">{currentPage}</span> / {totalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
