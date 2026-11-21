import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { NotFoundContent } from '@/components/not-found/NotFoundContent';

// "Page not found – FeenGo Partner" (docs/design/s0/placeholder-home.md). The
// separator is punctuation, the same in both languages, so it is not a message.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t('error.notFound.title')} – ${t('partner.app.name')}` };
}

export default function NotFound() {
  return <NotFoundContent />;
}
