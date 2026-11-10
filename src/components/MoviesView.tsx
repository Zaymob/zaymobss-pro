import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { MovieItem } from '../types';
import {
  Play,
  Film,
  Search,
  X,
  Tv,
  Maximize2,
  RefreshCw,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AppWindow,
  FastForward,
  Star,
  Info,
  ExternalLink,
  AlertTriangle,
  Eye,
  Users,
  Download,
  ListVideo,
  ArrowLeft,
  SlidersHorizontal,
  Settings2,
  Layers,
  Share2,
  Bookmark,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addHistoryItem } from './HistoryModal';
import {
  getCinemaHistory,
  addCinemaHistory,
  CinemaHistoryItem,
} from '../utils/historyManager';

interface MovieStreamSource {
  url: string;
  type: 'hls' | 'file';
  quality?: string;
  provider: string;
  providerName: string;
  headers?: Record<string, string>;
}

interface MoviesViewProps {
  selectedMovieId?: string;
}

interface TMDBSeasonInfo {
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string;
  poster_path?: string;
}

interface TMDBEpisodeInfo {
  episode_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  runtime?: number;
}

export interface WatchmodeSource {
  name: string;
  web_url: string;
  logo_url: string;
}

interface StreamingProvider {
  id: string;
  providerId: string;
  name: string;
  logo: string;
}

const STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: 'disney', providerId: '337', name: 'Disney+', logo: 'https://cdn.watchmode.com/provider_logos/disneyPlus_100px.png' },
  { id: 'netflix', providerId: '8', name: 'Netflix', logo: 'https://cdn.watchmode.com/provider_logos/netflix_100px.png' },
  { id: 'prime', providerId: '9', name: 'Amazon Prime Video', logo: 'https://cdn.watchmode.com/provider_logos/prime_video_100px.png' },
  { id: 'max', providerId: '1899', name: 'HBO Max', logo: 'https://cdn.watchmode.com/provider_logos/max_100px.png' },
  { id: 'hulu', providerId: '15', name: 'Hulu', logo: 'https://cdn.watchmode.com/provider_logos/hulu_100px.png' },
  { id: 'appletv', providerId: '350', name: 'Apple TV+', logo: 'https://cdn.watchmode.com/provider_logos/appleTvPlus_100px.png' },
  { id: 'paramount', providerId: '531', name: 'Paramount+', logo: 'https://cdn.watchmode.com/provider_logos/paramountPlus_100px.png' },
  { id: 'peacock', providerId: '386', name: 'Peacock', logo: 'https://cdn.watchmode.com/provider_logos/peacock_100px.png' },
  { id: 'crunchyroll', providerId: '283', name: 'Crunchyroll', logo: 'https://cdn.watchmode.com/provider_logos/crunchyroll_100px.png' },
  { id: 'mgm', providerId: '582', name: 'MGM+', logo: 'https://cdn.watchmode.com/provider_logos/mgmPlus_100px.png' },
];

