import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NotFoundContent } from '@/components/not-found/NotFoundContent';

// "Page not found – FeenGo Partner" (docs/design/s0/placeholder-home.md): one
// message, error.notFound.pageTitle, filled with the title and the app name.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t('error.notFound.pageTitle', {
      title: t('error.notFound.title'),
      appName: t('partner.app.name'),
    }),
  };
}

export default function NotFound() {
  return <NotFoundContent />;
}
