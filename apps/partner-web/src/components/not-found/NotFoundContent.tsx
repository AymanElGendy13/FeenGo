// The not-found state (docs/design/s0/placeholder-home.md, "Not-found state"):
// inside the shared frame, a title (h2, the app name stays the only h1), a body
// line and one link home. The language control stays, and switching it keeps
// the person on this page.
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageShell } from '@/components/page-shell/PageShell';
import styles from './NotFoundContent.module.css';

export function NotFoundContent() {
  const t = useTranslations('error.notFound');

  return (
    <PageShell>
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.body}>{t('body')}</p>
      <p className={styles.action}>
        <Link className={styles.home} href="/">
          {t('home')}
        </Link>
      </p>
    </PageShell>
  );
}
