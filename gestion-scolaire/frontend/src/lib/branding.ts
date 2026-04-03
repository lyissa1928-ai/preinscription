/**
 * Identité plateforme : nom et monogramme par défaut.
 * Le nom et les logos uploadés viennent de GET /appearance/settings (ThemeContext).
 */

export const DEFAULT_APP_NAME = 'Gestion Scolaire';

/** Nom affiché (admin → Identité & apparence, ou défaut). */
export function getAppDisplayName(settings: { appName?: string | null } | null | undefined): string {
  return settings?.appName?.trim() || DEFAULT_APP_NAME;
}

/**
 * Initiales pour le badge quand aucune image n’est disponible (remplace un « GS » figé).
 * Ex. « Gestion Scolaire » → GS, « Université de Dakar » → UD
 */
export function getBrandMonogram(appName: string): string {
  const t = (appName || DEFAULT_APP_NAME).trim();
  if (!t) return '?';
  const words = t.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿà-ÿ0-9]/.test(w));
  if (words.length >= 2) {
    const a = words[0].match(/[A-Za-zÀ-ÿà-ÿ0-9]/)?.[0] ?? words[0][0];
    const b = words[1].match(/[A-Za-zÀ-ÿà-ÿ0-9]/)?.[0] ?? words[1][0];
    return `${a}${b}`.toUpperCase();
  }
  const compact = t.replace(/[^A-Za-zÀ-ÿà-ÿ0-9]/g, '');
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}
