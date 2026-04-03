'use client';

import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
};

const baseClasses =
  'w-full text-sm text-[var(--foreground)] rounded-[var(--radius-input)] border transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-no-repeat';

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`${baseClasses} ${className}`}
      style={{
        minHeight: 'var(--input-height)',
        paddingLeft: 'var(--input-px)',
        paddingRight: '2rem',
        borderColor: error ? 'var(--color-danger)' : 'var(--color-border-subtle)',
        backgroundColor: 'var(--color-sidebar)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundSize: '1.25rem',
      }}
      {...props}
    >
      {children}
    </select>
  );
}
