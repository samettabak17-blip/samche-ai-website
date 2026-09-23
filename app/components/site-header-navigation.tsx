'use client';

import { usePathname } from 'next/navigation';
import Link from './internal-link';

export const mainNavigation = [
  { href: '/', label: 'Home' },
  { href: '/platform', label: 'Platform' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security & Privacy' },
  { href: '/support', label: 'Product Support' },
  { href: '/contact', label: 'Contact' },
] as const;

export function SiteHeaderNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname() ?? '/';
  return <nav className={mobile ? undefined : 'desktop-nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>{mainNavigation.map((item) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
    return <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>{item.label}</Link>;
  })}</nav>;
}
