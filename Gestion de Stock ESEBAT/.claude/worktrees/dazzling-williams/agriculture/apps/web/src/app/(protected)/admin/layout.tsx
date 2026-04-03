'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAdmin } from '@/hooks/use-auth';
import { ArrowLeft, Users, MapPin, Sprout, Sliders, Bell, FileText, LayoutDashboard } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/regions', label: 'Régions', icon: MapPin },
  { href: '/admin/crops', label: 'Cultures', icon: Sprout },
  { href: '/admin/crop-requirements', label: 'Exigences', icon: Sliders },
  { href: '/admin/alert-rules', label: 'Règles alertes', icon: Bell },
  { href: '/admin/audit-logs', label: 'Audit', icon: FileText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRequireAdmin();
  const pathname = usePathname();

  return (
    <div className="flex gap-8 -mx-8 -mb-8">
      <aside className="w-52 shrink-0 pl-8">
        <div className="bg-white rounded-2xl border border-stone-100 p-4 sticky top-24">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 px-2">
            Administration
          </h3>
          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 pt-4 border-t border-stone-100">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-stone-600 hover:bg-stone-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 pr-8">{children}</main>
    </div>
  );
}
