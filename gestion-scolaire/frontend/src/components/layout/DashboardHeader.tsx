'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icons';
import { ThemeImage } from '@/components/ui/theme-image';
import { useTheme } from '@/contexts/ThemeContext';
import { getAppDisplayName, getBrandMonogram } from '@/lib/branding';
import { getThemeImageSrc, DEFAULT_LOGO_PATH } from '@/lib/theme-images';
import { getApiUrl } from '@/lib/api';

type DashboardHeaderProps = {
  user: { role: string; firstName?: string; lastName?: string; profilePhotoUrl?: string | null };
  notifCount: number;
  onLogout: () => void;
  rightSlot?: ReactNode;
};

/**
 * Barre supérieure des dashboards : titre global, utilisateur, notifications.
 */
export function DashboardHeader({ user, notifCount, onLogout, rightSlot }: DashboardHeaderProps) {
  const { settings } = useTheme();
  const brand = getAppDisplayName(settings);
  const monogram = getBrandMonogram(brand);
  const headerLogoSrc = getThemeImageSrc(settings?.logoUrl?.trim() || DEFAULT_LOGO_PATH);

  return (
    <header
      className="h-14 flex items-center justify-between gap-4 px-6 border-b bg-[var(--color-topbar)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">
            <ThemeImage
              src={headerLogoSrc || undefined}
              alt=""
              className="h-8 w-8 object-contain p-0.5"
              placeholderClassName="h-8 w-8 rounded-lg bg-[var(--color-primary-soft)] animate-pulse"
              fallback={
                <span className="flex h-8 w-8 items-center justify-center text-[11px] font-bold text-[var(--color-primary)]">
                  {monogram}
                </span>
              }
            />
          </span>
          <span className="hidden sm:flex flex-col">
            <span className="text-sm font-semibold text-[var(--foreground)] truncate max-w-[200px]">{brand}</span>
            <span className="text-xs text-[var(--foreground-muted)]">Tableaux de bord</span>
          </span>
        </Link>
        {rightSlot && <div className="hidden md:flex items-center gap-2">{rightSlot}</div>}
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/notifications"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <Icon name="bell" className="h-4 w-4" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/profil"
            className="hidden sm:flex items-center gap-2 rounded-lg pr-1 hover:bg-[var(--surface-secondary)] transition-colors"
            title="Mon profil"
          >
            {user.profilePhotoUrl ? (
              <img
                src={`${getApiUrl()}${user.profilePhotoUrl}`}
                alt=""
                className="h-9 w-9 rounded-full object-cover border border-[var(--color-border)] shrink-0"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)] shrink-0">
                {(user.firstName?.[0] ?? '?').toUpperCase()}
                {(user.lastName?.[0] ?? user.firstName?.[1] ?? '').toUpperCase()}
              </span>
            )}
            <div className="hidden sm:flex flex-col items-start min-w-0">
              <span className="text-xs font-medium text-[var(--foreground)] truncate max-w-[140px]">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Utilisateur'}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
                {user.role}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            <Icon name="logout" className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

