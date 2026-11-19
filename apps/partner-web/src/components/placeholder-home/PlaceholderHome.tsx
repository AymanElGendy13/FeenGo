// The S0 placeholder page (docs/design/s0/placeholder-home.md, "Web variant"):
// the app name, a welcome line and the language control. A shared component:
// it renders on the server in the app and inside NextIntlClientProvider in tests.
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher/LanguageSwitcher';
import { locales } from '@/i18n/locale';
import styles from './PlaceholderHome.module.css';

export function PlaceholderHome() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <main className={styles.page}>
      <div className={styles.column}>
        <h1 className={styles.name}>{t('partner.app.name')}</h1>
        <p className={styles.welcome}>{t('home.placeholder.welcome')}</p>
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
