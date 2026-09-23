import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HelpCategoryClient } from '../../../components/help-center';
import { getCategoryBySlug, getPublishedCategories } from '../../../../lib/help-center/index.mjs';
import { SiteShell } from '../../../components/site-shell';

export function generateStaticParams() { return getPublishedCategories('en').map((category) => ({ category: category.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> { const { category: slug } = await params; const category = getCategoryBySlug(slug, 'en'); return { title: category ? `${category.label} · SamChe AI Help Center` : 'Help Center', description: category?.description || 'Verified SamChe AI product documentation.', alternates: { canonical: `https://samche.ai/help/category/${slug}` } }; }
export default async function HelpCategoryPage({ params }: { params: Promise<{ category: string }> }) { const { category } = await params; if (!getCategoryBySlug(category, 'en')) notFound(); return <SiteShell><HelpCategoryClient categorySlug={category} /></SiteShell>; }
