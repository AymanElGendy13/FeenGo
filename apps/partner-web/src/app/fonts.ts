// IBM Plex Sans Arabic from the design tokens package, served by this app with
// next/font/local, so no request goes to Google at run time (docs/ARCHITECTURE.md
// section 12). next/font needs literal paths relative to this file.
//
// next/font preloads per call, not per face, so there are two calls (next/font needs literal values, hence the repeated declaration): Regular, the
// body text, is preloaded; Medium and Bold load when the page first uses them.
// Both declare the same family name, the one in the token (--font-family-base),
// so the token's font stack picks up every weight. The variable from the first
// call adds next/font's size-adjusted fallback face; globals.css puts it in front
// of the token's stack.
import localFont from 'next/font/local';

export const plexSansArabic = localFont({
  src: '../../../../packages/design-tokens/fonts/IBMPlexSansArabic-Regular.ttf',
  weight: '400',
  style: 'normal',
  declarations: [{ prop: 'font-family', value: "'IBM Plex Sans Arabic'" }],
  variable: '--font-plex-sans-arabic',
  display: 'swap',
});

// Not exported for a class: its faces are registered by importing this module.
export const plexSansArabicMediumBold = localFont({
  src: [
    {
      path: '../../../../packages/design-tokens/fonts/IBMPlexSansArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../../packages/design-tokens/fonts/IBMPlexSansArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  declarations: [{ prop: 'font-family', value: "'IBM Plex Sans Arabic'" }],
  display: 'swap',
  preload: false,
});
