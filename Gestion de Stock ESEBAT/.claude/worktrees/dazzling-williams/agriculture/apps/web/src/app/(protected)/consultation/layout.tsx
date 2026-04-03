'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useRequireRole } from '@/hooks/use-require-role';
import { MapPin, Sprout, Sliders, Bell, LayoutDashboard } from 'lucide-react';

const AGRONOMIST_NAV = [
  { href: '/consultation/regions', label: 'Régions', icon: MapPin },
  { href: '/consultation/crops', label: 'Cultures', icon: Sprout },
  { href: '/consultation/exigences', label: 'Exigences agronomiques', icon: Sliders },
];

const TECHNICIAN_NAV = [
  { href: '/consultation/regions', label: 'Régions', icon: MapPin },
  { href: '/consultation/regles-alertes', label: 'Règles alertes', icon: Bell },
];

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  useRequireRole(['AGRONOMIST', 'TECHNICIAN']);

  const nav = currentUser?.role === 'AGRONOMIST' ? AGRONOMIST_NAV : TECHNICIAN_NAV;

  if (!currentUser || !['AGRONOMIST', 'TECHNICIAN'].includes(currentUser.role)) {
    return null;
  }

  return (
    <div className="flex gap-8 -mx-8 -mb-8">
      <aside className="w-52 shrink-0 pl-8">
        <div className="bg-white rounded-2xl border border-stone-100 p-4 sticky top-24">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 px-2">
            Consultation
          </h3>
          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition mb-2 ${
                pathname === '/dashboard' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Tableau de bord
            </Link>
            {nav.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition ${
                    isActive ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <main className="flex-1 min-w-0 pr-8">{children}</main>
    </div>
  );
}
