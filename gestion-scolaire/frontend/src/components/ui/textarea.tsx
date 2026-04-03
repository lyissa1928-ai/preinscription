'use client';

import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const baseClasses =
  'w-full text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] rounded-[var(--radius-input)] border transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed resize-y min-h-[4.5rem]';

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`${baseClasses} py-2 ${className}`}
      style={{
        paddingLeft: 'var(--input-px)',
        paddingRight: 'var(--input-px)',
        borderColor: error ? 'var(--color-danger)' : 'var(--color-border-subtle)',
        backgroundColor: 'var(--color-sidebar)',
      }}
      {...props}
    />
  );
}
