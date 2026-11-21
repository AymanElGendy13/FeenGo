import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import { resolveLocale, type Locale } from '@/i18n/locale';
import { NotFoundContent } from './NotFoundContent';

vi.mock('@/i18n/set-locale', () => ({ setLocale: vi.fn(async () => undefined) }));

const messages = { en, ar } as const;

function renderForCookie(cookieValue: string | undefined) {
  const locale: Locale = resolveLocale(cookieValue);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <NotFoundContent />
    </NextIntlClientProvider>,
  );
}

describe('NotFoundContent', () => {
  it('C-03 the not-found content shows English by default and Arabic when chosen', () => {
    const { unmount } = renderForCookie(undefined);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText("This page doesn't exist or has moved.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    unmount();

    renderForCookie('ar');
    expect(
      screen.getByRole('heading', { level: 2, name: 'الصفحة غير موجودة' }),
    ).toBeInTheDocument();
    expect(screen.getByText('هذه الصفحة غير موجودة أو تم نقلها.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى الصفحة الرئيسية' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('radio', { name: 'العربية' })).toBeChecked();
  });
});
