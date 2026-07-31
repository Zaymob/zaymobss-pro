/**
 * Scramjet Proxy Client Engine & Codec Module
 * Official Scramjet architecture integration for client-side proxying
 */

import { getScramjetProxyEndpoint } from './url-utils';

export interface ScramjetConfig {
  prefix: string;
  codec: 'xor' | 'plain' | 'base64';
  backendUrl?: string;
}

const defaultConfig: ScramjetConfig = {
  prefix: '/scramjet/',
  codec: 'xor',
};

/**
 * Scramjet XOR Codec for encoding/decoding proxied URLs according to Scramjet standard
 */
export const ScramjetCodec = {
  encode(str: string): string {
    if (!str) return '';
    return encodeURIComponent(
      str
        .split('')
        .map((char, ind) =>
          ind % 2 === 0
            ? String.fromCharCode(char.charCodeAt(0) ^ 2)
            : char
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
        ind % 2 === 0
          ? String.fromCharCode(char.charCodeAt(0) ^ 2)
          : char
      )
      .join('');
    
    return decodedInput + (query.length ? '?' + query.join('?') : '');
  },
};

/**
 * Service Worker registration for Scramjet
 */
let swRegistered = false;

export async function registerScramjetWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    // Unregister any stale or broken service workers hijacking fetch requests
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      console.log('[Scramjet Engine] Unregistering stale service worker:', reg.scope);
      await reg.unregister();
    }
  } catch (e) {
    console.warn('[Scramjet Engine] Error cleaning service workers:', e);
  }

  return false;
}

/**
 * Generates the full iframe src URL for a target website using Scramjet architecture.
 */
export function getProxiedUrl(targetUrl: string, config: ScramjetConfig = defaultConfig): string {
  if (!targetUrl) return 'about:blank';

  // Check external or custom backend URL override
  const customBackend = (import.meta as any).env?.VITE_SCRAMJET_SERVER_URL || process.env.VITE_SCRAMJET_SERVER_URL;

  if (customBackend) {
    const base = customBackend.trim().replace(/\/+$/, '');
    return `${base}?url=${encodeURIComponent(targetUrl)}&codec=${config.codec}`;
  }

  // Uses Express backend proxy controller
  return getScramjetProxyEndpoint(targetUrl);
}
