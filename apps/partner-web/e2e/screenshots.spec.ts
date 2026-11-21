// Screenshots for design review (docs/design/s0/placeholder-home.md, "Review
// checklist"). They are written to screenshots/, which is not committed, and are
// not compared against golden images.
import { test } from '@playwright/test';
import { chooseLocale, heights, setTextSize, waitForFonts, widths } from './support';

const locales = ['en', 'ar'] as const;
const themes = ['light', 'dark'] as const;
const sizes = ['phone', 'desktop'] as const;

for (const locale of locales) {
  for (const theme of themes) {
    test.describe(`screenshots ${locale} ${theme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await chooseLocale(page, locale);
      });

      for (const size of sizes) {
        test(`placeholder home at ${widths[size]} px`, async ({ page }) => {
          await page.setViewportSize({ width: widths[size], height: heights[size] });
          await page.goto('/');
          await waitForFonts(page);
          await page.screenshot({
            path: `screenshots/placeholder-home-${locale}-${theme}-${widths[size]}.png`,
            fullPage: true,
          });
        });
      }

      for (const size of sizes) {
        test(`not-found page at ${widths[size]} px`, async ({ page }) => {
          await page.setViewportSize({ width: widths[size], height: heights[size] });
          await page.goto('/no-such-page');
          await waitForFonts(page);
          await page.screenshot({
            path: `screenshots/not-found-${locale}-${theme}-${widths[size]}.png`,
            fullPage: true,
          });
        });
      }

      test('keyboard focus on the selected option at 360 px', async ({ page }) => {
        await page.setViewportSize({ width: widths.phone, height: heights.phone });
        await page.goto('/');
        await waitForFonts(page);
        // Tab enters the radio group on the checked option, which carries the selected fill.
        await page.keyboard.press('Tab');
        await page.screenshot({
          path: `screenshots/placeholder-home-${locale}-${theme}-360-focus.png`,
          fullPage: true,
        });
      });

      test('text at 200% at 360 px', async ({ page }) => {
        await page.setViewportSize({ width: widths.phone, height: heights.phone });
        await page.goto('/');
        await setTextSize(page, 200);
        await waitForFonts(page);
        await page.screenshot({
          path: `screenshots/placeholder-home-${locale}-${theme}-360-text200.png`,
          fullPage: true,
        });
      });
    });
  }
}
