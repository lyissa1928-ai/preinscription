import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const locales = ['fr', 'en', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];

const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('../../messages/fr.json'),
  en: () => import('../../messages/en.json'),
  es: () => import('../../messages/es.json'),
  it: () => import('../../messages/it.json'),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = localeCookie && locales.includes(localeCookie as Locale) ? (localeCookie as Locale) : 'fr';

  let messages: Record<string, unknown>;
  try {
    messages = (await messageLoaders[locale]()).default;
  } catch {
    messages = (await messageLoaders.fr()).default;
  }

  return {
    locale,
    messages,
  };
});
