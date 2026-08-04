import React, { useState, useEffect } from 'react';
import { EDITORS_PICKS_ALBUMS, MUSIC_TRACKS, FeaturedAlbum } from '../data/portalData';
import { MusicTrack, PlaybackContext } from '../types';
import {
  Play,
  Pause,
  Music,
  Disc,
  Volume2,
  Sparkles,
  Heart,
  Search,
  Plus,
  ListMusic,
  FileText,
  Disc3,
  ArrowRight,
  Check,
  Trash2,
  Radio,
  FolderPlus,
  ListPlus,
  X,
} from 'lucide-react';

interface MusicViewProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onPlayTrack: (track: MusicTrack, context?: PlaybackContext) => void;
  onTogglePlay: () => void;
  currentTime?: number;
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

function parseLrcLyrics(lrc: string): ParsedLrcLine[] {
  if (!lrc) return [];

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

    // Remove timestamp tags to get clean text
    let cleanText = line.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
    cleanText = cleanText.replace(/\\n/g, ' ').replace(/\\/g, '').trim();

    if (!cleanText) continue;

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

export const MusicView: React.FC<MusicViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  currentTime = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'liked' | 'playlists' | 'lyrics'>('home');
  const [selectedAlbum, setSelectedAlbum] = useState<FeaturedAlbum | null>(EDITORS_PICKS_ALBUMS[0] || null);
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

  // Recently Played Listening History State for Personalization
  const [recentlyPlayed, setRecentlyPlayed] = useState<MusicTrack[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_recently_played');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Calculate top listened artist from listening history
  const topListenedArtist = React.useMemo(() => {
    if (!recentlyPlayed || recentlyPlayed.length === 0) return 'Kanye West & Malcolm Todd';
    const artistCounts: Record<string, number> = {};
    recentlyPlayed.forEach((track) => {
      if (track.artist) {
        artistCounts[track.artist] = (artistCounts[track.artist] || 0) + 1;
      }
    });
    let topArt = recentlyPlayed[0].artist || 'Kanye West';
    let maxCount = 0;
    Object.entries(artistCounts).forEach(([art, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topArt = art;
      }
    });
    return topArt;
  }, [recentlyPlayed]);

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
    }, 3500);
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

  // Fetch lyrics whenever currentTrack changes or lyrics tab opens
  useEffect(() => {
    if (currentTrack) {
      setIsLoadingLyrics(true);
      fetch(`/api/music/lyrics?id=${currentTrack.songId || currentTrack.id}&title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`)
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
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.tracks || [];
        const formatted: MusicTrack[] = rawList.map((t: any) => ({
          id: t.id || `meting-${t.songId || Math.random()}`,
          songId: t.songId,
          title: t.title || t.name || 'Untitled Track',
          artist: t.artist || 'Unknown Artist',
          album: t.album || 'Meting Vault',
          genre: 'Stream',
          duration: t.duration || 210,
          cover: t.cover || t.pic || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
          audioUrl: t.audioUrl || t.url || `https://api.qijieya.cn/meting/?type=url&id=${t.songId || t.id}`,
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
      description: 'Custom user playlist on Yunø Vault',
      tracks: [],
    };
    setPlaylists((prev) => [...prev, newPl]);
    setNewPlaylistName('');
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
      showToast(`Added "${track.title}" to "${plName}"!`);
    }
  };

  const handleCreateAndAddPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNewPlaylistName.trim() || !trackForPlaylist) return;
    const name = modalNewPlaylistName.trim();
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description: 'Custom user playlist on Yunø Vault',
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 text-white">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center font-black text-xl shadow-lg shadow-[#1DB954]/20">
            <Disc3 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Music</h1>
            <p className="text-xs text-zinc-400">Search, stream, and organize your favorite tracks</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-[#181818] p-1.5 rounded-full border border-zinc-800">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'home'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'liked'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Liked ({likedSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'playlists'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Playlists ({playlists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'lyrics'
                ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lyrics</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SPOTIFY STYLE HOME PAGE */}
      {activeTab === 'home' && (
        <div className="space-y-8">
          {/* SPOTIFY FILTER PILLS & TIME-BASED GREETING */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs shadow-md cursor-pointer">
                All
              </button>
              <button
                onClick={() => handleMetingSearch('Hip Hop R&B Hits')}
                className="px-4 py-1.5 rounded-full bg-[#282828] hover:bg-[#333333] text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Music
              </button>
              <button
                onClick={() => handleMetingSearch('Podcast Commentary')}
                className="px-4 py-1.5 rounded-full bg-[#282828] hover:bg-[#333333] text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Podcasts
              </button>
            </div>

            {/* Time-Based Greeting */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return 'Good morning';
                  if (hour < 18) return 'Good afternoon';
                  return 'Good evening';
                })()}
              </h2>
            </div>

            {/* SPOTIFY QUICK-ACCESS 6-GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Tile 1: Liked Songs */}
              <div
                onClick={() => setActiveTab('liked')}
                className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Heart className="w-7 h-7 text-white fill-current" />
                </div>
                <span className="ml-4 font-bold text-sm text-white truncate flex-1">Liked Songs</span>
                <span className="text-xs text-zinc-400 font-mono mr-2">{likedSongs.length} tracks</span>
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Tile 2: Recently Played */}
              {recentlyPlayed.length > 0 ? (
                <div
                  onClick={() => onPlayTrack(recentlyPlayed[0], { type: 'general' })}
                  className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
                >
                  <img src={recentlyPlayed[0].cover} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                  <div className="ml-4 min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{recentlyPlayed[0].title}</p>
                    <p className="text-xs text-zinc-400 truncate">{recentlyPlayed[0].artist}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleMetingSearch('Tyler The Creator')}
                  className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
                >
                  <img src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80" alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                  <span className="ml-4 font-bold text-sm text-white truncate flex-1">Tyler, The Creator Radio</span>
                  <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              )}

              {/* Tile 3: Kanye West */}
              <div
                onClick={() => handleMetingSearch('Kanye West')}
                className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
              >
                <img src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80" alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                <span className="ml-4 font-bold text-sm text-white truncate flex-1">Kanye West Essentials</span>
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Tile 4: Malcolm Todd */}
              <div
                onClick={() => handleMetingSearch('Malcolm Todd')}
                className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
              >
                <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80" alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                <span className="ml-4 font-bold text-sm text-white truncate flex-1">Malcolm Todd Vault</span>
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Tile 5: Don Toliver */}
              <div
                onClick={() => handleMetingSearch('Don Toliver')}
                className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
              >
                <img src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80" alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                <span className="ml-4 font-bold text-sm text-white truncate flex-1">Don Toliver Radio</span>
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Tile 6: Frank Ocean & SZA */}
              <div
                onClick={() => handleMetingSearch('Frank Ocean SZA')}
                className="group flex items-center bg-[#282828]/80 hover:bg-[#383838] rounded-md overflow-hidden transition-all duration-200 cursor-pointer shadow-md hover:shadow-xl relative pr-4"
              >
                <img src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80" alt="" className="w-16 h-16 object-cover flex-shrink-0" />
                <span className="ml-4 font-bold text-sm text-white truncate flex-1">Frank Ocean & SZA Mix</span>
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100 flex-shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* SPOTIFY SECTION 1: RECENTLY PLAYED */}
          {recentlyPlayed.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white hover:underline cursor-pointer">
                  Recently played
                </h3>
                <span className="text-xs text-zinc-400 font-bold hover:underline cursor-pointer">Show all</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recentlyPlayed.slice(0, 5).map((track, i) => {
                  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                  return (
                    <div
                      key={`rec-${track.id}-${i}`}
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                      className="group bg-[#181818] hover:bg-[#282828] p-3.5 rounded-xl transition-all duration-300 cursor-pointer relative border border-transparent hover:border-zinc-800 flex flex-col justify-between shadow-lg"
                    >
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-900 shadow-md">
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1DB954] text-black shadow-xl shadow-black/60 flex items-center justify-center transition-all duration-200 transform ${
                            isCurrentlyPlaying
                              ? 'opacity-100 translate-y-0 scale-100'
                              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
                          }`}
                        >
                          {isCurrentlyPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate mt-1">{track.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SPOTIFY SECTION 2: MADE FOR YOU & VAULTS */}
          {EDITORS_PICKS_ALBUMS.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white hover:underline cursor-pointer">
                    Made For You
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Custom vaults curated from Tyler, Kanye, Malcolm Todd & Don Toliver</p>
                </div>
                <span className="text-xs text-zinc-400 font-bold hover:underline cursor-pointer">Show all</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {EDITORS_PICKS_ALBUMS.map((album) => (
                  <div
                    key={album.id}
                    className="group bg-[#181818] hover:bg-[#282828] p-4 rounded-xl transition-all duration-300 cursor-pointer relative border border-transparent hover:border-zinc-800 flex flex-col justify-between shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-900 shadow-md">
                        <img
                          src={album.cover}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (album.tracks.length > 0) {
                              handlePlayAlbumTrack(album, album.tracks[0].title);
                            }
                          }}
                          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1DB954] text-black shadow-xl shadow-black/60 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105"
                          title="Play Album"
                        >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">
                          {album.title}
                        </h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-snug">
                          {album.description}
                        </p>
                      </div>
                    </div>

                    {/* Album Track List Quick Preview */}
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 space-y-1">
                      {album.tracks.slice(0, 2).map((track, tIdx) => (
                        <button
                          key={tIdx}
                          onClick={() => handlePlayAlbumTrack(album, track.title)}
                          className="w-full flex items-center justify-between p-1 rounded hover:bg-zinc-800/80 text-left transition-colors text-[11px] group/trk"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <Play className="w-2.5 h-2.5 text-[#1DB954] fill-current flex-shrink-0" />
                            <span className="text-zinc-300 group-hover/trk:text-white truncate">{track.title}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPOTIFY TRACK DISCOVERY & TABLE VIEW */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Popular Tracks & Stream Search</span>
                </h3>
                <p className="text-xs text-zinc-400">Search any track or artist on Spotify catalog</p>
              </div>

              {/* Spotify Search Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleMetingSearch(searchQuery);
                }}
                className="flex items-center space-x-2 w-full sm:w-80"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What do you want to play?"
                    className="w-full px-4 py-2 pl-9 bg-[#242424] hover:bg-[#2a2a2a] border border-transparent focus:border-[#1DB954] rounded-full text-xs text-white placeholder-zinc-400 focus:outline-none transition-colors"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Spotify Artist Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {['Tyler The Creator', 'Malcolm Todd', 'Kanye West', 'Don Toliver', 'Frank Ocean', 'Kendrick Lamar', 'SZA', 'Travis Scott'].map((artist) => (
                <button
                  key={artist}
                  onClick={() => {
                    setSearchQuery(artist);
                    handleMetingSearch(artist);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#2a2a2a] hover:bg-[#383838] text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  {artist}
                </button>
              ))}
            </div>

            {/* Spotify Style Song Table List */}
            <div className="bg-[#181818] rounded-xl p-4 border border-zinc-800/80 shadow-xl overflow-x-auto">
              {/* Table Header */}
              <div className="grid grid-cols-12 text-[11px] font-bold text-zinc-400 uppercase tracking-wider pb-3 border-b border-zinc-800 px-3">
                <span className="col-span-1">#</span>
                <span className="col-span-6 sm:col-span-5">Title</span>
                <span className="col-span-3 sm:col-span-4 hidden sm:block">Album</span>
                <span className="col-span-5 sm:col-span-2 text-right">Actions</span>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-zinc-800/40">
                {(metingTracks.length > 0 ? metingTracks : MUSIC_TRACKS).map((track, index) => {
                  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                  const liked = isLiked(track);

                  return (
                    <div
                      key={track.id}
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                      className={`grid grid-cols-12 items-center py-2.5 px-3 rounded-md hover:bg-[#2a2a2a] group transition-colors cursor-pointer ${
                        isCurrentlyPlaying ? 'bg-[#2a2a2a]' : ''
                      }`}
                    >
                      {/* # or Play button */}
                      <div className="col-span-1 text-xs font-mono text-zinc-400 flex items-center">
                        {isCurrentlyPlaying ? (
                          <div className="flex items-end space-x-0.5 h-3">
                            <span className="w-0.5 h-3 bg-[#1DB954] animate-bounce" />
                            <span className="w-0.5 h-2 bg-[#1DB954] animate-bounce delay-100" />
                            <span className="w-0.5 h-3.5 bg-[#1DB954] animate-bounce delay-200" />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="w-4 h-4 text-white fill-current hidden group-hover:block" />
                          </>
                        )}
                      </div>

                      {/* Track Thumbnail & Title */}
                      <div className="col-span-6 sm:col-span-5 flex items-center space-x-3 min-w-0 pr-2">
                        <img src={track.cover} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 shadow" />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isCurrentlyPlaying ? 'text-[#1DB954]' : 'text-white group-hover:text-white'}`}>
                            {track.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      {/* Album Name */}
                      <div className="col-span-3 sm:col-span-4 hidden sm:block truncate text-xs text-zinc-400 pr-2">
                        {track.album}
                      </div>

                      {/* Action buttons */}
                      <div className="col-span-5 sm:col-span-2 flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleLikeSong(track)}
                          className={`p-1.5 transition-colors cursor-pointer ${
                            liked ? 'text-[#1DB954]' : 'text-zinc-500 hover:text-white'
                          }`}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => setTrackForPlaylist(track)}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIKED SONGS */}
      {activeTab === 'liked' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1DB954]/20 via-[#181818] to-zinc-950 border border-[#1DB954]/30 flex items-center space-x-4">
            <div className="p-4 rounded-full bg-[#1DB954] text-black shadow-xl">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Your Liked Songs</h2>
              <p className="text-xs text-zinc-400">{likedSongs.length} saved tracks in your personal vault</p>
            </div>
          </div>

          {likedSongs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl space-y-3 bg-[#181818]">
              <Heart className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-bold text-zinc-400">No liked songs yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Click the heart icon on any song card while listening to save it to your collection.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {likedSongs.map((track) => (
                <div
                  key={track.id}
                  className="p-3 rounded-2xl bg-[#181818] border border-zinc-800 hover:border-[#1DB954]/50 flex items-center justify-between space-x-3 transition-colors"
                >
                  <div
                    onClick={() => onPlayTrack(track, { type: 'general' })}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTrackForPlaylist(track);
                      }}
                      className="px-2.5 py-1.5 rounded-full bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                      title="Add to Playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add</span>
                    </button>

                    <button
                      onClick={() => toggleLikeSong(track)}
                      className="p-2 text-[#1DB954] hover:text-[#1ed760] cursor-pointer"
                      title="Remove from Liked"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLAYLISTS */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Your Playlists</h2>
              <p className="text-xs text-zinc-400">Create custom track lists for any mood</p>
            </div>

            <form onSubmit={handleCreatePlaylist} className="flex items-center space-x-2 w-full sm:w-80">
              <input
                type="text"
                placeholder="New playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="flex-1 px-4 py-2 bg-[#181818] border border-zinc-800 rounded-full text-xs text-white focus:outline-none focus:border-[#1DB954]"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playlists.map((pl) => (
              <div key={pl.id} className="p-5 rounded-3xl bg-[#181818] border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center border border-[#1DB954]/30">
                      <ListMusic className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{pl.name}</h3>
                      <p className="text-xs text-zinc-400">{pl.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-zinc-500">{pl.tracks.length} tracks</span>
                    <button
                      onClick={() => handleDeletePlaylist(pl.id)}
                      className="p-1.5 rounded-full bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  {pl.tracks.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-2">Playlist is empty. Add songs from Search!</p>
                  ) : (
                    pl.tracks.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs transition-colors"
                      >
                        <div onClick={() => onPlayTrack(t, { type: 'playlist', playlistId: pl.id, playlistTracks: pl.tracks })} className="flex items-center space-x-2 cursor-pointer truncate">
                          <Play className="w-3 h-3 text-[#1DB954] fill-current" />
                          <span className="text-white font-medium truncate">{t.title}</span>
                          <span className="text-zinc-500 text-[10px]">— {t.artist}</span>
                        </div>
                        <button
                          onClick={() => removeTrackFromPlaylist(pl.id, t.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 4: SYNCHRONIZED LYRICS */}
      {activeTab === 'lyrics' && (
        <div className="p-8 rounded-3xl bg-[#181818] border border-zinc-800 space-y-6 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="flex flex-col items-center space-y-2">
            <FileText className="w-8 h-8 text-[#1DB954] animate-bounce" />
            <h2 className="text-2xl font-black text-white">
              {currentTrack ? currentTrack.title : 'No Track Playing'}
            </h2>
            <p className="text-xs font-mono text-[#1DB954]">
              {currentTrack ? currentTrack.artist : 'Select a song to view lyrics'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 max-h-96 overflow-y-auto space-y-3 scrollbar-thin">
            {isLoadingLyrics ? (
              <p className="text-zinc-500 animate-pulse py-8 text-sm font-mono">Fetching live lyrics for track...</p>
            ) : (() => {
              const lines = parseLrcLyrics(lyricsText);
              if (lines.length === 0) {
                return <p className="text-zinc-500 text-xs font-mono">No lyrics text available for this song.</p>;
              }

              // Check if timestamps exist
              const hasTimestamps = lines.some((l) => l.time >= 0);

              if (!hasTimestamps) {
                return (
                  <div className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-line text-left">
                    {lyricsText}
                  </div>
                );
              }

              const activeIdx = lines.reduce((acc, line, idx) => {
                if (currentTime >= line.time) return idx;
                return acc;
              }, -1);

              return (
                <div className="space-y-3">
                  {lines.map((line, idx) => {
                    const isActive = idx === activeIdx;
                    return (
                      <p
                        key={idx}
                        className={`transition-all duration-300 text-center font-sans ${
                          isActive
                            ? 'text-[#1DB954] font-extrabold text-base sm:text-lg scale-105 drop-shadow-[0_0_12px_rgba(29,185,84,0.5)]'
                            : 'text-zinc-500 text-xs sm:text-sm hover:text-zinc-300'
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

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-full bg-[#181818] border border-[#1DB954] text-[#1DB954] text-xs font-bold shadow-2xl flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-[#1DB954]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {trackForPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-6 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Song to Playlist</h3>
                  <p className="text-xs text-zinc-400">Save to your custom audio vaults</p>
                </div>
              </div>
              <button
                onClick={() => setTrackForPlaylist(null)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Song Preview Banner */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center space-x-3">
              <img
                src={trackForPlaylist.cover}
                alt={trackForPlaylist.title}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{trackForPlaylist.title}</h4>
                <p className="text-[11px] text-zinc-400 truncate">{trackForPlaylist.artist}</p>
              </div>
            </div>

            {/* IF NO PLAYLISTS EXIST YET */}
            {playlists.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2 text-center">
                  <FolderPlus className="w-8 h-8 text-purple-400 mx-auto" />
                  <p className="text-xs font-bold text-purple-200">
                    You don't have any playlists yet!
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Enter a playlist name below to create your first playlist and automatically add this track onto it.
                  </p>
                </div>

                <form onSubmit={handleCreateAndAddPlaylist} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={modalNewPlaylistName}
                    onChange={(e) => setModalNewPlaylistName(e.target.value)}
                    placeholder="e.g., Chill Late Night Vibes..."
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Playlist & Add Song</span>
                  </button>
                </form>
              </div>
            ) : (
              /* IF PLAYLISTS EXIST */
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                    Select Existing Playlist:
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                    {playlists.map((pl) => {
                      const isAlreadyIn = pl.tracks.some((t) => t.id === trackForPlaylist.id || t.title === trackForPlaylist.title);
                      return (
                        <div
                          key={pl.id}
                          className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between hover:border-purple-500/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <h5 className="text-xs font-bold text-white truncate">{pl.name}</h5>
                            <p className="text-[10px] text-zinc-400 font-mono">{pl.tracks.length} tracks</p>
                          </div>

                          <button
                            onClick={() => {
                              addTrackToPlaylist(pl.id, trackForPlaylist);
                              setTrackForPlaylist(null);
                            }}
                            disabled={isAlreadyIn}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                              isAlreadyIn
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 opacity-80'
                                : 'bg-purple-500 hover:bg-purple-400 text-white shadow-md'
                            }`}
                          >
                            {isAlreadyIn ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Create New Playlist Inline Form */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <label className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider">
                    Or Create New Playlist & Add:
                  </label>
                  <form onSubmit={handleCreateAndAddPlaylist} className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      value={modalNewPlaylistName}
                      onChange={(e) => setModalNewPlaylistName(e.target.value)}
                      placeholder="New playlist name..."
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create & Add</span>
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
