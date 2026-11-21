// next-intl request configuration, without locale prefixes in the URL
// (docs/ARCHITECTURE.md section 12). The language comes from the cookie only.
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { localeCookieName, resolveLocale, type Locale } from './locale';
import type { Messages } from './messages';

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  en: () => import('../../messages/en.json'),
  ar: () => import('../../messages/ar.json'),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value);
  const messages = (await loaders[locale]()).default;
  return { locale, messages };
});
