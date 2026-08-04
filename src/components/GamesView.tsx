import React, { useState, useEffect, useRef } from 'react';
import { GAMES } from '../data/portalData';
import { GameItem } from '../types';
import { Gamepad2, Search, Play, X, Maximize2, RefreshCw, Heart, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GamesViewProps {
  selectedGameId?: string;
}

export interface ExternalGame {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  source: 'noahh' | 'hydra' | 'lumin';
  category: string;
  rating: number;
  plays: string;
}

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
          console.error("Lumin SDK init error:", e);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // External loaded games state
  const [noahhGames, setNoahhGames] = useState<ExternalGame[]>([]);
  const [hydraGames, setHydraGames] = useState<ExternalGame[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);

  // Active modal game state
  const [playingGame, setPlayingGame] = useState<any | null>(() => {
    if (selectedGameId) {
      return GAMES.find((g) => g.id === selectedGameId) || null;
    }
    return null;
  });

  const gameContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (gameContainerRef.current) {
      if (!document.fullscreenElement) {
        gameContainerRef.current.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request error:", err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen error:", err);
        });
      }
    }
  };

  const fetchExternalGames = async () => {
    setIsLoadingGames(true);
    try {
      if (activeSource === 'noahh' && noahhGames.length === 0) {
        const res = await fetch('/api/games/noahh');
        if (res.ok) {
          const data = await res.json();
          setNoahhGames(data.games || []);
        }
      } else if (activeSource === 'hydra' && hydraGames.length === 0) {
        const res = await fetch('/api/games/hydra');
        if (res.ok) {
          const data = await res.json();
          setHydraGames(data.games || []);
        }
      }
    } catch (err) {
      console.error('Error fetching external games:', err);
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    fetchExternalGames();
  }, [activeSource]);

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  // Determine current game list based on active source
  const getRawGameList = () => {
    if (activeSource === 'hydra') return hydraGames;
    return noahhGames.length > 0 ? noahhGames : GAMES;
  };

  const rawList = getRawGameList();

  const filteredGames = rawList.filter((game: any) => {
    const matchesSearch = (game.title || game.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Source Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Unblocked Games</h1>
          <p className="text-xs text-zinc-400 mt-1">Select your preferred game provider source below</p>
        </div>

        {/* Source Selector Pills */}
        <div className="flex items-center space-x-2 bg-[#181818] p-1.5 rounded-full border border-zinc-800">
          <button
            onClick={() => setActiveSource('noahh')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSource === 'noahh'
                ? 'bg-amber-400 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Noah's Catalog</span>
          </button>

          <button
            onClick={() => setActiveSource('hydra')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSource === 'hydra'
                ? 'bg-amber-400 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hydra Network</span>
          </button>

          <button
            onClick={() => setActiveSource('lumin')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSource === 'lumin'
                ? 'bg-amber-400 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Lumin Source</span>
          </button>
        </div>
      </div>

      {/* RENDER LUMIN SDK SOURCE IF ACTIVE */}
      {activeSource === 'lumin' ? (
        <LuminContainer />
      ) : (
        <>
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={`Search ${
                  activeSource === 'noahh'
                    ? "Noah's catalog"
                    : 'Hydra Network'
                }...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#181818] border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-sans"
              />
            </div>

            <div className="text-xs font-medium text-zinc-400">
              Showing <span className="text-white font-bold">{filteredGames.length}</span> unblocked titles
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingGames && (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading {activeSource === 'noahh' ? "Noah's Source" : 'Hydra Network'} CDN games...</p>
            </div>
          )}

          {/* Game Cards Grid */}
          {!isLoadingGames && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5">
              {filteredGames.map((game: any, idx: number) => {
                const isFav = favorites.includes(game.id || idx.toString());
                return (
                  <div
                    key={`${game.id || 'game'}-${idx}`}
                    onClick={() => setPlayingGame(game)}
                    className="group relative p-3 bg-[#181818] border border-zinc-800 hover:border-amber-400/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between shadow-xl"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-zinc-900 relative">
                      <img
                        src={game.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'}
                        alt={game.title || game.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      <div className="absolute top-2 right-2 flex items-center space-x-1">
                        <button
                          onClick={(e) => toggleFavorite(game.id || idx.toString(), e)}
                          className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors ${
                            isFav
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                              : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    <div className="mt-3">
                      <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {game.title || game.name}
                      </h3>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{game.description}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                      <span className="uppercase tracking-wider font-mono text-[9px] text-zinc-500">
                        {game.source ? `${game.source.toUpperCase()} UNBLOCKED` : 'UNBLOCKED GAME'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span>Play</span>
                        <Play className="w-3 h-3 fill-current" />
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  <span className="text-sm font-bold text-white">{playingGame.title || playingGame.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">
                    CDN UNBLOCKED GAME
                  </span>
                </div>

                <div className="flex items-center space-x-2">
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
                <iframe
                  src={playingGame.url || playingGame.embedUrl}
                  title={playingGame.title || 'Unblocked Game'}
                  className="w-full h-full border-0 rounded-xl bg-black"
                  allowFullScreen
                  allow="autoplay; payment; microphone; camera; midi; geolocation; gyroscope; accelerometer; cross-origin-isolated; encrypted-media; fullscreen"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
