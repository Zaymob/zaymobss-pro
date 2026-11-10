import React, { useState, useEffect, useRef } from 'react';
import { MusicTrack, PlaybackContext } from '../types';
import {
  Play,
  Pause,
  Heart,
  Search,
  X,
  ListPlus,
  ListMusic,
  Mic,
  Disc,
  Check,
  Flame,
  Library,
  Plus,
  Command,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
  Zap,
  Moon,
  Radio,
  Shuffle,
  ArrowLeft,
} from 'lucide-react';
import {
  getMusicHistory,
  addMusicHistory,
  MusicHistoryItem,
} from '../utils/historyManager';

interface MusicViewProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: MusicTrack, context?: PlaybackContext) => void;
  onTogglePlay: () => void;
  currentTime?: number;
  onSeek?: (time: number) => void;
  playQueue?: MusicTrack[];
  onAddToQueue?: (track: MusicTrack, playNext?: boolean) => void;
  onRemoveFromQueue?: (index: number) => void;
  onClearQueue?: () => void;
  onNavigateHome?: () => void;
  initialArtist?: { id: string; name: string; picture?: string } | null;
}

interface CustomPlaylist {
  id: string;
  name: string;
  description: string;
  cover?: string;
  createdAt: number;
  tracks: MusicTrack[];
}

interface ArtistItem {
  id: string;
  name: string;
  picture: string;
  trackCount?: number;
}

interface AlbumItem {
  id: string;
  collectionId: number | string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  trackCount: number;
  genre?: string;
}

interface ChartSection {
  id: number;
  title: string;
  icon?: string;
  tracks: MusicTrack[];
}

interface ParsedLyric {
  time: number;
  text: string;
}

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80';

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '3:30';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Resilient Image component with automatic fallbacks and no-referrer header policy
const SafeCoverImage: React.FC<{
  src?: string;
  alt?: string;
  className?: string;
  isCircle?: boolean;
}> = ({ src, alt = '', className = '', isCircle = false }) => {
  const [errorCount, setErrorCount] = useState(0);

  const fallbackSrc = isCircle
    ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
    : DEFAULT_COVER;

  const currentSrc = !src || errorCount > 0 ? fallbackSrc : src;

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (errorCount === 0) {
          setErrorCount(1);
        }
      }}
      className={`object-cover select-none ${className}`}
    />
  );
};

