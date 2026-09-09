import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  GameController,
  MagnifyingGlass as Search,
  Play,
  X,
  CornersOut as Maximize2,
  ArrowClockwise as RefreshCw,
  Heart,
  Lightning as Zap,
  ArrowSquareOut as ExternalLink,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';
import { addHistoryItem } from './HistoryModal';
import { PlayableTetris } from './games/PlayableTetris';
import { PlayableSnake } from './games/PlayableSnake';
import { Playable2048 } from './games/Playable2048';
import { PlayableDino } from './games/PlayableDino';
import { PlayableFlappy } from './games/PlayableFlappy';
import { PlayableSpaceInvaders } from './games/PlayableSpaceInvaders';
import { PlayableWordle } from './games/PlayableWordle';
import { PlayableCalculator } from './games/PlayableCalculator';

interface GamesViewProps {
  selectedGameId?: string;
}

export interface ExternalGame {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  source: 'noahh' | 'hydra' | 'lumin' | 'builtin';
  category: string;
  rating: number;
  plays: string;
  canvasType?: 'tetris' | 'snake' | '2048' | 'dino' | 'flappy' | 'space_invaders' | 'wordle' | 'calculator';
}

const CALCULATOR_GAME: ExternalGame = {
  id: 'game-calculator-hidden',
  title: 'Calculator',
  description: 'Standard utility calculation tool with arithmetic operations.',
  image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=600&auto=format&fit=crop&q=80',
  url: '',
  source: 'builtin',
  category: 'UTILITY',
  rating: 5.0,
  plays: '10K',
  canvasType: 'calculator',
};

// Curated high-resolution, thematic game covers for top web games
const CURATED_GAME_ART: Record<string, string> = {
  'minecraft': 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80',
  'eaglercraft': 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80',
  'roblox': 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
  'slope': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'subway': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
  'retro bowl': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
  '1v1': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  'cookie clicker': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
  'geometry dash': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'friday night funkin': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'fnf': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'fnaf': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'five nights': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
  'drift': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
  'moto': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80',
  'bike': 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80',
  'basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80',
  'soccer': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
  'chess': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&auto=format&fit=crop&q=80',
  'gartic': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'tetris': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'snake': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
  '2048': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'space invaders': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'dino': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
  'flappy': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  'wordle': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'drive mad': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80',
  'eggy car': 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&auto=format&fit=crop&q=80',
  'paper.io': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'crossy road': 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&auto=format&fit=crop&q=80',
  'bitlife': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  'krunker': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  'smash karts': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=80',
};

