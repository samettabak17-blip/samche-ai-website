import type { Metadata } from 'next';
import { HelpArticleClient } from '../../../components/help-center';
import { getArticleBySlug, getPublishedArticles } from '../../../../lib/help-center/index.mjs';
import { SiteShell } from '../../../components/site-shell';

export function generateStaticParams() { return getPublishedArticles('en').map((article) => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const article = getArticleBySlug(slug, 'en'); return { title: article ? `${article.title} · SamChe AI Help Center` : 'Help Center', description: article?.summary || 'Verified SamChe AI product documentation.', alternates: { canonical: `https://samche.ai/help/article/${slug}` } }; }
export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <SiteShell><HelpArticleClient slug={slug} /></SiteShell>; }
