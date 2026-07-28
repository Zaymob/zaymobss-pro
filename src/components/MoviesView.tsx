import React, { useState, useEffect } from 'react';
import { MOVIES } from '../data/portalData';
import { MovieItem, StreamSource } from '../types';
import { Play, Star, Film, Search, X, Heart, Tv, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MoviesViewProps {
  selectedMovieId?: string;
}

export const MoviesView: React.FC<MoviesViewProps> = ({ selectedMovieId }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMovie, setActiveMovie] = useState<MovieItem>(() => {
    if (selectedMovieId) {
      return MOVIES.find((m) => m.id === selectedMovieId) || MOVIES[0];
    }
    return MOVIES[0];
  });

  const [tmdbList, setTmdbList] = useState<MovieItem[]>(MOVIES);
  const [animeList, setAnimeList] = useState<MovieItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

  // Streaming player state
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<StreamSource>('vidcore');
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Fetch TMDB or AniList
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoadingList(true);
      try {
        if (filterCategory === 'anime') {
          const res = await fetch('/api/anime/trending');
          if (res.ok) {
            const data = await res.json();
            if (data.anime && Array.isArray(data.anime)) {
              setAnimeList(data.anime);
              if (data.anime.length > 0 && (!activeMovie || activeMovie.mediaType !== 'anime')) {
                setActiveMovie(data.anime[0]);
              }
            }
          }
        } else {
          const res = await fetch('/api/tmdb/trending');
          if (res.ok) {
            const data = await res.json();
            if (data.results && Array.isArray(data.results)) {
              const parsedItems: MovieItem[] = data.results.slice(0, 20).map((item: any) => ({
                id: `tmdb-${item.id}`,
                tmdbId: item.id,
                mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
                title: item.title || item.name || 'Untitled',
                year: item.release_date
                  ? new Date(item.release_date).getFullYear()
                  : item.first_air_date
                  ? new Date(item.first_air_date).getFullYear()
                  : 2024,
                rating: Math.round((item.vote_average || 8.0) * 10) / 10,
                category: item.media_type === 'tv' ? 'shows' : 'trending',
                image: item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
                backdrop: item.backdrop_path
                  ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                  : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
                description: item.overview || 'No synopsis provided.',
                genres: [item.media_type === 'tv' ? 'TV Series' : 'Blockbuster'],
                duration: item.media_type === 'tv' ? 'TV Series' : '2h 15m',
                seasonsCount: 5,
              }));
              if (parsedItems.length > 0) {
                setTmdbList([...parsedItems, ...MOVIES]);
              }
            }
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsLoadingList(false);
      }
    };

    fetchContent();
  }, [filterCategory, selectedMovieId]);

  // Handle Search
  const handleSearchSubmit = async (queryStr: string) => {
    setSearchQuery(queryStr);
    if (!queryStr.trim()) return;

    try {
      setIsLoadingList(true);
      if (filterCategory === 'anime') {
        const res = await fetch(`/api/anime/search?query=${encodeURIComponent(queryStr)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.anime) setAnimeList(data.anime);
        }
      } else {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(queryStr)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const searchResults: MovieItem[] = data.results.slice(0, 16).map((item: any) => ({
              id: `tmdb-search-${item.id}`,
              tmdbId: item.id,
              mediaType: item.media_type === 'tv' ? 'tv' : 'movie',
              title: item.title || item.name || 'Untitled',
              year: item.release_date
                ? new Date(item.release_date).getFullYear()
                : item.first_air_date
                ? new Date(item.first_air_date).getFullYear()
                : 2024,
              rating: Math.round((item.vote_average || 7.5) * 10) / 10,
              category: item.media_type === 'tv' ? 'shows' : 'trending',
              image: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
              backdrop: item.backdrop_path
                ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
                : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
              description: item.overview || 'No synopsis provided.',
              genres: ['Search Result'],
              duration: item.media_type === 'tv' ? 'TV Series' : 'Movie',
            }));
            if (searchResults.length > 0) setTmdbList(searchResults);
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const getActiveDisplayList = () => {
    if (filterCategory === 'anime') return animeList;
    if (filterCategory === 'watchlist') {
      return [...tmdbList, ...animeList].filter((m) => watchlist.includes(m.id));
    }
    return tmdbList.filter((movie) => {
      if (filterCategory === 'all') return true;
      if (filterCategory === 'shows') return movie.mediaType === 'tv' || movie.duration.includes('Series');
      return movie.category === filterCategory;
    });
  };

  const currentDisplayList = getActiveDisplayList();

  const toggleWatchlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Build stream embed URL based on selected source and media type
  const getStreamEmbedUrl = (movie: MovieItem) => {
    const isAnime = movie.mediaType === 'anime' || movie.category === 'anime' || filterCategory === 'anime';
    const animeId = movie.anilistId || movie.tmdbId || 21;

    if (isAnime || selectedSource === 'streamrip-anime') {
      return `https://streamrip.fun/anime/${animeId}/${episode}`;
    }

    const tmdbId = movie.tmdbId || 550;
    const isTv = movie.mediaType === 'tv' || movie.duration.includes('Series');

    switch (selectedSource) {
      case 'vidcore':
        return isTv
          ? `https://vidcore.net/tv/${tmdbId}/${season}/${episode}?autoPlay=true`
          : `https://vidcore.net/movie/${tmdbId}?autoPlay=true`;
      case 'streamrip':
        return isTv
          ? `https://streamrip.fun/play?type=tv&id=${tmdbId}&season=${season}&episode=${episode}`
          : `https://streamrip.fun/play?type=movie&id=${tmdbId}`;
      case 'viduki':
        return isTv
          ? `https://viduki.net/1/tv/${tmdbId}/${season}/${episode}?color=06b6d4`
          : `https://viduki.net/1/movie/${tmdbId}?color=06b6d4`;
      case 'vidsrc':
        return isTv
          ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`
          : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
      default:
        return `https://vidcore.net/movie/${tmdbId}?autoPlay=true`;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <Film className="w-4 h-4" />
            <span>Yunø Flix • TMDB & AniList Streaming Vault</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">4K Cinema & Anime Vault</h1>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder={filterCategory === 'anime' ? "Search AniList anime..." : "Search TMDB movies & TV shows..."}
              value={searchQuery}
              onChange={(e) => handleSearchSubmit(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Featured Hero Backdrop Banner */}
      {activeMovie && (
        <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 min-h-[380px] flex items-end p-6 sm:p-10 shadow-2xl">
          <img
            src={activeMovie.backdrop || activeMovie.image}
            alt={activeMovie.title}
            className="absolute inset-0 w-full h-full object-cover opacity-45 blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex items-center space-x-3 text-xs font-semibold font-mono flex-wrap gap-y-1">
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                <Star className="w-3 h-3 fill-current" />
                <span>{activeMovie.rating} Rating</span>
              </span>
              <span className="text-zinc-300">{activeMovie.year}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300">{activeMovie.duration}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-cyan-400">{activeMovie.genres.join(', ')}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {activeMovie.title}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed">
              {activeMovie.description}
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  if (activeMovie.mediaType === 'anime' || activeMovie.category === 'anime' || filterCategory === 'anime') {
                    setSelectedSource('streamrip-anime');
                  } else {
                    setSelectedSource('vidcore');
                  }
                  setIsPlayerOpen(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2 hover:scale-105"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {activeMovie.mediaType === 'anime' || filterCategory === 'anime'
                    ? 'Watch on StreamRip Anime'
                    : 'Stream Movie / Show'}
                </span>
              </button>

              <button
                onClick={(e) => toggleWatchlist(activeMovie.id, e)}
                className={`px-4 py-3 rounded-xl text-xs font-medium border transition-colors flex items-center space-x-1.5 ${
                  watchlist.includes(activeMovie.id)
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    watchlist.includes(activeMovie.id) ? 'fill-current text-rose-400' : ''
                  }`}
                />
                <span>{watchlist.includes(activeMovie.id) ? 'Saved' : 'Watchlist'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'all', name: 'All Blockbusters' },
          { id: 'anime', name: '✨ AniList Anime' },
          { id: 'shows', name: '📺 TV Series' },
          { id: 'trending', name: '🔥 TMDB Trending' },
          { id: 'watchlist', name: `❤️ Watchlist (${watchlist.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              filterCategory === tab.id
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Media Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {currentDisplayList.map((movie) => (
          <div
            key={movie.id}
            onClick={() => {
              setActiveMovie(movie);
              if (movie.mediaType === 'anime' || movie.category === 'anime' || filterCategory === 'anime') {
                setSelectedSource('streamrip-anime');
              }
              setIsPlayerOpen(true);
            }}
            className="group relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-105 shadow-lg flex flex-col justify-between"
          >
            <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-800">
              <img
                src={movie.image}
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-amber-400 font-bold border border-amber-500/30 flex items-center space-x-1">
                <Star className="w-3 h-3 fill-current" />
                <span>{movie.rating}</span>
              </div>

              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300 font-bold border border-cyan-500/30">
                {movie.mediaType === 'anime' || movie.category === 'anime' ? 'ANILIST' : movie.year}
              </div>

              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-cyan-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
            </div>

            <div className="p-3">
              <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                {movie.title}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{movie.genres.join(', ')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Video Streaming Modal */}
      <AnimatePresence>
        {isPlayerOpen && activeMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
              {/* Header Bar */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/90">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>{activeMovie.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 uppercase">
                        {activeMovie.mediaType === 'anime' || filterCategory === 'anime' ? 'ANILIST ANIME' : activeMovie.mediaType === 'tv' ? 'TV SERIES' : 'MOVIE'}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      {activeMovie.anilistId ? `AniList ID: ${activeMovie.anilistId}` : `TMDB ID: ${activeMovie.tmdbId || 'N/A'}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPlayerOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source & Episode Controls */}
              <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-zinc-400 font-bold uppercase">Stream Source:</span>
                  {[
                    { id: 'streamrip-anime', name: 'StreamRip Anime (AniList)' },
                    { id: 'vidcore', name: 'VidCore' },
                    { id: 'streamrip', name: 'StreamRip' },
                    { id: 'vidsrc', name: 'Vidsrc Pro' },
                  ].map((src) => (
                    <button
                      key={src.id}
                      onClick={() => setSelectedSource(src.id as StreamSource)}
                      className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                        selectedSource === src.id
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {src.name}
                    </button>
                  ))}
                </div>

                {/* Episode Selector for Anime / TV */}
                {(activeMovie.mediaType === 'anime' || activeMovie.mediaType === 'tv' || filterCategory === 'anime' || selectedSource === 'streamrip-anime') && (
                  <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <span className="text-zinc-400 font-mono">Episode:</span>
                    <select
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="bg-zinc-900 text-cyan-400 font-bold rounded px-2.5 py-1 border border-zinc-700 focus:outline-none"
                    >
                      {Array.from({ length: activeMovie.episodesCount || 24 }, (_, i) => i + 1).map((ep) => (
                        <option key={ep} value={ep}>
                          Episode {ep}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Video Iframe Embed */}
              <div className="w-full aspect-video bg-black relative">
                <iframe
                  src={getStreamEmbedUrl(activeMovie)}
                  title={activeMovie.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write; display-capture; fullscreen"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="p-3 bg-zinc-900/90 text-xs text-zinc-400 flex items-center justify-between">
                <span>
                  Source: <span className="text-cyan-400 font-bold uppercase">{selectedSource}</span>
                </span>
                <span>Playing Episode {episode} via StreamRip / AniList Integration</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
