import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { colors } from '@feengo/design-tokens/tokens';
import '@feengo/design-tokens/tokens.css';
import { directionOf } from '@/i18n/locale';
import { plexSansArabicMediumBold, plexSansArabicRegular } from './fonts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('partner.app.name') };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The page follows the system's light or dark setting (tokens.css); this lets
  // the browser draw its own parts (scroll bars, the area around the page) to match.
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: colors.light.surface },
    { media: '(prefers-color-scheme: dark)', color: colors.dark.surface },
  ],
};

// The language comes from a cookie, so lang and dir are right in the first byte
// the server sends and the page never flashes in the wrong direction.
export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={directionOf(locale)} className={`${plexSansArabicRegular.variable} ${plexSansArabicMediumBold.variable}`}>
      <body>{children}</body>
    </html>
  );
}
