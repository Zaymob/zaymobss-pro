import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Maximize2,
  Gamepad2,
  Play,
  Star,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { addHistoryItem } from './HistoryModal';

interface GamesViewProps {
  selectedGameId?: string;
}

export interface ExternalGame {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  source: 'hydra' | 'lumin' | 'truffled' | 'seraph' | 'ugs' | 'ckv' | 'all' | string;
  category: string;
  rating: number;
  plays: string;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'all' },
  { id: 'classic', label: 'classic' },
  { id: 'mario', label: 'mario' },
  { id: 'pokemon', label: 'pokemon' },
  { id: 'papa', label: "papa's" },
  { id: 'puzzle', label: 'puzzle' },
  { id: 'action', label: 'action' },
  { id: 'racing', label: 'racing' },
  { id: 'horror', label: 'horror' },
  { id: 'favorites', label: 'favorites' },
];

const getGameCategoryTag = (game: ExternalGame): string => {
  const t = (game.title || '').toLowerCase();
  if (
    t.includes('fnaf') ||
    t.includes('horror') ||
    t.includes('scary') ||
    t.includes('granny') ||
    t.includes('slender') ||
    t.includes('baldi') ||
    t.includes('zombie') ||
    t.includes('creepy') ||
    t.includes('fear') ||
    t.includes('nightmare') ||
    t.includes('poppy') ||
    t.includes('huggy') ||
    t.includes('evil') ||
    t.includes('haunt') ||
    t.includes('spooky') ||
    t.includes('eyes') ||
    t.includes('ghost') ||
    t.includes('scream') ||
    t.includes('dead') ||
    t.includes('neighbor')
  ) {
    return 'horror';
  }
  if (t.includes('mario')) return 'mario';
  if (t.includes('pokemon')) return 'pokemon';
  if (t.includes('papa')) return 'papa';
  if (
    t.includes('drift') ||
    t.includes('drive') ||
    t.includes('race') ||
    t.includes('moto') ||
    t.includes('car') ||
    t.includes('kart') ||
    t.includes('speed')
  ) {
    return 'racing';
  }
  if (
    t.includes('chess') ||
    t.includes('2048') ||
    t.includes('puzzle') ||
    t.includes('word') ||
    t.includes('sudoku') ||
    t.includes('mahjong') ||
    t.includes('logic') ||
    t.includes('minesweeper')
  ) {
    return 'puzzle';
  }
  if (
    t.includes('tetris') ||
    t.includes('snake') ||
    t.includes('dino') ||
    t.includes('flappy') ||
    t.includes('retro bowl') ||
    t.includes('minecraft') ||
    t.includes('pacman') ||
    t.includes('riddle school') ||
    t.includes('escaping') ||
    t.includes('stealing') ||
    t.includes('airship') ||
    t.includes('complex')
  ) {
    return 'classic';
  }
  if (
    t.includes('slope') ||
    t.includes('subway') ||
    t.includes('run') ||
    t.includes('bullet') ||
    t.includes('dawn') ||
    t.includes('action') ||
    t.includes('shoot') ||
    t.includes('strike') ||
    t.includes('gun') ||
    t.includes('tank') ||
    t.includes('combat') ||
    t.includes('survival') ||
    t.includes('battle') ||
    t.includes('superhot') ||
    t.includes('fruit ninja') ||
    t.includes('jetpack') ||
    t.includes('happy wheels') ||
    t.includes('vex')
  ) {
    return 'action';
  }
  return 'classic';
};

const POPULAR_KEYS = [
  'slope',
  'subway surfers',
  'flappy bird',
  'papa',
  'super mario',
  'run 3',
  'bitlife',
  'crossy road',
  'minecraft',
  'cookie clicker',
  'temple run',
  'duck life',
  'dino',
  'jetpack joyride',
  'retro bowl',
  'fruit ninja',
  'doodle jump',
  '2048',
  'tetris',
  'happy wheels',
  'superhot',
  'paperio',
  'tunnel rush',
  'fnaf',
  'drift hunters',
  'motox3m',
  'riddle school',
];

