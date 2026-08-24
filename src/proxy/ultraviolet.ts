/**
 * Ultraviolet (UV) Web Proxy Engine Module
 * Standard Ultraviolet architecture client, codec & proxy helper
 */

export interface UVConfig {
  prefix: string;
  bare: string;
  codec: 'xor' | 'base64' | 'plain';
}

export const defaultConfig: UVConfig = {
  prefix: '/uv/service/',
  bare: '/bare/',
  codec: 'xor',
};

/**
 * Ultraviolet XOR Codec for encoding/decoding proxied URLs
 */
export const uvCodec = {
  encode(str: string): string {
    if (!str) return '';
    return encodeURIComponent(
      str
        .split('')
        .map((char, ind) =>
          ind % 2 === 0 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
        )
        .join('')
    );
  },

  decode(str: string): string {
    if (!str) return '';
    const [input, ...query] = str.split('?');
    const decodedInput = decodeURIComponent(input)
      .split('')
      .map((char, ind) =>
        ind % 2 === 0 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
      )
      .join('');

    return decodedInput + (query.length ? '?' + query.join('?') : '');
  },
};

/**
 * Register Ultraviolet Service Worker if supported
 */
export async function registerUltravioletWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.register('/uv.sw.js', {
      scope: '/uv/service/',
    });
    console.log('[Ultraviolet Engine] Service Worker registered with scope:', reg.scope);
    return true;
  } catch (err) {
    console.warn('[Ultraviolet Engine] Service Worker registration notice:', err);
    return false;
  }
}

/**
 * Generates the proxied iframe src URL for Ultraviolet engine.
 */
export function getUltravioletProxiedUrl(targetUrl: string): string {
  if (!targetUrl) return 'about:blank';
  const encoded = uvCodec.encode(targetUrl);
  return `/api/proxy/uv?url=${encodeURIComponent(targetUrl)}&uv_key=${encoded}`;
}
