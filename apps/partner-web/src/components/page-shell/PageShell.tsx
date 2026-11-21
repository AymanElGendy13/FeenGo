// The frame shared by the S0 pages (docs/design/s0/placeholder-home.md, "Web
// variant"): one centred column with the app name as the page's only h1, the
// page's own content, then the language section. A shared component: it renders
// on the server in the app and inside NextIntlClientProvider in tests.
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher/LanguageSwitcher';
import { locales } from '@/i18n/locale';
import styles from './PageShell.module.css';

export function PageShell({ children }: Readonly<{ children: ReactNode }>) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <h1 className={styles.name}>{t('partner.app.name')}</h1>
        {children}
        <div className={styles.language}>
          <LanguageSwitcher
            locale={locale}
            title={t('settings.language.title')}
            options={locales.map((value) => ({
              value,
              label: t(`settings.language.option.${value}`),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
