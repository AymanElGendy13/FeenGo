import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import { resolveLocale, type Locale } from '@/i18n/locale';
import { setLocale } from '@/i18n/set-locale';
import { PlaceholderHome } from './PlaceholderHome';

// The server action sets a cookie on the server; here it is only observed.
vi.mock('@/i18n/set-locale', () => ({ setLocale: vi.fn(async () => undefined) }));

const messages = { en, ar } as const;

// Renders the page as the server does for a request with this cookie value.
function renderForCookie(cookieValue: string | undefined) {
  const locale: Locale = resolveLocale(cookieValue);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <PlaceholderHome />
    </NextIntlClientProvider>,
  );
}

describe('PlaceholderHome', () => {
  beforeEach(() => {
    vi.mocked(setLocale).mockClear();
  });

  it('C-03 the placeholder shows English by default and Arabic when chosen', () => {
    const { unmount } = renderForCookie(undefined);
    expect(screen.getByRole('heading', { level: 1, name: 'FeenGo Partner' })).toBeInTheDocument();
    expect(
      screen.getByText('Welcome. Places to eat, go out and celebrate are coming soon.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'العربية' })).not.toBeChecked();
    unmount();

    renderForCookie('ar');
    expect(screen.getByRole('heading', { level: 1, name: 'FeenGo للشركاء' })).toBeInTheDocument();
    expect(
      screen.getByText('أهلًا وسهلًا. أماكن للأكل والسهر والاحتفال قريبًا.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'اللغة' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'العربية' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
  });

  it('C-03 each language name is marked with its own language', () => {
    renderForCookie(undefined);
    expect(screen.getByText('English')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('العربية')).toHaveAttribute('lang', 'ar');
  });

  it('C-03 choosing a language saves it, and choosing the current one does nothing', () => {
    renderForCookie(undefined);

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(setLocale).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'العربية' }));
    expect(setLocale).toHaveBeenCalledExactlyOnceWith('ar');
    expect(screen.getByRole('radio', { name: 'العربية' })).toBeChecked();
  });
});
