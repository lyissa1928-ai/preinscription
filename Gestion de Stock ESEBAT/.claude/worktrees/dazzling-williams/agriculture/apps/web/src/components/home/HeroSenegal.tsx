'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Leaf, ArrowRight, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Images agricoles uniquement (Unsplash - agriculture Africa / farming)
const SENEGAL_IMAGES = [
  'https://images.unsplash.com/photo-1580629677996-fded70cdfd4c?w=1920&q=80', // Champs verts
  'https://images.unsplash.com/photo-1567497063796-7952e455a2a6?w=1920&q=80', // Irrigation, plantation bananière
  'https://images.unsplash.com/photo-1768775517205-7f4bc1b3f771?w=1920&q=80', // Labour avec bœufs
  'https://images.unsplash.com/photo-1509110646989-7ca4308edb3e?w=1920&q=80', // Champs verts vue aérienne
  'https://images.unsplash.com/photo-1612286710168-1690328bb8bd?w=1920&q=80', // Prairie agricole
  'https://images.unsplash.com/photo-1618265317491-8b7b2324320e?w=1920&q=80', // Champs vue aérienne
  'https://images.unsplash.com/photo-1741012253890-a62490e7ea3e?w=1920&q=80', // Fèves de café séchage
  'https://images.unsplash.com/photo-1602516818688-715dfc1b77d5?w=1920&q=80', // Champs sous ciel bleu
];

export function HeroSenegal() {
  const t = useTranslations('HomePage');
  const [currentImage, setCurrentImage] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % SENEGAL_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        {SENEGAL_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === currentImage ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Image
              src={src}
              alt="Agriculture Sénégal"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/75" />
          </div>
        ))}
      </div>

      <div className="relative z-10 text-center px-4 py-16">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/25 text-white text-sm font-medium mb-6 border border-white/30 animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          <Leaf className="w-4 h-4" />
          {t('badge')}
        </div>
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-5 max-w-4xl mx-auto leading-[1.1] tracking-tight drop-shadow-lg animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          {t('title')}
        </h1>
        <p
          className="text-lg md:text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow animate-slide-up"
          style={{ animationDelay: '0.6s' }}
        >
          {t('subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <Link
            href="/guide"
            className="group inline-flex items-center gap-3 px-7 py-3.5 bg-white/95 text-emerald-700 font-semibold rounded-2xl hover:bg-white transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <BookOpen className="w-5 h-5" />
            Découvrir la plateforme
          </Link>
          <Link
            href="/auth/login"
            className="group inline-flex items-center gap-3 px-7 py-3.5 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-500 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            {t('cta')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {SENEGAL_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentImage(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === currentImage ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'
            }`}
            aria-label={`Image ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
