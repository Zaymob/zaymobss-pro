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
  const lines = lrc.split('\n');
  const result: ParsedLrcLine[] = [];
  const regex = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const time = min * 60 + sec;
      const text = match[3].trim();
      if (text) {
        result.push({ time, text });
      }
    } else {
      const clean = line.trim();
      if (clean && !clean.startsWith('[')) {
        result.push({ time: -1, text: clean });
      }
    }
  }
  return result.sort((a, b) => (a.time >= 0 && b.time >= 0 ? a.time - b.time : 0));
}

export const MusicView: React.FC<MusicViewProps> = ({
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  currentTime = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'liked' | 'playlists' | 'lyrics'>('home');
  const [selectedAlbum, setSelectedAlbum] = useState<FeaturedAlbum>(EDITORS_PICKS_ALBUMS[0]);
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
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Yunø Audio Vault</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Music Studio</h1>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'home'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Featured & Search</span>
          </button>

          <button
            onClick={() => setActiveTab('liked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'liked'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Liked ({likedSongs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'playlists'
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Playlists ({playlists.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FEATURED ALBUMS & SEARCH */}
      {activeTab === 'home' && (
        <div className="space-y-8">
          {/* PERSONALIZED TASTE SECTION: BASED ON WHAT YOU LISTEN TO */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-950/60 to-zinc-950 border border-purple-500/30 shadow-2xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-purple-400">
                  <Disc3 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Personalized Taste Engine</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <span>Based on What You Listen To</span>
                </h2>
                <p className="text-xs text-zinc-300">
                  Curated mixes inspired by your affinity for <span className="text-cyan-300 font-bold">{topListenedArtist}</span>, Malcolm Todd & Kanye West.
                </p>
              </div>

              <button
                onClick={() => handleMetingSearch(topListenedArtist)}
                className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-500/30 transition-all flex items-center space-x-2 self-start sm:self-auto"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Launch {topListenedArtist.split(' ')[0]} Radio Station</span>
              </button>
            </div>

            {/* Recently Listened Quick Replay Row (If History Exists) */}
            {recentlyPlayed.length > 0 && (
              <div className="space-y-2 relative z-10 pt-2 border-t border-purple-500/20">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold block">
                  Recently Listened Tracks ({recentlyPlayed.length})
                </span>
                <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
                  {recentlyPlayed.slice(0, 10).map((track, i) => (
                    <div
                      key={`hist-${track.id}-${i}`}
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                      className="group/hist flex items-center space-x-2.5 p-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-400 cursor-pointer flex-shrink-0 transition-all hover:scale-105"
                    >
                      <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                      <div className="min-w-0 pr-1">
                        <p className="text-xs font-bold text-white group-hover/hist:text-purple-300 truncate max-w-[110px]">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[110px]">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Taste Recommendation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
              <div
                onClick={() => handleMetingSearch('Kanye West Graduation Yeezus')}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/60 cursor-pointer transition-all hover:bg-zinc-850 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                    Hip-Hop / Synth
                  </span>
                  <Play className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Kanye West Essential Vault</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Flashing Lights, Bound 2, Father Stretch My Hands & classic Ye beats.</p>
              </div>

              <div
                onClick={() => handleMetingSearch('Malcolm Todd Roommates Sweet Boy')}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-cyan-500/60 cursor-pointer transition-all hover:bg-zinc-850 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold border border-cyan-500/30">
                    Indie R&B / Soul
                  </span>
                  <Play className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Malcolm Todd Atmosphere</h4>
                <p className="text-[11px] text-zinc-400 mt-1">Roommates, Art House, Chest Press & smooth, bedroom R&B groove.</p>
              </div>

              <div
                onClick={() => handleMetingSearch('Tyler The Creator Don Toliver Frank Ocean')}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/60 cursor-pointer transition-all hover:bg-zinc-850 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-500/30">
                    Alternative Vibe
                  </span>
                  <Play className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Tyler, Don Toliver & Frank Ocean</h4>
                <p className="text-[11px] text-zinc-400 mt-1">See You Again, Bandit, Pink + White & high-energy futuristic tracks.</p>
              </div>
            </div>
          </div>

          {/* Featured Essential Albums (Kanye, Malcolm Todd, Tyler, Don Toliver) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Curated Collections</span>
                </div>
                <h2 className="text-xl font-black text-white">Essential Artist Vaults</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500 hidden sm:inline">Kanye • Malcolm Todd • Tyler • Don Toliver</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EDITORS_PICKS_ALBUMS.map((album) => (
                <div
                  key={album.id}
                  className="group relative rounded-2xl p-4 bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/50 transition-all hover:bg-zinc-850 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                      <img
                        src={album.cover}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black bg-cyan-400 px-2 py-0.5 rounded-full font-mono">
                          {album.artist}
                        </span>
                        <span className="text-[10px] text-zinc-300 font-mono">{album.year}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {album.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{album.description}</p>
                    </div>
                  </div>

                  {/* Album Tracks Quick Launcher */}
                  <div className="pt-2 border-t border-zinc-800 space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Featured Tracks</span>
                    {album.tracks.slice(0, 3).map((track, tIdx) => (
                      <button
                        key={tIdx}
                        onClick={() => handlePlayAlbumTrack(album, track.title)}
                        className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors text-[11px] group/trk"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Play className="w-3 h-3 text-cyan-400 fill-current flex-shrink-0 group-hover/trk:scale-110 transition-transform" />
                          <span className="text-zinc-300 group-hover/trk:text-white font-medium truncate">{track.title}</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">{track.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Searchable Songs Engine */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Search Music Vault</span>
              </h2>

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
                    placeholder="Artist or song name..."
                    className="w-full px-3 py-2 pl-8 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-cyan-500 text-black font-bold text-xs rounded-xl hover:bg-cyan-400 disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Quick Artist Tags */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {['Tyler The Creator', 'Malcolm Todd', 'Kanye West', 'Don Toliver', 'Frank Ocean', 'Kendrick Lamar', 'SZA', 'Travis Scott'].map((artist) => (
                <button
                  key={artist}
                  onClick={() => {
                    setSearchQuery(artist);
                    handleMetingSearch(artist);
                  }}
                  className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white hover:border-cyan-500/50 transition-colors whitespace-nowrap"
                >
                  {artist}
                </button>
              ))}
            </div>

            {/* Track Results List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(metingTracks.length > 0 ? metingTracks : MUSIC_TRACKS).map((track) => {
                const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                const liked = isLiked(track);

                return (
                  <div
                    key={track.id}
                    className={`group p-3 rounded-2xl bg-zinc-900/60 border transition-all flex items-center justify-between space-x-3 ${
                      isCurrentlyPlaying
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-lg'
                        : 'border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850'
                    }`}
                  >
                    <div
                      onClick={() => onPlayTrack(track, { type: 'general' })}
                      className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                        <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          {isCurrentlyPlaying ? (
                            <Pause className="w-5 h-5 text-cyan-400 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="truncate">
                        <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                          {track.title}
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                        <span className="text-[9px] font-mono text-zinc-500 block truncate">{track.album}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTrackForPlaylist(track);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-bold transition-all flex items-center space-x-1 shadow-md"
                        title="Add to Playlist"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add to Playlist</span>
                      </button>

                      <button
                        onClick={() => toggleLikeSong(track)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          liked ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-500 hover:text-white'
                        }`}
                        title={liked ? 'Unlike' : 'Like'}
                      >
                        <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIKED SONGS */}
      {activeTab === 'liked' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-900/30 via-zinc-900 to-zinc-950 border border-rose-500/30 flex items-center space-x-4">
            <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-xl">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">Your Liked Songs</h2>
              <p className="text-xs text-zinc-400">{likedSongs.length} saved tracks in your personal vault</p>
            </div>
          </div>

          {likedSongs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl space-y-3">
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
                  className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between space-x-3"
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
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 border border-purple-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                      title="Add to Playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add</span>
                    </button>

                    <button
                      onClick={() => toggleLikeSong(track)}
                      className="p-2 text-rose-500 hover:text-rose-400"
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
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-xl flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Create</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playlists.map((pl) => (
              <div key={pl.id} className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
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
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
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
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 hover:bg-zinc-800 text-xs"
                      >
                        <div onClick={() => onPlayTrack(t, { type: 'playlist', playlistId: pl.id, playlistTracks: pl.tracks })} className="flex items-center space-x-2 cursor-pointer truncate">
                          <Play className="w-3 h-3 text-purple-400 fill-current" />
                          <span className="text-white font-medium truncate">{t.title}</span>
                          <span className="text-zinc-500 text-[10px]">— {t.artist}</span>
                        </div>
                        <button
                          onClick={() => removeTrackFromPlaylist(pl.id, t.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
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
        <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-6 text-center max-w-2xl mx-auto shadow-2xl">
          <div className="flex flex-col items-center space-y-2">
            <FileText className="w-8 h-8 text-amber-400 animate-bounce" />
            <h2 className="text-2xl font-black text-white">
              {currentTrack ? currentTrack.title : 'No Track Playing'}
            </h2>
            <p className="text-xs font-mono text-amber-400">
              {currentTrack ? currentTrack.artist : 'Select a song to view lyrics'}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 max-h-96 overflow-y-auto space-y-3 scrollbar-thin">
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
                            ? 'text-amber-300 font-extrabold text-base sm:text-lg scale-105 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]'
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
        <div className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-2xl bg-zinc-900 border border-purple-500/50 text-purple-300 text-xs font-bold shadow-2xl shadow-purple-500/20 flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-purple-400" />
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
