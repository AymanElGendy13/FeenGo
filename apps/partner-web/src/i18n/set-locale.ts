'use server';

// Saves the chosen language in a cookie. A server action, because only the
// server may set the cookie (it is HttpOnly). Setting a cookie in a server
// action makes Next.js render the page again in the same response, so the text
// and <html lang dir> change together, without a reload and without a flash.
import { cookies } from 'next/headers';
import { isLocale, localeCookieMaxAgeSeconds, localeCookieName } from './locale';

export async function setLocale(locale: unknown): Promise<void> {
  // Server actions are public endpoints: accept only a known language.
  if (!isLocale(locale)) {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: localeCookieMaxAgeSeconds,
  });
}
