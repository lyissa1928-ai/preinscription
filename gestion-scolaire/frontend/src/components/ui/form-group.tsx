'use client';

import type { ReactNode } from 'react';

type FormGroupProps = {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
};

export function FormGroup({
  label,
  required,
  error,
  hint,
  children,
  htmlFor,
  className = '',
}: FormGroupProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label != null && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[var(--foreground-muted)]">{hint}</p>
      )}
    </div>
  );
}
