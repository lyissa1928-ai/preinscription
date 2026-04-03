'use client';

import type { LabelHTMLAttributes } from 'react';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({ children, required, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`block text-sm font-medium text-[var(--foreground)] mb-1 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--color-danger)] ml-0.5" aria-hidden>*</span>}
    </label>
  );
}
