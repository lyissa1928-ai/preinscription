import Link from 'next/link';
import { Leaf, Shield, BarChart3, MapPin, Thermometer } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { HeroSenegal } from '@/components/home/HeroSenegal';

export default async function HomePage() {
  const t = await getTranslations('HomePage');

  const features = [
    { icon: MapPin, key: 'parcels', color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-600' },
    { icon: BarChart3, key: 'recommendations', color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-600' },
    { icon: Thermometer, key: 'weather', color: 'from-sky-500/20 to-sky-600/10', iconColor: 'text-sky-600' },
    { icon: Shield, key: 'alerts', color: 'from-rose-500/20 to-rose-600/10', iconColor: 'text-rose-600' },
  ];

  return (
    <main className="min-h-screen relative overflow-hidden bg-stone-50/50">
      {/* Fond élégant - motif géométrique subtil */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(245,158,11,0.06),transparent)]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_50%_60%_at_0%_80%,rgba(16,185,129,0.05),transparent)]" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239ca3af%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />

      <header className="relative border-b border-stone-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-6xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/35 transition-shadow duration-300">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-stone-800 tracking-tight">Agriculture Intelligente</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/auth/login"
              className="px-5 py-2.5 bg-stone-800 text-white font-medium rounded-xl hover:bg-stone-700 transition-colors duration-200 shadow-sm"
            >
              {t('login')}
            </Link>
          </div>
        </div>
      </header>

      <HeroSenegal />

      <section className="relative container mx-auto px-4 py-16 md:py-24 max-w-6xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, key, color, iconColor }) => (
            <div
              key={key}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-xl hover:border-stone-200/80 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}>
                <Icon className={`w-7 h-7 ${iconColor}`} />
              </div>
              <h3 className="font-semibold text-stone-900 mb-2 text-lg">{t(`features.${key}.title`)}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{t(`features.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-stone-200/60 mt-20 py-12 bg-white/60 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-stone-500 text-sm max-w-6xl">
          {t('footer')}
        </div>
      </footer>
    </main>
  );
}
