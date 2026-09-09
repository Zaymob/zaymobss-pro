/**
 * URL and Search Utilities for Scramjet Web Proxy
 */

export const DEFAULT_SEARCH_ENGINE = 'https://duckduckgo.com/?q=%s';

/**
 * Checks if a string looks like a direct URL rather than a search query.
 */
export function isDirectUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  // Has protocol
  if (/^https?:\/\//i.test(trimmed)) return true;

  // Has no spaces and contains a top-level domain or port
  if (!/\s/.test(trimmed)) {
    // Check for common TLDs or IP addresses or localhost
    if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/i.test(trimmed)) return true;
    if (/^localhost(:\d+)?/i.test(trimmed)) return true;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?/.test(trimmed)) return true;
  }

  return false;
}

/**
 * Formats user input into a full valid URL or search engine query URL.
 */
export function formatProxyDestination(input: string, searchEngineTemplate: string = DEFAULT_SEARCH_ENGINE): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (isDirectUrl(trimmed)) {
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  // Treat as search query
  const query = encodeURIComponent(trimmed);
  if (searchEngineTemplate.includes('%s')) {
    return searchEngineTemplate.replace('%s', query);
  }
  return `${searchEngineTemplate}${query}`;
}

/**
 * Gets a displayable, clean URL or title for browser tab headers.
 */
export function getDisplayDomain(urlStr: string): string {
  if (!urlStr) return 'New Tab';
  try {
    const parsed = new URL(urlStr);
    let host = parsed.hostname.replace(/^www\./i, '');
    if (parsed.pathname && parsed.pathname !== '/') {
      const pathPart = parsed.pathname.split('/').filter(Boolean)[0];
      if (pathPart) {
        host += ` / ${decodeURIComponent(pathPart).substring(0, 15)}`;
      }
    }
    return host || urlStr;
  } catch (e) {
    return urlStr;
  }
}

/**
 * Gets the Scramjet / Bare server proxy endpoint URL.
 * Checks VITE_SCRAMJET_SERVER_URL environment variable first.
 */
export function getScramjetProxyEndpoint(targetUrl: string): string {
  if (!targetUrl) return '';

  // Environment variable override (e.g. deployed on external Railway/Heroku bare server)
  const externalServer = (import.meta as any).env?.VITE_SCRAMJET_SERVER_URL || process.env.VITE_SCRAMJET_SERVER_URL;
  
  if (externalServer && externalServer.trim()) {
    const baseUrl = externalServer.trim().replace(/\/+$/, '');
    return `${baseUrl}?url=${encodeURIComponent(targetUrl)}`;
  }

  // Default to our Express server backend proxy route
  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}
