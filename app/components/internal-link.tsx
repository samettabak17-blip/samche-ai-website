import type { ComponentProps } from 'react';

type InternalLinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };

/**
 * Use browser-native navigation for internal pages. The current Vinext Link
 * runtime throws while setting up RSC transitions in the production preview.
 */
export default function InternalLink({ href, children, ...props }: InternalLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
