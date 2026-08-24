/**
 * Flipgrid.gq Proxy Engine Module
 * Educational traffic disguise tunnel proxy engine
 */

export function getFlipgridProxiedUrl(targetUrl: string): string {
  if (!targetUrl) return 'about:blank';
  return `/api/proxy/flipgrid?url=${encodeURIComponent(targetUrl)}`;
}
