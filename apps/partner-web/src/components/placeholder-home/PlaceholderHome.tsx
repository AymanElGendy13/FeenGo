// The S0 placeholder page (docs/design/s0/placeholder-home.md, "Web variant"):
// the app name, a welcome line and the language control.
import { useTranslations } from 'next-intl';
import { PageShell } from '@/components/page-shell/PageShell';
import styles from './PlaceholderHome.module.css';

export function PlaceholderHome() {
  const t = useTranslations();

  return (
    <PageShell>
      <p className={styles.welcome}>{t('home.placeholder.welcome')}</p>
    </PageShell>
  );
}
