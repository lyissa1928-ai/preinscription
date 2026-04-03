'use client';

import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const baseClasses =
  'w-full text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] rounded-[var(--radius-input)] border transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={`${baseClasses} ${className}`}
      style={{
        minHeight: 'var(--input-height)',
        paddingLeft: 'var(--input-px)',
        paddingRight: 'var(--input-px)',
        borderColor: error ? 'var(--color-danger)' : 'var(--color-border-subtle)',
        backgroundColor: 'var(--color-sidebar)',
      }}
      {...props}
    />
  );
}
