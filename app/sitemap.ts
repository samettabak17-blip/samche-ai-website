import type { MetadataRoute } from 'next';
import { getAllPublishedArticleUrls, getPublishedCategories } from '../lib/help-center/index.mjs';

const routes = ['', 'platform', 'pricing', 'security', 'contact', 'privacy', 'support', 'help'];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = routes.map((route) => ({
    url: `https://samche.ai/${route}`,
    lastModified: new Date('2026-09-23'),
    changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
    priority: route === '' ? 1 : 0.7,
  }));
  const categoryRoutes = getPublishedCategories('en').map((category) => ({ url: `https://samche.ai/help/category/${category.slug}`, lastModified: new Date('2026-09-23'), changeFrequency: 'monthly' as const, priority: 0.65 }));
  const articleRoutes = getAllPublishedArticleUrls().map((route) => ({ url: `https://samche.ai${route}`, lastModified: new Date('2026-09-23'), changeFrequency: 'monthly' as const, priority: 0.6 }));
  return [...base, ...categoryRoutes, ...articleRoutes];
}
