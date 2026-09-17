import Image from 'next/image';
import { productScreenshots } from '../../lib/site-data.mjs';

export function ProductScreenshot({ className = '', alt, caption }: { className?: string; alt: string; caption: string }) {
  return <figure className={`product-shot ${className}`}>
    <div className="evidence-frame">
      <Image src={productScreenshots.knowledgeIntelligence} alt={alt} width={1875} height={777} unoptimized priority={className.includes('hero')} />
      <span className="evidence-redaction evidence-redaction-tenant" aria-hidden="true" />
      <span className="evidence-redaction evidence-redaction-account" aria-hidden="true" />
      <span className="evidence-redaction evidence-redaction-sources" aria-hidden="true" />
      <span className="evidence-redaction evidence-redaction-file" aria-hidden="true" />
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}
