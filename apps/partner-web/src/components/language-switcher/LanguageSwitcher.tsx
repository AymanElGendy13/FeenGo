'use client';

// The language control: a native radio group with a visible label
// (docs/design/s0/placeholder-home.md, "Web variant"). Arrow keys move between
// the options, as in any radio group. Choosing one saves the cookie through a
// server action, and Next.js renders the page again with the new text, lang and
// dir in the same response. The DOM nodes stay, so focus stays on the option.
import { useOptimistic, useTransition } from 'react';
import type { Locale } from '@/i18n/locale';
import { setLocale } from '@/i18n/set-locale';
import styles from './LanguageSwitcher.module.css';

export interface LanguageOption {
  value: Locale;
  /** The language's name in its own language, never translated. */
  label: string;
}

export interface LanguageSwitcherProps {
  locale: Locale;
  title: string;
  options: readonly LanguageOption[];
}

export function LanguageSwitcher({ locale, title, options }: LanguageSwitcherProps) {
  const [shownLocale, setShownLocale] = useOptimistic(locale);
  const [, startTransition] = useTransition();

  function choose(next: Locale) {
    // A radio's change event never fires for the option already checked, so
    // choosing the current language does nothing.
    startTransition(async () => {
      setShownLocale(next);
      await setLocale(next);
    });
  }

  return (
    <div className={styles.switcher}>
      <fieldset className={styles.group}>
        <legend className={styles.title}>{title}</legend>
        <div className={styles.options}>
          {options.map((option) => (
            <label key={option.value} className={styles.option}>
              <input
                className={styles.input}
                type="radio"
                name="locale"
                value={option.value}
                checked={shownLocale === option.value}
                onChange={() => choose(option.value)}
              />
              <svg
                className={styles.check}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" />
              </svg>
              {/* lang makes screen readers read each name in its own voice. */}
              <span className={styles.label} lang={option.value}>
                {option.label}
              </span>
              <span className={styles.radio} aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
