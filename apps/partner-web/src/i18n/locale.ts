// The two languages of the partner dashboard and the rule for choosing one
// (docs/ARCHITECTURE.md section 12). Safe to import from server and client code.

export const locales = ['en', 'ar'] as const;

export type Locale = (typeof locales)[number];

/** English is the default language (docs/DECISIONS.md, 2026-11-18). */
export const defaultLocale: Locale = 'en';

/**
 * The cookie that keeps the chosen language. It is set only by the server
 * (`setLocale`), so it is HttpOnly. `__Host-` stops a subdomain from setting it,
 * and needs `Secure` and `Path=/`; browsers accept Secure cookies from
 * http://localhost, so local development and the tests work too.
 */
export const localeCookieName = '__Host-feengo_locale';

/** One year: a language choice is a long-lived preference. */
export const localeCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/**
 * The language to show for a stored cookie value. English unless the cookie
 * says Arabic: a missing, empty or unknown value falls back to the default.
 * The browser's language is deliberately not consulted (see the open
 * first-visit question in docs/design/s0/placeholder-home.md).
 */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return isLocale(cookieValue) ? cookieValue : defaultLocale;
}

export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
