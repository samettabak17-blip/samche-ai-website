import type { Metadata } from 'next';

export const siteUrl = 'https://samche.ai';

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  const url = `${siteUrl}${path || '/'}`;
  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'SamChe AI', type: 'website', images: [{ url: '/samche-ai-platform-approved.png', alt: 'SamChe AI Platform' }] },
    twitter: { card: 'summary', title, description },
  };
}
