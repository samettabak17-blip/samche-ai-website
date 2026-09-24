import type { Metadata } from 'next';
import { HelpCenterHome } from '../components/help-center';
import { SiteShell } from '../components/site-shell';

export const metadata: Metadata = { title: 'SamChe AI Help Center', description: 'Verified SamChe AI dashboard guides, troubleshooting, and product documentation.', alternates: { canonical: 'https://samche.ai/help' } };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const initialQuery = Array.isArray(params.q) ? params.q[0] || '' : params.q || '';
  return <SiteShell><HelpCenterHome initialQuery={initialQuery} /></SiteShell>;
}
