'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type SidebarConfig,
  type SidebarItem,
  findActiveSidebarSectionId,
  getSidebarSectionId,
  isSidebarItemActive,
} from '@/config/sidebar';
import { Icon } from '@/components/ui/icons';
import { ThemeImage } from '@/components/ui/theme-image';
import { useTheme } from '@/contexts/ThemeContext';
import { getThemeImageSrc, DEFAULT_LOGO_PATH } from '@/lib/theme-images';
import { DEFAULT_APP_NAME, getBrandMonogram } from '@/lib/branding';
import { getApiUrl } from '@/lib/api';

const PLATFORM_VERSION = '1.0';
const SECTION_EXPANDED_STORAGE_KEY = 'gs-erp-sidebar-section-expanded';

type SidebarUser = {
  role?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string | null;
};

type SidebarProps = {
  config: SidebarConfig;
  title?: string;
  user?: SidebarUser | null;
};

function loadSectionExpandedFromStorage(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SECTION_EXPANDED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function Sidebar({ config, title = DEFAULT_APP_NAME, user }: SidebarProps) {
  const pathname = usePathname();
  const { settings } = useTheme();
  const displayTitle = title?.trim() || DEFAULT_APP_NAME;
  const monogram = getBrandMonogram(displayTitle);
  const logoSrc = getThemeImageSrc(settings?.logoUrl?.trim() || DEFAULT_LOGO_PATH);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    setSectionExpanded(loadSectionExpandedFromStorage());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || typeof window === 'undefined') return;
    try {
      localStorage.setItem(SECTION_EXPANDED_STORAGE_KEY, JSON.stringify(sectionExpanded));
    } catch {
      /* quota / private mode */
    }
  }, [sectionExpanded, storageReady]);

  useEffect(() => {
    const activeId = findActiveSidebarSectionId(config, pathname);
    if (!activeId) return;
    setSectionExpanded((prev) => {
      if (prev[activeId] !== false) return prev;
      return { ...prev, [activeId]: true };
    });
  }, [pathname, config]);

  const toggleSection = useCallback((sectionId: string, hasActiveItem: boolean) => {
    if (hasActiveItem) return;
    setSectionExpanded((prev) => {
      const isOpen = prev[sectionId] !== false;
      return { ...prev, [sectionId]: !isOpen };
    });
  }, []);

  const displayName = user?.firstName
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Utilisateur'
    : 'Utilisateur';
  const roleLabel = user?.role ?? '—';

  const renderItemRow = useCallback(
    (item: SidebarItem, sectionKey: string) => {
      const active = isSidebarItemActive(pathname, item);
      return (
        <li key={`${sectionKey}-${item.href}`}>
          <Link
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
              active
                ? 'font-medium bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--foreground)] hover:bg-slate-100'
            }`}
            style={
              active
                ? {
                    backgroundColor: 'var(--color-primary-soft)',
                    color: 'var(--color-primary)',
                  }
                : undefined
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0 [&>svg]:w-5 [&>svg]:h-5" aria-hidden>
              <Icon name={item.icon ?? 'arrow-right'} />
            </span>
            {!sidebarCollapsed && (
              <>
                <span className="truncate flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium flex items-center justify-center bg-[var(--color-danger)] text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        </li>
      );
    },
    [pathname, sidebarCollapsed],
  );

  return (
    <aside
      data-erp-sidebar
      className={`flex-shrink-0 flex flex-col bg-[var(--color-sidebar)] border-r transition-[width] duration-200 ease-out ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
      style={{ borderColor: 'var(--color-border-subtle)' }}
    >
      <div
        className={`flex items-center border-b min-h-[4rem] ${sidebarCollapsed ? 'justify-center p-2' : 'gap-2 p-4'}`}
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        {sidebarCollapsed ? (
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-primary-soft)] text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)] transition"
            title={displayTitle}
          >
            <ThemeImage
              src={logoSrc || undefined}
              alt=""
              className="h-8 w-8 object-contain p-0.5"
              placeholderClassName="h-8 w-8 rounded-lg bg-slate-200 animate-pulse"
              fallback={
                <span className="text-[10px] font-bold text-[var(--color-primary)]">{monogram}</span>
              }
            />
          </Link>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="font-semibold text-[var(--foreground)] hover:opacity-90 transition flex items-center gap-2 min-w-0 flex-1"
            >
              <ThemeImage
                src={logoSrc || undefined}
                alt=""
                className="h-9 max-w-[180px] object-contain object-left"
                placeholderClassName="bg-slate-200 animate-pulse min-h-[36px] min-w-[140px] rounded"
                fallback={
                  <span className="flex min-h-[36px] min-w-[140px] max-w-[180px] items-center gap-2 truncate">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)]">
                      {monogram}
                    </span>
                    <span className="truncate">{displayTitle}</span>
                  </span>
                }
              />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              aria-label={sidebarCollapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
            >
              <Icon name="bars-3" className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Navigation principale">
        {config.map((section, sectionIndex) => {
          const sectionId = getSidebarSectionId(section, sectionIndex);
          const hasActiveItem = section.items.some((item) => isSidebarItemActive(pathname, item));
          const collapsible = section.collapsible !== false;
          const isOpen = !collapsible || hasActiveItem || sectionExpanded[sectionId] !== false;

          if (sidebarCollapsed) {
            return (
              <div key={sectionId} className="mb-4">
                <ul className="space-y-0.5">{section.items.map((item) => renderItemRow(item, sectionId))}</ul>
              </div>
            );
          }

          if (!collapsible) {
            return (
              <div key={sectionId} className="mb-5">
                <div className="px-3 py-1.5">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">{section.title}</h3>
                  {section.subtitle ? (
                    <p className="mt-0.5 text-[10px] leading-snug text-[var(--foreground-muted)] opacity-90 normal-case font-normal tracking-normal">
                      {section.subtitle}
                    </p>
                  ) : null}
                </div>
                <ul className="mt-1 space-y-0.5">{section.items.map((item) => renderItemRow(item, sectionId))}</ul>
              </div>
            );
          }

          return (
            <div key={sectionId} className="mb-2 rounded-xl border border-transparent hover:border-[var(--color-border-subtle)] transition-colors">
              <button
                type="button"
                className="w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50/80 transition"
                onClick={() => toggleSection(sectionId, hasActiveItem)}
                aria-expanded={isOpen}
                aria-controls={`nav-section-${sectionId}`}
                disabled={hasActiveItem}
                title={hasActiveItem ? 'Section de la page courante' : undefined}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                    {section.title}
                  </span>
                  {section.subtitle ? (
                    <span className="mt-0.5 block text-[10px] leading-snug text-[var(--foreground-muted)] opacity-90 normal-case font-normal tracking-normal">
                      {section.subtitle}
                    </span>
                  ) : null}
                </span>
                <span className="flex-shrink-0 text-[var(--foreground-muted)] mt-0.5" aria-hidden>
                  <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} className="w-4 h-4" />
                </span>
              </button>
              {isOpen ? (
                <ul id={`nav-section-${sectionId}`} className="mt-0.5 mb-3 space-y-0.5 pl-0.5">
                  {section.items.map((item) => renderItemRow(item, sectionId))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t mt-auto" style={{ borderColor: 'var(--color-border-subtle)' }}>
        {sidebarCollapsed ? (
          <Link
            href="/dashboard/profil"
            className="flex items-center justify-center p-2 rounded-xl text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)] transition"
            title="Profil"
          >
            <Icon name="user" className="w-5 h-5" />
          </Link>
        ) : (
          <>
            <Link href="/dashboard/profil" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition">
              {user?.profilePhotoUrl ? (
                <img
                  src={`${getApiUrl()}${user.profilePhotoUrl}`}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover border border-[var(--color-border)] shrink-0"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary)] shrink-0">
                  {(user?.firstName?.[0] ?? '?').toUpperCase()}
                  {(user?.lastName?.[0] ?? '').toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--foreground)] truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-[var(--foreground-muted)] truncate" title={roleLabel}>
                  {roleLabel}
                </p>
              </div>
            </Link>
            <div className="mt-2 flex flex-col gap-0.5">
              <Link
                href="/dashboard/profil"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)] transition"
              >
                <Icon name="user" className="w-4 h-4" />
                Mon profil
              </Link>
              <Link
                href={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? '/dashboard/admin/settings/appearance' : '/dashboard/profil'}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--foreground-muted)] hover:bg-slate-100 hover:text-[var(--foreground)] transition"
              >
                <Icon name="cog" className="w-4 h-4" />
                Paramètres
              </Link>
            </div>
            <p className="mt-2 px-3 text-[10px] text-[var(--foreground-muted)]">v{PLATFORM_VERSION}</p>
          </>
        )}
      </div>
    </aside>
  );
}
