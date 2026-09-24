'use client';

import type { ComponentProps, MouseEvent, TouchEvent } from 'react';

type InternalLinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };

/**
 * Use browser-native navigation for internal pages. The current Vinext Link
 * runtime throws while setting up RSC transitions in the production preview.
 */
export default function InternalLink({ href, children, ...props }: InternalLinkProps) {
  const prefetch = () => {
    if (typeof window === 'undefined') return;
    try {
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin || Array.from(document.head.querySelectorAll('link[data-samche-prefetch]')).some((node) => node.getAttribute('data-samche-prefetch') === destination.href)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = destination.href;
      link.dataset.samchePrefetch = destination.href;
      document.head.appendChild(link);
    } catch { /* The anchor remains a safe native navigation fallback. */ }
  };
  const onMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => { prefetch(); props.onMouseEnter?.(event); };
  const onTouchStart = (event: TouchEvent<HTMLAnchorElement>) => { prefetch(); props.onTouchStart?.(event); };
  return <a href={href} {...props} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart}>{children}</a>;
}
