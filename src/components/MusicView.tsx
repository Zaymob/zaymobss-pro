import React, { useState, useEffect } from 'react';
import { EDITORS_PICKS_ALBUMS, MUSIC_TRACKS, FeaturedAlbum } from '../data/portalData';
import { MusicTrack, PlaybackContext } from '../types';
import {
  Play,
  Pause,
  MusicNotes as Music,
  Heart,
  MagnifyingGlass as Search,
  Plus,
  Queue as ListMusic,
  FileText,
  Trash as Trash2,
  ListPlus,
  X,
  Check,
  FolderSimplePlus as FolderPlus,
  Radio,
  Disc,
  Clock,
  Sparkle as Sparkles,
} from '@phosphor-icons/react';

interface MusicViewProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: MusicTrack, context?: PlaybackContext) => void;
  onTogglePlay: () => void;
  currentTime?: number;
  playQueue?: MusicTrack[];
  onAddToQueue?: (track: MusicTrack, playNext?: boolean) => void;
  onRemoveFromQueue?: (index: number) => void;
  onClearQueue?: () => void;
  onNavigateHome?: () => void;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  tracks: MusicTrack[];
}

interface ParsedLrcLine {
  time: number;
  text: string;
}

function parseLrcLyrics(lrc: string, trackTitle?: string, trackArtist?: string): ParsedLrcLine[] {
  if (!lrc) return [];

  const combined = ((trackTitle || '') + ' ' + (trackArtist || '')).toLowerCase();
  const isCjkTrack = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combined);

  // Normalize newline variations and escaped '\n' sequences
  const normalized = lrc
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalized.split('\n');
  const result: ParsedLrcLine[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Skip metadata headers
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) continue;

    // Clean text without timestamps
    let cleanText = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    cleanText = cleanText.replace(/\\n/g, ' ').replace(/\\/g, '').trim();

    if (!cleanText) continue;

    // Filter out CJK translation lines if track is English/Latin
    if (!isCjkTrack && /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(cleanText)) {
      if (!/[a-zA-Z0-9]/.test(cleanText)) {
        continue;
      }
      cleanText = cleanText.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]+/g, '').replace(/\s+/g, ' ').trim();
      if (!cleanText) continue;
    }

    // Extract all timestamp tags
    const timestampRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = timestampRegex.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const fraction = parseFloat(`0.${msStr}`);
      timestamps.push(min * 60 + sec + fraction);
    }

    if (timestamps.length > 0) {
      for (const time of timestamps) {
        result.push({ time, text: cleanText });
      }
    } else {
      result.push({ time: -1, text: cleanText });
    }
  }

  // Sort by time
  result.sort((a, b) => {
    if (a.time >= 0 && b.time >= 0) return a.time - b.time;
    if (a.time >= 0) return -1;
    if (b.time >= 0) return 1;
    return 0;
  });

  // Deduplicate exact duplicate time & text
  const deduplicated: ParsedLrcLine[] = [];
  for (const item of result) {
    const last = deduplicated[deduplicated.length - 1];
    if (last && Math.abs(last.time - item.time) < 0.05 && last.text === item.text) {
      continue;
    }
    deduplicated.push(item);
  }

  return deduplicated;
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const MusicView: React.FC<MusicViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  currentTime = 0,
  playQueue = [],
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'liked' | 'albums' | 'playlists' | 'lyrics'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [metingTracks, setMetingTracks] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Liked Songs State
  const [likedSongs, setLikedSongs] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_liked_songs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Recently Played Listening History State
  const [recentlyPlayed, setRecentlyPlayed] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_recently_played');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync listening history from localStorage
  useEffect(() => {
    const updateHistory = () => {
      try {
        const saved = localStorage.getItem('yuno_recently_played');
        if (saved) {
          setRecentlyPlayed(JSON.parse(saved));
        }
      } catch (e) {}
    };
    window.addEventListener('storage', updateHistory);
    const interval = setInterval(updateHistory, 3000);
    return () => {
      window.removeEventListener('storage', updateHistory);
      clearInterval(interval);
    };
  }, []);

  // Custom Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_playlists');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'pl-1',
              name: 'Tyler & Kanye Vault',
              description: 'Late night vibes featuring Tyler and Ye anthems.',
              tracks: [],
            },
            {
              id: 'pl-2',
              name: 'Malcolm & Don Vibe',
              description: 'Melodic R&B and psychedelic trap loops.',
              tracks: [],
            },
          ];
    } catch (e) {
      return [];
    }
  });

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Add to Playlist Modal & Toast States
  const [trackForPlaylist, setTrackForPlaylist] = useState<MusicTrack | null>(null);
  const [modalNewPlaylistName, setModalNewPlaylistName] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  // Lyrics State
  const [lyricsText, setLyricsText] = useState<string>('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('yuno_liked_songs', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('yuno_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Initial search on load
  useEffect(() => {
    handleMetingSearch('Kanye West Malcolm Todd');
  }, []);

  // Fetch lyrics whenever currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      setIsLoadingLyrics(true);
      const jooxMsg = (currentTrack as any).jooxMsg || '';
      const jooxN = (currentTrack as any).jooxN || '';
      const lrcUrl = currentTrack.lrcUrl || '';

      const queryParams = new URLSearchParams({
        id: currentTrack.songId || currentTrack.id || '',
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        lrcUrl: lrcUrl,
        jooxMsg: jooxMsg,
        jooxN: String(jooxN || ''),
      });

      fetch(`/api/music/lyrics?${queryParams.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setLyricsText(data.lyrics || 'No lyrics available.');
        })
        .catch(() => setLyricsText('Lyrics unavailable for this track.'))
        .finally(() => setIsLoadingLyrics(false));
    }
  }, [currentTrack]);

  const handleMetingSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.tracks || [];
        const formatted: MusicTrack[] = rawList.map((t: any) => ({
          id: t.id || `track-${t.songId || Math.random()}`,
          songId: t.songId,
          title: t.title || t.name || 'Untitled Track',
          artist: t.artist || 'Unknown Artist',
          album: t.album || 'Music Vault',
          genre: 'Stream',
          duration: t.duration || 210,
          cover: t.cover || t.pic || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
          audioUrl: t.audioUrl || t.url,
          lrcUrl: t.lrcUrl,
          jooxMsg: t.jooxMsg,
          jooxN: t.jooxN,
        }));
        setMetingTracks(formatted);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleLikeSong = (track: MusicTrack) => {
    setLikedSongs((prev) => {
      const exists = prev.some((t) => t.id === track.id || t.title === track.title);
      if (exists) {
        return prev.filter((t) => t.id !== track.id && t.title !== track.title);
      } else {
        return [...prev, track];
      }
    });
  };

  const isLiked = (track: MusicTrack) => {
    return likedSongs.some((t) => t.id === track.id || t.title === track.title);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    if (selectedPlaylist?.id === playlistId) {
      setSelectedPlaylist(null);
    }
  };

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      description: 'Custom user playlist on Yuno Vault',
      tracks: [],
    };
    setPlaylists((prev) => [...prev, newPl]);
    setNewPlaylistName('');
    showToast(`Created playlist "${newPl.name}"`);
  };

  const addTrackToPlaylist = (playlistId: string, track: MusicTrack) => {
    let plName = '';
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          plName = pl.name;
          if (pl.tracks.some((t) => t.id === track.id || t.title === track.title)) return pl;
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      })
    );
    if (plName) {
      showToast(`Added "${track.title}" to "${plName}"`);
    }
  };

  const handleCreateAndAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNewPlaylistName.trim() || !trackForPlaylist) return;
    const name = modalNewPlaylistName.trim();
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description: 'Custom user playlist on Yuno Vault',
      tracks: [trackForPlaylist],
    };
    setPlaylists((prev) => [...prev, newPl]);
    showToast(`Created playlist "${name}" and added "${trackForPlaylist.title}"!`);
    setModalNewPlaylistName('');
    setTrackForPlaylist(null);
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
        }
        return pl;
      })
    );
  };

  const handlePlayAlbumTrack = (album: FeaturedAlbum, trackTitle: string) => {
    const trackObj: MusicTrack = {
      id: `album-${album.id}-${encodeURIComponent(trackTitle)}`,
      title: trackTitle,
      artist: album.artist,
      album: album.title,
      duration: 210,
      cover: album.cover,
      genre: album.genre,
      synthType: 'lofi',
      audioUrl: `https://api.qijieya.cn/meting/?type=search&id=${encodeURIComponent(album.artist + ' ' + trackTitle)}`,
    };
    onPlayTrack(trackObj, { type: 'general' });
  };

  const displayedTracks = metingTracks.length > 0 ? metingTracks : MUSIC_TRACKS;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 pb-20 text-zinc-100 font-sans">
      
      {/* Top Header & Search Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#111115] border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">Music</h1>
            </div>
            <p className="text-xs text-zinc-400">Audio player</p>
          </div>
        </div>

        {/* Global Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleMetingSearch(searchQuery);
          }}
          className="flex items-center space-x-2 w-full md:w-80"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, artist, or album..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Main Standard 2-Column Library Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left/Main Column: Library & Track Catalog (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Library Category Tabs */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#111115] border border-zinc-800 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'library'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>All Tracks</span>
              <span className="text-[10px] font-mono text-zinc-500">({displayedTracks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('liked')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'liked'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'liked' ? 'fill-current' : ''}`} />
              <span>Liked Songs</span>
              <span className="text-[10px] font-mono text-zinc-500">({likedSongs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('albums')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'albums'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Curated Vaults</span>
              <span className="text-[10px] font-mono text-zinc-500">({EDITORS_PICKS_ALBUMS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'playlists'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Playlists</span>
              <span className="text-[10px] font-mono text-zinc-500">({playlists.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('lyrics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'lyrics'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>
          </div>

          {/* Quick Artist Filter Pills when on Library */}
          {activeTab === 'library' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-mono text-zinc-500 whitespace-nowrap">Filter:</span>
              {['Kanye West', 'Tyler The Creator', 'Malcolm Todd', 'Don Toliver', 'Frank Ocean', 'Kendrick Lamar', 'SZA', 'Travis Scott'].map((artist) => (
                <button
                  key={artist}
                  onClick={() => {
                    setSearchQuery(artist);
                    handleMetingSearch(artist);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#111115] hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
                >
                  {artist}
                </button>
              ))}
            </div>
          )}

          {/* VIEW TAB 1: ALL TRACKS (STANDARD VERTICAL TABLE LIST) */}
          {activeTab === 'library' && (
            <div className="rounded-2xl bg-[#111115] border border-zinc-800 overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-12 items-center py-2.5 px-4 bg-zinc-950 border-b border-zinc-800 text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-6 sm:col-span-5">Title</span>
                <span className="col-span-3 sm:col-span-4 hidden sm:block">Album</span>
                <span className="col-span-5 sm:col-span-2 text-right">Actions</span>
              </div>

              {/* Vertical list rows */}
              <div className="divide-y divide-zinc-800/50">
                {displayedTracks.map((track, index) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const liked = isLiked(track);

                  return (
                    <div
                      key={`${track.id}-${index}`}
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                      className={`grid grid-cols-12 items-center py-2.5 px-4 transition-colors cursor-pointer group ${
                        isCurrent
                          ? 'bg-zinc-800/80 hover:bg-zinc-800'
                          : 'hover:bg-zinc-900/80'
                      }`}
                    >
                      {/* # / Play Indicator */}
                      <div className="col-span-1 text-xs font-mono text-zinc-500 flex items-center justify-center">
                        {isCurrent && isPlaying ? (
                          <div className="flex items-end space-x-0.5 h-3">
                            <span className="w-0.5 h-3 bg-amber-400 animate-pulse" />
                            <span className="w-0.5 h-2 bg-amber-400 animate-pulse delay-75" />
                            <span className="w-0.5 h-3.5 bg-amber-400 animate-pulse delay-150" />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="w-3.5 h-3.5 text-zinc-200 fill-current hidden group-hover:block" />
                          </>
                        )}
                      </div>

                      {/* Title & Artist */}
                      <div className="col-span-6 sm:col-span-5 flex items-center space-x-3 min-w-0 pr-2">
                        <img
                          src={track.cover}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-amber-400' : 'text-zinc-200 group-hover:text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      {/* Album */}
                      <div className="col-span-3 sm:col-span-4 hidden sm:block truncate text-xs text-zinc-400 pr-2">
                        {track.album || 'Single'}
                      </div>

                      {/* Action buttons */}
                      <div
                        className="col-span-5 sm:col-span-2 flex items-center justify-end space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            if (onAddToQueue) {
                              onAddToQueue(track, true);
                              showToast(`Added "${track.title}" to Play Next`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Play Next"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (onAddToQueue) {
                              onAddToQueue(track, false);
                              showToast(`Added "${track.title}" to Queue`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Add to Queue"
                        >
                          <ListMusic className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => toggleLikeSong(track)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-zinc-800 ${
                            liked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-200'
                          }`}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => setTrackForPlaylist(track)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Add to Playlist"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW TAB 2: LIKED SONGS */}
          {activeTab === 'liked' && (
            <div className="rounded-2xl bg-[#111115] border border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-amber-400 fill-current" />
                  <h2 className="text-sm font-bold text-white">Liked Songs</h2>
                </div>
                <span className="text-xs font-mono text-zinc-400">{likedSongs.length} tracks</span>
              </div>

              {likedSongs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">No liked songs in your library.</p>
                  <p className="text-[11px] text-zinc-500">Click the heart button on any track in the catalog to save it here.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {likedSongs.map((track, idx) => (
                    <div
                      key={`liked-${track.id}-${idx}`}
                      className="py-2.5 px-2 flex items-center justify-between hover:bg-zinc-900/60 rounded-xl transition-colors cursor-pointer"
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-2">
                        <img src={track.cover} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{track.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (onAddToQueue) onAddToQueue(track, false);
                            showToast(`Queued "${track.title}"`);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Add to queue"
                        >
                          <ListMusic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleLikeSong(track)}
                          className="p-1.5 rounded-lg text-amber-400 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                          title="Remove from liked"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB 3: CURATED ALBUMS / VAULTS */}
          {activeTab === 'albums' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EDITORS_PICKS_ALBUMS.map((album) => (
                  <div
                    key={album.id}
                    className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 space-y-3"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={album.cover}
                        alt={album.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-zinc-900 border border-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{album.genre}</span>
                        <h4 className="text-xs font-bold text-white truncate mt-0.5">{album.title}</h4>
                        <p className="text-[11px] text-zinc-400 truncate">{album.artist}</p>
                        <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1">{album.description}</p>
                      </div>
                    </div>

                    {/* Album Tracks List */}
                    <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                      {album.tracks.map((t, idx) => (
                        <div
                          key={idx}
                          onClick={() => handlePlayAlbumTrack(album, t.title)}
                          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 text-xs transition-colors cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Play className="w-3 h-3 text-zinc-400 fill-current flex-shrink-0" />
                            <span className="text-zinc-200 truncate">{t.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">{t.duration || '3:30'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW TAB 4: PLAYLISTS */}
          {activeTab === 'playlists' && (
            <div className="space-y-4">
              {/* Create Playlist Form */}
              <div className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white">Custom Playlists</h3>
                  <p className="text-[11px] text-zinc-400">Organize your favorite stream tracks</p>
                </div>
                <form onSubmit={handleCreatePlaylist} className="flex items-center space-x-2 w-full sm:w-72">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="New playlist name..."
                    className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer flex-shrink-0"
                  >
                    Create
                  </button>
                </form>
              </div>

              {/* Playlists Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playlists.map((pl) => (
                  <div key={pl.id} className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-white truncate">{pl.name}</h4>
                        <span className="text-[10px] font-mono text-zinc-500">{pl.tracks.length} tracks</span>
                      </div>
                      <button
                        onClick={() => handleDeletePlaylist(pl.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                        title="Delete playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 space-y-1">
                      {pl.tracks.length === 0 ? (
                        <p className="text-[11px] text-zinc-500 italic py-2">Playlist is empty. Add songs from All Tracks.</p>
                      ) : (
                        pl.tracks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 text-xs transition-colors"
                          >
                            <div
                              onClick={() => onPlayTrack(t, { type: 'playlist', playlistId: pl.id, playlistTracks: pl.tracks })}
                              className="flex items-center space-x-2 truncate cursor-pointer flex-1 mr-2"
                            >
                              <Play className="w-3 h-3 text-zinc-400 fill-current flex-shrink-0" />
                              <span className="text-zinc-200 truncate">{t.title}</span>
                              <span className="text-zinc-500 text-[10px] truncate">— {t.artist}</span>
                            </div>
                            <button
                              onClick={() => removeTrackFromPlaylist(pl.id, t.id)}
                              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW TAB 5: SYNCHRONIZED LYRICS */}
          {activeTab === 'lyrics' && (
            <div className="p-6 rounded-2xl bg-[#111115] border border-zinc-800 space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white">{currentTrack ? currentTrack.title : 'No Track Playing'}</h3>
                <p className="text-xs font-mono text-zinc-400">{currentTrack ? currentTrack.artist : 'Select a song to stream lyrics'}</p>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-2 scrollbar-thin">
                {isLoadingLyrics ? (
                  <p className="text-xs font-mono text-zinc-500 py-6 text-center">Fetching live synchronized lyrics...</p>
                ) : (() => {
                  const lines = parseLrcLyrics(lyricsText, currentTrack?.title, currentTrack?.artist);
                  if (lines.length === 0) {
                    return <p className="text-xs font-mono text-zinc-500 py-4 text-center">No lyrics text available for this track.</p>;
                  }

                  const hasTimestamps = lines.some((l) => l.time >= 0);
                  if (!hasTimestamps) {
                    return (
                      <div className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-line">
                        {lyricsText}
                      </div>
                    );
                  }

                  const activeIdx = lines.reduce((acc, line, idx) => {
                    if (currentTime >= line.time) return idx;
                    return acc;
                  }, -1);

                  return (
                    <div className="space-y-2">
                      {lines.map((line, idx) => {
                        const isActive = idx === activeIdx;
                        return (
                          <p
                            key={idx}
                            className={`text-xs transition-colors ${
                              isActive
                                ? 'text-amber-400 font-bold text-sm'
                                : 'text-zinc-500'
                            }`}
                          >
                            {line.text}
                          </p>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar: Now Playing & Queue Management (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 sticky top-4">
          
          {/* Now Playing Panel */}
          <div className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Now Playing</span>
              {currentTrack && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {isPlaying ? 'ACTIVE' : 'PAUSED'}
                </span>
              )}
            </div>

            {currentTrack ? (
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <img
                    src={currentTrack.cover}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-zinc-900 border border-zinc-800 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-white truncate">{currentTrack.title}</h3>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">{currentTrack.album || 'Single'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={onTogglePlay}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    onClick={() => toggleLikeSong(currentTrack)}
                    className={`p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer ${
                      isLiked(currentTrack) ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                    title="Like current song"
                  >
                    <Heart className={`w-4 h-4 ${isLiked(currentTrack) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-500">
                No track playing right now.
              </div>
            )}
          </div>

          {/* Up Next Queue Management Panel */}
          <div className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Play Queue</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {playQueue.length}
                </span>
              </div>
              {playQueue.length > 0 && onClearQueue && (
                <button
                  onClick={onClearQueue}
                  className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {playQueue.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs text-zinc-400">Queue is empty</p>
                <p className="text-[11px] text-zinc-500">Click the queue icon on any track to add it here.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {playQueue.map((track, idx) => (
                  <div
                    key={`sidebar-queue-${track.id}-${idx}`}
                    className="p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800/80 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 pr-1">
                      <span className="text-[10px] font-mono text-zinc-500 w-4 text-center">{idx + 1}</span>
                      <img src={track.cover} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0 bg-zinc-900" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-zinc-200 truncate">{track.title}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          onRemoveFromQueue?.(idx);
                          onPlayTrack(track);
                        }}
                        className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Play now"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                      {onRemoveFromQueue && (
                        <button
                          onClick={() => onRemoveFromQueue(idx)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Listening Stats / History Panel */}
          {recentlyPlayed.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#111115] border border-zinc-800 space-y-2">
              <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Recently Played</span>
              <div className="space-y-1">
                {recentlyPlayed.slice(0, 3).map((track, i) => (
                  <div
                    key={`hist-${track.id}-${i}`}
                    onClick={() => onPlayTrack(track, { type: 'general' })}
                    className="p-1.5 rounded-lg hover:bg-zinc-900 flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-zinc-300 truncate">{track.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                    </div>
                    <Play className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold shadow-2xl flex items-center space-x-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {trackForPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl bg-[#111115] border border-zinc-800 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-bold text-white">Add Song to Playlist</h3>
              </div>
              <button
                onClick={() => setTrackForPlaylist(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Song Preview */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center space-x-3">
              <img
                src={trackForPlaylist.cover}
                alt={trackForPlaylist.title}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-zinc-800"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{trackForPlaylist.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{trackForPlaylist.artist}</p>
              </div>
            </div>

            {/* Playlists List */}
            {playlists.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 text-center">No playlists created yet. Enter a name below to make one:</p>
                <form onSubmit={handleCreateAndAddPlaylist} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={modalNewPlaylistName}
                    onChange={(e) => setModalNewPlaylistName(e.target.value)}
                    placeholder="e.g., Chill Late Night..."
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-colors"
                  >
                    Create Playlist & Add Song
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Select Playlist:</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {playlists.map((pl) => {
                    const isAlreadyIn = pl.tracks.some((t) => t.id === trackForPlaylist.id || t.title === trackForPlaylist.title);
                    return (
                      <div
                        key={pl.id}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <h5 className="text-xs font-bold text-white truncate">{pl.name}</h5>
                          <span className="text-[10px] font-mono text-zinc-500">{pl.tracks.length} tracks</span>
                        </div>
                        <button
                          onClick={() => {
                            addTrackToPlaylist(pl.id, trackForPlaylist);
                            setTrackForPlaylist(null);
                          }}
                          disabled={isAlreadyIn}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isAlreadyIn
                              ? 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                          }`}
                        >
                          {isAlreadyIn ? 'Added' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase">Or Create New Playlist:</label>
                  <form onSubmit={handleCreateAndAddPlaylist} className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      value={modalNewPlaylistName}
                      onChange={(e) => setModalNewPlaylistName(e.target.value)}
                      placeholder="Playlist name..."
                      className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Create & Add
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
