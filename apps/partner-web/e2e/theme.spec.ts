import { expect, test } from '@playwright/test';
import { chooseLocale, heights, rgb, setTextSize, widths } from './support';

test.describe('theme and text size', () => {
  test('Q-04 the page follows the system light and dark setting', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    const name = page.getByRole('heading', { level: 1 });
    const selected = page.locator('label', { has: page.getByRole('radio', { checked: true }) });

    await expect(html).toHaveCSS('background-color', rgb('light', 'surface'));
    await expect(html).toHaveCSS('color', rgb('light', 'onSurface'));
    await expect(name).toHaveCSS('color', rgb('light', 'brandText'));
    await expect(selected).toHaveCSS('background-color', rgb('light', 'selected'));
    await expect(selected).toHaveCSS('color', rgb('light', 'onSelected'));

    // A live switch while the page is open, as when the system changes at sunset.
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(html).toHaveCSS('background-color', rgb('dark', 'surface'));
    await expect(html).toHaveCSS('color', rgb('dark', 'onSurface'));
    await expect(name).toHaveCSS('color', rgb('dark', 'brandText'));
    await expect(selected).toHaveCSS('background-color', rgb('dark', 'selected'));
    await expect(selected).toHaveCSS('color', rgb('dark', 'onSelected'));

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html).toHaveCSS('background-color', rgb('light', 'surface'));
  });

  test('Q-04 keyboard focus shows the focus ring in both themes', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto('/');
      await page.keyboard.press('Tab');
      const english = page.getByRole('radio', { name: 'English' });
      await expect(english).toBeFocused();
      const option = page.locator('label', { has: english });
      // The ring is the outer shadow in the focus colour, after a gap in the surface colour.
      await expect(option).toHaveCSS(
        'box-shadow',
        `${rgb(theme, 'surface')} 0px 0px 0px 2px, ${rgb(theme, 'focus')} 0px 0px 0px 4px`,
      );
    }
  });

  for (const locale of ['en', 'ar'] as const) {
    test(`Q-04 nothing is cut off at 360 px wide or with text at 200% (${locale})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: widths.phone, height: heights.phone });
      await chooseLocale(page, locale);
      await page.reload();

      const overflow = () =>
        page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const boxes = async () => {
        // Each option's label, its whole visible box, is the touch target.
        const options = page.locator('label', { has: page.getByRole('radio') });
        const first = await options.nth(0).boundingBox();
        const second = await options.nth(1).boundingBox();
        if (!first || !second) throw new Error('A language option is not rendered');
        return { first, second };
      };

      // Default text size: the two options sit side by side, each at least 48 px tall.
      expect(await overflow()).toBeLessThanOrEqual(0);
      let { first, second } = await boxes();
      expect(Math.round(first.y)).toBe(Math.round(second.y));
      expect(first.height).toBeGreaterThanOrEqual(48);

      // Text at 200%: the control becomes a vertical list, still without sideways scrolling.
      await setTextSize(page, 200);
      ({ first, second } = await boxes());
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
      expect(first.height).toBeGreaterThanOrEqual(48);
      expect(await overflow()).toBeLessThanOrEqual(0);
    });
  }
});