// Generates a customized, distinct SVG game cover so no two games ever share a boring generic fallback
export const generateGameArtwork = (title: string, category: string = 'ARCADE'): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { start: '#10b981', mid: '#065f46', end: '#022c22', accent: '#34d399', badge: 'EMERALD' },
    { start: '#3b82f6', mid: '#1e40af', end: '#0f172a', accent: '#60a5fa', badge: 'SAPPHIRE' },
    { start: '#8b5cf6', mid: '#5b21b6', end: '#1e1b4b', accent: '#a78bfa', badge: 'AMETHYST' },
    { start: '#ec4899', mid: '#9d174d', end: '#3b0764', accent: '#f472b6', badge: 'RUBY' },
    { start: '#f59e0b', mid: '#92400e', end: '#451a03', accent: '#fbbf24', badge: 'AMBER' },
    { start: '#06b6d4', mid: '#155e75', end: '#082f49', accent: '#22d3ee', badge: 'CYAN' },
    { start: '#ef4444', mid: '#991b1b', end: '#450a0a', accent: '#f87171', badge: 'CRIMSON' },
    { start: '#6366f1', mid: '#3730a3', end: '#1e1b4b', accent: '#818cf8', badge: 'INDIGO' },
    { start: '#14b8a6', mid: '#115e59', end: '#042f2e', accent: '#2dd4bf', badge: 'TEAL' },
    { start: '#d946ef', mid: '#86198f', end: '#3b0764', accent: '#e879f9', badge: 'MAGENTA' },
  ];

  const p = palettes[Math.abs(hash) % palettes.length];
  const initials =
    title
      .split(/[\s-_:.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'GM';

  const cleanTitle = title.replace(/[<>&"]/g, '').slice(0, 26);
  const cleanCat = (category || 'ARCADE').replace(/[<>&"]/g, '').toUpperCase().slice(0, 14);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="375" viewBox="0 0 600 375">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${p.start}"/>
        <stop offset="50%" stop-color="${p.mid}"/>
        <stop offset="100%" stop-color="${p.end}"/>
      </linearGradient>
      <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
        <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="600" height="375" fill="url(#bg)"/>
    <rect width="600" height="375" fill="url(#grid)"/>
    
    <circle cx="520" cy="60" r="160" fill="white" fill-opacity="0.05" />
    <circle cx="80" cy="320" r="120" fill="${p.accent}" fill-opacity="0.08" />

    <!-- Center Icon Shield -->
    <rect x="225" y="90" width="150" height="95" rx="20" fill="rgba(0,0,0,0.5)" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.6"/>
    <text x="300" y="152" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">${initials}</text>

    <!-- Game Title -->
    <text x="300" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${cleanTitle}</text>
    
    <!-- Category Pill -->
    <rect x="${300 - (cleanCat.length * 4.5 + 16)}" y="260" width="${cleanCat.length * 9 + 32}" height="26" rx="13" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
    <text x="300" y="277" font-family="ui-monospace, monospace" font-size="11" font-weight="800" fill="${p.accent}" text-anchor="middle" letter-spacing="1.5">${cleanCat}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Lumin SDK Container
const LuminContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initLumin = () => {
      if ((window as any).Lumin && typeof (window as any).Lumin.init === 'function') {
        try {
          (window as any).Lumin.init({
            container: '#games',
            theme: 'dark',
            columns: 12,
            rows: 8,
            gamesPerPage: 96,
          });
        } catch (e) {
          console.error('Lumin SDK init error:', e);
        }
      }
    };

    if ((window as any).Lumin) {
      initLumin();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js';
      script.async = true;
      script.onload = () => {
        initLumin();
      };
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full min-h-[700px] rounded-2xl bg-[#181818] border border-zinc-800 p-4 shadow-xl overflow-hidden">
      <div id="games" ref={containerRef} className="w-full h-full min-h-[650px]" />
    </div>
  );
};

export const GamesView: React.FC<GamesViewProps> = ({ selectedGameId }) => {
  const [activeSource, setActiveSource] = useState<'noahh' | 'hydra' | 'lumin'>('noahh');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_game_favorites') || localStorage.getItem('dior_game_favorites');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Check Yunø Lite Mode (Image-only mode)
  const [isLiteActive, setIsLiteActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_lite_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkLite = () => {
      try {
        setIsLiteActive(localStorage.getItem('yuno_lite_mode') === 'true');
      } catch {}
    };
    window.addEventListener('storage', checkLite);
    const interval = setInterval(checkLite, 1000);
    return () => {
      window.removeEventListener('storage', checkLite);
      clearInterval(interval);
    };
  }, []);

  // External Game Catalogs with instant LocalStorage caching
  const [noahhGames, setNoahhGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_noahh');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [hydraGames, setHydraGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_hydra');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);

  // Active playing game modal
  const [playingGame, setPlayingGame] = useState<ExternalGame | null>(null);

  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Toggle Fullscreen on active game container
  const toggleFullscreen = () => {
    if (gameContainerRef.current) {
      if (!document.fullscreenElement) {
        gameContainerRef.current.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request error:', err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen error:', err);
        });
      }
    }
  };

  // Fetch games from external CDNs with graceful fallback
  const fetchExternalGames = async () => {
    if (activeSource === 'noahh' && noahhGames.length > 0) return;
    if (activeSource === 'hydra' && hydraGames.length > 0) return;

    setIsLoadingGames(true);
    try {
      if (activeSource === 'noahh') {
        const res = await fetch(`/api/games/noahh?_t=${Date.now()}`, {
          signal: AbortSignal.timeout(7000),
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.games) && data.games.length > 0) {
            setNoahhGames(data.games);
            try {
              localStorage.setItem('yuno_games_cache_noahh', JSON.stringify(data.games));
            } catch {}
          }
        }
      } else if (activeSource === 'hydra') {
        const res = await fetch(`/api/games/hydra?_t=${Date.now()}`, {
          signal: AbortSignal.timeout(7000),
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.games) && data.games.length > 0) {
            setHydraGames(data.games);
            try {
              localStorage.setItem('yuno_games_cache_hydra', JSON.stringify(data.games));
            } catch {}
          }
        }
      }
    } catch {
      // Graceful fallback to local cache
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    if (activeSource !== 'lumin') {
      fetchExternalGames();
    }
  }, [activeSource]);

  // Handle selected game ID from URL or external navigation
  useEffect(() => {
    if (!selectedGameId) return;

    const allGames = [...noahhGames, ...hydraGames];
    const found = allGames.find(
      (g) =>
        g.id === selectedGameId ||
        g.title.toLowerCase() === selectedGameId.toLowerCase() ||
        g.title.toLowerCase().includes(selectedGameId.toLowerCase().replace(/[-_]/g, ' '))
    );

    if (found) {
      setPlayingGame(found);
    }
  }, [selectedGameId, noahhGames, hydraGames]);

  // Favorite toggle handler with persistence
  const toggleFavorite = (gameKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(gameKey) ? prev.filter((id) => id !== gameKey) : [...prev, gameKey];
      try {
        localStorage.setItem('yuno_game_favorites', JSON.stringify(next));
        localStorage.setItem('dior_game_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Get image for game with curated lookup and dynamic custom fallback
  const getGameImage = (game: ExternalGame): string => {
    if (game.image && typeof game.image === 'string' && game.image.startsWith('http')) {
      // Check if it's a raw github image that should be converted or used
      if (!game.image.includes('placeholder') && !game.image.includes('unsplash.com/photo-1550745165')) {
        return game.image;
      }
    }

    const titleLower = (game.title || '').toLowerCase();
    for (const [key, curatedUrl] of Object.entries(CURATED_GAME_ART)) {
      if (titleLower.includes(key)) {
        return curatedUrl;
      }
    }

    if (game.image && game.image.startsWith('http')) {
      return game.image;
    }

    return generateGameArtwork(game.title, game.category);
  };

  // Build current unified game list based on source
  const currentCatalog = useMemo(() => {
    if (activeSource === 'hydra') {
      return hydraGames;
    }
    if (activeSource === 'noahh') {
      return noahhGames;
    }
    return [];
  }, [activeSource, noahhGames, hydraGames]);

  // Categories list: keeping All Titles and Starred
  const CATEGORIES = [
    { id: 'all', label: 'All Titles', icon: Zap },
    { id: 'favorites', label: 'Starred', icon: Heart },
  ];

  // Filtered games based on search and category
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const isCalculatorQuery = query === 'calculator';

    const baseList = isCalculatorQuery ? [CALCULATOR_GAME, ...currentCatalog] : currentCatalog;

    return baseList.filter((game) => {
      // If it's the hidden calculator, only show when exact word 'calculator' is typed
      if (game.id === CALCULATOR_GAME.id) {
        return isCalculatorQuery;
      }

      const matchesSearch =
        !query ||
        game.title.toLowerCase().includes(query) ||
        (game.category && game.category.toLowerCase().includes(query)) ||
        (game.description && game.description.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (activeCategory === 'favorites') {
        return favorites.includes(game.id || game.title);
      }

      return true;
    });
  }, [currentCatalog, searchQuery, activeCategory, favorites]);

  // Split into favorites on top and remainder
  const favoritedGames = useMemo(() => {
    if (activeCategory === 'favorites') return filteredGames;
    return filteredGames.filter((g) => favorites.includes(g.id || g.title));
  }, [filteredGames, favorites, activeCategory]);

  const otherGames = useMemo(() => {
    if (activeCategory === 'favorites') return [];
    return filteredGames.filter((g) => !favorites.includes(g.id || g.title));
  }, [filteredGames, favorites, activeCategory]);

  // Start Playing Game
  const handleLaunchGame = (game: ExternalGame) => {
    const finalImage = getGameImage(game);
    setPlayingGame({ ...game, image: finalImage });
    addHistoryItem({
      type: 'game',
      title: game.title,
      subtitle: game.category || 'Arcade Game',
      thumbnail: finalImage,
      data: game,
    });
  };

  // Render individual game card
  const renderGameCard = (game: ExternalGame, idx: number) => {
    const gameKey = game.id || game.title;
    const isFav = favorites.includes(gameKey);
    const imageUrl = getGameImage(game);

    return (
      <div
        key={`${gameKey}-${idx}`}
        onClick={() => handleLaunchGame(game)}
        className="group relative p-2.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-xl hover:shadow-black/60 hover:-translate-y-0.5"
      >
        <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-zinc-900 relative">
          <img
            src={imageUrl}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              target.src = generateGameArtwork(game.title, game.category);
            }}
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

          {/* Index Number Badge */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-zinc-950/90 text-[10px] font-mono text-zinc-300 border border-zinc-700 font-bold">
            #{idx + 1}
          </div>

          {/* Source Tag Badge */}
          {game.source === 'builtin' && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-mono text-emerald-400 font-bold">
              OFFLINE
            </div>
          )}

          {/* Heart Favorite Button */}
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            <button
              onClick={(e) => toggleFavorite(gameKey, e)}
              className={`p-1.5 rounded-lg border transition-all ${
                isFav
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-sm'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={isFav ? 'Unfavorite' : 'Favorite'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center Play Overlay Icon */}
          <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 shadow-2xl">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* When in Yunø Lite Mode: Hide text (pure picture only!) */}
        {!isLiteActive && (
          <div className="mt-2.5 px-1">
            <div className="flex items-center justify-between gap-1.5">
              <h3 className="text-xs font-bold text-zinc-100 group-hover:text-white transition-colors truncate">
                {game.title}
              </h3>
              <span className="uppercase text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 flex-shrink-0">
                {game.category || 'Arcade'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-2 sm:px-4">
      {/* Sleek Modern Arcade Header */}
      <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                <GameController className="w-5 h-5 text-emerald-400" weight="fill" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight uppercase">
                  Games
                </h1>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-zinc-800 text-emerald-400 border border-zinc-700">
                {filteredGames.length}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-sans pl-12">
              Play games
            </p>
          </div>

          {/* Elevated Source Selector Pills */}
          <div className="flex items-center space-x-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              onClick={() => {
                setActiveSource('noahh');
                setActiveCategory('all');
              }}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSource === 'noahh'
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-600 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Noah's Vault</span>
            </button>

            <button
              onClick={() => {
                setActiveSource('hydra');
                setActiveCategory('all');
              }}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSource === 'hydra'
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-600 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Hydra Stash</span>
            </button>

            <button
              onClick={() => {
                setActiveSource('lumin');
              }}
              className={`px-4 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                activeSource === 'lumin'
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-600 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Lumin Cloud</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER LUMIN SDK SOURCE IF ACTIVE */}
      {activeSource === 'lumin' ? (
        <LuminContainer />
      ) : (
        <>
          {/* Subheader, Categories & Search Bar */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1">
              {/* Category Filter Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer border ${
                        isActive
                          ? 'bg-zinc-800 text-white border-zinc-600 font-bold shadow-sm'
                          : 'bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80 flex-shrink-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search games, genres, or titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-9 py-2 bg-zinc-950/90 border border-zinc-800 focus:border-zinc-500 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Counter Summary */}
            <div className="text-xs font-mono text-zinc-400 flex items-center space-x-2.5 px-1">
              <span className="font-semibold text-zinc-300">{filteredGames.length} Titles Available</span>
              {favorites.length > 0 && (
                <span className="text-rose-400 font-medium">• {favorites.length} Starred</span>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingGames && (
            <div className="py-20 text-center space-y-3">
              <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading catalog...</p>
            </div>
          )}

          {/* Game Cards Grid */}
          {!isLoadingGames && (
            <div className="space-y-6">
              {/* Section 1: Favorited Games (if any exist in current filtered results) */}
              {favoritedGames.length > 0 && activeCategory !== 'favorites' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />
                    <span>Favorites ({favoritedGames.length})</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {favoritedGames.map((game, idx) => renderGameCard(game, idx))}
                  </div>

                  {/* Sleek Divider between Hearted and Other Games */}
                  {otherGames.length > 0 && (
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-zinc-800" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-wider font-mono">
                        <span className="bg-[#0b0b0e] px-3.5 py-1 rounded-full border border-zinc-800 text-[10px] text-zinc-400">
                          All Games ({otherGames.length})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Section 2: Other Games / Full List */}
              {activeCategory === 'favorites' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {favoritedGames.map((game, idx) => renderGameCard(game, idx))}
                </div>
              ) : (
                otherGames.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {otherGames.map((game, idx) =>
                      renderGameCard(game, favoritedGames.length + idx)
                    )}
                  </div>
                )
              )}

              {/* Empty Search Results */}
              {filteredGames.length === 0 && (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2">
                  <p className="text-sm font-semibold text-zinc-300">No games found</p>
                  <p className="text-xs text-zinc-500">
                    Try searching for a different title or clearing the search filter
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* FULLSCREEN GAME MODAL OVERLAY */}
      <AnimatePresence>
        {playingGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6"
          >
            <div
              ref={gameContainerRef}
              className="w-full h-full max-w-6xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Modal Window Top Header */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-white">{playingGame.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">
                    {playingGame.source === 'builtin' ? 'OFFLINE NATIVE GAME' : 'CDN UNBLOCKED GAME'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {playingGame.url && (
                    <button
                      onClick={() => {
                        window.open(playingGame.url, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-medium transition-all flex items-center space-x-1.5"
                      title="Open game directly in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pop-out</span>
                    </button>
                  )}

                  <button
                    onClick={toggleFullscreen}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-lg"
                    title="Fullscreen Mode"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Fullscreen</span>
                  </button>

                  <button
                    onClick={() => {
                      const current = playingGame;
                      setPlayingGame(null);
                      setTimeout(() => setPlayingGame(current), 50);
                    }}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Reload Game"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setPlayingGame(null)}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Game Viewport Container */}
              <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden p-2">
                {playingGame.source === 'builtin' && playingGame.canvasType ? (
                  <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                    {playingGame.canvasType === 'tetris' && <PlayableTetris />}
                    {playingGame.canvasType === 'snake' && <PlayableSnake />}
                    {playingGame.canvasType === '2048' && <Playable2048 />}
                    {playingGame.canvasType === 'dino' && <PlayableDino />}
                    {playingGame.canvasType === 'flappy' && <PlayableFlappy />}
                    {playingGame.canvasType === 'space_invaders' && <PlayableSpaceInvaders />}
                    {playingGame.canvasType === 'wordle' && <PlayableWordle />}
                    {playingGame.canvasType === 'calculator' && <PlayableCalculator />}
                  </div>
                ) : (
                  <iframe
                    src={playingGame.url}
                    title={playingGame.title}
                    className="w-full h-full border-0 rounded-xl bg-black"
                    allowFullScreen
                    allow="autoplay; payment; microphone; camera; midi; geolocation; gyroscope; accelerometer; cross-origin-isolated; encrypted-media; fullscreen"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
