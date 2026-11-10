// Independent History Manager for Yunø Tabs (Cinema, Music, Proxy, Games)

export interface CinemaHistoryItem {
  id: string;
  tmdbId?: number;
  title: string;
  subtitle?: string;
  mediaType?: 'tv' | 'movie' | 'anime';
  season?: number;
  episode?: number;
  thumbnail?: string;
  timestamp: number;
  data?: any;
}

export interface MusicHistoryItem {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  cover: string;
  streamUrl?: string;
  duration?: number;
  timestamp: number;
  data?: any;
}

export interface ProxyHistoryItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  iconUrl?: string;
  timestamp: number;
}

export interface GameHistoryItem {
  id: string;
  gameId: string;
  title: string;
  thumbnail: string;
  category?: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  cinema: 'yuno_history_cinema',
  music: 'yuno_history_music',
  proxy: 'yuno_history_proxy',
  games: 'yuno_history_games',
  unified: 'yuno_unified_activity_history',
};

// Default seed items for first-time or empty state so Continue Playing rows look awesome immediately
export const DEFAULT_CINEMA_HISTORY: CinemaHistoryItem[] = [
  {
    id: 'seed-cin-1',
    tmdbId: 95557,
    title: 'INVINCIBLE',
    subtitle: 'S1:E1',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    thumbnail: 'https://image.tmdb.org/t/p/w500/yDWJYRAwMNKbIYT8O3fR9Ot4aST.jpg',
    timestamp: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'seed-cin-2',
    tmdbId: 1429,
    title: 'Attack on Titan',
    subtitle: 'S1:E1',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    thumbnail: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    timestamp: Date.now() - 1000 * 60 * 60,
  },
  {
    id: 'seed-cin-3',
    tmdbId: 1159559,
    title: 'Twisters',
    subtitle: 'Movie',
    mediaType: 'movie',
    thumbnail: 'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao8l3urDDgo40KG.jpg',
    timestamp: Date.now() - 1000 * 60 * 120,
  },
];

export const DEFAULT_MUSIC_HISTORY: MusicHistoryItem[] = [
  {
    id: 'seed-mus-1',
    trackId: 'seed-t1',
    title: 'FE!N (feat. Playboi Carti)',
    artist: 'Travis Scott',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    duration: 191,
    timestamp: Date.now() - 1000 * 60 * 20,
  },
  {
    id: 'seed-mus-2',
    trackId: 'seed-t2',
    title: 'Starboy',
    artist: 'The Weeknd, Daft Punk',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    duration: 230,
    timestamp: Date.now() - 1000 * 60 * 50,
  },
  {
    id: 'seed-mus-3',
    trackId: 'seed-t3',
    title: 'Dracula',
    artist: 'Tame Impala',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    duration: 215,
    timestamp: Date.now() - 1000 * 60 * 90,
  },
];

export const DEFAULT_PROXY_HISTORY: ProxyHistoryItem[] = [
  {
    id: 'seed-prx-1',
    url: 'https://discord.com',
    title: 'Discord',
    domain: 'discord.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=discord.com&sz=128',
    timestamp: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'seed-prx-2',
    url: 'https://youtube.com',
    title: 'YouTube',
    domain: 'youtube.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=128',
    timestamp: Date.now() - 1000 * 60 * 45,
  },
  {
    id: 'seed-prx-3',
    url: 'https://www.tiktok.com',
    title: 'TikTok',
    domain: 'tiktok.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=128',
    timestamp: Date.now() - 1000 * 60 * 110,
  },
];

// Helper to notify all listening components
const dispatchHistoryEvent = (tab: 'cinema' | 'music' | 'proxy' | 'games') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yuno-history-updated', { detail: { tab } }));
  }
};

// Cinema History API
export const getCinemaHistory = (): CinemaHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cinema);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CINEMA_HISTORY;
};

export const addCinemaHistory = (item: Omit<CinemaHistoryItem, 'id' | 'timestamp'>) => {
  try {
    const current = getCinemaHistory().filter((p) => !p.id.startsWith('seed-'));
    const newItem: CinemaHistoryItem = {
      ...item,
      id: `cin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    // Deduplicate by title / tmdbId
    const filtered = current.filter(
      (c) => !(c.tmdbId && item.tmdbId && c.tmdbId === item.tmdbId) && c.title !== item.title
    );
    const updated = [newItem, ...filtered].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.cinema, JSON.stringify(updated));
    dispatchHistoryEvent('cinema');
  } catch {}
};

// Music History API
export const getMusicHistory = (): MusicHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.music);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_MUSIC_HISTORY;
};

export const addMusicHistory = (item: Omit<MusicHistoryItem, 'id' | 'timestamp'>) => {
  try {
    const current = getMusicHistory().filter((p) => !p.id.startsWith('seed-'));
    const newItem: MusicHistoryItem = {
      ...item,
      id: `mus-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    const filtered = current.filter(
      (m) => !(m.trackId && item.trackId && m.trackId === item.trackId) && m.title !== item.title
    );
    const updated = [newItem, ...filtered].slice(0, 40);
    localStorage.setItem(STORAGE_KEYS.music, JSON.stringify(updated));
    dispatchHistoryEvent('music');
  } catch {}
};

// Proxy History API
export const getProxyHistory = (): ProxyHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.proxy);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROXY_HISTORY;
};

export const addProxyHistory = (item: Omit<ProxyHistoryItem, 'id' | 'timestamp'>) => {
  try {
    const current = getProxyHistory().filter((p) => !p.id.startsWith('seed-'));
    const newItem: ProxyHistoryItem = {
      ...item,
      id: `prx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    const filtered = current.filter((p) => p.url !== item.url && p.domain !== item.domain);
    const updated = [newItem, ...filtered].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.proxy, JSON.stringify(updated));
    dispatchHistoryEvent('proxy');
  } catch {}
};

// Games History API
export const getGameHistory = (): GameHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.games);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const addGameHistory = (item: Omit<GameHistoryItem, 'id' | 'timestamp'>) => {
  try {
    const current = getGameHistory();
    const newItem: GameHistoryItem = {
      ...item,
      id: `gam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    const filtered = current.filter((g) => g.gameId !== item.gameId && g.title !== item.title);
    const updated = [newItem, ...filtered].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.games, JSON.stringify(updated));
    dispatchHistoryEvent('games');
  } catch {}
};
