import React, { useState, useEffect, useRef } from 'react';
import { MOVIES } from '../data/portalData';
import { MovieItem, StreamSource } from '../types';
import {
  Play,
  Star,
  FilmStrip as Film,
  MagnifyingGlass as Search,
  X,
  Heart,
  Television as Tv,
  Info,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  Plus,
  Check,
  SpeakerHigh as Volume2,
  SpeakerSlash as VolumeX,
  FilmSlate as Clapperboard,
  Flame,
  Lightning as Zap,
  TrendUp as TrendingUp,
  ArrowClockwise as RefreshCw,
  ArrowSquareOut as ExternalLink,
  CornersOut as Maximize2,
  WarningCircle as AlertCircle,
  TelevisionSimple as Tv2,
  ShieldCheck,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface MoviesViewProps {
  selectedMovieId?: string;
}

const FEATURED_MEDIA_DICT: Record<string, MovieItem> = {
  'movie-1': {
    id: 'tmdb-569094',
    tmdbId: 569094,
    mediaType: 'movie',
    title: 'Spider-Man: Across the Spider-Verse',
    year: 2023,
    rating: 8.8,
    category: 'movies',
    image: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj7sM48.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nnLOuh2A3P33C33C33C33.jpg',
    description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    genres: ['Animation', 'Action', 'Adventure'],
    duration: '2h 20m',
  },
  'movie-2': {
    id: 'tmdb-2232',
    tmdbId: 2232,
    mediaType: 'tv',
    title: 'The Boondocks',
    year: 2005,
    rating: 8.6,
    category: 'shows',
    image: 'https://image.tmdb.org/t/p/w500/bJ8K0h0j0d0j0d0j0d0j0d0j0d0.jpg',
    backdrop: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    description: 'Based on the satiric strip, two young brothers move from Chicago to Woodcrest, living with their grandfather Huey and Riley.',
    genres: ['Animation', 'Comedy'],
    duration: 'TV Series',
    seasonsCount: 4,
  },
  'movie-3': {
    id: 'anilist-20',
    tmdbId: 20,
    anilistId: 20,
    mediaType: 'anime',
    title: 'Death Note',
    year: 2006,
    rating: 8.7,
    category: 'anime',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
    backdrop: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    description: 'Light Yagami finds a high school notebook that grants the ability to kill anyone whose name is written in it.',
    genres: ['Anime', 'Psychological', 'Thriller'],
    duration: '37 Episodes',
  },
};

const STREAM_SERVERS: Array<{ id: StreamSource; label: string }> = [
  { id: 'vidcore', label: 'VidCore' },
  { id: 'vidfast', label: 'VidFast' },
  { id: 'streamrip', label: 'StreamRip' },
  { id: 'viduki', label: 'VidUki' },
  { id: 'vidsrc', label: 'VidSrc' },
  { id: 'streamrip-anime', label: 'StreamRip Anime' },
];

export const MoviesView: React.FC<MoviesViewProps> = ({ selectedMovieId }) => {
  // Navigation & Category filter
  const [activeCategory, setActiveCategory] = useState<'all' | 'shows' | 'movies' | 'anime' | 'watchlist'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live content lists from TMDB and AniList
  const [trendingList, setTrendingList] = useState<MovieItem[]>([]);
  const [popularMoviesList, setPopularMoviesList] = useState<MovieItem[]>([]);
  const [popularTvList, setPopularTvList] = useState<MovieItem[]>([]);
  const [topRatedList, setTopRatedList] = useState<MovieItem[]>([]);
  const [actionList, setActionList] = useState<MovieItem[]>([]);
  const [sciFiList, setSciFiList] = useState<MovieItem[]>([]);
  const [animeList, setAnimeList] = useState<MovieItem[]>([]);
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Hero Movie for Top Billboard
  const [heroMovie, setHeroMovie] = useState<MovieItem | null>(null);

  // Streaming player state
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [modalMovie, setModalMovie] = useState<MovieItem | null>(null);
  const [selectedSource, setSelectedSource] = useState<StreamSource>('vidcore');
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_watchlist');
      return saved ? JSON.parse(saved) : ['tmdb-155'];
    } catch (e) {
      return ['tmdb-155'];
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [episodesList, setEpisodesList] = useState<Array<{ episode_number: number; name: string; overview?: string; still_path?: string }>>([]);

  // Refs for horizontal scroll carousels
  const rowRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollRow = (rowKey: string, direction: 'left' | 'right') => {
    const rowEl = rowRefs.current[rowKey];
    if (rowEl) {
      const scrollAmount = direction === 'left' ? -rowEl.clientWidth * 0.75 : rowEl.clientWidth * 0.75;
      rowEl.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Save Watchlist to localStorage
  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('yuno_watchlist', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // Helper to map TMDB item to clean MovieItem
  const mapTmdbItem = (item: any, defaultType: 'movie' | 'tv' = 'movie', genreTag: string = 'Blockbuster'): MovieItem => {
    const isTv = item.media_type === 'tv' || defaultType === 'tv' || !!item.first_air_date || !!item.name;
    const year = item.release_date
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date
      ? new Date(item.first_air_date).getFullYear()
      : 2024;

    return {
      id: `tmdb-${item.id}`,
      tmdbId: item.id,
      mediaType: isTv ? 'tv' : 'movie',
      title: item.title || item.name || 'Untitled Title',
      year,
      rating: Math.round((item.vote_average || 8.0) * 10) / 10,
      category: isTv ? 'shows' : 'trending',
      image: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      backdrop: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
      description: item.overview || 'An extraordinary Netflix story of survival, power, and unexpected discoveries.',
      genres: item.genre_ids ? [genreTag] : [isTv ? 'TV Series' : 'Cinema'],
      duration: isTv ? 'TV Series' : '2h 15m',
      seasonsCount: isTv ? 4 : undefined,
    };
  };

  // Load Initial Netflix Catalog Rows
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadAllRows = async () => {
      try {
        // 1. Trending
        const resTrending = await fetch('/api/tmdb/trending');
        if (resTrending.ok) {
          const data = await resTrending.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, i.media_type || 'movie', 'Trending'));
            if (isMounted && mapped.length > 0) {
              setTrendingList(mapped);
              if (!heroMovie || heroMovie.id === 'tmdb-155') {
                setHeroMovie(mapped[0]);
              }
            }
          }
        }

        // 2. Popular Movies
        const resPopMovies = await fetch('/api/tmdb/popular_movies');
        if (resPopMovies.ok) {
          const data = await resPopMovies.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, 'movie', 'Popular Movie'));
            if (isMounted) setPopularMoviesList(mapped);
          }
        }

        // 3. Popular TV
        const resPopTv = await fetch('/api/tmdb/popular_tv');
        if (resPopTv.ok) {
          const data = await resPopTv.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, 'tv', 'Hit Series'));
            if (isMounted) setPopularTvList(mapped);
          }
        }

        // 4. Top Rated
        const resTop = await fetch('/api/tmdb/top_rated');
        if (resTop.ok) {
          const data = await resTop.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, 'movie', 'Top Rated'));
            if (isMounted) setTopRatedList(mapped);
          }
        }

        // 5. Action (Genre 28)
        const resAction = await fetch('/api/tmdb/discover?genre=28');
        if (resAction.ok) {
          const data = await resAction.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, 'movie', 'Action'));
            if (isMounted) setActionList(mapped);
          }
        }

        // 6. Sci-Fi (Genre 878)
        const resSciFi = await fetch('/api/tmdb/discover?genre=878');
        if (resSciFi.ok) {
          const data = await resSciFi.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 20).map((i: any) => mapTmdbItem(i, 'movie', 'Sci-Fi'));
            if (isMounted) setSciFiList(mapped);
          }
        }

        // 7. Anime Vault (AniList)
        const resAnime = await fetch('/api/anime/trending');
        if (resAnime.ok) {
          const data = await resAnime.json();
          if (data.anime && Array.isArray(data.anime)) {
            if (isMounted) setAnimeList(data.anime);
          }
        }
      } catch (err) {
        console.error('Error fetching Netflix catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAllRows();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle selected movie / show / anime selection from HomeView
  useEffect(() => {
    if (!selectedMovieId) return;

    if (FEATURED_MEDIA_DICT[selectedMovieId]) {
      const item = FEATURED_MEDIA_DICT[selectedMovieId];
      setModalMovie(item);
      setIsInfoModalOpen(true);
      return;
    }

    const allMovies = [
      ...trendingList,
      ...popularMoviesList,
      ...popularTvList,
      ...animeList,
      ...topRatedList,
      ...actionList,
      ...sciFiList,
    ];

    const found = allMovies.find(
      (m) => m.id === selectedMovieId || (m.tmdbId && `tmdb-${m.tmdbId}` === selectedMovieId)
    );

    if (found) {
      setModalMovie(found);
      setIsInfoModalOpen(true);
    } else {
      const queryTitle = selectedMovieId.replace(/[-_]/g, ' ');
      fetch(`/api/tmdb/search?query=${encodeURIComponent(queryTitle)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            const mapped = mapTmdbItem(data.results[0], data.results[0].media_type || 'movie', 'Featured');
            setModalMovie(mapped);
            setIsInfoModalOpen(true);
          }
        })
        .catch(() => {});
    }
  }, [selectedMovieId, trendingList, popularMoviesList, popularTvList, animeList]);

  // Handle Live Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped = data.results.slice(0, 24).map((i: any) => mapTmdbItem(i, i.media_type || 'movie', 'Search Match'));
            setSearchResults(mapped);
          }
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch TV episodes when modal TV show or season changes
  useEffect(() => {
    if (modalMovie && modalMovie.mediaType === 'tv' && modalMovie.tmdbId) {
      fetch(`/api/tmdb/tv_season?id=${modalMovie.tmdbId}&season=${season}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.episodes && Array.isArray(data.episodes)) {
            setEpisodesList(data.episodes);
          } else {
            setEpisodesList([]);
          }
        })
        .catch(() => setEpisodesList([]));
    }
  }, [modalMovie, season]);

  // Stream URL builder
  const getStreamRawUrl = (movie: MovieItem | null): string => {
    if (!movie) return '';
    const isAnime = movie.mediaType === 'anime' || movie.category === 'anime' || activeCategory === 'anime';
    const animeId = movie.anilistId || movie.tmdbId || 20;

    if (isAnime || selectedSource === 'streamrip-anime') {
      return `https://streamrip.fun/anime/${animeId}/${episode}`;
    }

    const tmdbId = movie.tmdbId || 550;
    const isTv = movie.mediaType === 'tv' || movie.duration?.includes('Series');

    switch (selectedSource) {
      case 'vidfast':
        return isTv
          ? `https://vidfast.vc/tv/${tmdbId}/${season}/${episode}?autoPlay=true`
          : `https://vidfast.vc/movie/${tmdbId}?autoPlay=true`;
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
        return isTv
          ? `https://vidcore.net/tv/${tmdbId}/${season}/${episode}?autoPlay=true`
          : `https://vidcore.net/movie/${tmdbId}?autoPlay=true`;
    }
  };

  const getStreamEmbedUrl = (movie: MovieItem | null): string => {
    const raw = getStreamRawUrl(movie);
    if (!raw) return '';
    return `/api/stream/proxy?url=${encodeURIComponent(raw)}`;
  };

  const openPlayMovie = (movie: MovieItem) => {
    setModalMovie(movie);
    setIframeKey((k) => k + 1);
    setIsIframeLoading(true);
    const isTv = movie.mediaType === 'tv' || movie.duration?.includes('Series');
    const isAnime = movie.mediaType === 'anime' || movie.category === 'anime' || activeCategory === 'anime';

    if (isAnime) {
      setSelectedSource('streamrip-anime');
    } else if (selectedSource === 'streamrip-anime') {
      setSelectedSource('vidcore');
    }

    // Fetch official HD Trailer in background
    if (movie.tmdbId) {
      fetch(`/api/tmdb/trailer?id=${movie.tmdbId}&type=${isTv ? 'tv' : 'movie'}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.key) {
            setTrailerKey(data.key);
          } else {
            setTrailerKey(null);
          }
        })
        .catch(() => setTrailerKey(null));
    } else {
      setTrailerKey(null);
    }

    setSeason(1);
    setEpisode(1);
    setIsPlayerOpen(true);
  };

  const openMoreInfo = (movie: MovieItem) => {
    setModalMovie(movie);
    setSeason(1);
    setEpisode(1);
    setIsInfoModalOpen(true);
  };

  // Combine all loaded movies for Watchlist filtering (deduplicated by id)
  const allLoadedMoviesMap = new Map<string, MovieItem>();
  [
    ...MOVIES,
    ...trendingList,
    ...popularMoviesList,
    ...popularTvList,
    ...topRatedList,
    ...actionList,
    ...sciFiList,
    ...animeList,
  ].forEach((m) => {
    if (m && m.id && !allLoadedMoviesMap.has(m.id)) {
      allLoadedMoviesMap.set(m.id, m);
    }
  });

  const watchlistMovies = watchlist
    .filter((id, index) => watchlist.indexOf(id) === index)
    .map((id) => allLoadedMoviesMap.get(id))
    .filter((m): m is MovieItem => Boolean(m));

  return (
    <div className="w-full max-w-full lg:max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-16 min-w-0 text-white">
      {/* YUNØFLIX BRANDING & TOP CONTROL BAR */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 -mx-3 sm:-mx-5 lg:-mx-8 px-3 sm:px-5 lg:px-8 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-4 overflow-x-auto scrollbar-none py-1">
          {/* YUNØFLIX Brand Logo */}
          <div className="flex items-center space-x-2 flex-shrink-0 cursor-pointer" onClick={() => setActiveCategory('all')}>
            <span className="font-black text-2xl text-white tracking-wider flex items-center">
              YUNØ<span className="text-red-600 ml-1">FLIX</span>
            </span>
            <span className="text-[10px] font-mono py-0.5 px-2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">PORTAL</span>
          </div>

          {/* Navigation Category Tabs */}
          <nav className="flex items-center space-x-1.5 flex-shrink-0">
            {[
              { id: 'all', label: 'Home' },
              { id: 'shows', label: 'TV Shows' },
              { id: 'movies', label: 'Movies' },
              { id: 'anime', label: 'Anime' },
              { id: 'watchlist', label: `My List (${watchlist.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id as any);
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeCategory === tab.id
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Search Input & Stream Source Selector */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative flex-1 md:w-64 min-w-[160px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search movies, TV, anime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stream Server Source Selector Dropdown */}
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase hidden sm:inline">Source:</span>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value as StreamSource);
                setIframeKey((k) => k + 1);
              }}
              className="bg-transparent text-white font-mono text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {STREAM_SERVERS.map((src) => (
                <option key={src.id} value={src.id} className="bg-zinc-900 text-white">
                  {src.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SEARCH RESULTS VIEW (IF SEARCH QUERY IS TYPED) */}
      {searchQuery.trim() !== '' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Search className="w-4 h-4 text-red-500" />
              <span>Search Results for "{searchQuery}"</span>
            </h2>
            <span className="text-xs text-zinc-400">{searchResults.length} titles found</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {searchResults.map((item, idx) => (
              <div
                key={`search-${item.id}-${idx}`}
                onClick={() => openMoreInfo(item)}
                className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-red-600/80 cursor-pointer transition-all hover:scale-105 shadow-xl flex flex-col justify-between"
              >
                <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-800">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{item.rating}</span>
                  </div>
                  <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="p-2.5">
                  <h4 className="text-xs font-bold text-white group-hover:text-red-400 truncate">{item.title}</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{item.year} • {item.genres[0] || 'HD'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* NETFLIX HERO BILLBOARD FEATURED BANNER */}
          {heroMovie && activeCategory === 'all' && (
            <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-950 min-h-[340px] sm:min-h-[420px] lg:min-h-[480px] flex items-end p-5 sm:p-8 lg:p-12 shadow-2xl group">
              {/* High-Res Hero Backdrop Image */}
              <img
                src={heroMovie.backdrop || heroMovie.image}
                alt={heroMovie.title}
                className="absolute inset-0 w-full h-full object-cover opacity-60 filter contrast-110 brightness-90 group-hover:scale-105 transition-transform duration-1000 ease-out"
              />

              {/* Cinematic Netflix Gradient Vignette (Fade down and fade left) */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent w-full lg:w-3/4" />

              {/* Hero Content Information */}
              <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
                {/* Feature Tag */}
                <div className="flex items-center space-x-2 text-xs font-black tracking-widest text-red-500 uppercase font-mono">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span>FEATURED TITLE</span>
                </div>

                {/* Hero Title */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-xl">
                  {heroMovie.title}
                </h1>

                {/* Metadata Badges */}
                <div className="flex items-center space-x-2.5 text-xs font-semibold flex-wrap gap-y-1">
                  <span className="text-emerald-400 font-bold font-mono">98% Match</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
                    {heroMovie.year}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-zinc-600 text-zinc-300 text-[10px] font-mono uppercase font-bold">
                    TV-MA / 4K
                  </span>
                  <span className="text-zinc-400 font-mono text-[11px]">{heroMovie.duration}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-red-400 font-medium">{heroMovie.genres.join(', ')}</span>
                </div>

                {/* Overview Description */}
                <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed max-w-xl drop-shadow">
                  {heroMovie.description}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={() => openPlayMovie(heroMovie)}
                    className="px-6 py-3 bg-white hover:bg-zinc-200 text-black font-black text-xs sm:text-sm rounded-xl shadow-2xl transition-all flex items-center space-x-2 hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    <span>Play / Stream</span>
                  </button>

                  <button
                    onClick={() => openMoreInfo(heroMovie)}
                    className="px-5 py-3 bg-zinc-800/80 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm rounded-xl backdrop-blur-md border border-zinc-700 transition-all flex items-center space-x-2 hover:scale-105 active:scale-95"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-300" />
                    <span>More Info</span>
                  </button>

                  <button
                    onClick={(e) => toggleWatchlist(heroMovie.id, e)}
                    className={`p-3 rounded-xl border backdrop-blur-md transition-all ${
                      watchlist.includes(heroMovie.id)
                        ? 'bg-red-600/30 text-red-400 border-red-500'
                        : 'bg-zinc-900/80 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                    title="Add to My List"
                  >
                    {watchlist.includes(heroMovie.id) ? (
                      <Check className="w-5 h-5 text-red-400" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-3 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-700 transition-all"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* NETFLIX HORIZONTAL CAROUSEL ROWS */}
          <div className="space-y-8">
            {/* ROW 1: TRENDING NOW */}
            {(activeCategory === 'all' || activeCategory === 'movies') && (
              <NetflixRow
                title="Trending Now"
                icon={<Flame className="w-4 h-4 text-red-500" />}
                movies={trendingList}
                rowKey="trending"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 2: POPULAR BLOCKBUSTERS */}
            {(activeCategory === 'all' || activeCategory === 'movies') && popularMoviesList.length > 0 && (
              <NetflixRow
                title="Popular Movies"
                icon={<Clapperboard className="w-4 h-4 text-red-500" />}
                movies={popularMoviesList}
                rowKey="popular_movies"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 3: TOP TV SERIES */}
            {(activeCategory === 'all' || activeCategory === 'shows') && popularTvList.length > 0 && (
              <NetflixRow
                title="Popular TV Shows"
                icon={<Tv className="w-4 h-4 text-red-500" />}
                movies={popularTvList}
                rowKey="popular_tv"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 4: ANIME VAULT */}
            {(activeCategory === 'all' || activeCategory === 'anime') && animeList.length > 0 && (
              <NetflixRow
                title="Trending Anime Vault"
                icon={<Tv2 className="w-4 h-4 text-red-400" />}
                movies={animeList}
                rowKey="anime"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 5: ACTION & THRILLERS */}
            {(activeCategory === 'all' || activeCategory === 'movies') && actionList.length > 0 && (
              <NetflixRow
                title="Action & Thrillers"
                icon={<Zap className="w-4 h-4 text-amber-400" />}
                movies={actionList}
                rowKey="action"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 6: SCI-FI & FANTASY */}
            {(activeCategory === 'all' || activeCategory === 'movies') && sciFiList.length > 0 && (
              <NetflixRow
                title="Sci-Fi & Fantasy"
                icon={<Film className="w-4 h-4 text-zinc-300" />}
                movies={sciFiList}
                rowKey="scifi"
                rowRefs={rowRefs}
                scrollRow={scrollRow}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                onPlay={openPlayMovie}
                onInfo={openMoreInfo}
              />
            )}

            {/* ROW 7: MY WATCHLIST */}
            {(activeCategory === 'all' || activeCategory === 'watchlist') && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-500 fill-current" />
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">My List</h2>
                </div>

                {watchlistMovies.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                    <p className="text-xs text-zinc-400">Your Watchlist is empty.</p>
                    <p className="text-[11px] text-zinc-500">Click the "+" icon on any movie or TV show to save it here.</p>
                  </div>
                ) : (
                  <NetflixRow
                    title=""
                    movies={watchlistMovies}
                    rowKey="watchlist"
                    rowRefs={rowRefs}
                    scrollRow={scrollRow}
                    watchlist={watchlist}
                    toggleWatchlist={toggleWatchlist}
                    onPlay={openPlayMovie}
                    onInfo={openMoreInfo}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* NETFLIX "MORE INFO" DIALOG MODAL */}
      <AnimatePresence>
        {isInfoModalOpen && modalMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsInfoModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl space-y-6 my-auto"
            >
              {/* Modal Backdrop Banner */}
              <div className="relative h-64 sm:h-96 w-full bg-zinc-900">
                <img
                  src={modalMovie.backdrop || modalMovie.image}
                  alt={modalMovie.title}
                  className="w-full h-full object-cover filter contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                <button
                  onClick={() => setIsInfoModalOpen(false)}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 text-zinc-300 hover:text-white hover:bg-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-6 left-6 right-6 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-red-500 font-extrabold uppercase">
                    <span>YUNØFLIX STREAMING</span>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black text-white">{modalMovie.title}</h2>

                  <div className="flex items-center space-x-3 pt-1">
                    <button
                      onClick={() => {
                        setIsInfoModalOpen(false);
                        openPlayMovie(modalMovie);
                      }}
                      className="px-6 py-2.5 bg-white text-black font-black text-xs sm:text-sm rounded-xl shadow-lg hover:bg-zinc-200 transition-all flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play / Stream Now</span>
                    </button>

                    <button
                      onClick={(e) => toggleWatchlist(modalMovie.id, e)}
                      className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white hover:bg-zinc-800 transition-colors"
                    >
                      {watchlist.includes(modalMovie.id) ? <Check className="w-5 h-5 text-red-400" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body Details */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center space-x-3 text-xs font-semibold font-mono">
                      <span className="text-emerald-400 font-bold">98% Match</span>
                      <span className="text-zinc-400">{modalMovie.year}</span>
                      <span className="px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-300">HD 4K</span>
                      <span className="text-zinc-400">{modalMovie.duration}</span>
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{modalMovie.description}</p>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                    <div>
                      <span className="text-zinc-500 block">Genres:</span>
                      <span className="text-white font-medium">{modalMovie.genres.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Rating:</span>
                      <span className="text-amber-400 font-bold">{modalMovie.rating} / 10 ★</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Media Type:</span>
                      <span className="text-red-400 font-bold uppercase">{modalMovie.mediaType}</span>
                    </div>
                  </div>
                </div>

                {/* Episode Selector for TV Shows */}
                {modalMovie.mediaType === 'tv' && (
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white">Episodes</h3>
                      <select
                        value={season}
                        onChange={(e) => setSeason(Number(e.target.value))}
                        className="bg-zinc-900 text-red-400 font-bold text-xs rounded-xl px-3 py-1.5 border border-zinc-800 focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <option key={s} value={s}>
                            Season {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {episodesList.length > 0 ? (
                        episodesList.map((ep) => (
                          <div
                            key={ep.episode_number}
                            onClick={() => {
                              setEpisode(ep.episode_number);
                              setIsInfoModalOpen(false);
                              openPlayMovie(modalMovie);
                            }}
                            className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-red-400 w-6">
                                {ep.episode_number}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400">{ep.name || `Episode ${ep.episode_number}`}</h4>
                                <p className="text-[10px] text-zinc-400 line-clamp-1">{ep.overview || 'Available in HD 4K Streaming.'}</p>
                              </div>
                            </div>
                            <Play className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                          </div>
                        ))
                      ) : (
                        Array.from({ length: 12 }, (_, i) => i + 1).map((epNum) => (
                          <div
                            key={epNum}
                            onClick={() => {
                              setEpisode(epNum);
                              setIsInfoModalOpen(false);
                              openPlayMovie(modalMovie);
                            }}
                            className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-red-400 w-6">
                                {epNum}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-white group-hover:text-red-400">Episode {epNum}</h4>
                                <p className="text-[10px] text-zinc-400">Season {season} • High Definition Stream</p>
                              </div>
                            </div>
                            <Play className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN VIDEO PLAYER MODAL */}
      <AnimatePresence>
        {isPlayerOpen && modalMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4"
          >
            <div className="relative w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[96vh]">
              {/* Player Top Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0">
                    <Film className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate flex items-center space-x-2">
                      <span>{modalMovie.title}</span>
                      {modalMovie.mediaType === 'tv' && (
                        <span className="text-[10px] text-red-400 font-mono bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/50">
                          S{season} E{episode}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIframeKey((k) => k + 1);
                      setIsIframeLoading(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                    title="Reload current stream mirror"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reload</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = getStreamEmbedUrl(modalMovie);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono text-white transition-colors flex items-center gap-1.5 shadow-sm font-bold"
                    title="Open stream in a clean unblocked tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pop-out Unblocked ↗</span>
                  </button>

                  <button
                    onClick={() => setIsPlayerOpen(false)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Streaming Source & Episode Selector Bar */}
              <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-zinc-400 font-bold text-[11px] uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                    Source:
                  </span>
                  <select
                    value={selectedSource}
                    onChange={(e) => {
                      setSelectedSource(e.target.value as StreamSource);
                      setIframeKey((k) => k + 1);
                      setIsIframeLoading(true);
                    }}
                    className="bg-zinc-800 border border-zinc-700 text-white font-mono text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    {STREAM_SERVERS.map((src) => (
                      <option key={src.id} value={src.id} className="bg-zinc-900 text-white">
                        {src.label}
                      </option>
                    ))}
                  </select>
                </div>

                {modalMovie.mediaType === 'tv' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-400 font-mono text-xs">Episode:</span>
                    <select
                      value={episode}
                      onChange={(e) => {
                        setEpisode(Number(e.target.value));
                        setIframeKey((k) => k + 1);
                      }}
                      className="bg-zinc-900 text-red-400 font-bold rounded-lg px-2.5 py-1 text-xs border border-zinc-700 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((ep) => (
                        <option key={ep} value={ep}>
                          Episode {ep}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Video Player Container */}
              <div className="w-full aspect-video bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                {/* Background loader & fallback card */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 p-4 text-center select-none pointer-events-none">
                  <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-mono text-zinc-300">Loading stream mirror ({selectedSource})...</p>
                </div>

                <iframe
                  key={`${selectedSource}-${modalMovie.id}-${season}-${episode}-${iframeKey}`}
                  src={getStreamEmbedUrl(modalMovie)}
                  title={modalMovie.title}
                  className="w-full h-full border-0 relative z-10 bg-transparent"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; clipboard-write; display-capture; fullscreen"
                  referrerPolicy="no-referrer"
                  onLoad={() => setIsIframeLoading(false)}
                />
              </div>

              {/* Unblock & Troubleshooting Helper Footer */}
              <div className="p-3 bg-zinc-900/95 border-t border-zinc-800 text-[11px] text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 flex-shrink-0">
                <div className="flex items-center space-x-2 text-zinc-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Blocked at school/filter?</strong> Switch mirror buttons above or click{' '}
                    <button
                      onClick={() => window.open(getStreamEmbedUrl(modalMovie), '_blank', 'noopener,noreferrer')}
                      className="text-red-400 hover:text-red-300 underline font-bold"
                    >
                      Pop-out Unblocked ↗
                    </button>{' '}
                    to play without iframe blocks.
                  </span>
                </div>

                <div className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                  Active Server: <span className="text-red-400 font-bold uppercase">{selectedSource}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* NETFLIX HORIZONTAL SCROLLING ROW CAROUSEL COMPONENT */
interface NetflixRowProps {
  title: string;
  icon?: React.ReactNode;
  movies: MovieItem[];
  rowKey: string;
  rowRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  scrollRow: (rowKey: string, direction: 'left' | 'right') => void;
  watchlist: string[];
  toggleWatchlist: (id: string, e?: React.MouseEvent) => void;
  onPlay: (movie: MovieItem) => void;
  onInfo: (movie: MovieItem) => void;
}

const NetflixRow: React.FC<NetflixRowProps> = ({
  title,
  icon,
  movies,
  rowKey,
  rowRefs,
  scrollRow,
  watchlist,
  toggleWatchlist,
  onPlay,
  onInfo,
}) => {
  return (
    <div className="space-y-2.5 relative group/row">
      {title && (
        <div className="flex items-center space-x-2">
          {icon}
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>{title}</span>
          </h2>
        </div>
      )}

      {/* Row Scroll Container */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => scrollRow(rowKey, 'left')}
          className="absolute left-0 top-0 bottom-0 z-20 w-10 bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm rounded-r-lg"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Movies Row */}
        <div
          ref={(el) => (rowRefs.current[rowKey] = el)}
          className="flex items-center space-x-3.5 overflow-x-auto scrollbar-none py-3 px-1 scroll-smooth"
        >
          {movies.map((movie, idx) => (
            <div
              key={`${rowKey}-${movie.id}-${idx}`}
              onClick={() => onInfo(movie)}
              className="group/card relative flex-shrink-0 w-36 sm:w-44 md:w-48 lg:w-52 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all duration-200 hover:scale-105 hover:z-20 shadow-md"
            >
              <div className="aspect-[2/3] w-full relative overflow-hidden bg-zinc-800">
                <img
                  src={movie.image}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity" />

                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-200 font-bold border border-zinc-700 flex items-center space-x-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{movie.rating}</span>
                </div>

                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-zinc-300 font-bold border border-zinc-700 uppercase">
                  {movie.year}
                </div>

                {/* Quick Play Hover Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(movie);
                  }}
                  className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity shadow-lg hover:scale-110"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Card Footer Details */}
              <div className="p-2.5 bg-zinc-950 flex items-center justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white group-hover/card:text-red-400 truncate">
                    {movie.title}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 mt-0.5">
                    <span className="text-emerald-400 font-mono font-bold">98% Match</span>
                    <span>•</span>
                    <span className="truncate">{movie.genres[0] || 'HD'}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => toggleWatchlist(movie.id, e)}
                  className="p-1 rounded text-zinc-400 hover:text-white flex-shrink-0"
                >
                  {watchlist.includes(movie.id) ? (
                    <Check className="w-4 h-4 text-red-500" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scrollRow(rowKey, 'right')}
          className="absolute right-0 top-0 bottom-0 z-20 w-10 bg-black/70 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity backdrop-blur-sm rounded-l-xl"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
