// IBM Plex Sans Arabic from the design tokens package, served by this app with
// next/font/local, so no request goes to Google at run time (docs/ARCHITECTURE.md
// section 12). next/font needs literal paths relative to this file. It serves
// the family under a generated name and exposes it as the CSS variable below;
// globals.css puts that name in front of the token's font family.
import localFont from 'next/font/local';

export const plexSansArabic = localFont({
  src: [
    {
      path: '../../../../packages/design-tokens/fonts/IBMPlexSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
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
  variable: '--font-plex-sans-arabic',
  display: 'swap',
});
