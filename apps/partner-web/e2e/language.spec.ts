import { expect, test } from '@playwright/test';
import { localeCookieName } from './support';

test.describe('language', () => {
  test('C-03 the page sets lang and dir from the chosen language', async ({ page, context }) => {
    // First visit: English, from the very first byte the server sends.
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
    const firstHtml = (await response?.text()) ?? '';
    expect(firstHtml).toMatch(/<html[^>]*\blang="en"/);
    expect(firstHtml).toMatch(/<html[^>]*\bdir="ltr"/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page).toHaveTitle('FeenGo Partner');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo Partner');
    await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();

    // Choosing Arabic switches text and direction together, without a reload.
    await page.evaluate(() => {
      (window as unknown as { notReloaded: boolean }).notReloaded = true;
    });
    const arabic = page.getByRole('radio', { name: 'العربية' });
    await arabic.check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo للشركاء');
    await expect(page.getByRole('group', { name: 'اللغة' })).toBeVisible();
    await expect(page).toHaveTitle('FeenGo للشركاء');
    await expect(arabic).toBeChecked();
    await expect(arabic).toBeFocused();
    expect(
      await page.evaluate(() => (window as unknown as { notReloaded?: boolean }).notReloaded),
    ).toBe(true);

    // The choice is kept in a cookie that page scripts cannot read.
    const cookie = (await context.cookies()).find((c) => c.name === localeCookieName);
    expect(cookie).toMatchObject({
      value: 'ar',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    });
    expect(await page.evaluate(() => document.cookie)).not.toContain(localeCookieName);

    // The next visit is Arabic from the first byte, so it never flashes left to right.
    const again = await page.request.get('/');
    const againHtml = await again.text();
    expect(againHtml).toMatch(/<html[^>]*\blang="ar"/);
    expect(againHtml).toMatch(/<html[^>]*\bdir="rtl"/);
    expect(againHtml).toContain('FeenGo للشركاء');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Keyboard: arrow keys move through the radio group and switch back to English.
    await page.getByRole('radio', { name: 'العربية' }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'English' })).toBeFocused();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo Partner');
  });

  test('C-03 an unknown language in the cookie shows English', async ({ request }) => {
    const response = await request.get('/', { headers: { cookie: `${localeCookieName}=fr` } });
    const html = await response.text();
    expect(html).toMatch(/<html[^>]*\blang="en"/);
    expect(html).toMatch(/<html[^>]*\bdir="ltr"/);
    expect(html).toContain('FeenGo Partner');
  });
});
