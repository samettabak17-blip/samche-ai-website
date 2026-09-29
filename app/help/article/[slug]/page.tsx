import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpArticleClient } from '../../../components/help-center';
import { getArticleBySlug, getPublishedArticles } from '../../../../lib/help-center/index.mjs';
import { SiteShell } from '../../../components/site-shell';
import { BreadcrumbJsonLd } from '../../../components/breadcrumb-json-ld';
import { buildPageMetadata, siteUrl } from '../../../../lib/seo';

export function generateStaticParams() { return getPublishedArticles('en').map((article) => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const article = getArticleBySlug(slug, 'en'); return buildPageMetadata({ title: article ? `${article.title} · SamChe AI Help Center` : 'Help Center', description: article?.summary || 'Verified SamChe AI product documentation.', path: `/help/article/${slug}` }); }
export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const article = getArticleBySlug(slug, 'en'); if (!article) notFound(); return <SiteShell><BreadcrumbJsonLd items={[{ name: 'SamChe AI Help Center', url: `${siteUrl}/help` }, { name: article.categoryLabel, url: `${siteUrl}/help/category/${article.category}` }, { name: article.title, url: `${siteUrl}/help/article/${article.slug}` }]} /><HelpArticleClient slug={slug} /></SiteShell>; }
