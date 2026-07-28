import React, { useState, useEffect, useRef } from 'react';
import { GAMES } from '../data/portalData';
import { GameItem } from '../types';
import { Gamepad2, Search, Play, X, Maximize2, RefreshCw, Heart, Zap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Canvas Games Implementations
import { Playable2048 } from './games/Playable2048';
import { PlayableSnake } from './games/PlayableSnake';
import { PlayableFlappy } from './games/PlayableFlappy';
import { PlayableWordle } from './games/PlayableWordle';
import { PlayableSpaceInvaders } from './games/PlayableSpaceInvaders';
import { PlayableTetris } from './games/PlayableTetris';
import { PlayableDino } from './games/PlayableDino';

interface GamesViewProps {
  selectedGameId?: string;
}

export interface ExternalGame {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  source: 'noahh' | 'hydra';
  category: string;
  rating: number;
  plays: string;
}

export const GamesView: React.FC<GamesViewProps> = ({ selectedGameId }) => {
  const [activeSource, setActiveSource] = useState<'noahh' | 'hydra' | 'canvas'>('noahh');
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
    if (activeSource !== 'canvas') {
      fetchExternalGames();
    }
  }, [activeSource]);

  const toggleFavorite = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  // Determine current game list based on active source
  const getRawGameList = () => {
    if (activeSource === 'noahh') return noahhGames;
    if (activeSource === 'hydra') return hydraGames;
    return GAMES;
  };

  const rawList = getRawGameList();

  const filteredGames = rawList.filter((game: any) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderGameCanvas = (game: GameItem) => {
    switch (game.canvasGameType) {
      case '2048':
        return <Playable2048 />;
      case 'snake':
        return <PlayableSnake />;
      case 'flappy':
        return <PlayableFlappy />;
      case 'wordle':
        return <PlayableWordle />;
      case 'space_invaders':
        return <PlayableSpaceInvaders />;
      case 'tetris':
        return <PlayableTetris />;
      case 'dino':
        return <PlayableDino />;
      default:
        return <PlayableFlappy />;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Source Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
            <Gamepad2 className="w-4 h-4 animate-pulse" />
            <span>Yunø Arcade Hub • Unblocked Game Networks</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Unblocked Games</h1>
        </div>

        {/* Source Selector Pills */}
        <div className="flex items-center space-x-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveSource('noahh')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSource === 'noahh'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Noah's Source</span>
          </button>

          <button
            onClick={() => setActiveSource('hydra')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSource === 'hydra'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hydra Network</span>
          </button>

          <button
            onClick={() => setActiveSource('canvas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeSource === 'canvas'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Built-in Canvas</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={`Search ${
              activeSource === 'noahh'
                ? "Noah's catalog"
                : activeSource === 'hydra'
                ? 'Hydra Network'
                : 'Canvas games'
            }...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs font-mono text-zinc-400">
          Showing <span className="text-white font-bold">{filteredGames.length}</span> unblocked titles
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoadingGames && (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-400">Loading {activeSource === 'noahh' ? "Noah's Source" : 'Hydra Network'} CDN games...</p>
        </div>
      )}

      {/* Games Grid */}
      {!isLoadingGames && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGames.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-2xl">
              No games found matching your query.
            </div>
          ) : (
            filteredGames.map((game: any, idx: number) => (
              <div
                key={`${game.id || 'game'}-${idx}`}
                onClick={() => setPlayingGame(game)}
                className="group relative rounded-2xl p-3 bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:scale-[1.02] hover:bg-zinc-850 flex flex-col justify-between"
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                  <img
                    src={game.image || game.img}
                    alt={game.title || game.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                  <div className="absolute top-2 right-2 flex items-center space-x-1">
                    <button
                      onClick={(e) => toggleFavorite(game.id, e)}
                      className={`p-1.5 rounded-lg backdrop-blur transition-all ${
                        favorites.includes(game.id)
                          ? 'bg-rose-500 text-white'
                          : 'bg-black/60 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.includes(game.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                    {game.title || game.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{game.description}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                  <span className="uppercase tracking-wider font-mono text-[9px] text-zinc-500">
                    {game.source ? `${game.source.toUpperCase()} UNBLOCKED` : 'CANVAS'}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span>Play</span>
                    <Play className="w-3 h-3 fill-current" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Interactive Playable Game Modal */}
      <AnimatePresence>
        {playingGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <div ref={gameContainerRef} className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
              {/* Modal Window Top Header */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-white">{playingGame.title || playingGame.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 bg-emerald-500/20 rounded border border-emerald-500/30">
                    {playingGame.url ? 'CDN UNBLOCKED IFRAME' : 'CANVAS ENGINE'}
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
                {playingGame.url ? (
                  <iframe
                    src={playingGame.url}
                    title={playingGame.title || 'Unblocked Game'}
                    className="w-full h-full border-0 rounded-xl bg-black"
                    allowFullScreen
                    allow="autoplay; payment; microphone; camera; midi; geolocation; gyroscope; accelerometer; cross-origin-isolated; encrypted-media; fullscreen"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  renderGameCanvas(playingGame)
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
