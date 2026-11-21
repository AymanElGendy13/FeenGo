import { expect, test } from '@playwright/test';
import { waitForFonts } from './support';

test.describe('fonts', () => {
  test('S0 only the regular font is preloaded, and every weight is IBM Plex Sans Arabic', async ({
    page,
  }) => {
    const response = await page.goto('/');
    const preloads = (response?.headers()['link'] ?? '')
      .split(',')
      .filter((entry) => entry.includes('rel=preload') && entry.includes('as="font"'));
    expect(preloads).toHaveLength(1);
    expect(preloads[0]).toContain('IBMPlexSansArabic_Regular');

    // Medium (the language label) and Bold (the app name) load when first used.
    await waitForFonts(page);
    const weights = await page.evaluate(() =>
      [...document.fonts]
        .filter((face) => face.status === 'loaded' && face.family.includes('IBM Plex Sans Arabic'))
        .map((face) => face.weight)
        .sort(),
    );
    expect(weights).toEqual(['400', '500', '700']);
  });
});