// Lumin SDK Container
interface LuminContainerProps {
  onFallbackToHydra: () => void;
}

const LuminContainer: React.FC<LuminContainerProps> = ({ onFallbackToHydra }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [luminError, setLuminError] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const handleRejection = (e: PromiseRejectionEvent) => {
      const reasonStr = String(e?.reason?.message || e?.reason || '');
      if (
        reasonStr.includes('Lumin') ||
        reasonStr.includes('domain fetch failed') ||
        reasonStr.includes('Worker connection')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        if (isMounted) {
          setLuminError(true);
          setIsInitializing(false);
        }
      }
    };

    const handleError = (e: ErrorEvent) => {
      const msg = String(e?.message || '');
      if (
        msg.includes('Lumin') ||
        msg.includes('domain fetch failed') ||
        msg.includes('Worker connection')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation?.();
        if (isMounted) {
          setLuminError(true);
          setIsInitializing(false);
        }
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    const initLumin = () => {
      if ((window as any).Lumin && typeof (window as any).Lumin.init === 'function') {
        try {
          const res = (window as any).Lumin.init({
            container: '#games',
            theme: 'dark',
            columns: 12,
            rows: 8,
            gamesPerPage: 96,
          });
          if (res && typeof res.catch === 'function') {
            res.catch((err: any) => {
              console.warn('Lumin init caught error:', err);
              if (isMounted) {
                setLuminError(true);
                setIsInitializing(false);
              }
            });
          }
          if (isMounted) setIsInitializing(false);
        } catch (e) {
          console.warn('Lumin SDK init error:', e);
          if (isMounted) {
            setLuminError(true);
            setIsInitializing(false);
          }
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
        if (isMounted) initLumin();
      };
      script.onerror = () => {
        if (isMounted) {
          setLuminError(true);
          setIsInitializing(false);
        }
      };
      document.body.appendChild(script);
    }

    const timer = setTimeout(() => {
      if (isMounted && isInitializing) {
        setIsInitializing(false);
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (luminError) {
    return (
      <div className="w-full min-h-[420px] rounded-xl bg-[#0c0714] border border-[#221338] p-8 flex flex-col items-center justify-center text-center space-y-3">
        <Gamepad2 className="w-9 h-9 text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-200">Lumin Cloud Unavailable</h3>
        <p className="text-xs text-zinc-400 max-w-md">
          The Lumin Cloud SDK is currently unreachable in this network sandbox. You can switch to Hydra Stash or Noah's Vault for instant gameplay.
        </p>
        <button
          onClick={onFallbackToHydra}
          className="mt-2 px-4 py-2 bg-[#2f1454] hover:bg-[#3d186e] text-white text-xs font-semibold rounded-lg border border-[#5b249e] transition-colors cursor-pointer"
        >
          Switch to Hydra Stash
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[700px] rounded-xl bg-[#0c0714] border border-[#221338] p-4 overflow-hidden relative">
      {isInitializing && (
        <div className="absolute inset-0 bg-[#0c0714]/80 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div id="games" ref={containerRef} className="w-full h-full min-h-[650px]" />
    </div>
  );
};

export const GamesView: React.FC<GamesViewProps> = ({ selectedGameId }) => {
  const [activeSource, setActiveSource] = useState<
    'all' | 'truffled' | 'seraph' | 'ugs' | 'ckv' | 'hydra' | 'lumin'
  >('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(75);

  const [truffledGames, setTruffledGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_truffled');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => Boolean(g.image))) return parsed;
      }
    } catch {}
    return [];
  });

  const [seraphGames, setSeraphGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_seraph');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => Boolean(g.image))) return parsed;
      }
    } catch {}
    return [];
  });

  const [ugsGames, setUgsGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_ugs');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => Boolean(g.image))) return parsed;
      }
    } catch {}
    return [];
  });

  const [ckvGames, setCkvGames] = useState<ExternalGame[]>(() => {
    try {
      const cached = localStorage.getItem('yuno_games_cache_ckv');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.some(g => Boolean(g.image))) return parsed;
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

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_game_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [playingGame, setPlayingGame] = useState<ExternalGame | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Load All game catalogs (gmshelf: Truffled, Seraph, UGS, CKV + Hydra)
  useEffect(() => {
    let isCancelled = false;

    const fetchAllCatalogs = async () => {
      setIsLoadingGames(true);
      try {
        const [gmshelfRes, hydraRes] = await Promise.allSettled([
          fetch('/api/games/gmshelf').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/games/hydra').then((r) => (r.ok ? r.json() : null)),
        ]);

        if (isCancelled) return;

        if (gmshelfRes.status === 'fulfilled' && gmshelfRes.value?.games) {
          const allGmshelf: ExternalGame[] = gmshelfRes.value.games;
          const truffled = allGmshelf.filter((g) => g.source === 'truffled');
          const seraph = allGmshelf.filter((g) => g.source === 'seraph');
          const ugs = allGmshelf.filter((g) => g.source === 'ugs');
          const ckv = allGmshelf.filter((g) => g.source === 'ckv');

          if (truffled.length > 0) {
            setTruffledGames(truffled);
            try {
              localStorage.setItem('yuno_games_cache_truffled', JSON.stringify(truffled));
            } catch {}
          }
          if (seraph.length > 0) {
            setSeraphGames(seraph);
            try {
              localStorage.setItem('yuno_games_cache_seraph', JSON.stringify(seraph));
            } catch {}
          }
          if (ugs.length > 0) {
            setUgsGames(ugs);
            try {
              localStorage.setItem('yuno_games_cache_ugs', JSON.stringify(ugs));
            } catch {}
          }
          if (ckv.length > 0) {
            setCkvGames(ckv);
            try {
              localStorage.setItem('yuno_games_cache_ckv', JSON.stringify(ckv));
            } catch {}
          }
        }

        if (hydraRes.status === 'fulfilled' && hydraRes.value?.games) {
          const list = hydraRes.value.games;
          setHydraGames(list);
          try {
            localStorage.setItem('yuno_games_cache_hydra', JSON.stringify(list));
          } catch {}
        }
      } catch (err) {
        console.error('Error fetching game catalog:', err);
      } finally {
        if (!isCancelled) setIsLoadingGames(false);
      }
    };

    fetchAllCatalogs();
    return () => {
      isCancelled = true;
    };
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('yuno_game_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Current active catalog based on selected source (all, truffled, seraph, ugs, ckv, hydra, noahh)
  const currentCatalog = useMemo(() => {
    let rawList: ExternalGame[] = [];
    if (activeSource === 'truffled') rawList = truffledGames;
    else if (activeSource === 'seraph') rawList = seraphGames;
    else if (activeSource === 'ugs') rawList = ugsGames;
    else if (activeSource === 'ckv') rawList = ckvGames;
    else if (activeSource === 'hydra') rawList = hydraGames;
    else {
      // 'all': Combine all sources
      rawList = [
        ...truffledGames,
        ...seraphGames,
        ...ugsGames,
        ...ckvGames,
        ...hydraGames,
      ];
    }

    // Deduplicate by lowercase title
    const seen = new Set<string>();
    const unique: ExternalGame[] = [];
    for (const g of rawList) {
      const key = (g.title || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(g);
      }
    }

    // Sort popular titles to the front
    return unique.sort((a, b) => {
      const ta = (a.title || '').toLowerCase();
      const tb = (b.title || '').toLowerCase();

      let scoreA = 9999;
      let scoreB = 9999;

      for (let i = 0; i < POPULAR_KEYS.length; i++) {
        if (ta.includes(POPULAR_KEYS[i])) {
          scoreA = i;
          break;
        }
      }

      for (let i = 0; i < POPULAR_KEYS.length; i++) {
        if (tb.includes(POPULAR_KEYS[i])) {
          scoreB = i;
          break;
        }
      }

      if (scoreA !== scoreB) return scoreA - scoreB;
      return ta.localeCompare(tb);
    });
  }, [activeSource, truffledGames, seraphGames, ugsGames, ckvGames, hydraGames]);

  // Filtered list based on category & search
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let list = currentCatalog;

    if (activeCategory === 'favorites') {
      list = list.filter((g) => favorites.includes(g.id));
    } else if (activeCategory !== 'all') {
      list = list.filter((g) => getGameCategoryTag(g) === activeCategory);
    }

    if (query) {
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          (g.category && g.category.toLowerCase().includes(query)) ||
          getGameCategoryTag(g).toLowerCase().includes(query)
      );
    }

    return list;
  }, [currentCatalog, activeCategory, searchQuery, favorites]);

  // Reset pagination when category, search, or source changes
  useEffect(() => {
    setVisibleCount(75);
  }, [activeCategory, searchQuery, activeSource]);

  const displayedGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  const handleLaunchGame = (game: ExternalGame) => {
    setPlayingGame(game);
    addHistoryItem({
      type: 'game',
      title: game.title,
      subtitle: game.category || 'Game',
      thumbnail: game.image || '',
      data: game,
    });
  };

  // Deep link
  useEffect(() => {
    if (!selectedGameId) return;
    const all = [
      ...truffledGames,
      ...seraphGames,
      ...ugsGames,
      ...ckvGames,
      ...hydraGames,
    ];
    const found = all.find(
      (g) => g.id === selectedGameId || g.title.toLowerCase().includes(selectedGameId.toLowerCase())
    );
    if (found) {
      handleLaunchGame(found);
    }
  }, [
    selectedGameId,
    truffledGames,
    seraphGames,
    ugsGames,
    ckvGames,
    hydraGames,
  ]);

  const toggleFullscreen = () => {
    if (!gameContainerRef.current) return;
    if (!document.fullscreenElement) {
      gameContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const totalAllGames =
    truffledGames.length +
    seraphGames.length +
    ugsGames.length +
    ckvGames.length +
    hydraGames.length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3.5 pb-20 select-none">
      {/* Top Bar: Clean source dropdown & search bar */}
      <div className="flex items-center space-x-2.5">
        {/* Source selector */}
        <select
          value={activeSource}
          onChange={(e) => setActiveSource(e.target.value as any)}
          className="bg-[#121216] border border-zinc-800 text-zinc-300 text-xs px-2.5 py-2 rounded-lg cursor-pointer focus:outline-none focus:border-zinc-700"
        >
          <option value="all">all {totalAllGames > 0 ? `(${totalAllGames})` : ''}</option>
          <option value="truffled">truffled {truffledGames.length > 0 ? `(${truffledGames.length})` : ''}</option>
          <option value="seraph">seraph {seraphGames.length > 0 ? `(${seraphGames.length})` : ''}</option>
          <option value="ugs">ugs {ugsGames.length > 0 ? `(${ugsGames.length})` : ''}</option>
          <option value="ckv">ckv {ckvGames.length > 0 ? `(${ckvGames.length})` : ''}</option>
          <option value="hydra">hydra {hydraGames.length > 0 ? `(${hydraGames.length})` : ''}</option>
          <option value="lumin">lumin</option>
        </select>

        {/* Clean search input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search..."
            className="w-full pl-8 pr-7 py-2 bg-[#121216] border border-zinc-800 focus:border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar: Count & Category Filter Tabs */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs text-zinc-400 py-1">
        <span className="text-zinc-500 font-mono text-xs shrink-0">
          {filteredGames.length} available
        </span>

        <div className="flex items-center flex-wrap gap-1">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#2f1454] text-white border border-[#5b249e]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#150a26]'
                }`}
              >
                {tab.label}
                {tab.id === 'favorites' && favorites.length > 0 && (
                  <span className="text-[10px] ml-1 text-purple-300">({favorites.length})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center space-x-2 text-zinc-400 text-xs font-bold uppercase tracking-wider pt-1">
        <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
        <span>{activeCategory === 'all' ? 'ALL GAMES' : `${activeCategory} GAMES`}</span>
      </div>

      {/* RENDER LUMIN IF ACTIVE */}
      {activeSource === 'lumin' ? (
        <LuminContainer onFallbackToHydra={() => setActiveSource('hydra')} />
      ) : (
        <>
          {/* Loading Indicator */}
          {isLoadingGames && currentCatalog.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-500 font-mono">loading games...</p>
            </div>
          )}

          {/* Empty State */}
          {filteredGames.length === 0 && !isLoadingGames && (
            <div className="py-16 text-center bg-[#0d0716] border border-[#221237] rounded-xl space-y-2">
              <Gamepad2 className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">No games found.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-mono cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Main Games Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {displayedGames.map((game, idx) => {
              const isFav = favorites.includes(game.id);
              const formattedTitle = (game.title || '').toLowerCase();

              return (
                <div
                  key={`${game.id || game.title}-${idx}`}
                  onClick={() => handleLaunchGame(game)}
                  className="flex flex-col group cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/10] bg-[#120822] border border-[#23123b] group-hover:border-[#6b21a8] rounded-xl overflow-hidden transition-colors flex items-center justify-center">
                    {game.image ? (
                      <img
                        src={game.image}
                        alt={game.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.includes('raw.githubusercontent.com') && !target.dataset.retried) {
                            target.dataset.retried = 'true';
                            target.src = target.src.replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh').replace('/main/', '/');
                            return;
                          }
                          target.style.display = 'none';
                          if (target.parentElement) {
                            const fallback = target.parentElement.querySelector('.fallback-badge');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* Fallback monogram for broken images */}
                    <div
                      className={`fallback-badge w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#140b24] ${
                        game.image ? 'hidden' : 'flex'
                      }`}
                    >
                      <Gamepad2 className="w-5 h-5 text-purple-400 mb-0.5" />
                      <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider truncate max-w-full px-1">
                        {game.title}
                      </span>
                    </div>

                    {/* Favorite Star Button */}
                    <button
                      onClick={(e) => toggleFavorite(game.id, e)}
                      className={`absolute top-1.5 right-1.5 p-1 rounded-md transition-colors cursor-pointer border ${
                        isFav
                          ? 'bg-[#3b1768] text-amber-400 border border-[#6b21a8]'
                          : 'bg-[#07030e]/80 text-zinc-500 hover:text-white border border-[#23123b]'
                      }`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-3 h-3 ${isFav ? 'fill-amber-400' : ''}`} />
                    </button>

                    {/* Subtle Hover Play Overlay */}
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-[#3c1770] border border-[#6b21a8] text-white flex items-center justify-center shadow">
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Below Image: Only Game Title */}
                  <div className="mt-1.5 text-left">
                    <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate block">
                      {formattedTitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button for Large Catalog */}
          {displayedGames.length < filteredGames.length && (
            <div className="pt-4 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 75)}
                className="px-6 py-2 bg-[#140b24] hover:bg-[#1d1033] text-purple-200 hover:text-white text-xs font-semibold rounded-lg border border-[#2b1747] hover:border-[#522394] transition-colors cursor-pointer"
              >
                Load More ({filteredGames.length - displayedGames.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Pure Game Frame with Overlapping Black Circle Close and Fullscreen Buttons */}
      <AnimatePresence>
        {playingGame && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <div
              ref={gameContainerRef}
              className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden"
            >
              {/* Floating Black Circle Controls Overlapping the Game Frame */}
              <div className="absolute top-4 right-4 flex items-center space-x-2 z-30">
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 rounded-full bg-black/85 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors shadow-lg border border-white/20"
                  title="Fullscreen"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPlayingGame(null)}
                  className="w-9 h-9 rounded-full bg-black/85 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-colors shadow-lg border border-white/20"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Game Viewport Frame */}
              <iframe
                src={playingGame.url}
                title={playingGame.title}
                className="w-full h-full border-0 bg-black"
                allowFullScreen
                allow="autoplay; payment; microphone; camera; midi; geolocation; gyroscope; accelerometer; cross-origin-isolated; encrypted-media; fullscreen"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
