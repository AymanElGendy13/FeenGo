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

  test('C-03 a language change that cannot be saved keeps the page and the current language', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    const html = page.locator('html');
    const english = page.getByRole('radio', { name: 'English' });
    const arabic = page.getByRole('radio', { name: 'العربية' });
    const expectEnglishPage = async () => {
      await expect(html).toHaveAttribute('lang', 'en');
      await expect(html).toHaveAttribute('dir', 'ltr');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo Partner');
      await expect(english).toBeChecked();
      await expect(arabic).not.toBeChecked();
    };

    // The save is a server action: a POST with a Next-Action header.
    const isSave = (request: { method(): string; headers(): Record<string, string> }) =>
      request.method() === 'POST' && 'next-action' in request.headers();

    // 1. The server fails.
    await page.route('**/*', (route) =>
      isSave(route.request())
        ? route.fulfill({ status: 500, body: 'Internal Server Error' })
        : route.continue(),
    );
    await arabic.click();
    await expectEnglishPage();

    // 2. The connection drops before the request is answered.
    await page.unroute('**/*');
    await page.route('**/*', (route) =>
      isSave(route.request()) ? route.abort('connectionreset') : route.continue(),
    );
    await arabic.click();
    await expectEnglishPage();

    // 3. The browser is offline.
    await page.unroute('**/*');
    await context.setOffline(true);
    await arabic.click();
    await expectEnglishPage();
    await context.setOffline(false);

    // Nothing was saved, and the page was never replaced by an error page.
    expect((await context.cookies()).find((c) => c.name === localeCookieName)).toBeUndefined();
    await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();

    // Once saving works again, the same control still switches the language.
    await arabic.click();
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('C-03 the not-found page is in the chosen language with the right lang and dir', async ({
    page,
  }) => {
    const titles = (html: string) => html.match(/<title[\s>]/g) ?? [];

    // English, from the first byte, with HTTP status 404 and exactly one title.
    const english = await page.goto('/no-such-page');
    expect(english?.status()).toBe(404);
    const englishHtml = (await english?.text()) ?? '';
    expect(englishHtml).toMatch(/<html[^>]*\blang="en"/);
    expect(englishHtml).toMatch(/<html[^>]*\bdir="ltr"/);
    expect(titles(englishHtml)).toHaveLength(1);
    await expect(page).toHaveTitle('Page not found – FeenGo Partner');
    await expect(page.locator('title')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo Partner');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Page not found');
    await expect(page.getByText("This page doesn't exist or has moved.")).toBeVisible();
    const homeLink = page.getByRole('link', { name: 'Go to the home page' });
    await expect(homeLink).toHaveAttribute('href', '/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    // Switching the language keeps the person on the not-found page.
    await page.getByRole('radio', { name: 'العربية' }).check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(new URL(page.url()).pathname).toBe('/no-such-page');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('الصفحة غير موجودة');

    // Arabic, from the first byte, with no English text apart from the Latin
    // app name and the language option "English", which are never translated.
    const arabic = await page.goto('/another/missing/page');
    expect(arabic?.status()).toBe(404);
    const arabicHtml = (await arabic?.text()) ?? '';
    expect(arabicHtml).toMatch(/<html[^>]*\blang="ar"/);
    expect(arabicHtml).toMatch(/<html[^>]*\bdir="rtl"/);
    expect(titles(arabicHtml)).toHaveLength(1);
    await expect(page).toHaveTitle('الصفحة غير موجودة – FeenGo للشركاء');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('الصفحة غير موجودة');
    await expect(page.getByText('هذه الصفحة غير موجودة أو تم نقلها.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'الذهاب إلى الصفحة الرئيسية' })).toHaveAttribute(
      'href',
      '/',
    );
    const visibleText = await page.locator('body').innerText();
    const withoutUntranslated = visibleText.replaceAll('FeenGo', '').replaceAll('English', '');
    expect(withoutUntranslated).not.toMatch(/[A-Za-z]/);
    const title = await page.title();
    expect(title.replaceAll('FeenGo', '')).not.toMatch(/[A-Za-z]/);

    // The home link leads home, still in Arabic.
    await page.getByRole('link', { name: 'الذهاب إلى الصفحة الرئيسية' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('FeenGo للشركاء');
  });
});
