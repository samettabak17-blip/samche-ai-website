import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpCategoryClient } from '../../../components/help-center';
import { getCategoryBySlug, getPublishedCategories } from '../../../../lib/help-center/index.mjs';
import { SiteShell } from '../../../components/site-shell';
import { BreadcrumbJsonLd } from '../../../components/breadcrumb-json-ld';
import { buildPageMetadata, siteUrl } from '../../../../lib/seo';

export function generateStaticParams() { return getPublishedCategories('en').map((category) => ({ category: category.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> { const { category: slug } = await params; const category = getCategoryBySlug(slug, 'en'); return buildPageMetadata({ title: category ? `${category.label} · SamChe AI Help Center` : 'Help Center', description: category?.description || 'Verified SamChe AI product documentation.', path: `/help/category/${slug}` }); }
export default async function HelpCategoryPage({ params }: { params: Promise<{ category: string }> }) { const { category: slug } = await params; const category = getCategoryBySlug(slug, 'en'); if (!category) notFound(); return <SiteShell><BreadcrumbJsonLd items={[{ name: 'SamChe AI Help Center', url: `${siteUrl}/help` }, { name: category.label, url: `${siteUrl}/help/category/${category.slug}` }]} /><HelpCategoryClient categorySlug={slug} /></SiteShell>; }
