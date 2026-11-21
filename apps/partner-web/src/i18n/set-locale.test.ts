import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = { set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

const { setLocale } = await import('./set-locale');

describe('setLocale', () => {
  beforeEach(() => {
    cookieStore.set.mockClear();
  });

  it('C-03 the language choice is kept in a cookie page scripts cannot read', async () => {
    await setLocale('ar');
    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith('__Host-feengo_locale', 'ar', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 31_536_000,
    });
  });

  it('C-03 an unknown language is never saved', async () => {
    for (const value of ['fr', '', 'ar; Domain=example.com', 42, null, undefined]) {
      await setLocale(value);
    }
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
