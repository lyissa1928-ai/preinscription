'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { getSidebarConfigForPath } from '@/config/sidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { getAppDisplayName } from '@/lib/branding';

type AppShellProps = {
  user: { role: string; firstName?: string; lastName?: string; profilePhotoUrl?: string | null };
  notifCount: number;
  onLogout: () => void;
  children: React.ReactNode;
};

/**
 * Shell applicatif unique : sidebar + header pour tous les dashboards.
 * Design ERP homogène avec fond analytique (style Power BI).
 */
export function AppShell({ user, notifCount, onLogout, children }: AppShellProps) {
  const pathname = usePathname();
  const config = getSidebarConfigForPath(pathname, user.role);
  const { settings } = useTheme();
  const sidebarTitle = getAppDisplayName(settings);

  return (
    <div className="min-h-screen flex bg-[var(--background)]">
      <Sidebar config={config} title={sidebarTitle} user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader user={user} notifCount={notifCount} onLogout={onLogout} />
        <main className="flex-1 p-6 text-[var(--foreground)] overflow-auto transition-opacity duration-200 bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}

