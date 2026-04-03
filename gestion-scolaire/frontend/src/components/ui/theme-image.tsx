'use client';

import { useState } from 'react';

type ThemeImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Afficché pendant le chargement (placeholder) */
  placeholderClassName?: string;
  /** Afficché en cas d’erreur de chargement */
  fallback?: React.ReactNode;
};

/**
 * Image du thème (logo, favicon) avec placeholder pendant le chargement
 * et fallback en cas d’erreur, pour éviter emplacement vide ou icône cassée.
 */
export function ThemeImage({
  src,
  alt,
  className = '',
  placeholderClassName = 'bg-slate-200 animate-pulse',
  fallback = null,
}: ThemeImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const effectiveSrc = !src
    ? ''
    : src.startsWith('http') || src.startsWith('blob:')
      ? src
      : src.startsWith('/')
        ? src
        : `/${src}`;

  if (!effectiveSrc) {
    return <>{fallback}</>;
  }

  if (error) {
    return <>{fallback}</>;
  }

  return (
    <span className="relative inline-block min-h-[2rem]">
      {!loaded && (
        <span
          className={`absolute inset-0 rounded block min-w-[120px] min-h-[36px] ${placeholderClassName}`}
          aria-hidden
        />
      )}
      <img
        key={effectiveSrc}
        src={effectiveSrc}
        alt={alt}
        className={`max-w-full object-contain object-left ${className}`}
        style={!loaded ? { opacity: 0, position: 'relative' } : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </span>
  );
}
