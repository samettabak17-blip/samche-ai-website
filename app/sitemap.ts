import type { MetadataRoute } from 'next';

const routes = ['', 'platform', 'pricing', 'security', 'contact', 'privacy', 'support'];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://samche.ai/${route}`,
    lastModified: new Date('2026-09-15'),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }));
}
