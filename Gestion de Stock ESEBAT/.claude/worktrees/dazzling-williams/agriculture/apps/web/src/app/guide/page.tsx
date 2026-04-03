'use client';

import React from 'react';
import Link from 'next/link';
import {
  Leaf,
  ArrowLeft,
  MapPin,
  BarChart3,
  Thermometer,
  Shield,
  Cpu,
  Users,
  Sprout,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const SECTIONS = [
  {
    id: 'parcelles',
    icon: MapPin,
    title: 'Gestion des parcelles',
    desc: 'Créez et gérez vos parcelles agricoles avec précision. Géolocalisation, carte interactive, types de sol et cultures — tout centralisé pour une vue d\'ensemble optimale de vos exploitations au Sénégal.',
    color: 'from-emerald-500 to-emerald-700',
    bgColor: 'bg-emerald-500/10',
    delay: 0,
  },
  {
    id: 'recommandations',
    icon: BarChart3,
    title: 'Recommandations culturales intelligentes',
    desc: 'Des recommandations personnalisées selon votre sol, la météo locale et les spécificités de chaque région du Sénégal. Choisissez les meilleures cultures et optimisez vos rendements.',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500/10',
    delay: 100,
  },
  {
    id: 'meteo',
    icon: Thermometer,
    title: 'Météo & données en temps réel',
    desc: 'Prévisions météo détaillées et historique climatique pour planifier vos semis, irrigations et récoltes. Données adaptées aux régions agricoles sénégalaises.',
    color: 'from-sky-500 to-sky-600',
    bgColor: 'bg-sky-500/10',
    delay: 200,
  },
  {
    id: 'alertes',
    icon: Shield,
    title: 'Alertes en temps réel',
    desc: 'Recevez des notifications sur les risques : sécheresse, pluies intenses, pH hors norme, humidité faible. Protégez vos cultures avant qu\'il ne soit trop tard.',
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-500/10',
    delay: 300,
  },
  {
    id: 'capteurs',
    icon: Cpu,
    title: 'Capteurs IoT & agriculture connectée',
    desc: 'Connectez des capteurs de sol (pH, humidité, salinité) et des stations météo. Les données alimentent automatiquement vos parcelles pour des décisions éclairées.',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-500/10',
    delay: 400,
  },
  {
    id: 'roles',
    icon: Users,
    title: 'Une plateforme pour tous les acteurs',
    desc: 'Agriculteurs, agronomes, techniciens et administrateurs — chacun dispose d\'un espace adapté à son rôle. Collaboration et suivi simplifiés pour une agriculture sénégalaise performante.',
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-500/10',
    delay: 500,
  },
];

export default function GuideVisiteurPage() {
  const [visibleSections, setVisibleSections] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-emerald-50/30">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-white/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-emerald-600 transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-stone-800">Agriculture Intelligente</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/auth/login"
              className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
            >
              Connexion
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-700 text-sm font-medium mb-6 border border-emerald-500/25">
            <Sprout className="w-4 h-4" />
            Guide du visiteur
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-900 mb-6 leading-tight">
            Découvrez ce que la plateforme fait pour vous
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            Une solution complète dédiée à l&apos;agriculture intelligente au Sénégal. Gérez, analysez et optimisez vos exploitations.
          </p>
        </div>

        <div className="space-y-12">
          {SECTIONS.map(({ id, icon: Icon, title, desc, color, bgColor, delay }) => (
            <section
              key={id}
              id={id}
              className={`transition-all duration-700 ${
                visibleSections.has(id)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: visibleSections.has(id) ? `${delay}ms` : '0ms' }}
            >
              <div className="group flex flex-col md:flex-row gap-6 p-6 md:p-8 rounded-3xl bg-white border border-stone-100 shadow-sm hover:shadow-xl hover:border-emerald-100/80 transition-all duration-300">
                <div
                  className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-stone-900 mb-3 flex items-center gap-2">
                    {title}
                    <ChevronRight className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
                  </h2>
                  <p className="text-stone-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-center shadow-xl">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-bold mb-3">Prêt à optimiser votre agriculture ?</h2>
          <p className="text-emerald-100 mb-6 max-w-xl mx-auto">
            Rejoignez la plateforme et bénéficiez de tous ces outils pour une agriculture plus productive et durable au Sénégal.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 font-semibold rounded-2xl hover:bg-emerald-50 transition shadow-lg"
          >
            Accéder à la plateforme
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
