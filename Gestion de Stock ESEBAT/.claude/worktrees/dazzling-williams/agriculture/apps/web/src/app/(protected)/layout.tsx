'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Leaf,
  LayoutDashboard,
  Warehouse,
  Map,
  Bell,
  Settings,
  BookOpen,
  LogOut,
  ChevronRight,
  User,
  Radio,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRequireAuth, useAuth, getRoleLabel } from '@/hooks/use-auth';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const ALL_NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/farm', labelKey: 'farm', icon: Warehouse, roles: ['FARMER'] },
  { href: '/parcels', labelKey: 'parcels', icon: Map, roles: ['FARMER'] },
  { href: '/alerts', labelKey: 'alerts', icon: Bell, roles: ['FARMER'] },
  { href: '/consultation/regions', labelKey: 'consultation', icon: BookOpen, roles: ['AGRONOMIST', 'TECHNICIAN'] },
  { href: '/capteurs', labelKey: 'sensors', icon: Radio, roles: ['ADMIN', 'TECHNICIAN'] },
  { href: '/admin', labelKey: 'admin', icon: Settings, roles: ['ADMIN'] },
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRequireAuth();
  const { logout, currentUser } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('Nav');

  return (
    <div className="min-h-screen flex bg-stone-50">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-stone-800">{t('brand')}</span>
              <span className="block text-xs text-stone-500">{t('subtitle')}</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {ALL_NAV_ITEMS.filter((item) => !item.roles || (currentUser && item.roles.includes(currentUser.role)))
            .map(({ href, labelKey, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t(labelKey)}
                <ChevronRight className={`w-4 h-4 ml-auto ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-stone-100 space-y-3">
          {currentUser && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">{t('profile')}</p>
                <p className="font-medium text-stone-800">{getRoleLabel(currentUser.role)}</p>
                <p className="text-xs text-stone-600 truncate mt-0.5" title={currentUser.email}>
                  {currentUser.email}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="px-2">
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-stone-600 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut className="w-5 h-5" />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
