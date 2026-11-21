// Types next-intl's keys and locales, so a missing message key fails the type check.
import type { Locale } from './locale';
import type { Messages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
