// IBM Plex Sans Arabic from the design tokens package, served by this app with
// next/font/local, so no request goes to Google at run time (docs/ARCHITECTURE.md
// section 12). next/font needs literal values and paths relative to this file.
//
// Every face declares the family name the token uses, 'IBM Plex Sans Arabic', so
// the token's own stack (--font-family-base) finds them and nothing maps names.
// next/font's size-adjusted fallback face is off: its generated family would sit
// in front of the token's stack, and on machines with Arial it would win.
//
// next/font preloads per call, not per face, so there are two calls: Regular, the
// body text, is preloaded; Medium and Bold load when the page first uses them.
// layout.tsx puts both classes on <html>, which keeps their CSS in the build.
import localFont from 'next/font/local';

export const plexSansArabicRegular = localFont({
  src: '../../../../packages/design-tokens/fonts/IBMPlexSansArabic-Regular.ttf',
  weight: '400',
  style: 'normal',
  declarations: [{ prop: 'font-family', value: "'IBM Plex Sans Arabic'" }],
  variable: '--font-plex-sans-arabic-regular',
  adjustFontFallback: false,
  display: 'swap',
});

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
  variable: '--font-plex-sans-arabic-medium-bold',
  adjustFontFallback: false,
  display: 'swap',
  preload: false,
});
