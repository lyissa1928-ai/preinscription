import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
};

const baseClasses =
  'inline-flex items-center justify-center rounded-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-sm sm:text-base px-4 py-2.5',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'text-white ring-offset-[var(--background)] [background:var(--color-primary)] hover:opacity-90',
  secondary: 'bg-slate-100 text-[var(--foreground)] hover:bg-slate-200 ring-offset-[var(--background)]',
  ghost: 'bg-transparent text-[var(--foreground)] hover:bg-slate-100 ring-offset-[var(--background)]',
  danger: 'bg-[var(--color-danger)] text-white hover:opacity-90 ring-offset-[var(--background)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
      {loading && (
        <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
      )}
      {children}
    </button>
  );
}