export const MusicView: React.FC<MusicViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  currentTime = 0,
  onSeek,
  playQueue = [],
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  initialArtist,
}) => {
  // Navigation tabs: Browse (default home page), Search, Your Library
  const [navTab, setNavTab] = useState<'browse' | 'search' | 'library'>('browse');
  const [searchQuery, setSearchQuery] = useState('');

  // Browse Vibe Homepage Sections (Top Hits, Pop, Hip-Hop, R&B, etc.)
  const [chartSections, setChartSections] = useState<ChartSection[]>([]);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);

  // Search Results State
  const [searchResults, setSearchResults] = useState<{
    tracks: MusicTrack[];
    artists: ArtistItem[];
    albums: AlbumItem[];
  }>({
    tracks: [],
    artists: [],
    albums: [],
  });
  const [isSearching, setIsSearching] = useState(false);

  // Source selector state (YouTube Music, Tidal) from music-main API
  const [selectedSource, setSelectedSource] = useState<'ytm' | 'tidal'>('ytm');
  const [sourceLatencies, setSourceLatencies] = useState<{ [key: string]: number }>({});
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const sourceOptions = [
    { id: 'ytm' as const, label: 'YouTube Music (YTM)', badge: 'Audio Stream' },
    { id: 'tidal' as const, label: 'Tidal (Hi-Fi)', badge: 'Master Catalog' },
  ];

  // Liked songs state
  const [likedSongIds, setLikedSongIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_liked_songs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom playlists state
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_custom_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistMenuTrack, setPlaylistMenuTrack] = useState<MusicTrack | null>(null);

  // Synced lyrics state
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [lyrics, setLyrics] = useState<ParsedLyric[]>([]);
  const [plainLyrics, setPlainLyrics] = useState('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Artist Profile & Discography state
  const [selectedArtist, setSelectedArtist] = useState<{ id: string; name: string; picture?: string } | null>(null);
  const [artistTopSongs, setArtistTopSongs] = useState<MusicTrack[]>([]);
  const [artistAlbums, setArtistAlbums] = useState<AlbumItem[]>([]);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [artistTab, setArtistTab] = useState<'songs' | 'albums'>('songs');

  // Album Detail Modal state
  const [selectedAlbumModal, setSelectedAlbumModal] = useState<AlbumItem | null>(null);
  const [albumModalTracks, setAlbumModalTracks] = useState<MusicTrack[]>([]);
  const [isLoadingAlbumModal, setIsLoadingAlbumModal] = useState(false);

  // Carousel refs map for smooth scrolling
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const artistsScrollRef = useRef<HTMLDivElement | null>(null);
  const albumsScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null> | HTMLDivElement | null, direction: 'left' | 'right') => {
    const el = ref && 'current' in ref ? ref.current : ref;
    if (el) {
      const amount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Load active music source & categorized Browse charts on mount
  useEffect(() => {
    fetch('/api/music/source')
      .then((r) => r.json())
      .then((data) => {
        if (data.current) setSelectedSource(data.current);
        if (data.latencies) setSourceLatencies(data.latencies);
      })
      .catch(() => {});

    const fetchBrowseCharts = async () => {
      setIsLoadingCharts(true);
      try {
        const res = await fetch('/api/music/charts');
        if (!res.ok) throw new Error('Charts failed');
        const data = await res.json();
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          setChartSections(data.sections);
        }
      } catch (e) {
        console.warn('Error loading browse charts:', e);
      } finally {
        setIsLoadingCharts(false);
      }
    };
    fetchBrowseCharts();
  }, []);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Focus search input when switching to Search tab
  useEffect(() => {
    if (navTab === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [navTab]);

  const handleGoToSearch = (term = '') => {
    setNavTab('search');
    setSelectedArtist(null);
    if (term) {
      setSearchQuery(term);
      executeSearch(term);
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  // Open Artist Profile with top songs & albums
  const handleOpenArtist = async (artist: { id: string; name: string; picture?: string }) => {
    setSelectedArtist(artist);
    setIsLoadingArtist(true);
    setArtistTab('songs');
    try {
      const res = await fetch(
        `/api/music/artist_details?name=${encodeURIComponent(artist.name)}&id=${encodeURIComponent(artist.id)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.artist) {
          setSelectedArtist({
            id: String(data.artist.id || artist.id),
            name: artist.name, // Always preserve the artist name the user opened
            picture: data.artist.picture || artist.picture,
          });
        }
        setArtistTopSongs(Array.isArray(data.topSongs) ? data.topSongs : []);
        // Strictly filter out 1-song singles from the albums list
        const genuineAlbums = Array.isArray(data.albums)
          ? data.albums.filter((alb: AlbumItem) => {
              const count = alb.trackCount || 0;
              const isSingle = count <= 2 || alb.title.toLowerCase().endsWith(' - single');
              return !isSingle;
            })
          : [];
        setArtistAlbums(genuineAlbums);
      }
    } catch (e) {
      console.warn('Artist load error:', e);
    } finally {
      setIsLoadingArtist(false);
    }
  };

  useEffect(() => {
    if (initialArtist && initialArtist.name) {
      handleOpenArtist(initialArtist);
    }
  }, [initialArtist]);

  // Open Album details with full tracklist
  const handleOpenAlbum = async (album: AlbumItem) => {
    setSelectedAlbumModal(album);
    setIsLoadingAlbumModal(true);
    try {
      const res = await fetch(
        `/api/music/album_details?id=${encodeURIComponent(album.collectionId || album.id)}&title=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.album) {
          setSelectedAlbumModal((prev) => ({
            ...prev,
            ...data.album,
            collectionId: data.album.id || album.collectionId,
          }));
        }
        setAlbumModalTracks(Array.isArray(data.tracks) ? data.tracks : []);
      }
    } catch (e) {
      console.warn('Album load error:', e);
    } finally {
      setIsLoadingAlbumModal(false);
    }
  };

  // Execute Music Search (Powered by music-main API)
  const executeSearch = async (term: string, sourceOverride?: 'ytm' | 'tidal') => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return;

    setIsSearching(true);
    const sourceToUse = sourceOverride || selectedSource;
    try {
      const res = await fetch(
        `/api/music/search?query=${encodeURIComponent(cleanTerm)}&limit=30&source=${sourceToUse}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      const tracks: MusicTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
      const artists: ArtistItem[] = Array.isArray(data.artists) ? data.artists : [];
      const albums: AlbumItem[] = Array.isArray(data.albums) ? data.albums : [];

      setSearchResults({ tracks, artists, albums });
    } catch (e) {
      console.warn('Search query error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedArtist(null);
    if (navTab !== 'search') setNavTab('search');
    executeSearch(searchQuery);
  };

  // Toggle Like Song
  const toggleLikeSong = (track: MusicTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedSongIds((prev) => {
      const next = prev.includes(track.id) ? prev.filter((id) => id !== track.id) : [...prev, track.id];
      try {
        localStorage.setItem('yuno_liked_songs', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(likedSongIds.includes(track.id) ? 'Removed from Liked Songs' : 'Added to Liked Songs');
  };

  // Play an entire collection of tracks
  const handlePlayCollection = (collection: MusicTrack[], startIndex = 0) => {
    if (!collection || collection.length === 0) return;
    const track = collection[startIndex];
    addMusicHistory({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      duration: track.duration,
      streamUrl: track.streamUrl,
      data: track,
    });
    onPlayTrack(track, {
      type: 'playlist',
      playlistTracks: collection,
    });
  };

  // Create Playlist
  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: CustomPlaylist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: 'Custom Playlist',
      createdAt: Date.now(),
      tracks: playlistMenuTrack ? [playlistMenuTrack] : [],
    };
    const updated = [newPl, ...customPlaylists];
    setCustomPlaylists(updated);
    try {
      localStorage.setItem('yuno_custom_playlists', JSON.stringify(updated));
    } catch {}
    setNewPlaylistName('');
    setShowNewPlaylistModal(false);
    setPlaylistMenuTrack(null);
    showToast(`Created playlist "${newPl.name}"`);
  };

  // Add track to playlist
  const handleAddTrackToPlaylist = (playlistId: string, track: MusicTrack) => {
    const updated = customPlaylists.map((pl) => {
      if (pl.id === playlistId) {
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        return {
          ...pl,
          tracks: [...pl.tracks, track],
          cover: pl.cover || track.cover,
        };
      }
      return pl;
    });
    setCustomPlaylists(updated);
    try {
      localStorage.setItem('yuno_custom_playlists', JSON.stringify(updated));
    } catch {}
    setPlaylistMenuTrack(null);
    showToast('Added to playlist');
  };

  // Fetch full live synced lyrics whenever current track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      setPlainLyrics('');
      return;
    }

    let isMounted = true;
    const fetchLyrics = async () => {
      setIsLoadingLyrics(true);
      try {
        const title = encodeURIComponent(currentTrack.title || '');
        const artist = encodeURIComponent(currentTrack.artist || '');
        const res = await fetch(`/api/music/lyrics?title=${title}&artist=${artist}`);
        if (!res.ok) throw new Error('Lyrics failed');
        const data = await res.json();
        if (!isMounted) return;

        const raw = data.lyrics || data.lrc || '';
        if (raw) {
          const lines = raw.split('\n');
          const parsed: ParsedLyric[] = [];
          const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

          for (const line of lines) {
            const match = line.match(lrcRegex);
            if (match) {
              const mins = parseInt(match[1], 10);
              const secs = parseInt(match[2], 10);
              const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
              const time = mins * 60 + secs + ms / 1000;
              const text = match[4].trim();
              if (text) {
                parsed.push({ time, text });
              }
            }
          }

          if (parsed.length > 0) {
            setLyrics(parsed);
            setPlainLyrics('');
          } else {
            setLyrics([]);
            setPlainLyrics(raw);
          }
        } else {
          setLyrics([]);
          setPlainLyrics('No synchronized lyrics found for this track.');
        }
      } catch {
        if (isMounted) {
          setLyrics([]);
          setPlainLyrics('No lyrics found for this track.');
        }
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
      }
    };

    fetchLyrics();
    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Active lyric index calculation
  const activeLyricIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    if (nextLine) {
      return currentTime >= line.time && currentTime < nextLine.time;
    }
    return currentTime >= line.time;
  });

  // Get icon for category
  const getCategoryIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('hit') || lower.includes('top')) return <Flame className="w-4 h-4 text-purple-400" />;
    if (lower.includes('pop')) return <Sparkles className="w-4 h-4 text-purple-400" />;
    if (lower.includes('rap') || lower.includes('hip')) return <Zap className="w-4 h-4 text-purple-400" />;
    if (lower.includes('r&b') || lower.includes('soul') || lower.includes('chill')) return <Moon className="w-4 h-4 text-purple-400" />;
    return <Radio className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#07040a] text-zinc-100 flex flex-col md:flex-row pb-28 select-none font-sans">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#190e29] border border-[#552c8c] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center space-x-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT SIDEBAR (Music, Browse, Search, Your Library, Playlists, New Playlist, Shortcuts) */}
      <aside className="w-full md:w-56 lg:w-64 bg-[#0a050f] border-r border-[#1a0f26] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Brand Wordmark Header */}
          <div className="flex items-center justify-between pt-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Music</h1>
            <button
              onClick={() => setIsLyricsModalOpen(true)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-[#190e2b] transition-colors cursor-pointer"
              title="Open Synced Lyrics"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setNavTab('browse');
                setSelectedArtist(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                navTab === 'browse' && !selectedArtist
                  ? 'bg-[#1b0f2d] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#120820]'
              }`}
            >
              <Flame className="w-4 h-4 text-purple-400" />
              <span>Browse</span>
            </button>

            <button
              onClick={() => handleGoToSearch('')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                navTab === 'search' && !selectedArtist
                  ? 'bg-[#1b0f2d] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#120820]'
              }`}
            >
              <Search className="w-4 h-4 text-purple-400" />
              <span>Search</span>
            </button>

            <button
              onClick={() => {
                setNavTab('library');
                setSelectedArtist(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                navTab === 'library' && !selectedArtist
                  ? 'bg-[#1b0f2d] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#120820]'
              }`}
            >
              <Library className="w-4 h-4 text-purple-400" />
              <span>Your Library</span>
            </button>
          </nav>

          {/* Playlists Section */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
              PLAYLISTS
            </span>

            {customPlaylists.length === 0 ? (
              <p className="text-xs text-zinc-400">Create your first playlist</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-none pr-1">
                {customPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      setSelectedPlaylistId(pl.id);
                      setNavTab('library');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium truncate transition-colors cursor-pointer flex items-center justify-between group ${
                      selectedPlaylistId === pl.id && navTab === 'library'
                        ? 'text-purple-300 font-semibold bg-[#1a0e2a]'
                        : 'text-zinc-400 hover:text-white hover:bg-[#12091d]'
                    }`}
                  >
                    <span className="truncate">{pl.name}</span>
                    <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 font-mono">
                      {pl.tracks.length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* + New Playlist Button */}
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="w-full py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Playlist</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 space-y-6 max-w-7xl">
        {/* TOP BAR: Header / Omnibox & Quality dropdown (Profile button removed) */}
        <div className="flex items-center justify-between gap-3">
          {navTab === 'browse' ? (
            /* Browse Header matching reference image: Title 'Browse' with search trigger */
            <div className="flex items-center justify-between flex-1 max-w-xl gap-4">
              <h2 className="text-2xl font-black text-white tracking-tight shrink-0">Browse</h2>
              <button
                type="button"
                onClick={() => handleGoToSearch('')}
                className="relative flex-1 text-left px-4 py-2 bg-[#120a1c] border border-[#261539] hover:border-purple-500 rounded-full text-xs text-zinc-400 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4 text-zinc-500" />
                <span>Search artists, songs, albums...</span>
              </button>
            </div>
          ) : (
            /* Search Omnibox */
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists, songs, albums..."
                className="w-full pl-10 pr-9 py-2 bg-[#120a1c] border border-[#261539] focus:border-purple-500 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          )}

          {/* Right Controls: Source Selector (YTM / Tidal from music-main API) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowSourceDropdown(!showSourceDropdown)}
                className="px-3.5 py-1.5 rounded-full bg-[#120a1c] hover:bg-[#1a0f26] border border-[#261539] text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Select Music Audio & Catalog Source"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{selectedSource === 'ytm' ? 'YouTube Music' : 'Tidal Hi-Fi'}</span>
                {sourceLatencies[selectedSource] ? (
                  <span className="text-[10px] text-purple-400 font-mono">
                    {sourceLatencies[selectedSource]}ms
                  </span>
                ) : null}
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {showSourceDropdown && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#140b22] border border-[#37195c] rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-purple-400 border-b border-[#25133d]">
                    Active Music Source
                  </div>
                  {sourceOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedSource(opt.id);
                        setShowSourceDropdown(false);
                        showToast(`Source: ${opt.label}`);
                        if (searchQuery.trim()) {
                          executeSearch(searchQuery, opt.id);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        selectedSource === opt.id
                          ? 'bg-purple-900/40 text-purple-300 font-bold'
                          : 'text-zinc-300 hover:bg-[#1c0f30] hover:text-white'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">{opt.badge}</span>
                      </div>
                      {selectedSource === opt.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ARTIST PROFILE VIEW (When user clicks an artist from search, browse, or tracks) */}
        {selectedArtist ? (
          <div className="space-y-6 animate-fadeIn pb-12">
            {/* Back Navigation Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedArtist(null)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#150a22] hover:bg-[#200f35] text-zinc-300 hover:text-white text-xs font-semibold border border-[#2d1547] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-purple-400" />
                <span>Back</span>
              </button>
            </div>

            {/* Artist Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-b from-[#160c28] via-[#0f071a] to-[#0a0512] border border-[#23123b] p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shrink-0 border border-white/10 shadow-2xl bg-zinc-900">
                <SafeCoverImage
                  src={selectedArtist.picture}
                  alt={selectedArtist.name}
                  isCircle
                  className="w-full h-full rounded-full"
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 font-semibold block">
                  Artist
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  {selectedArtist.name}
                </h1>
                <p className="text-xs text-zinc-400 font-mono">
                  {artistTopSongs.length} Top Songs • {artistAlbums.length} Albums & Releases
                </p>

                {/* Play Top Songs / Shuffle Buttons */}
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-3">
                  {artistTopSongs.length > 0 && (
                    <button
                      onClick={() => handlePlayCollection(artistTopSongs, 0)}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-2 transition-transform hover:scale-105 shadow-xl cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-black text-black" />
                      <span>Play Top Songs</span>
                    </button>
                  )}
                  {artistTopSongs.length > 1 && (
                    <button
                      onClick={() => {
                        const shuffled = [...artistTopSongs].sort(() => Math.random() - 0.5);
                        handlePlayCollection(shuffled, 0);
                      }}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white font-semibold text-xs border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Shuffle className="w-4 h-4 text-zinc-300" />
                      <span>Shuffle</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Artist Navigation Sub-tabs: Top Songs | Albums */}
            <div className="flex items-center gap-2 border-b border-[#24113e] pb-2">
              <button
                onClick={() => setArtistTab('songs')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  artistTab === 'songs'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a0c2c]'
                }`}
              >
                Top Songs ({artistTopSongs.length})
              </button>
              <button
                onClick={() => setArtistTab('albums')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  artistTab === 'albums'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1a0c2c]'
                }`}
              >
                Albums & Discography ({artistAlbums.length})
              </button>
            </div>

            {isLoadingArtist ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500 font-mono text-xs">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading artist profile & discography...</span>
              </div>
            ) : artistTab === 'songs' ? (
              <div className="space-y-1">
                {artistTopSongs.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                  const isLiked = likedSongIds.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayCollection(artistTopSongs, idx)}
                      className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors group cursor-pointer ${
                        isCurrent ? 'bg-[#1b0f2e] text-white' : 'hover:bg-[#120820] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-purple-400">
                          {isCurrent && isPlaying ? (
                            <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            idx + 1
                          )}
                        </span>

                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800 shadow">
                          <SafeCoverImage src={track.cover} alt={track.title} className="w-full h-full rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {isCurrent && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-white text-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 truncate">
                          <span className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                            {track.album || 'Single'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={(e) => toggleLikeSong(track, e)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title={isLiked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToQueue?.(track);
                            showToast(`Queued ${track.title}`);
                          }}
                          className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Add to queue"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              artistAlbums.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 text-xs font-mono">
                  No studio albums cataloged for this artist. Listen to their Top Songs above.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {artistAlbums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => handleOpenAlbum(album)}
                      className="flex flex-col gap-2 p-2.5 rounded-2xl bg-[#120721]/60 hover:bg-[#1a0b30] border border-[#26133d] hover:border-purple-500/60 transition-all group cursor-pointer shadow-lg"
                    >
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 relative">
                        <SafeCoverImage src={album.cover} alt={album.title} className="w-full h-full rounded-xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{album.title}</p>
                        <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {album.year} • {album.trackCount} songs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          <>
            {/* VIEW 1: BROWSE VIBE HOMEPAGE (Matching User's Reference Image: Top Hits, Pop, Hip-Hop, etc. with genuine album art) */}
            {navTab === 'browse' && (
          <div className="space-y-8 animate-fadeIn pt-1">
            {isLoadingCharts ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3 text-center text-zinc-500 font-mono text-xs">
                <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading trending releases and hits...</span>
              </div>
            ) : chartSections.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No chart sections available. Switch to Search to explore millions of songs.
              </div>
            ) : (
              chartSections.map((section) => (
                <section key={section.id} className="space-y-3">
                  {/* Category Title Row (e.g. 🔥 Top Hits / ✨ Pop) + Arrow Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(section.title)}
                      <h3 className="text-base font-bold text-white tracking-tight">{section.title}</h3>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-500">
                      <button
                        onClick={() => scrollCarousel(carouselRefs.current[section.id], 'left')}
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Scroll Left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => scrollCarousel(carouselRefs.current[section.id], 'right')}
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Scroll Right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Carousel of Album/Track Cards */}
                  <div
                    ref={(el) => {
                      carouselRefs.current[section.id] = el;
                    }}
                    className="flex items-start gap-4 sm:gap-5 overflow-x-auto scrollbar-none pb-2 pt-1"
                  >
                    {section.tracks.map((track, idx) => {
                      const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;

                      return (
                        <div
                          key={track.id}
                          onClick={() => handlePlayCollection(section.tracks, idx)}
                          className="flex flex-col gap-1.5 group cursor-pointer shrink-0 w-36 sm:w-44 text-left"
                        >
                          {/* Square Artwork Card */}
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/80 group-hover:border-purple-500/70 group-hover:scale-[1.03] transition-all shadow-xl relative">
                            <SafeCoverImage
                              src={track.cover}
                              alt={track.title}
                              className="w-full h-full rounded-2xl"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4 fill-white" />
                                ) : (
                                  <Play className="w-4 h-4 fill-white ml-0.5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Song Title in Bold White */}
                          <p
                            className={`text-xs sm:text-sm font-bold truncate w-full mt-1 ${
                              isCurrent ? 'text-purple-300' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </p>

                          {/* Artist Name Underneath in Muted Gray */}
                          <p
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenArtist({ id: track.artist, name: track.artist, picture: track.coverUrl || track.cover });
                            }}
                            className="text-[11px] sm:text-xs text-zinc-400 truncate w-full hover:text-white transition-colors cursor-pointer"
                          >
                            {track.artist}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vibe scroll indicator line matching reference image */}
                  <div className="flex items-center gap-1 text-zinc-700 px-1 pt-0.5">
                    <span className="w-2 h-0.5 bg-zinc-700 rounded-full" />
                    <span className="w-24 sm:w-40 h-0.5 bg-zinc-800 rounded-full" />
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {/* VIEW 2: SEARCH VIEW (Artists carousel with ACTUAL photos, Albums carousel, Tracks table) */}
        {navTab === 'search' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header Track Count */}
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span>{isSearching ? 'Searching tracks...' : `${searchResults.tracks.length} tracks`}</span>
            </div>

            {/* 1. ARTISTS CAROUSEL (Circular avatars with actual photos + Artist Name Underneath) */}
            {searchResults.artists.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-tight">Artists</h2>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <button
                      onClick={() => scrollCarousel(artistsScrollRef, 'left')}
                      className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="w-12 h-0.5 bg-zinc-800 rounded-full" />
                    <button
                      onClick={() => scrollCarousel(artistsScrollRef, 'right')}
                      className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={artistsScrollRef}
                  className="flex items-start gap-4 sm:gap-6 overflow-x-auto scrollbar-none pb-2 pt-1"
                >
                  {searchResults.artists.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => handleOpenArtist({ id: artist.id, name: artist.name, picture: artist.picture })}
                      className="flex flex-col items-center gap-2 group cursor-pointer shrink-0 w-20 sm:w-24 text-center"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-500 group-hover:scale-105 transition-all shadow-md">
                        <SafeCoverImage
                          src={artist.picture}
                          alt={artist.name}
                          isCircle
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <span className="text-xs font-semibold text-zinc-300 group-hover:text-white truncate w-full">
                        {artist.name}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. ALBUMS CAROUSEL (Square Cards + Album Title + Artist Name Underneath) */}
            {searchResults.albums.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white tracking-tight">Albums</h2>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <button
                      onClick={() => scrollCarousel(albumsScrollRef, 'left')}
                      className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="w-12 h-0.5 bg-zinc-800 rounded-full" />
                    <button
                      onClick={() => scrollCarousel(albumsScrollRef, 'right')}
                      className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div
                  ref={albumsScrollRef}
                  className="flex items-start gap-4 overflow-x-auto scrollbar-none pb-2 pt-1"
                >
                  {searchResults.albums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => handleOpenAlbum(album)}
                      className="flex flex-col gap-1.5 group cursor-pointer shrink-0 w-32 sm:w-36 text-left"
                    >
                      <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-purple-500 group-hover:scale-[1.03] transition-all shadow-lg relative">
                        <SafeCoverImage
                          src={album.cover}
                          alt={album.title}
                          className="w-full h-full rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-white truncate w-full mt-1">
                        {album.title}
                      </p>
                      <p
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenArtist({ id: album.artist, name: album.artist, picture: album.cover });
                        }}
                        className="text-[11px] text-zinc-400 truncate w-full hover:text-white transition-colors cursor-pointer"
                      >
                        {album.artist}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. TRACKS TABLE (Index, Thumbnail, Track Title, Artist Name UNDERNEATH, Album, Duration) */}
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white tracking-tight">Tracks</h2>

              {isSearching ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500 font-mono text-xs">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading matching tracks...</span>
                </div>
              ) : searchResults.tracks.length === 0 ? (
                !searchQuery.trim() ? (
                  <div className="py-4 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-3">Popular Searches</h3>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Travis Scott',
                          'Drake',
                          'The Weeknd',
                          'Taylor Swift',
                          'Kendrick Lamar',
                          'Playboi Carti',
                          'Billie Eilish',
                          'SZA',
                          'Frank Ocean',
                          'Tyler, The Creator',
                          'Don Toliver',
                        ].map((artist) => (
                          <button
                            key={artist}
                            onClick={() => handleGoToSearch(artist)}
                            className="px-3.5 py-1.5 rounded-full bg-[#180d28] hover:bg-purple-600 border border-[#2b1646] hover:border-purple-400 text-xs font-medium text-purple-200 hover:text-white transition-all cursor-pointer shadow-sm"
                          >
                            {artist}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white mb-3">Explore Genres</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { name: 'Hip-Hop', bg: 'from-amber-600 to-rose-700' },
                          { name: 'Pop', bg: 'from-pink-600 to-purple-700' },
                          { name: 'R&B', bg: 'from-indigo-600 to-blue-700' },
                          { name: 'Electronic', bg: 'from-cyan-600 to-teal-700' },
                          { name: 'Rock', bg: 'from-red-600 to-orange-700' },
                          { name: 'Indie', bg: 'from-emerald-600 to-teal-800' },
                          { name: 'Lo-Fi', bg: 'from-purple-800 to-indigo-900' },
                          { name: 'Latin', bg: 'from-yellow-600 to-red-700' },
                        ].map((genre) => (
                          <button
                            key={genre.name}
                            onClick={() => handleGoToSearch(genre.name)}
                            className={`p-4 rounded-2xl bg-gradient-to-br ${genre.bg} text-left transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer shadow-lg`}
                          >
                            <span className="text-sm font-black text-white">{genre.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    No tracks found for "{searchQuery}". Type an artist, album, or song name above.
                  </div>
                )
              ) : (
                <div className="space-y-1">
                  {searchResults.tracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                    const isLiked = likedSongIds.includes(track.id);

                    return (
                      <div
                        key={track.id}
                        onClick={() => handlePlayCollection(searchResults.tracks, idx)}
                        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors group cursor-pointer ${
                          isCurrent ? 'bg-[#1b0f2e] text-white' : 'hover:bg-[#120820] text-zinc-300'
                        }`}
                      >
                        {/* Left: Index + Artwork + Title & Artist UNDER */}
                        <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                          <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-purple-400">
                            {isCurrent && isPlaying ? (
                              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                              idx + 1
                            )}
                          </span>

                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800 shadow">
                            <SafeCoverImage
                              src={track.cover}
                              alt={track.title}
                              className="w-full h-full rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              {isCurrent && isPlaying ? (
                                <Pause className="w-3.5 h-3.5 fill-white text-white" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Track Title and Artist Name Underneath */}
                          <div className="flex flex-col min-w-0 truncate">
                            <span
                              className={`text-xs font-bold truncate leading-tight ${
                                isCurrent ? 'text-purple-300' : 'text-white'
                              }`}
                            >
                              {track.title}
                            </span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArtist({ id: track.artist, name: track.artist, picture: track.coverUrl || track.cover });
                              }}
                              className="text-[11px] text-zinc-400 truncate hover:text-purple-300 transition-colors cursor-pointer leading-tight mt-0.5"
                            >
                              {track.artist}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Album Name */}
                        <div className="hidden md:block w-48 text-xs text-zinc-400 truncate pr-4">
                          {track.album || 'Single'}
                        </div>

                        {/* Right: Actions + Duration */}
                        <div className="flex items-center gap-2 text-zinc-400 shrink-0">
                          <button
                            onClick={(e) => toggleLikeSong(track, e)}
                            className="p-1.5 hover:text-white transition-colors cursor-pointer"
                            title={isLiked ? 'Unlike' : 'Like'}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-500'
                              }`}
                            />
                          </button>

                          {onAddToQueue && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToQueue(track);
                                showToast(`Added "${track.title}" to queue`);
                              }}
                              className="p-1.5 hover:text-white transition-colors cursor-pointer hidden sm:block"
                              title="Add to queue"
                            >
                              <ListMusic className="w-3.5 h-3.5 text-zinc-500" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylistMenuTrack(track);
                            }}
                            className="p-1.5 hover:text-white transition-colors cursor-pointer"
                            title="Add to playlist"
                          >
                            <ListPlus className="w-3.5 h-3.5 text-zinc-500" />
                          </button>

                          <span className="text-xs font-mono text-zinc-400 w-12 text-right">
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 3: YOUR LIBRARY VIEW (Liked songs, custom playlists) */}
        {navTab === 'library' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-white">Your Music Library</h2>

            {/* Liked Songs Quick Card */}
            <div className="p-4 rounded-xl bg-[#120a1c] border border-[#261539] flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-lg">
                  <Heart className="w-6 h-6 fill-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Liked Songs</h3>
                  <p className="text-xs text-zinc-400">{likedSongIds.length} songs saved</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const allKnown = [
                    ...chartSections.flatMap((s) => s.tracks),
                    ...searchResults.tracks,
                  ];
                  const liked = allKnown.filter((t) => likedSongIds.includes(t.id));
                  if (liked.length > 0) handlePlayCollection(liked);
                  else showToast('No liked songs yet');
                }}
                className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow"
              >
                Play Liked
              </button>
            </div>

            {/* Custom Playlists Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Custom Playlists</h3>
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                >
                  + Create Playlist
                </button>
              </div>

              {customPlaylists.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
                  No custom playlists created yet. Click "+ New Playlist" to start your first mix!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      className="p-3 rounded-xl bg-[#0f0719] border border-[#231336] hover:border-[#4d227f] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 shrink-0">
                          <Disc className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{pl.name}</p>
                          <p className="text-[11px] text-zinc-400">{pl.tracks.length} songs</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {pl.tracks.length > 0 && (
                          <button
                            onClick={() => handlePlayCollection(pl.tracks, 0)}
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-[#201037] transition-colors cursor-pointer"
                            title="Play Playlist"
                          >
                            <Play className="w-4 h-4 fill-purple-400" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete playlist "${pl.name}"?`)) {
                              const next = customPlaylists.filter((p) => p.id !== pl.id);
                              setCustomPlaylists(next);
                              localStorage.setItem('yuno_custom_playlists', JSON.stringify(next));
                              showToast('Playlist deleted');
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-[#201037] transition-colors cursor-pointer"
                          title="Delete Playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* ALBUM DETAIL MODAL (Tracklist & Play Album) */}
      {selectedAlbumModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0f071a] border border-[#37185e] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#24113e] flex items-start gap-4 bg-[#140a23] relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-purple-500/50 shadow-xl bg-zinc-900">
                <SafeCoverImage src={selectedAlbumModal.cover} alt={selectedAlbumModal.title} className="w-full h-full rounded-2xl" />
              </div>
              <div className="flex-1 min-w-0 pr-8 space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Album</span>
                <h2 className="text-lg sm:text-2xl font-black text-white truncate">{selectedAlbumModal.title}</h2>
                <p
                  onClick={() => {
                    handleOpenArtist({ id: selectedAlbumModal.artist, name: selectedAlbumModal.artist, picture: selectedAlbumModal.cover });
                    setSelectedAlbumModal(null);
                  }}
                  className="text-xs sm:text-sm text-purple-300 font-semibold hover:underline cursor-pointer truncate"
                >
                  {selectedAlbumModal.artist}
                </p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {selectedAlbumModal.year} • {albumModalTracks.length} tracks
                </p>

                {albumModalTracks.length > 0 && (
                  <button
                    onClick={() => handlePlayCollection(albumModalTracks, 0)}
                    className="mt-2 px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 transition-transform hover:scale-105 shadow-md cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play Album</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedAlbumModal(null)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tracklist */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-1">
              {isLoadingAlbumModal ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-2 text-center text-zinc-500 font-mono text-xs">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading album tracklist...</span>
                </div>
              ) : albumModalTracks.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">No tracks found for this album.</div>
              ) : (
                albumModalTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id || currentTrack?.title === track.title;
                  const isLiked = likedSongIds.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayCollection(albumModalTracks, idx)}
                      className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors group cursor-pointer ${
                        isCurrent ? 'bg-[#1b0f2e] text-white' : 'hover:bg-[#150a24] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-purple-400">
                          {isCurrent && isPlaying ? (
                            <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                          ) : (
                            idx + 1
                          )}
                        </span>
                        <div className="flex flex-col min-w-0 truncate">
                          <span className={`text-xs font-bold truncate leading-tight ${isCurrent ? 'text-purple-300' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button
                          onClick={(e) => toggleLikeSong(track, e)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToQueue?.(track);
                            showToast(`Queued ${track.title}`);
                          }}
                          className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono text-zinc-400 w-10 text-right">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#120a1c] border border-[#3b1968] rounded-2xl p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create New Playlist</h3>
              <button
                onClick={() => setShowNewPlaylistModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name (e.g. Late Night Vibes)"
              className="w-full px-3 py-2 bg-[#0a050f] border border-[#2b144a] focus:border-purple-500 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewPlaylistModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO PLAYLIST SELECTION MODAL */}
      {playlistMenuTrack && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#120a1c] border border-[#3b1968] rounded-2xl p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Add to Playlist</h3>
                <p className="text-[11px] text-zinc-400 truncate max-w-xs">{playlistMenuTrack.title}</p>
              </div>
              <button
                onClick={() => setPlaylistMenuTrack(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customPlaylists.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-zinc-400">No playlists available.</p>
                <button
                  onClick={() => setShowNewPlaylistModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#f43f5e] text-white text-xs font-bold cursor-pointer"
                >
                  Create One Now
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {customPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddTrackToPlaylist(pl.id, playlistMenuTrack)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-[#0a050f] hover:bg-[#1a0d2a] border border-[#210f39] text-xs font-medium text-white transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{pl.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{pl.tracks.length} songs</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SYNCHRONIZED LYRICS MODAL */}
      {isLyricsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0717] border border-[#331754] rounded-2xl shadow-2xl flex flex-col h-[70vh] overflow-hidden animate-scaleUp">
            <div className="p-4 border-b border-[#210f39] flex items-center justify-between bg-[#130a20]">
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-purple-400" />
                <div>
                  <h3 className="text-xs font-bold text-white truncate max-w-xs">
                    {currentTrack?.title || 'No Track Selected'}
                  </h3>
                  <p className="text-[10px] text-zinc-400">{currentTrack?.artist || 'Unknown'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLyricsModalOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={lyricsContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 text-center font-sans"
            >
              {isLoadingLyrics ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                  Loading lyrics...
                </div>
              ) : lyrics.length > 0 ? (
                lyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <p
                      key={idx}
                      onClick={() => onSeek?.(line.time)}
                      className={`text-sm sm:text-base font-semibold cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'text-purple-300 font-bold scale-105'
                          : 'text-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 whitespace-pre-wrap leading-relaxed">
                  {plainLyrics || 'No synced lyrics available for this song.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHORTCUTS MODAL */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#120a1c] border border-[#3b1968] rounded-2xl p-5 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#24113e] pb-3">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">Play / Pause</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1f1035] border border-[#3b1968] text-purple-300 font-mono text-[10px]">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">Toggle Synced Lyrics</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1f1035] border border-[#3b1968] text-purple-300 font-mono text-[10px]">
                  L
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">Next Track</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1f1035] border border-[#3b1968] text-purple-300 font-mono text-[10px]">
                  Shift + N
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-zinc-400">Previous Track</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1f1035] border border-[#3b1968] text-purple-300 font-mono text-[10px]">
                  Shift + P
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicView;
