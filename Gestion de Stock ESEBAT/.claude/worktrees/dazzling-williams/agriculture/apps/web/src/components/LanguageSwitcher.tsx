'use client';

import { Globe } from 'lucide-react';

const LOCALES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
] as const;

export function LanguageSwitcher() {
  const setLocale = (locale: string) => {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-stone-600 hover:bg-white/80 hover:text-stone-800 transition"
        aria-label="Changer de langue"
      >
        <Globe className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Langue</span>
      </button>
      <div className="absolute right-0 top-full mt-1 py-2 bg-white rounded-xl shadow-lg border border-stone-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
        {LOCALES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className="block w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
