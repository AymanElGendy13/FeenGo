// Shared helpers for the partner-web Playwright tests.
import { expect, type Page } from '@playwright/test';
import { colors, type ColorRoles, type ThemeName } from '@feengo/design-tokens/tokens';

export const localeCookieName = '__Host-feengo_locale';

export const widths = { phone: 360, desktop: 1440 } as const;
export const heights = { phone: 800, desktop: 900 } as const;

/**
 * Chooses a language through the page's own control, so the server sets its
 * cookie as it does for a person. Browsers refuse a `__Host-` cookie injected
 * from outside on http://localhost, but accept the one the server sets.
 */
export async function chooseLocale(page: Page, locale: 'en' | 'ar'): Promise<void> {
  await page.goto('/');
  if (locale === 'ar') {
    await page.getByRole('radio', { name: 'العربية' }).check();
  }
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}

/** A token colour as the browser reports it in computed styles. */
export function rgb(theme: ThemeName, role: keyof ColorRoles): string {
  const hex = colors[theme][role].replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Waits until the web fonts are in use, so screenshots show IBM Plex Sans Arabic. */
export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.weight),
  );
  if (loaded.length === 0) {
    throw new Error('No web font was loaded');
  }
}

/** Emulates the browser's text size setting, which scales the root font size. */
export async function setTextSize(page: Page, percent: number): Promise<void> {
  await page.addStyleTag({ content: `html { font-size: ${percent}%; }` });
}