export const MoviesView: React.FC<MoviesViewProps> = ({ selectedMovieId }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'shows' | 'movies' | 'anime' | 'discover'>('all');
  const [show18PlusAnime, setShow18PlusAnime] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main Catalogs
  const [trendingMoviesWeek, setTrendingMoviesWeek] = useState<MovieItem[]>([]);
  const [trendingMoviesToday, setTrendingMoviesToday] = useState<MovieItem[]>([]);
  const [trendingSeriesWeek, setTrendingSeriesWeek] = useState<MovieItem[]>([]);
  const [trendingSeriesToday, setTrendingSeriesToday] = useState<MovieItem[]>([]);
  const [nowPlayingList, setNowPlayingList] = useState<MovieItem[]>([]);
  const [popularMoviesList, setPopularMoviesList] = useState<MovieItem[]>([]);
  const [popularTvList, setPopularTvList] = useState<MovieItem[]>([]);
  const [topRatedList, setTopRatedList] = useState<MovieItem[]>([]);
  const [animeList, setAnimeList] = useState<MovieItem[]>([]);
  const [anime18List, setAnime18List] = useState<MovieItem[]>([]);
  const [actionMoviesList, setActionMoviesList] = useState<MovieItem[]>([]);
  const [sciFiList, setSciFiList] = useState<MovieItem[]>([]);
  const [homeExploreList, setHomeExploreList] = useState<MovieItem[]>([]);
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalogPage, setCatalogPage] = useState<number>(2);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [homePage, setHomePage] = useState<number>(2);
  const [isLoadingMoreHome, setIsLoadingMoreHome] = useState<boolean>(false);

  // Time filters for sections (matching video)
  const [trendingMoviesTime, setTrendingMoviesTime] = useState<'week' | 'day'>('week');
  const [trendingSeriesTime, setTrendingSeriesTime] = useState<'week' | 'day'>('week');
  const [isMovieTimeDropdownOpen, setIsMovieTimeDropdownOpen] = useState<boolean>(false);
  const [isSeriesTimeDropdownOpen, setIsSeriesTimeDropdownOpen] = useState<boolean>(false);

  // Provider Catalog (From Disney+, Netflix, etc.)
  const [selectedProvider, setSelectedProvider] = useState<StreamingProvider>(STREAMING_PROVIDERS[0]);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState<boolean>(false);
  const [providerMovies, setProviderMovies] = useState<MovieItem[]>([]);
  const [isLoadingProvider, setIsLoadingProvider] = useState<boolean>(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsMovieTimeDropdownOpen(false);
        setIsSeriesTimeDropdownOpen(false);
        setIsProviderDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Hero Featured Carousel State
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  // Player state
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [isPlayerSidebarOpen, setIsPlayerSidebarOpen] = useState<boolean>(false);
  const [playerSidebarTab, setPlayerSidebarTab] = useState<'episodes' | 'sources' | 'settings'>('episodes');
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [modalMovie, setModalMovie] = useState<MovieItem | null>(null);
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const showAndScheduleHideControls = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (!isPlayerSidebarOpen) {
      controlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 5000);
    }
  }, [isPlayerSidebarOpen]);

  useEffect(() => {
    if (!isPlayerOpen) {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      return;
    }

    if (isPlayerSidebarOpen) {
      setIsControlsVisible(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    } else {
      showAndScheduleHideControls();
    }

    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlayerOpen, isPlayerSidebarOpen, showAndScheduleHideControls]);

  // Streaming sources & player
  const [streams, setStreams] = useState<MovieStreamSource[]>([]);
  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(-1);
  const [activeServer, setActiveServer] = useState<'stream' | 'vidlink' | 'vidsrc' | 'vidfast' | 'vidsrc_pm' | 'vidsrc_me'>('stream');
  const [isScrapingStreams, setIsScrapingStreams] = useState<boolean>(false);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Watchmode Sources State (Budget-cached)
  const [watchmodeSources, setWatchmodeSources] = useState<WatchmodeSource[]>([]);
  const [isLoadingWatchmode, setIsLoadingWatchmode] = useState<boolean>(false);

  // Autoplay state with countdown
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_cinema_autoplay') !== 'false';
    } catch {
      return true;
    }
  });
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);

  // Accurate TMDB seasons and episodes state
  const [availableSeasons, setAvailableSeasons] = useState<TMDBSeasonInfo[]>([]);
  const [availableEpisodes, setAvailableEpisodes] = useState<TMDBEpisodeInfo[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(false);

  // Media Detail View state (Flystream cinema UI)
  const [detailMovie, setDetailMovie] = useState<MovieItem | null>(null);
  const [detailInfo, setDetailInfo] = useState<{
    runtime?: number;
    episodeCount?: number;
    genres?: string[];
    tagline?: string;
    similar?: MovieItem[];
  } | null>(null);
  const [trailers, setTrailers] = useState<Array<{ id: string; key: string; name: string; type: string }>>([]);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const episodesSectionRef = useRef<HTMLDivElement>(null);

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleWatchlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWatchlist((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('yuno_watchlist', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const mapTmdbItem = (item: any, defaultType: 'movie' | 'tv' = 'movie', genreTag: string = 'Cinema'): MovieItem => {
    const isTv = item.media_type === 'tv' || defaultType === 'tv' || (!item.media_type && !!item.first_air_date) || (!item.media_type && !item.release_date && !!item.name);
    const year = item.release_date
      ? new Date(item.release_date).getFullYear()
      : item.first_air_date
      ? new Date(item.first_air_date).getFullYear()
      : 2026;

    const isAnime =
      item.original_language === 'ja' &&
      (item.genre_ids?.includes(16) || item.name?.toLowerCase().includes('anime') || item.title?.toLowerCase().includes('anime'));

    return {
      id: `tmdb-${item.id}`,
      tmdbId: item.id,
      mediaType: isAnime ? 'anime' : isTv ? 'tv' : 'movie',
      title: item.title || item.name || 'Untitled',
      year,
      rating: Math.round((item.vote_average || 8.0) * 10) / 10,
      category: isAnime ? 'anime' : isTv ? 'shows' : 'movies',
      image: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      backdrop: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '',
      description: item.overview || '',
      genres: [genreTag],
      duration: isTv ? 'Series' : 'Movie',
      isTvShow: isTv,
    };
  };

  const safeFetchJson = async (url: string) => {
    try {
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (e) {
      console.warn('safeFetchJson error for URL:', url, e);
    }
    return { results: [] };
  };

  // Load catalogs from TMDB
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadAllCatalogs = async () => {
      try {
        const [
          resMoviesWeek,
          resMoviesToday,
          resSeriesWeek,
          resSeriesToday,
          resNowPlaying,
          resPopMovies,
          resPopMoviesP2,
          resPopTv,
          resPopTvP2,
          resTop,
          resAnime,
          resAnimeP2,
          resAnime18,
          resAction,
          resSciFi,
        ] = await Promise.all([
          safeFetchJson('/api/movies/trending/movie/week'),
          safeFetchJson('/api/movies/trending/movie/day'),
          safeFetchJson('/api/movies/trending/tv/week'),
          safeFetchJson('/api/movies/trending/tv/day'),
          safeFetchJson('/api/tmdb/now_playing'),
          safeFetchJson('/api/tmdb/popular_movies?page=1'),
          safeFetchJson('/api/tmdb/popular_movies?page=2'),
          safeFetchJson('/api/tmdb/popular_tv?page=1'),
          safeFetchJson('/api/tmdb/popular_tv?page=2'),
          safeFetchJson('/api/tmdb/top_rated?page=1'),
          safeFetchJson('/api/tmdb/anime?page=1'),
          safeFetchJson('/api/tmdb/anime?page=2'),
          safeFetchJson('/api/tmdb/anime/mature'),
          safeFetchJson('/api/tmdb/discover?genre=28&page=1'),
          safeFetchJson('/api/tmdb/discover?genre=878&page=1'),
        ]);

        if (!isMounted) return;

        if (Array.isArray(resMoviesWeek.results)) {
          setTrendingMoviesWeek(resMoviesWeek.results.map((i: any) => mapTmdbItem(i, 'movie', 'Action')));
        }
        if (Array.isArray(resMoviesToday.results)) {
          setTrendingMoviesToday(resMoviesToday.results.map((i: any) => mapTmdbItem(i, 'movie', 'Action')));
        }
        if (Array.isArray(resSeriesWeek.results)) {
          setTrendingSeriesWeek(resSeriesWeek.results.map((i: any) => mapTmdbItem(i, 'tv', 'Drama')));
        }
        if (Array.isArray(resSeriesToday.results)) {
          setTrendingSeriesToday(resSeriesToday.results.map((i: any) => mapTmdbItem(i, 'tv', 'Drama')));
        }
        if (Array.isArray(resNowPlaying.results)) {
          setNowPlayingList(resNowPlaying.results.map((i: any) => mapTmdbItem(i, 'movie', 'In Theaters')));
        }

        const combinedPopMovies = [
          ...(Array.isArray(resPopMovies.results) ? resPopMovies.results : []),
          ...(Array.isArray(resPopMoviesP2.results) ? resPopMoviesP2.results : []),
        ].map((i: any) => mapTmdbItem(i, 'movie', 'Popular'));
        setPopularMoviesList(combinedPopMovies);

        const combinedPopTv = [
          ...(Array.isArray(resPopTv.results) ? resPopTv.results : []),
          ...(Array.isArray(resPopTvP2.results) ? resPopTvP2.results : []),
        ].map((i: any) => mapTmdbItem(i, 'tv', 'Series'));
        setPopularTvList(combinedPopTv);

        if (Array.isArray(resTop.results)) {
          setTopRatedList(resTop.results.map((i: any) => mapTmdbItem(i, 'movie', 'Top Rated')));
        }

        const combinedAnime = [
          ...(Array.isArray(resAnime.results) ? resAnime.results : []),
          ...(Array.isArray(resAnimeP2.results) ? resAnimeP2.results : []),
        ].map((i: any) => mapTmdbItem(i, 'tv', 'Anime'));
        setAnimeList(combinedAnime);

        if (Array.isArray(resAnime18.results)) {
          setAnime18List(resAnime18.results.map((i: any) => mapTmdbItem(i, i.media_type || 'tv', '18+ Seinen')));
        }

        if (Array.isArray(resAction.results)) {
          setActionMoviesList(resAction.results.map((i: any) => mapTmdbItem(i, 'movie', 'Action')));
        }

        if (Array.isArray(resSciFi.results)) {
          setSciFiList(resSciFi.results.map((i: any) => mapTmdbItem(i, 'movie', 'Sci-Fi')));
        }

        // Initialize Home Explore List with rich discovery items
        const initialExplore: MovieItem[] = [
          ...(Array.isArray(resPopMoviesP2.results) ? resPopMoviesP2.results.map((i: any) => mapTmdbItem(i, 'movie', 'Featured')) : []),
          ...(Array.isArray(resPopTvP2.results) ? resPopTvP2.results.map((i: any) => mapTmdbItem(i, 'tv', 'Featured')) : []),
          ...(Array.isArray(resTop.results) ? resTop.results.slice(10).map((i: any) => mapTmdbItem(i, 'movie', 'Masterpiece')) : []),
        ];
        setHomeExploreList(initialExplore);
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAllCatalogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoadMoreCatalog = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = catalogPage + 1;
    try {
      if (searchQuery.trim()) {
        let searchType = 'multi';
        if (activeCategory === 'movies') searchType = 'movie';
        else if (activeCategory === 'shows') searchType = 'tv';
        else if (activeCategory === 'anime') searchType = 'anime';

        const data = await safeFetchJson(
          `/api/tmdb/search?query=${encodeURIComponent(searchQuery.trim())}&type=${searchType}&page=${nextPage}`
        );
        if (Array.isArray(data?.results) && data.results.length > 0) {
          let newItems = data.results
            .filter((i: any) => i.poster_path || i.backdrop_path)
            .map((i: any) => mapTmdbItem(i, i.media_type || (searchType === 'tv' ? 'tv' : 'movie'), 'Search Match'));
          if (activeCategory === 'movies') {
            newItems = newItems.filter((m: MovieItem) => m.category === 'movies' && !isMovieEpisodic(m));
          } else if (activeCategory === 'shows') {
            newItems = newItems.filter((m: MovieItem) => m.category === 'shows' || isMovieEpisodic(m));
          } else if (activeCategory === 'anime') {
            newItems = newItems.filter((m: MovieItem) => m.category === 'anime' || m.mediaType === 'anime');
          }
          setSearchResults((prev) => [...prev, ...newItems]);
          setCatalogPage(nextPage);
        }
      } else if (activeCategory === 'movies') {
        const data = await safeFetchJson(`/api/tmdb/popular_movies?page=${nextPage}`);
        if (Array.isArray(data?.results) && data.results.length > 0) {
          const newItems = data.results.map((i: any) => mapTmdbItem(i, 'movie', 'Popular'));
          setPopularMoviesList((prev) => [...prev, ...newItems]);
          setCatalogPage(nextPage);
        }
      } else if (activeCategory === 'shows') {
        const data = await safeFetchJson(`/api/tmdb/popular_tv?page=${nextPage}`);
        if (Array.isArray(data?.results) && data.results.length > 0) {
          const newItems = data.results.map((i: any) => mapTmdbItem(i, 'tv', 'Series'));
          setPopularTvList((prev) => [...prev, ...newItems]);
          setCatalogPage(nextPage);
        }
      } else if (activeCategory === 'anime') {
        const data = await safeFetchJson(`/api/tmdb/anime?page=${nextPage}`);
        if (Array.isArray(data?.results) && data.results.length > 0) {
          const newItems = data.results.map((i: any) => mapTmdbItem(i, 'tv', 'Anime'));
          setAnimeList((prev) => [...prev, ...newItems]);
          setCatalogPage(nextPage);
        }
      }
    } catch (err) {
      console.warn('Load more catalog error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreHome = async () => {
    if (isLoadingMoreHome) return;
    setIsLoadingMoreHome(true);
    const nextPage = homePage + 1;
    try {
      const [moreMovies, moreTv] = await Promise.all([
        safeFetchJson(`/api/tmdb/discover?mediaType=movie&page=${nextPage}`),
        safeFetchJson(`/api/tmdb/discover?mediaType=tv&page=${nextPage}`),
      ]);
      const newItems: MovieItem[] = [];
      if (Array.isArray(moreMovies?.results)) {
        newItems.push(...moreMovies.results.map((i: any) => mapTmdbItem(i, 'movie', 'Discovery')));
      }
      if (Array.isArray(moreTv?.results)) {
        newItems.push(...moreTv.results.map((i: any) => mapTmdbItem(i, 'tv', 'Discovery')));
      }
      if (newItems.length > 0) {
        setHomeExploreList((prev) => [...prev, ...newItems]);
        setHomePage(nextPage);
      }
    } catch (err) {
      console.warn('Load more home error:', err);
    } finally {
      setIsLoadingMoreHome(false);
    }
  };

  // Fetch catalog for selected streaming provider (From Disney+, Netflix, etc.)
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProvider(true);

    safeFetchJson(`/api/tmdb/by_provider?provider_id=${selectedProvider.providerId}&media_type=movie`)
      .then((data: any) => {
        if (!isMounted) return;
        if (Array.isArray(data.results) && data.results.length > 0) {
          setProviderMovies(data.results.map((i: any) => mapTmdbItem(i, 'movie', selectedProvider.name)));
        } else {
          setProviderMovies(popularMoviesList.slice(0, 10));
        }
      })
      .catch(() => {
        if (isMounted) setProviderMovies(popularMoviesList.slice(0, 10));
      })
      .finally(() => {
        if (isMounted) setIsLoadingProvider(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProvider, popularMoviesList]);

  // Featured hero items: top 5 from trending movies
  const featuredMovies = useMemo(() => {
    return trendingMoviesWeek.slice(0, 5);
  }, [trendingMoviesWeek]);

  // Auto-rotate hero carousel every 8 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  // Handle Category-Strict Search using TMDB key & AniList criteria
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCatalogPage(2);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        const trimmedQuery = searchQuery.trim();
        let searchType = 'multi';
        if (activeCategory === 'movies') searchType = 'movie';
        else if (activeCategory === 'shows') searchType = 'tv';
        else if (activeCategory === 'anime') searchType = 'anime';

        const tmdbData = await safeFetchJson(
          `/api/tmdb/search?query=${encodeURIComponent(trimmedQuery)}&type=${searchType}&page=1`
        );

        let tmdbMatches =
          Array.isArray(tmdbData?.results)
            ? tmdbData.results
                .filter((i: any) => i.poster_path || i.backdrop_path)
                .map((i: any) => mapTmdbItem(i, i.media_type || (searchType === 'tv' ? 'tv' : 'movie'), 'Search Match'))
            : [];

        // Category-strict filter guarantees:
        if (activeCategory === 'movies') {
          tmdbMatches = tmdbMatches.filter((m: MovieItem) => m.category === 'movies' && !isMovieEpisodic(m));
        } else if (activeCategory === 'shows') {
          tmdbMatches = tmdbMatches.filter((m: MovieItem) => m.category === 'shows' || isMovieEpisodic(m));
        } else if (activeCategory === 'anime') {
          tmdbMatches = tmdbMatches.filter((m: MovieItem) => m.category === 'anime' || m.mediaType === 'anime');
        } else if (activeCategory === 'watchlist') {
          const lowerQ = trimmedQuery.toLowerCase();
          const allSaved = [
            ...trendingMoviesWeek,
            ...popularMoviesList,
            ...popularTvList,
            ...topRatedList,
            ...animeList,
            ...anime18List,
            ...actionMoviesList,
            ...sciFiList,
          ].filter((m) => watchlist.includes(m.id) && m.title.toLowerCase().includes(lowerQ));
          tmdbMatches = allSaved;
        }

        setSearchResults(tmdbMatches);
        setCatalogPage(1);
      } catch (e) {
        console.error('Search error:', e);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, activeCategory]);

  const isMovieEpisodic = (movie: MovieItem | null): boolean => {
    if (!movie) return false;
    return (
      movie.mediaType === 'tv' ||
      movie.isTvShow === true ||
      movie.category === 'shows' ||
      movie.duration === 'Series' ||
      (movie.category === 'anime' && movie.duration !== 'Movie' && movie.isTvShow !== false) ||
      (movie.mediaType === 'anime' && movie.duration !== 'Movie')
    );
  };

  // Construct official embed URL supporting reliable providers
  // Construct official embed URL supporting reliable providers
  const getStreamEmbedUrl = (
    movie: MovieItem | null,
    s: number = season,
    e: number = episode,
    provider: 'stream' | 'vidlink' | 'vidsrc' | 'vidfast' | 'vidsrc_pm' | 'vidsrc_me' | string = activeServer
  ): string => {
    if (!movie) return '';
    const tmdbId = movie.tmdbId || 1159559;
    const isTv = isMovieEpisodic(movie);

    if (provider === 'vidlink') {
      if (isTv) {
        return `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`;
      }
      return `https://vidlink.pro/movie/${tmdbId}`;
    }

    if (provider === 'vidfast') {
      if (isTv) {
        return `https://vidfast.pro/tv/${tmdbId}/${s}/${e}`;
      }
      return `https://vidfast.pro/movie/${tmdbId}`;
    }

    if (provider === 'vidsrc_me') {
      if (isTv) {
        return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`;
      }
      return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
    }

    if (provider === 'vidsrc_pm') {
      if (isTv) {
        return `https://vidsrc.pm/embed/tv/${tmdbId}/${s}/${e}`;
      }
      return `https://vidsrc.pm/embed/movie/${tmdbId}`;
    }

    // Default VidSrc Primary (active high-speed mirror: vidsrc.to)
    if (isTv) {
      return `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`;
    }
    return `https://vidsrc.to/embed/movie/${tmdbId}`;
  };

  // Watchmode Sources Lookup (Strict 2-step process with 24h budget cache)
  const fetchWatchmodeSources = async (movie: MovieItem) => {
    const cacheKey = `wm_cache_${movie.tmdbId || movie.title}`;
    // 1. Check local client cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setWatchmodeSources(parsed.sources || []);
          return;
        }
      }
    } catch {}

    // 2. Fetch via server proxy
    setIsLoadingWatchmode(true);
    setWatchmodeSources([]);

    try {
      const mediaType = isMovieEpisodic(movie) ? 'tv' : 'movie';
      const res = await fetch(
        `/api/watchmode/sources?title=${encodeURIComponent(movie.title)}&tmdbId=${movie.tmdbId || ''}&mediaType=${mediaType}`
      );
      if (res.ok) {
        const data = await res.json();
        const sources: WatchmodeSource[] = Array.isArray(data.sources) ? data.sources : [];
        setWatchmodeSources(sources);

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), sources }));
        } catch {}
      }
    } catch (err) {
      console.warn('Watchmode fetch notice:', err);
    } finally {
      setIsLoadingWatchmode(false);
    }
  };

  // Fetch scraped direct stream sources from movies-main backend
  const fetchStreamsForContent = async (movie: MovieItem, s: number, e: number) => {
    setIsScrapingStreams(true);
    setStreamStatus('Connecting to fastest stream...');
    setStreamError(null);
    setStreams([]);
    setSelectedStreamIndex(-1);

    const tmdbId = movie.tmdbId || 1159559;
    const isTv = isMovieEpisodic(movie);
    const path = isTv
      ? `/api/movies/stream/tv/${tmdbId}/${s}/${e}`
      : `/api/movies/stream/movie/${tmdbId}`;

    try {
      const res = await fetch(path);
      if (res.ok) {
        const data = await res.json();
        const rawList: MovieStreamSource[] = Array.isArray(data.streams) ? data.streams : [];
        const validList = rawList.filter(
          (str) => str && str.url && !str.url.includes('invalid') && !str.url.includes('mismatched') && !str.url.includes('<')
        );

        if (validList.length > 0) {
          setStreams(validList);
          setSelectedStreamIndex(0);
          setStreamStatus(`${validList.length} direct stream${validList.length > 1 ? 's' : ''}`);
          return;
        }
      }
      // If direct scraping produced 0 streams (e.g. upstream Turnstile block), smoothly fallback to VidLink Pro
      console.log('Direct streams unavailable, auto-connecting to VidLink Pro...');
      setActiveServer('vidlink');
      setStreamStatus('Connected to VidLink Pro');
    } catch (err: any) {
      console.warn('Stream scraping error, auto-connecting to VidLink Pro:', err?.message);
      setActiveServer('vidlink');
      setStreamStatus('Connected to VidLink Pro');
    } finally {
      setIsScrapingStreams(false);
    }
  };

  // Direct HLS video stream playback lifecycle with auto-failover
  useEffect(() => {
    if (activeServer !== 'stream' || selectedStreamIndex < 0 || !streams[selectedStreamIndex]) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const stream = streams[selectedStreamIndex];
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const headersParam = stream.headers ? `&headers=${encodeURIComponent(JSON.stringify(stream.headers))}` : '';
    const proxiedUrl = `/api/movies/proxy?url=${encodeURIComponent(stream.url)}${headersParam}`;

    const handleStreamFailover = () => {
      if (streams.length > 1 && selectedStreamIndex < streams.length - 1) {
        console.warn(`Direct stream ${selectedStreamIndex} failed. Auto-switching to mirror ${selectedStreamIndex + 1}...`);
        setSelectedStreamIndex((curr) => curr + 1);
      } else {
        console.warn('All direct streams attempted. Falling back to high-speed embed server...');
        setActiveServer('vidlink');
        setStreamStatus('VidLink Pro (Auto-failover)');
      }
    };

    const handleVideoError = () => {
      console.warn('Native video error encountered on stream:', stream.providerName);
      handleStreamFailover();
    };

    video.addEventListener('error', handleVideoError);

    if (stream.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setStreamError(null);
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.warn('HLS stream notice:', data.type, data.details, 'fatal:', data.fatal);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('Fatal network error on direct stream:', stream.providerName);
                hls.destroy();
                handleStreamFailover();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Fatal media error on direct stream, recovering...');
                hls.recoverMediaError();
                break;
              default:
                console.warn('Fatal unrecoverable HLS stream error:', data.details);
                hls.destroy();
                handleStreamFailover();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = proxiedUrl;
        video.play().catch(() => {});
      }
    } else {
      video.src = proxiedUrl;
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener('error', handleVideoError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeServer, selectedStreamIndex, streams]);

  const cancelAutoplay = () => {
    setAutoplayCountdown(null);
  };

  const playNextEpisode = () => {
    setAutoplayCountdown(null);
    if (!modalMovie) return;
    const maxEp = availableEpisodes.length;
    if (episode < maxEp) {
      handleEpisodeChange(episode + 1);
    } else if (availableSeasons.length > 0) {
      const currentSeasonIdx = availableSeasons.findIndex((s) => s.season_number === season);
      if (currentSeasonIdx >= 0 && currentSeasonIdx < availableSeasons.length - 1) {
        const nextSeasonNum = availableSeasons[currentSeasonIdx + 1].season_number;
        handleSeasonChange(nextSeasonNum);
      }
    }
  };

  const handleVideoEnded = () => {
    if (autoplay && isMovieEpisodic(modalMovie)) {
      setAutoplayCountdown(5);
    }
  };

  // Autoplay countdown timer
  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown <= 0) {
      setAutoplayCountdown(null);
      playNextEpisode();
      return;
    }
    const timer = setTimeout(() => {
      setAutoplayCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoplayCountdown, episode, season, availableEpisodes, availableSeasons]);

  const toggleAutoplay = () => {
    setAutoplay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yuno_cinema_autoplay', String(next));
      } catch {}
      return next;
    });
  };

  const handleDesktopPiP = async () => {
    if (activeServer === 'stream' && videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          return;
        } else if (document.pictureInPictureEnabled) {
          await videoRef.current.requestPictureInPicture();
          return;
        }
      } catch (err) {
        console.warn('Native video PiP error, falling back to window popout:', err);
      }
    }

    if (!modalMovie) return;
    const streamUrl =
      activeServer === 'stream' && streams[selectedStreamIndex]
        ? `/api/movies/proxy?url=${encodeURIComponent(streams[selectedStreamIndex].url)}`
        : getStreamEmbedUrl(modalMovie, season, episode, activeServer);

    const width = 640;
    const height = 380;
    const left = Math.max(0, window.screen.width - width - 50);
    const top = Math.max(0, window.screen.height - height - 100);

    window.open(
      streamUrl,
      `pip_filmu_${modalMovie.tmdbId}`,
      `popup=1,width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
  };

  const handleSeasonChange = (newSeason: number) => {
    cancelAutoplay();
    setSeason(newSeason);
    setEpisode(1);
    setIframeKey((k) => k + 1);
    const activeMovie = modalMovie || detailMovie;
    if (activeMovie) {
      if (modalMovie) {
        addCinemaHistory({
          tmdbId: modalMovie.tmdbId,
          title: modalMovie.title,
          subtitle: `S${newSeason}:E1`,
          mediaType: modalMovie.mediaType,
          season: newSeason,
          episode: 1,
          thumbnail: modalMovie.image || modalMovie.backdrop,
          data: modalMovie,
        });
        fetchStreamsForContent(modalMovie, newSeason, 1);
      }
      if (activeMovie.tmdbId) {
        const sObj = availableSeasons.find((s) => s.season_number === newSeason);
        loadSeasonEpisodes(activeMovie.tmdbId, newSeason, sObj?.episode_count);
      }
    }
  };

  const handleEpisodeChange = (newEpisode: number) => {
    cancelAutoplay();
    setEpisode(newEpisode);
    setIframeKey((k) => k + 1);
    if (modalMovie) {
      addCinemaHistory({
        tmdbId: modalMovie.tmdbId,
        title: modalMovie.title,
        subtitle: `S${season}:E${newEpisode}`,
        mediaType: modalMovie.mediaType,
        season: season,
        episode: newEpisode,
        thumbnail: modalMovie.image || modalMovie.backdrop,
        data: modalMovie,
      });
      fetchStreamsForContent(modalMovie, season, newEpisode);
    }
  };

  const loadSeasonEpisodes = async (tmdbId: number, seasonNum: number, fallbackCount?: number) => {
    setIsLoadingEpisodes(true);
    try {
      const data = await safeFetchJson(`/api/tmdb/tv_season?id=${tmdbId}&season=${seasonNum}`);
      if (data && Array.isArray(data.episodes) && data.episodes.length > 0) {
        setAvailableEpisodes(
          data.episodes.map((ep: any) => ({
            episode_number: ep.episode_number,
            name: ep.name || `Episode ${ep.episode_number}`,
            overview: ep.overview || '',
            still_path: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : undefined,
            runtime: ep.runtime,
          }))
        );
      } else {
        const count = fallbackCount || 12;
        setAvailableEpisodes(
          Array.from({ length: count }, (_, i) => ({
            episode_number: i + 1,
            name: `Episode ${i + 1}`,
          }))
        );
      }
    } catch {
      const count = fallbackCount || 12;
      setAvailableEpisodes(
        Array.from({ length: count }, (_, i) => ({
          episode_number: i + 1,
          name: `Episode ${i + 1}`,
        }))
      );
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  const openPlayMovie = async (movie: MovieItem, startSeason?: number, startEpisode?: number) => {
    cancelAutoplay();
    const sToUse = startSeason || 1;
    const epToUse = startEpisode || 1;
    setModalMovie(movie);
    setSeason(sToUse);
    setEpisode(epToUse);
    setAvailableSeasons([]);
    setAvailableEpisodes([]);
    setIframeKey((k) => k + 1);
    setIsPlayerOpen(true);
    setIsPlayerSidebarOpen(false);

    // Scraped direct sources play first by default
    setActiveServer('stream');
    setStreamError(null);

    // Fetch official Watchmode streaming sources for this title
    fetchWatchmodeSources(movie);

    const episodic = isMovieEpisodic(movie);
    setPlayerSidebarTab(episodic ? 'episodes' : 'sources');

    addCinemaHistory({
      tmdbId: movie.tmdbId,
      title: movie.title,
      subtitle: episodic ? `S${sToUse}:E${epToUse}` : 'Movie',
      mediaType: movie.mediaType,
      season: sToUse,
      episode: epToUse,
      thumbnail: movie.image || movie.backdrop,
      data: movie,
    });

    addHistoryItem({
      type: 'watch',
      title: movie.title,
      subtitle: episodic
        ? movie.category === 'anime'
          ? 'Anime Series'
          : 'TV Show'
        : movie.category === 'anime'
        ? 'Anime Movie'
        : 'Cinema Movie',
      thumbnail: movie.image || movie.backdrop,
      data: movie,
    });

    // Start direct stream resolution via movies-main
    fetchStreamsForContent(movie, sToUse, epToUse);

    if (episodic && movie.tmdbId) {
      try {
        const details = await safeFetchJson(`/api/tmdb/details?id=${movie.tmdbId}&type=tv`);
        if (details && Array.isArray(details.seasons) && details.seasons.length > 0) {
          const validSeasons = details.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0);
          const finalSeasons: TMDBSeasonInfo[] = validSeasons.length > 0 ? validSeasons : details.seasons;
          setAvailableSeasons(finalSeasons);

          const seasonToLoad = startSeason || finalSeasons[0]?.season_number || 1;
          setSeason(seasonToLoad);
          setEpisode(epToUse);
          const activeSObj = finalSeasons.find((s) => s.season_number === seasonToLoad);
          await loadSeasonEpisodes(movie.tmdbId, seasonToLoad, activeSObj?.episode_count || finalSeasons[0]?.episode_count);
        } else {
          setAvailableSeasons([{ season_number: 1, name: 'Season 1', episode_count: 12 }]);
          await loadSeasonEpisodes(movie.tmdbId, sToUse, 12);
        }
      } catch (err) {
        console.warn('Error loading TV seasons from TMDB:', err);
        setAvailableSeasons([{ season_number: 1, name: 'Season 1', episode_count: 12 }]);
        await loadSeasonEpisodes(movie.tmdbId, sToUse, 12);
      }
    }
  };

  // 18+ Mature content advisory handlers
  const isMovie18Plus = (m: MovieItem | null): boolean => {
    if (!m) return false;
    return (
      (activeCategory === 'anime' && show18PlusAnime) ||
      m.category === 'anime18' ||
      (Array.isArray(m.genres) && m.genres.some((g) => g.toLowerCase().includes('18+'))) ||
      anime18List.some((item) => item.id === m.id || item.tmdbId === m.tmdbId)
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };


  const handleDownloadAction = (movie: MovieItem) => {
    showToast(`Direct stream links prepared for ${movie.title}. Tap Play to start!`);
  };

  const openMovieDetail = async (movie: MovieItem) => {
    setDetailMovie(movie);
    setIsDescriptionExpanded(false);
    setDetailInfo(null);
    setTrailers([]);

    const episodic = isMovieEpisodic(movie);

    if (episodic && movie.tmdbId) {
      try {
        const details = await safeFetchJson(`/api/tmdb/details?id=${movie.tmdbId}&type=tv`);
        if (details) {
          const validSeasons = Array.isArray(details.seasons)
            ? details.seasons.filter((s: any) => s.season_number > 0 && s.episode_count > 0)
            : [];
          const sList = validSeasons.length > 0 ? validSeasons : details.seasons || [];
          setAvailableSeasons(sList);
          const firstSeason = sList[0]?.season_number || 1;
          setSeason(firstSeason);
          loadSeasonEpisodes(movie.tmdbId, firstSeason, sList[0]?.episode_count || 12);

          const genreNames = Array.isArray(details.genres)
            ? details.genres.map((g: any) => g.name)
            : movie.genres;
          const similar = Array.isArray(details.similar?.results)
            ? details.similar.results.slice(0, 10).map((it: any) => mapTmdbItem(it, 'tv'))
            : [];

          setDetailInfo({
            episodeCount:
              details.number_of_episodes ||
              details.seasons?.reduce((acc: number, s: any) => acc + (s.episode_count || 0), 0) ||
              12,
            genres: genreNames,
            tagline: details.tagline,
            similar,
          });
        }
      } catch (e) {
        console.warn('Error loading TV details for detail view:', e);
      }
    } else if (movie.tmdbId) {
      try {
        const details = await safeFetchJson(`/api/tmdb/details?id=${movie.tmdbId}&type=movie`);
        if (details) {
          const genreNames = Array.isArray(details.genres)
            ? details.genres.map((g: any) => g.name)
            : movie.genres;
          const similar = Array.isArray(details.similar?.results)
            ? details.similar.results.slice(0, 10).map((it: any) => mapTmdbItem(it, 'movie'))
            : [];

          setDetailInfo({
            runtime: details.runtime,
            genres: genreNames,
            tagline: details.tagline,
            similar,
          });
        }
      } catch (e) {
        console.warn('Error loading movie details for detail view:', e);
      }
    }

    // Load trailers for detail view
    if (movie.tmdbId) {
      try {
        const type = episodic ? 'tv' : 'movie';
        const trailerData = await safeFetchJson(`/api/tmdb/trailer?id=${movie.tmdbId}&type=${type}`);
        if (trailerData && Array.isArray(trailerData.videos) && trailerData.videos.length > 0) {
          setTrailers(trailerData.videos);
        } else if (trailerData && trailerData.key) {
          setTrailers([
            {
              id: 'main-trailer',
              key: trailerData.key,
              name: trailerData.name || 'Official Trailer',
              type: 'Trailer',
            },
          ]);
        }
      } catch (e) {
        console.warn('Error fetching trailers for detail view:', e);
      }
    }
  };

  const handleMovieCardClick = (movie: MovieItem) => {
    openMovieDetail(movie);
  };

  // Deep link
  useEffect(() => {
    if (!selectedMovieId) return;
    const idToFind = selectedMovieId.replace('tmdb-', '');
    safeFetchJson(`/api/tmdb/movie/${idToFind}`)
      .then((data: any) => {
        if (data && data.id) {
          const mapped = mapTmdbItem(data, 'movie');
          openMovieDetail(mapped);
        } else {
          return safeFetchJson(`/api/tmdb/details?id=${idToFind}&type=tv`);
        }
      })
      .then((tvData: any) => {
        if (tvData && tvData.id) {
          const mapped = mapTmdbItem(tvData, 'tv');
          openMovieDetail(mapped);
        }
      })
      .catch(() => {});
  }, [selectedMovieId]);

  // Current featured movie for Hero Carousel
  const currentFeatured = featuredMovies[featuredIndex] || trendingMoviesWeek[0] || null;

  // Active movie and series lists according to selected time toggle (Week vs Today)
  const activeTrendingMovies = trendingMoviesTime === 'week' ? trendingMoviesWeek : trendingMoviesToday;
  const activeTrendingSeries = trendingSeriesTime === 'week' ? trendingSeriesWeek : trendingSeriesToday;

  // Filtered catalog for grid views (Movies, TV, Anime, Discover)
  const displayedCatalog = useMemo(() => {
    let list: MovieItem[] = [];
    if (activeCategory === 'discover' || searchQuery.trim()) {
      list = searchResults.length > 0 ? searchResults : (searchQuery.trim() ? [] : homeExploreList);
    } else if (activeCategory === 'shows') {
      list = popularTvList;
    } else if (activeCategory === 'movies') {
      list = popularMoviesList;
    } else if (activeCategory === 'anime') {
      list = show18PlusAnime ? anime18List : animeList;
    }
    const seen = new Set<string>();
    return list.filter((m) => {
      if (!m || !m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [
    searchQuery,
    searchResults,
    activeCategory,
    show18PlusAnime,
    popularTvList,
    popularMoviesList,
    animeList,
    anime18List,
    homeExploreList,
  ]);

  const togglePlayerFullscreen = () => {
    const el = document.getElementById('filmu-player-container');
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 select-none">
      {/* Cinema Minimal Navigation Bar (matching reference mockup) */}
      <div className="border-none pb-0 bg-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Text-Only Navigation with Thin Purple Underline */}
          <nav className="flex items-center space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'shows', label: 'TV' },
              { id: 'movies', label: 'Movies' },
              { id: 'anime', label: 'Anime' },
              { id: 'discover', label: 'Discover' },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id as any);
                    setDetailMovie(null);
                    setCatalogPage(2);
                    if (tab.id !== 'discover') {
                      setSearchQuery('');
                    }
                  }}
                  className={`relative pb-3 text-sm font-medium transition-colors cursor-pointer select-none whitespace-nowrap bg-transparent border-0 p-0 ${
                    isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {/* Thin purple underline for active tab */}
                  {isActive && (
                    <motion.div
                      layoutId="cinema-minimal-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Search Input (pill shape matching reference mockup) - shown when Discover is active */}
          {activeCategory === 'discover' && (
            <div className="w-full sm:w-80 pb-2 sm:pb-0 animate-fadeIn">
              <div className="relative flex items-center bg-[#131218] border border-white/[0.12] focus-within:border-purple-500/70 rounded-full px-4 py-2 transition-all shadow-inner">
                <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies, series, anime..."
                  autoFocus
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="py-24 text-center">
          <div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-zinc-400 font-mono">Loading cinema catalog...</p>
        </div>
      )}

      {/* MEDIA DETAIL VIEW (Flystream-inspired Cinema Detail UI) */}
      {!isLoading && detailMovie && (
        <div className="space-y-8 animate-fadeIn">
          {/* Circular Back Button (top-left) - Cinema Detail text removed */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDetailMovie(null)}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl group"
              title="Back to Catalog"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Cinematic Hero Detail Banner */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#07070b] shadow-2xl">
            {/* Backdrop image */}
            <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full min-h-[380px] max-h-[520px] overflow-hidden bg-black">
              <img
                src={detailMovie.backdrop || detailMovie.image}
                alt={detailMovie.title}
                className="w-full h-full object-cover object-top opacity-80"
              />
              {/* Atmospheric smooth bottom & lateral vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] via-[#07070b]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#07070b]/90 via-[#07070b]/40 to-transparent" />
            </div>

            {/* Movie Details Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10 z-10">
              <div className="max-w-3xl space-y-3">
                {/* Big bold title */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                  {detailMovie.title}
                </h1>

                {/* Metadata row: ★ Rating • Year • Type • Episodes/Runtime */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-300">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{(detailMovie.rating || 8.0).toFixed(1)}</span>
                  </div>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-200">{detailMovie.year}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300 uppercase tracking-wide">
                    {isMovieEpisodic(detailMovie) ? 'TV' : 'Movie'}
                  </span>
                  {isMovieEpisodic(detailMovie) ? (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-300">
                        {detailInfo?.episodeCount || availableEpisodes.length || 12} episodes
                      </span>
                    </>
                  ) : (
                    detailInfo?.runtime && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-300">{detailInfo.runtime} min</span>
                      </>
                    )
                  )}
                </div>

                {/* Genres row (clean text with bullet separators) */}
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {(detailInfo?.genres && detailInfo.genres.length > 0
                    ? detailInfo.genres
                    : detailMovie.genres || ['Action', 'Mystery']
                  ).join(' • ')}
                </p>

                {/* Synopsis / Description with Read More toggle */}
                <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl drop-shadow">
                  <span className="inline">
                    {isDescriptionExpanded || (detailMovie.description && detailMovie.description.length <= 160)
                      ? detailMovie.description || 'No detailed description available for this title.'
                      : `${(detailMovie.description || '').slice(0, 160)}...`}
                  </span>
                  {detailMovie.description && detailMovie.description.length > 160 && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="ml-1.5 text-white hover:text-purple-300 font-bold underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0 text-xs"
                    >
                      {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                    </button>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {/* High-contrast Play Pill */}
                  <button
                    onClick={() => openPlayMovie(detailMovie)}
                    className="px-7 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm transition-all shadow-xl shadow-white/10 flex items-center space-x-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-black text-black" />
                    <span>Play</span>
                  </button>

                  {/* Add to List button */}
                  <button
                    onClick={(e) => toggleWatchlist(detailMovie.id, e)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title={watchlist.includes(detailMovie.id) ? 'Remove from My List' : 'Add to My List'}
                  >
                    {watchlist.includes(detailMovie.id) ? (
                      <Check className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>

                  {/* Trailer / Preview Eye button */}
                  <button
                    onClick={() => {
                      if (trailers.length > 0 && trailers[0].key) {
                        setActiveTrailerKey(trailers[0].key);
                      } else {
                        showToast('No official trailer found for this title');
                      }
                    }}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Watch Preview / Trailer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Download button */}
                  <button
                    onClick={() => handleDownloadAction(detailMovie)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Download stream links"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Episodes list button (if episodic) */}
                  {isMovieEpisodic(detailMovie) && (
                    <button
                      onClick={() => episodesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="View Episodes"
                    >
                      <ListVideo className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trailers Section */}
          {trailers.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Trailers</h3>
              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {trailers.map((tr) => (
                  <div
                    key={tr.id || tr.key}
                    onClick={() => setActiveTrailerKey(tr.key)}
                    className="w-56 sm:w-64 flex-shrink-0 cursor-pointer group space-y-1.5"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/80 transition-all shadow-md">
                      <img
                        src={`https://img.youtube.com/vi/${tr.key}/hqdefault.jpg`}
                        alt={tr.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 group-hover:bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                          <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300 font-semibold border border-zinc-700/80">
                        {tr.type || 'Trailer'}
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-purple-300 transition-colors">
                      {tr.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Episodes Section (for TV / Anime) */}
          {isMovieEpisodic(detailMovie) && (
            <div ref={episodesSectionRef} className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-tight">Episodes</h3>
                {availableSeasons.length > 1 && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-zinc-400 font-mono">Season:</span>
                    <select
                      value={season}
                      onChange={(e) => handleSeasonChange(parseInt(e.target.value, 10))}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-zinc-700 cursor-pointer font-semibold"
                    >
                      {availableSeasons.map((s) => (
                        <option key={s.season_number} value={s.season_number}>
                          {s.name || `Season ${s.season_number}`} ({s.episode_count} eps)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Episodes Grid with High-Quality Episode Images */}
              {isLoadingEpisodes ? (
                <div className="py-12 text-center text-xs text-zinc-400 font-mono">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                  <span>Loading season episodes...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableEpisodes.map((ep) => {
                    const episodeThumb =
                      ep.still_path ||
                      detailMovie.backdrop ||
                      detailMovie.image;

                    return (
                      <div
                        key={`ep-card-${ep.episode_number}`}
                        onClick={() => openPlayMovie(detailMovie, season, ep.episode_number)}
                        className="group relative rounded-xl overflow-hidden bg-[#100b1a]/80 hover:bg-[#181126] border border-white/10 hover:border-purple-500/80 transition-all duration-200 cursor-pointer flex flex-col shadow-lg hover:shadow-purple-900/20"
                      >
                        {/* 16:9 Thumbnail with Overlay & Play Icon */}
                        <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
                          <img
                            src={episodeThumb}
                            alt={ep.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/60 transition-colors" />

                          {/* Hover Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="w-11 h-11 rounded-full bg-white/95 text-black flex items-center justify-center shadow-xl group-hover:scale-110 active:scale-95 transition-transform">
                              <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                            </div>
                          </div>

                          {/* Episode Number Badge (top-left) */}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/15">
                            EP {ep.episode_number}
                          </div>

                          {/* Runtime Badge (bottom-right) */}
                          {ep.runtime && (
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono font-medium text-zinc-300 border border-white/10">
                              {ep.runtime}m
                            </div>
                          )}
                        </div>

                        {/* Episode Info Below Thumbnail */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                              {ep.name || `Episode ${ep.episode_number}`}
                            </h4>
                            {ep.overview ? (
                              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mt-1 font-normal">
                                {ep.overview}
                              </p>
                            ) : (
                              <p className="text-[11px] text-zinc-500 italic mt-1 font-normal">
                                Season {season}, Episode {ep.episode_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* More Like This Section */}
          {detailInfo?.similar && detailInfo.similar.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xl font-bold text-white tracking-tight">More Like This</h3>
              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {detailInfo.similar.map((sim, idx) => (
                  <div
                    key={`sim-${sim.id}-${idx}`}
                    onClick={() => openMovieDetail(sim)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={sim.image}
                        alt={sim.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {sim.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {sim.genres?.[0] || 'Cinema'} • {sim.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: Filtered / Search / Category Grid View */}
      {!isLoading && !detailMovie && (searchQuery.trim() || activeCategory !== 'all') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span>
                {activeCategory === 'discover'
                  ? searchQuery.trim()
                    ? `Search: "${searchQuery}"`
                    : 'Discover'
                  : activeCategory === 'movies'
                  ? 'Movies'
                  : activeCategory === 'shows'
                  ? 'TV Shows'
                  : activeCategory === 'anime'
                  ? 'Anime'
                  : searchQuery.trim()
                  ? `Search: "${searchQuery}"`
                  : 'Catalog'}
              </span>
              {activeCategory === 'anime' && !searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setShow18PlusAnime(!show18PlusAnime)}
                  className="normal-case font-normal text-xs text-zinc-400 hover:text-red-400 underline underline-offset-2 ml-2 transition-colors cursor-pointer bg-transparent border-0 p-0"
                  title={show18PlusAnime ? 'Hide 18+ mature titles' : 'Show 18+ mature anime'}
                >
                  {show18PlusAnime ? 'hide 18+ animes' : 'show 18+ animes'}
                </button>
              )}
            </h2>
            <span className="text-xs text-zinc-400 font-mono">{displayedCatalog.length} titles</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayedCatalog.map((movie, idx) => {
              const isSaved = watchlist.includes(movie.id);
              return (
                <div
                  key={`${movie.id}-${idx}`}
                  onClick={() => handleMovieCardClick(movie)}
                  className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-purple-600 transition-all cursor-pointer flex flex-col justify-end shadow-md"
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  {/* Quick-play hover button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPlayMovie(movie);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute inset-0 m-auto w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 z-10 cursor-pointer"
                    title="Play now"
                  >
                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                  </button>
                  {isMovie18Plus(movie) && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/85 rounded text-[9px] font-black text-red-400 border border-red-900/60 font-mono z-10">
                      18+
                    </div>
                  )}
                  <button
                    onClick={(e) => toggleWatchlist(movie.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-zinc-300 hover:text-white hover:bg-black border border-zinc-800 transition-colors cursor-pointer z-10"
                    title={isSaved ? 'Remove from My List' : 'Add to My List'}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5 text-purple-400" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                  <div className="relative z-10 p-2.5 bg-zinc-950/90 border-t border-zinc-800">
                    <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                    <p className="text-[10px] text-zinc-400 font-medium">
                      {movie.genres?.[0] || 'Cinema'} • {movie.year}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Endless Scroll / Load More Titles */}
          {activeCategory !== 'watchlist' && (
            <div className="pt-6 pb-2 flex flex-col items-center justify-center space-y-2">
              <button
                onClick={handleLoadMoreCatalog}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white transition-all cursor-pointer flex items-center space-x-2 active:scale-95 shadow-sm"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Loading More Titles...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Titles</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-zinc-500 font-mono">
                Showing {displayedCatalog.length} titles &bull; Page {catalogPage}
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Video-Style Home Layout (Hero Banner + Ranked Rows + Streaming Provider Catalog) */}
      {!isLoading && !detailMovie && !searchQuery.trim() && activeCategory === 'all' && (
        <div className="space-y-8">
          {/* HERO FEATURED CAROUSEL BANNER (Clean Flystream-style presentation) */}
          {currentFeatured && (
            <div className="relative w-full rounded-2xl overflow-hidden bg-[#07070b] shadow-2xl">
              {/* Backdrop Poster */}
              <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full max-h-[480px] overflow-hidden bg-black">
                <img
                  src={currentFeatured.backdrop || currentFeatured.image}
                  alt={currentFeatured.title}
                  className="w-full h-full object-cover object-top opacity-80"
                />
                {/* Atmospheric smooth bottom & lateral vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07070b] via-[#07070b]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#07070b]/90 via-[#07070b]/40 to-transparent" />
              </div>

              {/* Hero Movie Details & Action Buttons */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-10 z-10">
                <div className="max-w-3xl space-y-3">
                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    {currentFeatured.title}
                  </h1>

                  {/* Rating, Year, Format, Genres */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-300">
                    <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{currentFeatured.rating || '8.2'}</span>
                    </div>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-200">{currentFeatured.year}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300 uppercase tracking-wide">
                      {isMovieEpisodic(currentFeatured) ? 'TV' : 'Movie'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400">
                      {currentFeatured.genres?.join(' • ') || 'Action • Mystery • Sci-Fi'}
                    </span>
                  </div>

                  {/* Truncated Synopsis */}
                  <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 max-w-xl leading-relaxed drop-shadow">
                    {currentFeatured.description ||
                      'In the remote South Korean village of Hope Harbor, investigators uncover strange anomalies that threaten the local community.'}
                  </p>

                  {/* Hero Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {/* White Pill Play Button */}
                    <button
                      onClick={() => openPlayMovie(currentFeatured)}
                      className="px-7 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-xs sm:text-sm transition-all shadow-xl shadow-white/10 flex items-center space-x-2 cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>Play</span>
                    </button>

                    {/* Bookmark Button */}
                    <button
                      onClick={(e) => toggleWatchlist(currentFeatured.id, e)}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title={watchlist.includes(currentFeatured.id) ? 'Remove from My List' : 'Add to My List'}
                    >
                      {watchlist.includes(currentFeatured.id) ? (
                        <Check className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>

                    {/* Preview / Trailer eye button */}
                    <button
                      onClick={() => openMovieDetail(currentFeatured)}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Watch Trailer / Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Details Info Button */}
                    <button
                      onClick={() => openMovieDetail(currentFeatured)}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="View Details & Streaming Availability"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Carousel Dash / Dots Indicator */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  {featuredMovies.map((_, idx) => (
                    <button
                      key={`feat-dot-${idx}`}
                      onClick={() => setFeaturedIndex(idx)}
                      className={`h-1.5 transition-all cursor-pointer rounded-full ${
                        featuredIndex === idx
                          ? 'w-6 bg-purple-500'
                          : 'w-2 bg-zinc-600 hover:bg-zinc-400'
                      }`}
                      title={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ROW 1: TRENDING MOVIES (With Numbered Cards & Text 'This Week / Today' selector) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Trending Movies</h3>

                {/* Pure text This Week / Today selector (As shown in video) */}
                <div className="relative inline-flex items-center">
                  <button
                    onClick={() => {
                      setIsMovieTimeDropdownOpen(!isMovieTimeDropdownOpen);
                      setIsSeriesTimeDropdownOpen(false);
                      setIsProviderDropdownOpen(false);
                    }}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-0.5 cursor-pointer bg-transparent border-0 p-0 transition-colors focus:outline-none"
                  >
                    <span>{trendingMoviesTime === 'week' ? 'This Week' : 'Today'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                  </button>

                  {isMovieTimeDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-32 bg-[#130a24] border border-[#311756] rounded-lg shadow-xl p-1 z-30">
                      <button
                        onClick={() => {
                          setTrendingMoviesTime('today');
                          setIsMovieTimeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors ${
                          trendingMoviesTime === 'today'
                            ? 'bg-[#2b144d] text-white font-semibold'
                            : 'text-zinc-300 hover:bg-[#1a0f30]'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          setTrendingMoviesTime('week');
                          setIsMovieTimeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors ${
                          trendingMoviesTime === 'week'
                            ? 'bg-[#2b144d] text-white font-semibold'
                            : 'text-zinc-300 hover:bg-[#1a0f30]'
                        }`}
                      >
                        This Week
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horizontal Scrolling Numbered Cards */}
            <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
              {activeTrendingMovies.map((movie, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={`trend-m-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      {/* Big Bold Rank Number in bottom-left (As shown in video) */}
                      <div className="absolute bottom-1.5 left-2 z-10">
                        <span className="text-3xl font-black text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
                          {rank}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {movie.genres?.[0] || 'Action'} • {movie.year}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROW 2: TRENDING SERIES (With Numbered Cards & Text 'This Week / Today' selector) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Trending Series</h3>

                {/* Pure text This Week / Today selector (As shown in video) */}
                <div className="relative inline-flex items-center">
                  <button
                    onClick={() => {
                      setIsSeriesTimeDropdownOpen(!isSeriesTimeDropdownOpen);
                      setIsMovieTimeDropdownOpen(false);
                      setIsProviderDropdownOpen(false);
                    }}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-0.5 cursor-pointer bg-transparent border-0 p-0 transition-colors focus:outline-none"
                  >
                    <span>{trendingSeriesTime === 'week' ? 'This Week' : 'Today'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                  </button>

                  {isSeriesTimeDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-32 bg-[#130a24] border border-[#311756] rounded-lg shadow-xl p-1 z-30">
                      <button
                        onClick={() => {
                          setTrendingSeriesTime('today');
                          setIsSeriesTimeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors ${
                          trendingSeriesTime === 'today'
                            ? 'bg-[#2b144d] text-white font-semibold'
                            : 'text-zinc-300 hover:bg-[#1a0f30]'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          setTrendingSeriesTime('week');
                          setIsSeriesTimeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors ${
                          trendingSeriesTime === 'week'
                            ? 'bg-[#2b144d] text-white font-semibold'
                            : 'text-zinc-300 hover:bg-[#1a0f30]'
                        }`}
                      >
                        This Week
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
              {activeTrendingSeries.map((show, idx) => {
                const rank = idx + 1;
                return (
                  <div
                    key={`trend-s-${show.id}-${idx}`}
                    onClick={() => handleMovieCardClick(show)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={show.image}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                      <div className="absolute bottom-1.5 left-2 z-10">
                        <span className="text-3xl font-black text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-mono">
                          {rank}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {show.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {show.genres?.[0] || 'Drama'} • {show.year}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ROW 3: NEW RELEASES (Fresh in theaters & just added) */}
          <div className="space-y-1.5">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">New Releases</h3>
              <p className="text-xs text-zinc-400 font-medium">Fresh in theaters & just added</p>
            </div>

            <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
              {nowPlayingList.map((movie, idx) => (
                <div
                  key={`new-rel-${movie.id}-${idx}`}
                  onClick={() => handleMovieCardClick(movie)}
                  className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                      {movie.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {movie.genres?.[0] || 'Action'} • {movie.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 4: FROM [STREAMING SERVICE ▾] (Video 00:27 - 00:41) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-white tracking-tight">From</span>
                  <div className="relative inline-flex items-center">
                    <button
                      onClick={() => {
                        setIsProviderDropdownOpen(!isProviderDropdownOpen);
                        setIsMovieTimeDropdownOpen(false);
                        setIsSeriesTimeDropdownOpen(false);
                      }}
                      className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1.5 cursor-pointer bg-transparent border-0 p-0 transition-colors focus:outline-none"
                    >
                      <img
                        src={selectedProvider.logo}
                        alt={selectedProvider.name}
                        className="w-4 h-4 rounded-sm object-contain"
                      />
                      <span>{selectedProvider.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-purple-400" />
                    </button>

                    {isProviderDropdownOpen && (
                      <div className="absolute left-0 mt-1.5 w-48 bg-[#130a24] border border-[#311756] rounded-lg shadow-2xl p-1 z-30 max-h-64 overflow-y-auto">
                        {STREAMING_PROVIDERS.map((prov) => (
                          <button
                            key={prov.id}
                            onClick={() => {
                              setSelectedProvider(prov);
                              setIsProviderDropdownOpen(false);
                            }}
                            className={`w-full flex items-center space-x-2 px-2.5 py-2 text-xs rounded transition-colors text-left ${
                              selectedProvider.id === prov.id
                                ? 'bg-[#2b144d] text-white font-semibold'
                                : 'text-zinc-300 hover:bg-[#1a0f30]'
                            }`}
                          >
                            <img src={prov.logo} alt={prov.name} className="w-4 h-4 rounded-sm object-contain" />
                            <span className="truncate">{prov.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-zinc-400 font-medium">Browse a streaming service's catalogue</p>
              </div>
            </div>

            {/* Provider Movies Horizontal Scroller */}
            <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
              {isLoadingProvider ? (
                <div className="py-8 px-4 text-xs text-zinc-500 font-mono animate-pulse">
                  Loading {selectedProvider.name} catalogue...
                </div>
              ) : (
                providerMovies.map((movie, idx) => (
                  <div
                    key={`prov-m-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {movie.genres?.[0] || 'Popular'} • {movie.year}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ROW 5: POPULAR SERIES (Binge-worthy shows everyone's watching) */}
          <div className="space-y-1.5">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Popular Series</h3>
              <p className="text-xs text-zinc-400 font-medium">Binge-worthy shows everyone's watching</p>
            </div>

            <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
              {popularTvList.map((show, idx) => (
                <div
                  key={`pop-s-${show.id}-${idx}`}
                  onClick={() => handleMovieCardClick(show)}
                  className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                    <img
                      src={show.image}
                      alt={show.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                      {show.title}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {show.genres?.[0] || 'Drama'} • {show.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 6: TOP RATED MASTERPIECES */}
          {topRatedList.length > 0 && (
            <div className="space-y-1.5">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Top Rated Masterpieces</h3>
                <p className="text-xs text-zinc-400 font-medium">Critically acclaimed cinema & all-time classics</p>
              </div>

              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {topRatedList.map((movie, idx) => (
                  <div
                    key={`top-r-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        ★ {movie.rating} • {movie.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROW 7: ANIME SPOTLIGHT */}
          {animeList.length > 0 && (
            <div className="space-y-1.5">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Trending Anime</h3>
                <p className="text-xs text-zinc-400 font-medium">Top Japanese anime series & films</p>
              </div>

              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {animeList.map((anime, idx) => (
                  <div
                    key={`anime-spot-${anime.id}-${idx}`}
                    onClick={() => handleMovieCardClick(anime)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {anime.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Anime • {anime.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROW 8: ACTION & ADVENTURE */}
          {actionMoviesList.length > 0 && (
            <div className="space-y-1.5">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Action & Blockbusters</h3>
                <p className="text-xs text-zinc-400 font-medium">High-octane blockbusters & adrenaline</p>
              </div>

              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {actionMoviesList.map((movie, idx) => (
                  <div
                    key={`action-m-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Action • {movie.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROW 9: SCI-FI & CYBERPUNK */}
          {sciFiList.length > 0 && (
            <div className="space-y-1.5">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Sci-Fi & Cyberpunk</h3>
                <p className="text-xs text-zinc-400 font-medium">Mind-bending futures & interstellar worlds</p>
              </div>

              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2 pt-1">
                {sciFiList.map((movie, idx) => (
                  <div
                    key={`scifi-m-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="flex-shrink-0 w-36 sm:w-44 group cursor-pointer space-y-1.5"
                  >
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-600 transition-all shadow-md">
                      <img
                        src={movie.image}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {movie.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Sci-Fi • {movie.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENDLESS EXPLORE GRID: KEEP SCROLLING & DISCOVERING */}
          {homeExploreList.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/[0.08]">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">More to Explore</h3>
                <p className="text-xs text-zinc-400 font-medium">Keep scrolling to discover endless cinema titles</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {homeExploreList.map((movie, idx) => (
                  <div
                    key={`explore-${movie.id}-${idx}`}
                    onClick={() => handleMovieCardClick(movie)}
                    className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-purple-600 transition-all cursor-pointer flex flex-col justify-end shadow-md"
                  >
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlayMovie(movie);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute inset-0 m-auto w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 z-10 cursor-pointer"
                      title="Play now"
                    >
                      <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                    </button>
                    <div className="relative z-10 p-2.5 bg-zinc-950/90 border-t border-zinc-800">
                      <p className="text-xs font-bold text-white truncate">{movie.title}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {movie.genres?.[0] || 'Cinema'} • {movie.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Endless Scroll Load More Button */}
              <div className="pt-6 pb-4 flex flex-col items-center justify-center space-y-2">
                <button
                  onClick={handleLoadMoreHome}
                  disabled={isLoadingMoreHome}
                  className="px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-semibold text-white transition-all cursor-pointer flex items-center space-x-2 active:scale-95 shadow-sm"
                >
                  {isLoadingMoreHome ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Loading More Titles...</span>
                    </>
                  ) : (
                    <>
                      <span>Explore More Titles</span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Loaded {homeExploreList.length} deep recommendations &bull; Page {homePage}
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* IMMERSIVE FULL-SCREEN VIDEO THEATER PLAYER WITH DEDICATED SLIDE-OVER SIDEBAR */}
      <AnimatePresence>
        {isPlayerOpen && modalMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="filmu-player-container"
            onMouseMove={showAndScheduleHideControls}
            onMouseEnter={showAndScheduleHideControls}
            onTouchStart={showAndScheduleHideControls}
            onClick={showAndScheduleHideControls}
            className={`fixed inset-0 z-50 bg-black w-screen h-screen overflow-hidden flex flex-col select-none ${
              !isControlsVisible && !isPlayerSidebarOpen ? 'cursor-none' : ''
            }`}
          >
            {/* Minimalist Professional Floating Header Overlay with 5s Auto-Hide */}
            <div
              className={`absolute top-0 left-0 right-0 z-30 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between transition-all duration-500 ease-in-out ${
                isControlsVisible || isPlayerSidebarOpen
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => {
                    cancelAutoplay();
                    setIsPlayerOpen(false);
                    setIsPlayerSidebarOpen(false);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg group shrink-0"
                  title="Close Player"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                </button>

                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {modalMovie.title}
                  </h2>
                </div>
              </div>

              {/* Top Controls: Sidebar Toggle, PiP, Fullscreen */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Dedicated Open Sidebar Button */}
                <button
                  onClick={() => setIsPlayerSidebarOpen(!isPlayerSidebarOpen)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all flex items-center space-x-2 cursor-pointer shadow-lg ${
                    isPlayerSidebarOpen
                      ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-purple-600/30 ring-2 ring-purple-500/40'
                      : 'bg-black/60 hover:bg-white/15 text-zinc-200 border-white/15 hover:text-white'
                  }`}
                  title="Toggle Sidebar (Episodes, Sources, Settings)"
                >
                  <SlidersHorizontal className="w-4 h-4 text-purple-300" />
                  <span className="hidden sm:inline font-medium">
                    {isPlayerSidebarOpen ? 'Close Controls' : 'Playback Controls'}
                  </span>
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={handleDesktopPiP}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  title="Pop out in Picture-in-Picture window"
                >
                  <AppWindow className="w-4 h-4" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={togglePlayerFullscreen}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/15 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Viewport: Edge-to-Edge immersion */}
            <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
              {/* Autoplay Up Next Countdown Overlay */}
              {autoplayCountdown !== null && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-40 p-4 select-none">
                  <p className="text-[11px] text-zinc-400 font-mono font-semibold uppercase tracking-widest mb-1.5">
                    Up Next
                  </p>
                  <h4 className="text-base font-bold text-white mb-1 text-center">
                    Episode {episode + 1}
                  </h4>
                  <p className="text-xs text-zinc-300 font-mono mb-4">
                    Autoplaying next episode in {autoplayCountdown}s...
                  </p>
                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={playNextEpisode}
                      className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold border border-purple-500 transition-colors cursor-pointer"
                    >
                      Play Now
                    </button>
                    <button
                      onClick={cancelAutoplay}
                      className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {activeServer === 'stream' ? (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    controls
                    autoPlay
                    playsInline
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain bg-black"
                  />

                  {/* Simple 3 Bouncing White Dots Loading State */}
                  {isScrapingStreams && (
                    <div className="absolute inset-0 bg-black flex items-center justify-center z-20 pointer-events-none">
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}


                  {/* If no scraped streams found for this specific title */}
                  {/* If no scraped streams found for this specific title */}
                  {!isScrapingStreams && streams.length === 0 && (
                    <div className="absolute inset-0 bg-[#0c0914] flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
                      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <div className="max-w-md px-4">
                        <p className="text-sm md:text-base font-semibold text-zinc-200">
                          Connecting to VidLink Pro Server...
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Direct scraper unavailable. Seamlessly connecting to high-speed embed stream.
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => {
                            setActiveServer('vidlink');
                            setStreamStatus('VidLink Pro');
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center space-x-2"
                        >
                          <Tv className="w-4 h-4" />
                          <span>VidLink Pro</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveServer('vidsrc');
                            setStreamStatus('VidSrc Primary');
                          }}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all cursor-pointer flex items-center space-x-2"
                        >
                          <Tv className="w-4 h-4" />
                          <span>VidSrc Primary</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Playback Error Banner with User-Chosen Actions */}
                  {streamError && !isScrapingStreams && streams.length > 0 && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-rose-500/40 text-white px-4 py-2.5 rounded-xl backdrop-blur-md shadow-2xl flex items-center space-x-3 z-30 max-w-[90vw]">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-zinc-200">{streamError}</span>
                      <div className="flex items-center space-x-1.5 ml-2">
                        {streams.length > 1 && (
                          <button
                            onClick={() => {
                              setStreamError(null);
                              setSelectedStreamIndex((curr) => (curr + 1) % streams.length);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[11px] font-semibold text-white cursor-pointer"
                          >
                            Next Stream
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveServer('vidlink');
                            setStreamError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-[11px] text-white font-semibold cursor-pointer"
                        >
                          Switch to VidLink
                        </button>
                        <button
                          onClick={() => {
                            setActiveServer('vidsrc');
                            setStreamError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                        >
                          VidSrc
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <iframe
                  key={`${iframeKey}-${activeServer}-${season}-${episode}`}
                  src={getStreamEmbedUrl(modalMovie, season, episode, activeServer)}
                  title={modalMovie.title}
                  className="w-full h-full border-0 bg-black"
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                />
              )}

              {/* Dedicated Slide-over Player Sidebar (Episodes, Sources, Settings) */}
              <AnimatePresence>
                {isPlayerSidebarOpen && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] md:w-[440px] max-w-full bg-[#0a0712]/95 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col shadow-2xl text-white"
                  >
                    {/* Sidebar Header */}
                    <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">Playback Controls</h3>
                        <p className="text-xs text-zinc-400 truncate max-w-[260px]">{modalMovie.title}</p>
                      </div>
                      <button
                        onClick={() => setIsPlayerSidebarOpen(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Close Sidebar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center border-b border-white/10 px-4 pt-2 bg-black/40">
                      {isMovieEpisodic(modalMovie) && (
                        <button
                          onClick={() => setPlayerSidebarTab('episodes')}
                          className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                            playerSidebarTab === 'episodes'
                              ? 'border-purple-500 text-white'
                              : 'border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          Episodes
                        </button>
                      )}
                      <button
                        onClick={() => setPlayerSidebarTab('sources')}
                        className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          playerSidebarTab === 'sources'
                            ? 'border-purple-500 text-white'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Sources
                      </button>
                      <button
                        onClick={() => setPlayerSidebarTab('settings')}
                        className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          playerSidebarTab === 'settings'
                            ? 'border-purple-500 text-white'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Settings
                      </button>
                    </div>

                    {/* Tab Contents: EPISODES */}
                    {playerSidebarTab === 'episodes' && isMovieEpisodic(modalMovie) && (
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Season Dropdown */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                            Select Season
                          </label>
                          <div className="relative">
                            <select
                              value={season}
                              onChange={(e) => handleSeasonChange(parseInt(e.target.value, 10))}
                              className="w-full bg-zinc-900/90 border border-white/15 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-purple-500 cursor-pointer appearance-none"
                            >
                              {(availableSeasons.length > 0
                                ? availableSeasons
                                : [{ season_number: 1, name: 'Season 1', episode_count: 12 }]
                              ).map((s) => (
                                <option key={s.season_number} value={s.season_number}>
                                  {s.name || `Season ${s.season_number}`} ({s.episode_count || 12} Episodes)
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Episodes List */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                            <span>Season {season}</span>
                            <span>{availableEpisodes.length} Episodes</span>
                          </div>

                          {isLoadingEpisodes ? (
                            <div className="py-12 text-center text-xs text-zinc-400 font-mono">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              Loading episodes...
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                              {availableEpisodes.map((ep) => {
                                const isCurrent = episode === ep.episode_number;
                                const epThumb =
                                  ep.still_path ||
                                  modalMovie.backdrop ||
                                  modalMovie.image;
                                return (
                                  <button
                                    key={`side-ep-${ep.episode_number}`}
                                    onClick={() => handleEpisodeChange(ep.episode_number)}
                                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center space-x-3 group ${
                                      isCurrent
                                        ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                        : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                                    }`}
                                  >
                                    <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-white/10 group-hover:border-purple-500/60 transition-colors">
                                      <img
                                        src={epThumb}
                                        alt={ep.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <Play className="w-3.5 h-3.5 fill-white text-white drop-shadow opacity-80 group-hover:opacity-100" />
                                      </div>
                                      <div className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-zinc-300 font-semibold">
                                        EP {ep.episode_number}
                                      </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold truncate pr-1">
                                          {ep.name || `Episode ${ep.episode_number}`}
                                        </p>
                                        {isCurrent && (
                                          <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 ml-1">
                                            Playing
                                          </span>
                                        )}
                                      </div>
                                      {ep.overview && (
                                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 font-normal">
                                          {ep.overview}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab Contents: SOURCES */}
                    {playerSidebarTab === 'sources' && (
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                            Streaming Servers & Scrapers
                          </label>

                          {/* Direct Scraped Streams */}
                          {streams.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs text-zinc-400 font-medium">Direct Stream Mirrors:</p>
                              {streams.map((str, idx) => {
                                const isSelected = activeServer === 'stream' && selectedStreamIndex === idx;
                                return (
                                  <button
                                    key={`side-stream-${idx}`}
                                    onClick={() => {
                                      setActiveServer('stream');
                                      setSelectedStreamIndex(idx);
                                    }}
                                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                        : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2.5">
                                      <Play className="w-4 h-4 text-purple-400" />
                                      <div>
                                        <span className="text-xs font-semibold">{str.providerName}</span>
                                        {str.quality && (
                                          <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                                            {str.quality}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Embed Servers */}
                          <div className="space-y-1.5 pt-2">
                            <p className="text-xs text-zinc-400 font-medium">Embed Servers:</p>
                            <button
                              onClick={() => {
                                setActiveServer('vidlink');
                                setStreamStatus('VidLink Pro');
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                activeServer === 'vidlink'
                                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Tv className="w-4 h-4 text-purple-400" />
                                <div>
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-xs font-semibold">VidLink Pro</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                      Fast • HD
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400">High speed, ultra-reliable player (vidlink.pro)</p>
                                </div>
                              </div>
                              {activeServer === 'vidlink' && <Check className="w-4 h-4 text-purple-400" />}
                            </button>

                            <button
                              onClick={() => {
                                setActiveServer('vidsrc');
                                setStreamStatus('VidSrc Primary');
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                activeServer === 'vidsrc'
                                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Tv className="w-4 h-4 text-purple-400" />
                                <div>
                                  <span className="text-xs font-semibold">VidSrc Primary Server</span>
                                  <p className="text-[10px] text-zinc-400">High compatibility player (vidsrc.to)</p>
                                </div>
                              </div>
                              {activeServer === 'vidsrc' && <Check className="w-4 h-4 text-purple-400" />}
                            </button>

                            <button
                              onClick={() => {
                                setActiveServer('vidfast');
                                setStreamStatus('VidFast Pro');
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                activeServer === 'vidfast'
                                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Tv className="w-4 h-4 text-purple-400" />
                                <div>
                                  <span className="text-xs font-semibold">VidFast Pro Mirror</span>
                                  <p className="text-[10px] text-zinc-400">Fast alternative mirror (vidfast.pro)</p>
                                </div>
                              </div>
                              {activeServer === 'vidfast' && <Check className="w-4 h-4 text-purple-400" />}
                            </button>

                            <button
                              onClick={() => {
                                setActiveServer('vidsrc_pm');
                                setStreamStatus('VidSrc PM');
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                activeServer === 'vidsrc_pm'
                                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Tv className="w-4 h-4 text-purple-400" />
                                <div>
                                  <span className="text-xs font-semibold">VidSrc PM Mirror</span>
                                  <p className="text-[10px] text-zinc-400">High uptime mirror (vidsrc.pm)</p>
                                </div>
                              </div>
                              {activeServer === 'vidsrc_pm' && <Check className="w-4 h-4 text-purple-400" />}
                            </button>

                            <button
                              onClick={() => {
                                setActiveServer('vidsrc_me');
                                setStreamStatus('VidSrc Classic');
                              }}
                              className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                activeServer === 'vidsrc_me'
                                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <Tv className="w-4 h-4 text-purple-400" />
                                <div>
                                  <span className="text-xs font-semibold">VidSrc Classic Mirror</span>
                                  <p className="text-[10px] text-zinc-400">Alternative mirror (vidsrc.me)</p>
                                </div>
                              </div>
                              {activeServer === 'vidsrc_me' && <Check className="w-4 h-4 text-purple-400" />}
                            </button>
                          </div>
                        </div>

                        {/* Status Card */}
                        <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400">
                          <span className="flex items-center space-x-2">
                            {isScrapingStreams && (
                              <span className="w-2.5 h-2.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            <span>{streamStatus || 'Ready'}</span>
                          </span>
                          <button
                            onClick={() => {
                              if (modalMovie) {
                                fetchStreamsForContent(modalMovie, season, episode);
                                setIframeKey((k) => k + 1);
                              }
                            }}
                            className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                          >
                            Rescrape
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tab Contents: SETTINGS */}
                    {playerSidebarTab === 'settings' && (
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Autoplay setting */}
                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-white">Autoplay Next Episode</p>
                            <p className="text-[11px] text-zinc-400">
                              Automatically start next episode when video ends
                            </p>
                          </div>
                          <button
                            onClick={toggleAutoplay}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                              autoplay ? 'bg-purple-600' : 'bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                autoplay ? 'left-7' : 'left-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Picture-in-Picture Button */}
                        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-white">Picture-in-Picture Window</p>
                            <p className="text-[11px] text-zinc-400">Watch in a detached floating desktop window</p>
                          </div>
                          <button
                            onClick={handleDesktopPiP}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium cursor-pointer transition-colors"
                          >
                            Open PiP
                          </button>
                        </div>

                        {/* Official Streaming Availability */}
                        {watchmodeSources.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                              Official Streaming Availability
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {watchmodeSources.slice(0, 6).map((src, i) => (
                                <a
                                  key={`wm-${i}`}
                                  href={src.web_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 flex items-center space-x-2 text-xs text-zinc-300 hover:text-white transition-colors"
                                >
                                  {src.logo_url && (
                                    <img src={src.logo_url} alt={src.name} className="w-4 h-4 rounded-sm object-contain" />
                                  )}
                                  <span className="truncate">{src.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRAILER PREVIEW MODAL */}
      <AnimatePresence>
        {activeTrailerKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveTrailerKey(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl"
            >
              <button
                onClick={() => setActiveTrailerKey(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/80 hover:bg-zinc-800 text-white flex items-center justify-center border border-zinc-700 transition-colors cursor-pointer shadow-lg"
                title="Close Trailer"
              >
                <X className="w-5 h-5" />
              </button>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeTrailerKey}?autoplay=1&rel=0`}
                title="Trailer"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FEEDBACK TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700 text-white text-xs font-semibold shadow-2xl flex items-center space-x-2 backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
