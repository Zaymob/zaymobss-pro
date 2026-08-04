import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Play,
  Pause,
  Tv,
  Film,
  Send,
  Sparkles,
  Users,
  Copy,
  Check,
  Smile,
  Search,
  RotateCcw,
  Pencil,
  Layers,
  Flame,
  Popcorn,
  RefreshCw,
  Zap,
  Phone,
  Video,
  Mic,
  Monitor,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOVIES } from '../data/portalData';
import { MovieItem, UserProfile, StreamSource, CallState } from '../types';
import { audioEngine } from '../utils/audioSynth';
import { GarticPhone } from './GarticPhone';

interface PrivateChatMessage {
  id: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  badge: string;
  isSystemEvent?: boolean;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  left: number;
}

interface PrivateChatViewProps {
  userProfile: UserProfile;
  onStartCall?: (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => void;
  callState?: CallState;
  screenStream?: MediaStream | null;
  onToggleScreenShare?: () => void;
}

export const PrivateChatView: React.FC<PrivateChatViewProps> = ({
  userProfile,
  onStartCall,
  callState,
  screenStream,
  onToggleScreenShare,
}) => {
  const [activeTab, setActiveTab] = useState<'watch_party' | 'gartic_phone'>('watch_party');

  // Generate random room code under 7 chars
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < 5; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Room Code State (no hardcoded presets, under 7 characters)
  const [roomCode, setRoomCode] = useState<string>(() => generateRandomCode());
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState<boolean>(false);
  const [inputRoomCode, setInputRoomCode] = useState<string>('');

  const hostScreenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (hostScreenVideoRef.current && screenStream) {
      hostScreenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Watch Party States
  const [selectedMovie, setSelectedMovie] = useState<MovieItem>(() => {
    return MOVIES.find((m) => m.tmdbId || m.id) || MOVIES[0];
  });
  const [selectedSource, setSelectedSource] = useState<StreamSource>('vidcore');
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(120);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showMovieSelector, setShowMovieSelector] = useState<boolean>(false);

  // Chat messages per room
  const [messages, setMessages] = useState<PrivateChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`yuno_private_chat_messages_${roomCode}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: '1',
        user: 'System Bot',
        avatar: '',
        content: `🔒 Welcome to VIP Room #${roomCode}! Watch full movies & TV shows in sync or play Gartic Phone together.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'VIP SYSTEM',
        isSystemEvent: true,
      },
      {
        id: '2',
        user: 'Ghost_Vip',
        avatar: '',
        content: 'Yo! /e douche squad in the house. Let\'s stream a movie or start a Gartic Phone game!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'FOUNDER VIP',
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [syncStatusNotice, setSyncStatusNotice] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(() => Math.random().toString(36).substring(2, 9));

  // Real-time online hosts list
  const [activeOnlineHosts, setActiveOnlineHosts] = useState<
    Array<{
      tabId: string;
      hostName: string;
      avatar: string;
      roomCode: string;
      showingTitle: string;
      activeTab: string;
      lastActive: number;
    }>
  >([]);

  // Function to scan and update real online hosts from storage & pings
  const refreshOnlineHosts = () => {
    try {
      const now = Date.now();
      const onlineList: Array<any> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yuno_vip_presence_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const data = JSON.parse(raw);
              if (now - data.lastActive < 7000) {
                onlineList.push(data);
              } else {
                localStorage.removeItem(key);
              }
            }
          } catch (e) {}
        }
      }

      // Deduplicate by hostName & roomCode if multiple tabs
      const uniqueHosts = onlineList.reduce((acc: any[], item) => {
        if (!acc.some((x) => x.roomCode === item.roomCode && x.hostName === item.hostName)) {
          acc.push(item);
        }
        return acc;
      }, []);

      setActiveOnlineHosts(uniqueHosts);
    } catch (err) {}
  };

  // Poll Watch Party state and messages from server for room synchronization
  useEffect(() => {
    let isMounted = true;
    const fetchRoomState = async () => {
      try {
        const username = userProfile.displayName || userProfile.username || 'VIP Member';
        const res = await fetch(
          `/api/rooms/watchparty/state?roomCode=${encodeURIComponent(roomCode)}&user=${encodeURIComponent(username)}&avatar=${encodeURIComponent(userProfile.avatar || '')}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          // Update video state if changed
          if (data.selectedMovie) setSelectedMovie(data.selectedMovie);
          if (data.selectedSource) setSelectedSource(data.selectedSource);
          if (data.season !== undefined) setSeason(data.season);
          if (data.episode !== undefined) setEpisode(data.episode);
          if (data.currentTimeSec !== undefined) setCurrentTimeSec(data.currentTimeSec);
          if (data.isPlaying !== undefined) setIsPlaying(data.isPlaying);

          // Merge chat messages
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages((prev) => {
              const prevIds = new Set(prev.map((m) => m.id));
              const newMsgs = data.messages.filter((m: any) => !prevIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              return [...prev, ...newMsgs];
            });
          }

          // Active users online
          if (Array.isArray(data.activeUsers)) {
            const formatted = data.activeUsers.map((u: any) => ({
              tabId: u.user,
              hostName: u.user,
              avatar: u.avatar || '',
              roomCode,
              showingTitle: selectedMovie.title || 'Watching Movie',
              activeTab,
              lastActive: Date.now(),
            }));
            setActiveOnlineHosts(formatted);
          }
        }
      } catch (err) {
        console.warn('Room state poll error:', err);
      }
    };

    fetchRoomState();
    const interval = setInterval(fetchRoomState, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomCode, userProfile, activeTab]);

  // Heartbeat & Presence broadcasting
  useEffect(() => {
    const myTabId = typeof tabIdRef.current === 'function' ? tabIdRef.current() : tabIdRef.current;
    
    const sendPresence = () => {
      const presencePayload = {
        tabId: myTabId,
        hostName: userProfile.displayName || userProfile.username || 'VIP Member',
        avatar: userProfile.avatar || '',
        roomCode,
        showingTitle: selectedMovie.title || 'Watching Movie',
        activeTab,
        lastActive: Date.now(),
      };

      try {
        localStorage.setItem(`yuno_vip_presence_${myTabId}`, JSON.stringify(presencePayload));
      } catch (e) {}

      try {
        broadcastChannelRef.current?.postMessage({
          type: 'PRESENCE_PING',
          payload: presencePayload,
        });
      } catch (e) {}

      refreshOnlineHosts();
    };

    sendPresence();
    const interval = setInterval(sendPresence, 2500);

    return () => {
      clearInterval(interval);
      try {
        localStorage.removeItem(`yuno_vip_presence_${myTabId}`);
      } catch (e) {}
    };
  }, [roomCode, userProfile, selectedMovie, activeTab]);

  // Initialize Global BroadcastChannel for multi-tab & multi-user syncing
  useEffect(() => {
    const channelName = `yuno_vip_global_mesh_channel`;
    const channel = new BroadcastChannel(channelName);
    broadcastChannelRef.current = channel;

    // Request room sync on join
    try {
      channel.postMessage({
        type: 'REQUEST_ROOM_SYNC',
        roomCode,
        requestor: userProfile.displayName || userProfile.username || 'User',
      });
    } catch (e) {}

    channel.onmessage = (event) => {
      const { type, roomCode: eventRoomCode, payload, requestor } = event.data || {};

      if (type === 'CHAT_MSG' && payload) {
        if (!eventRoomCode || eventRoomCode === roomCode) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const updated = [...prev, payload];
            try {
              localStorage.setItem(`yuno_private_chat_messages_${roomCode}`, JSON.stringify(updated.slice(-50)));
            } catch (e) {}
            return updated;
          });
          try {
            audioEngine.playPopSound();
          } catch (e) {}
        }
      } else if (type === 'SYNC_STREAM') {
        if (!eventRoomCode || eventRoomCode === roomCode) {
          if (payload) {
            if (payload.currentTimeSec !== undefined) setCurrentTimeSec(payload.currentTimeSec);
            if (payload.isPlaying !== undefined) setIsPlaying(payload.isPlaying);
            if (payload.selectedMovie) setSelectedMovie(payload.selectedMovie);
            if (payload.season) setSeason(payload.season);
            if (payload.episode) setEpisode(payload.episode);
            if (payload.selectedSource) setSelectedSource(payload.selectedSource);

            setSyncStatusNotice(
              `Synced stream with ${payload.byUser || 'host'} at ${formatTime(payload.currentTimeSec || 0)}`
            );
            setTimeout(() => setSyncStatusNotice(''), 3500);
          }
        }
      } else if (type === 'REQUEST_ROOM_SYNC') {
        if (eventRoomCode === roomCode) {
          // Send current state to requestor
          try {
            channel.postMessage({
              type: 'SYNC_STREAM',
              roomCode,
              payload: {
                currentTimeSec,
                isPlaying,
                selectedMovie,
                selectedSource,
                season,
                episode,
                byUser: userProfile.displayName || userProfile.username || 'Host',
              },
            });
          } catch (e) {}
        }
      } else if (type === 'REACTION' && payload?.emoji) {
        if (!eventRoomCode || eventRoomCode === roomCode) {
          setFloatingReactions((prev) => [
            ...prev,
            { id: Math.random().toString(), emoji: payload.emoji, left: Math.floor(Math.random() * 80) + 10 },
          ]);
          try {
            audioEngine.playBlipSound();
          } catch (e) {}
        }
      } else if (type === 'PRESENCE_PING') {
        refreshOnlineHosts();
      }
    };

    // Storage event listener for multi-tab fallback
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `yuno_private_chat_messages_${roomCode}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setMessages(parsed);
        } catch (err) {}
      }
      if (e.key && e.key.startsWith('yuno_vip_presence_')) {
        refreshOnlineHosts();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [roomCode, currentTimeSec, isPlaying, selectedMovie, selectedSource, season, episode, userProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(`yuno_private_chat_messages_${roomCode}`, JSON.stringify(messages.slice(-50)));
    } catch (e) {}
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, roomCode]);

  // Sync timeline simulator
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Compute stream URL
  const getStreamEmbedUrl = (movie: MovieItem) => {
    const isAnime = movie.mediaType === 'anime' || movie.category === 'anime';
    const animeId = movie.anilistId || movie.tmdbId || 21;

    if (isAnime || selectedSource === 'streamrip-anime') {
      return `https://streamrip.fun/anime/${animeId}/${episode}`;
    }

    const tmdbId = movie.tmdbId || 550;
    const isTv = movie.mediaType === 'tv' || movie.duration.includes('Series');

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
        return `https://vidcore.net/movie/${tmdbId}?autoPlay=true`;
    }
  };

  const handleSearchTMDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const parsed: MovieItem[] = data.results.slice(0, 10).map((item: any) => ({
            id: `tmdb-vip-${item.id}`,
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
            genres: [item.media_type === 'tv' ? 'TV Show' : 'Movie'],
            duration: item.media_type === 'tv' ? 'TV Series' : '2h 10m',
          }));
          setSearchResults(parsed);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage: PrivateChatMessage = {
      id: Date.now().toString(),
      user: userProfile.displayName || userProfile.username || 'VIP Member',
      avatar: userProfile.avatar || '',
      content: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: userProfile.badge || 'VIP',
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send to backend room API
    fetch('/api/rooms/watchparty/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, message: newMessage }),
    }).catch((e) => console.warn('Failed to send room msg:', e));

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: newMessage,
      });
    } catch (err) {}

    setInputMessage('');
    try {
      audioEngine.playPopSound();
    } catch (err) {}

    // Simulated Bot reply if mentioned or testing
    const text = newMessage.content.toLowerCase();
    if (text.includes('sync') || text.includes('movie') || text.includes('gartic') || text.includes('hi') || text.includes('hello')) {
      setTimeout(() => {
        const botMsg: PrivateChatMessage = {
          id: (Date.now() + 1).toString(),
          user: 'VIP Bot',
          avatar: '',
          content: text.includes('sync')
            ? '🎬 Hit the "Sync Stream" button under the video player to synchronize timestamps across all viewers!'
            : text.includes('gartic')
            ? '🎨 Switch to "Gartic Phone Game" tab above to draw & guess with everyone!'
            : `Hey ${newMessage.user}! Connected to VIP Room #${roomCode}. Watch party stream is live & synced!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'BOT',
        };
        setMessages((prev) => [...prev, botMsg]);
        try {
          broadcastChannelRef.current?.postMessage({
            type: 'CHAT_MSG',
            payload: botMsg,
          });
        } catch (e) {}
      }, 1000);
    }
  };

  const triggerReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      left: Math.floor(Math.random() * 80) + 10,
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'REACTION',
        payload: { emoji },
      });
    } catch (err) {}

    try {
      audioEngine.playBlipSound();
    } catch (err) {}
  };

  const broadcastSyncStream = (timeVal?: number, playingVal?: boolean) => {
    const targetTime = timeVal !== undefined ? timeVal : currentTimeSec;
    const targetPlaying = playingVal !== undefined ? playingVal : isPlaying;

    setCurrentTimeSec(targetTime);
    setIsPlaying(targetPlaying);

    const sysMsg: PrivateChatMessage = {
      id: Date.now().toString(),
      user: userProfile.displayName || userProfile.username || 'VIP Member',
      avatar: userProfile.avatar || '',
      content: `🔄 Synced watch party stream timestamp (${formatTime(targetTime)}) & playback for everyone in Room #${roomCode}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: 'SYNC',
      isSystemEvent: true,
    };

    setMessages((prev) => [...prev, sysMsg]);

    // Send state sync payload to backend server
    fetch('/api/rooms/watchparty/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        user: userProfile.displayName || userProfile.username || 'Host',
        selectedMovie,
        selectedSource,
        season,
        episode,
        currentTimeSec: targetTime,
        isPlaying: targetPlaying,
      }),
    }).catch((e) => console.warn('Failed sync post:', e));

    fetch('/api/rooms/watchparty/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode, message: sysMsg }),
    }).catch((e) => console.warn('Failed system msg post:', e));

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: sysMsg,
      });
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_STREAM',
        payload: {
          currentTimeSec: targetTime,
          isPlaying: targetPlaying,
          selectedMovie,
          selectedSource,
          season,
          episode,
          byUser: userProfile.displayName || userProfile.username || 'Host',
        },
      });
    } catch (err) {}

    setSyncStatusNotice(`Synced stream at ${formatTime(targetTime)} for Room #${roomCode}!`);
    setTimeout(() => setSyncStatusNotice(''), 3000);
  };

  const handleSelectMovie = (movie: MovieItem) => {
    setSelectedMovie(movie);
    setShowMovieSelector(false);
    setCurrentTimeSec(0);
    setIsPlaying(true);

    const sysMsg: PrivateChatMessage = {
      id: Date.now().toString(),
      user: userProfile.displayName || userProfile.username || 'VIP Member',
      avatar: userProfile.avatar || '',
      content: `🎬 Stream changed to full ${movie.mediaType === 'tv' ? 'TV Show' : 'Movie'}: "${movie.title}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: 'WATCH PARTY',
      isSystemEvent: true,
    };
    setMessages((prev) => [...prev, sysMsg]);

    try {
      broadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: sysMsg,
      });
      broadcastChannelRef.current?.postMessage({
        type: 'SYNC_STREAM',
        payload: {
          currentTimeSec: 0,
          isPlaying: true,
          selectedMovie: movie,
          selectedSource,
          season,
          episode,
          byUser: userProfile.displayName || userProfile.username || 'Host',
        },
      });
    } catch (err) {}
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinRoom = (codeToJoin: string) => {
    let cleanCode = codeToJoin.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleanCode.length > 7) {
      cleanCode = cleanCode.substring(0, 7);
    }
    if (!cleanCode) {
      cleanCode = generateRandomCode();
    }
    setRoomCode(cleanCode);
    setIsJoinRoomOpen(false);
    setInputRoomCode('');

    try {
      const saved = localStorage.getItem(`yuno_private_chat_messages_${cleanCode}`);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        const welcomeMsg: PrivateChatMessage = {
          id: Date.now().toString(),
          user: 'System Bot',
          avatar: '',
          content: `🔒 Connected to Private Room #${cleanCode}! Share this room code with friends to stream and chat together.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'ROOM SYSTEM',
          isSystemEvent: true,
        };
        setMessages([welcomeMsg]);
      }
    } catch (e) {}

    try {
      audioEngine.playPopSound();
    } catch (e) {}
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isTvShow = selectedMovie.mediaType === 'tv' || selectedMovie.duration.includes('Series');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/50 via-zinc-950 to-purple-950/50 border border-amber-500/30 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-amber-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-amber-500 text-black shadow-md">
                VIP SECRET LOUNGE
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Secret VIP Watch Party & Gartic Phone Lounge
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Unlocked via <code className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">/e douche</code> command. Stream full movies & TV shows in 4K or play Gartic Phone with friends.
            </p>
          </div>

          {/* Room Controls & Call Launchers */}
          <div className="flex flex-wrap items-center gap-2">
            {onStartCall && (
              <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-md">
                <button
                  type="button"
                  onClick={() => onStartCall(`vip-voice-${roomCode}`, `VIP Voice Lounge #${roomCode}`, 'voice')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-black text-emerald-400 font-bold text-xs transition-all flex items-center space-x-1 border border-emerald-500/30"
                  title="Start VIP Voice Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Voice Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => onStartCall(`vip-video-${roomCode}`, `VIP Video Room #${roomCode}`, 'video')}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-300 font-bold text-xs transition-all flex items-center space-x-1 border border-cyan-500/30"
                  title="Start VIP Video Call"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Call</span>
                </button>

                <button
                  type="button"
                  onClick={() => onStartCall(`vip-screen-${roomCode}`, `VIP Watch Stream #${roomCode}`, 'screen')}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 hover:text-black text-purple-300 font-bold text-xs transition-all flex items-center space-x-1 border border-purple-500/30"
                  title="Share Screen with Room"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Screen Share</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsJoinRoomOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <Users className="w-4 h-4" />
              <span>Join / Switch Room</span>
            </button>

            <button
              onClick={handleCopyInvite}
              className="px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow-lg"
              title="Click to copy room code"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Code Copied!' : `Room Code: #${roomCode}`}</span>
            </button>

            <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-emerald-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {callState?.isActive ? 'Call & Watch Party Live' : `Connected to #${roomCode}`}
              </span>
            </div>
          </div>
        </div>

        {/* Join Room Modal Dialog */}
        <AnimatePresence>
          {isJoinRoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setIsJoinRoomOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md p-6 rounded-3xl bg-zinc-950 border border-amber-500/30 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Join Friend's Room</h3>
                      <p className="text-xs text-zinc-400">Enter a room code to join your friends' watch party & Gartic game!</p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputRoomCode.trim()) handleJoinRoom(inputRoomCode);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                        Enter Custom Room Code (Max 7 Chars)
                      </label>
                      <button
                        type="button"
                        onClick={() => setInputRoomCode(generateRandomCode())}
                        className="text-[10px] font-mono font-bold text-amber-300 hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Random Code</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      maxLength={7}
                      value={inputRoomCode}
                      onChange={(e) =>
                        setInputRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').substring(0, 7))
                      }
                      placeholder="e.g. VIP77, X7A9, NIGHT..."
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm font-mono font-bold text-amber-300 tracking-wider placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      No presets! Type any custom code under 7 characters to create or join a room with friends.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsJoinRoomOpen(false)}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-2xl border border-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black font-black text-xs rounded-2xl shadow-lg"
                    >
                      Join / Host Room
                    </button>
                  </div>
                </form>

                {/* Active Online Rooms & Hosts Directory */}
                <div className="pt-3 border-t border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active Online VIP Hosts:</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">
                      {activeOnlineHosts.length} Online
                    </span>
                  </div>

                  {activeOnlineHosts.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center space-y-1">
                      <p className="text-xs font-bold text-zinc-300">You are the first VIP host live right now!</p>
                      <p className="text-[10px] text-zinc-500">
                        Hosting room <span className="font-mono text-amber-400 font-bold">#{roomCode}</span>. Open another tab or share code to sync watch party streams!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {activeOnlineHosts.map((host) => {
                        const isCurrentRoom = roomCode === host.roomCode;
                        const isSelf = host.hostName === (userProfile.displayName || userProfile.username);

                        return (
                          <div
                            key={host.tabId + host.roomCode}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isCurrentRoom
                                ? 'bg-amber-500/15 border-amber-500/50 text-white'
                                : 'bg-zinc-900/90 border-zinc-800/80 text-zinc-300 hover:border-amber-500/30'
                            }`}
                          >
                            <div className="flex items-center space-x-3 truncate">
                              <img
                                src={
                                  host.avatar ||
                                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                                }
                                alt={host.hostName}
                                className="w-8 h-8 rounded-xl object-cover ring-2 ring-amber-500/30 flex-shrink-0"
                              />
                              <div className="truncate">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-mono font-black text-amber-400">#{host.roomCode}</span>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-bold text-white truncate">Host: {host.hostName}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{host.showingTitle}</div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Live
                              </span>
                              <button
                                type="button"
                                onClick={() => handleJoinRoom(host.roomCode)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                                  isCurrentRoom
                                    ? 'bg-amber-500 text-black shadow-md'
                                    : 'bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-200'
                                }`}
                              >
                                {isCurrentRoom ? 'Connected' : 'Join Room'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lounge Mode Switcher Tabs */}
        <div className="flex items-center space-x-3 pt-6 border-t border-zinc-800/80 mt-5">
          <button
            onClick={() => setActiveTab('watch_party')}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center space-x-2 ${
              activeTab === 'watch_party'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>4K Cinema & TV Watch Party</span>
          </button>

          <button
            onClick={() => setActiveTab('gartic_phone')}
            className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center space-x-2 ${
              activeTab === 'gartic_phone'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Pencil className="w-4 h-4" />
            <span>Gartic Phone Game</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Selected Mode (Left 7 Cols) + Encrypted Chat (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: WATCH PARTY OR GARTIC PHONE */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'watch_party' ? (
            <div className="relative rounded-3xl bg-zinc-950 border border-amber-500/20 overflow-hidden shadow-2xl flex flex-col">
              {/* Player Top Header */}
              <div className="p-4 bg-zinc-900/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5 truncate">
                  <Film className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div className="truncate">
                    <h3 className="text-sm font-black text-white truncate">
                      {selectedMovie.title} ({selectedMovie.year})
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-400">
                      Full Stream • {selectedMovie.genres.join(', ')} • Rating {selectedMovie.rating}★
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onToggleScreenShare) {
                        onToggleScreenShare();
                      } else if (onStartCall) {
                        onStartCall(`vip-screen-${roomCode}`, `VIP Watch Stream #${roomCode}`, 'screen');
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center space-x-1.5 flex-shrink-0 shadow-lg ${
                      screenStream
                        ? 'bg-amber-400 text-black animate-pulse border border-amber-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30'
                    }`}
                    title="Share Host Screen & System Audio to Room"
                  >
                    <Monitor className="w-4 h-4 text-amber-400" />
                    <span>{screenStream ? 'Sharing Screen Live' : 'Share Screen & Audio'}</span>
                  </button>

                  <button
                    onClick={() => setShowMovieSelector(!showMovieSelector)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <Tv className="w-4 h-4" />
                    <span>Select Movie / TV Show</span>
                  </button>
                </div>
              </div>

              {/* Server & Season/Episode Selectors */}
              <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                {/* Server selection */}
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-500">SERVER:</span>
                  {(['vidfast', 'vidcore', 'streamrip', 'viduki', 'vidsrc'] as StreamSource[]).map((srv) => (
                    <button
                      key={srv}
                      onClick={() => setSelectedSource(srv)}
                      className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-bold transition-all ${
                        selectedSource === srv
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {srv}
                    </button>
                  ))}
                </div>

                {/* Season & Episode selector if TV */}
                {isTvShow && (
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-400 font-bold">S:</span>
                    <select
                      value={season}
                      onChange={(e) => setSeason(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-700 text-amber-400 text-xs rounded-lg px-2 py-0.5 focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Season {s}
                        </option>
                      ))}
                    </select>

                    <span className="text-zinc-400 font-bold ml-1">E:</span>
                    <select
                      value={episode}
                      onChange={(e) => setEpisode(Number(e.target.value))}
                      className="bg-zinc-900 border border-zinc-700 text-amber-400 text-xs rounded-lg px-2 py-0.5 focus:outline-none"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Episode {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Movie Search & Dropdown Selector */}
              {showMovieSelector && (
                <div className="p-4 bg-zinc-900 border-b border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                      Select From Vault or Search TMDB:
                    </span>
                  </div>

                  {/* TMDB Search */}
                  <form onSubmit={handleSearchTMDB} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search any movie or show on TMDB..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </form>

                  {/* Display List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {(searchResults.length > 0 ? searchResults : MOVIES).map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => handleSelectMovie(movie)}
                        className={`p-2 rounded-xl text-left border transition-all flex items-center space-x-2 ${
                          selectedMovie.id === movie.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <img
                          src={movie.image}
                          alt={movie.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{movie.title}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{movie.year} • {movie.rating}★</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Player Box with Floating Emoji Reactions & Sync Banner */}
              <div className="relative aspect-video bg-black overflow-hidden group">
                {/* Sync Notification Banner */}
                <AnimatePresence>
                  {syncStatusNotice && (
                    <motion.div
                      initial={{ y: -40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -40, opacity: 0 }}
                      className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-amber-500 text-black font-black text-xs shadow-2xl flex items-center space-x-2 border border-amber-300"
                    >
                      <Zap className="w-4 h-4 animate-bounce" />
                      <span>{syncStatusNotice}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Floating Emojis */}
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                  {floatingReactions.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ y: 250, opacity: 1, scale: 0.8 }}
                      animate={{ y: -50, opacity: 0, scale: 1.8 }}
                      transition={{ duration: 2.2, ease: 'easeOut' }}
                      style={{ left: `${r.left}%` }}
                      className="absolute bottom-4 text-3xl drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                    >
                      {r.emoji}
                    </motion.div>
                  ))}
                </div>

                {screenStream ? (
                  <div className="relative w-full h-full bg-black flex items-center justify-center">
                    <video
                      ref={hostScreenVideoRef}
                      autoPlay
                      playsInline
                      controls
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black flex items-center space-x-1.5 shadow-2xl border border-amber-300">
                      <Monitor className="w-4 h-4 animate-pulse" />
                      <span>🔴 LIVE HOST SCREEN & SYSTEM AUDIO BROADCAST (Room #{roomCode})</span>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={getStreamEmbedUrl(selectedMovie)}
                    title="VIP Watch Party Player"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Sync Controls & Live Reactions Bar */}
              <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => broadcastSyncStream(currentTimeSec, !isPlaying)}
                      className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all shadow-md flex items-center space-x-1"
                      title={isPlaying ? 'Pause stream for room' : 'Play stream for room'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => broadcastSyncStream(Math.max(0, currentTimeSec - 10))}
                      className="px-2 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300"
                      title="Rewind 10s for room"
                    >
                      -10s
                    </button>

                    <button
                      onClick={() => broadcastSyncStream(currentTimeSec + 10)}
                      className="px-2 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300"
                      title="Forward 10s for room"
                    >
                      +10s
                    </button>

                    <div className="text-xs font-mono text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center space-x-1">
                      <span className="text-amber-400 font-bold">{formatTime(currentTimeSec)}</span>
                      <span>/</span>
                      <span>{selectedMovie.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => broadcastSyncStream(currentTimeSec, isPlaying)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black font-extrabold text-xs shadow-lg flex items-center space-x-1.5 transition-all active:scale-95"
                    >
                      <RefreshCw className="w-4 h-4 text-black animate-spin" style={{ animationDuration: '3s' }} />
                      <span>Sync Stream</span>
                    </button>
                  </div>
                </div>

                {/* Instant Reaction Buttons Overlay Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase font-bold">
                    Live Emoji Reactions:
                  </span>
                  <div className="flex items-center space-x-2">
                    {['🔥', '❤️', '😂', '😱', '🍿', '👏'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => triggerReaction(emoji)}
                        className="p-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 hover:scale-125 border border-zinc-800/80 text-base transition-all active:scale-95 shadow"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <GarticPhone
              roomCode={roomCode}
              username={userProfile.displayName || userProfile.username || 'VIP Member'}
              avatar={userProfile.avatar || ''}
              onStartCall={onStartCall}
              callState={callState}
              onGameEvent={(evt) => {
                const sysMsg: PrivateChatMessage = {
                  id: Date.now().toString(),
                  user: userProfile.displayName || userProfile.username || 'VIP Member',
                  avatar: userProfile.avatar || '',
                  content: evt,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  badge: 'GARTIC BOT',
                  isSystemEvent: true,
                };
                setMessages((prev) => [...prev, sysMsg]);
              }}
            />
          )}
        </div>

        {/* ENCRYPTED PRIVATE CHATROOM (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-[620px] rounded-3xl bg-zinc-950 border border-amber-500/20 overflow-hidden shadow-2xl">
          {/* Chatroom Top Bar */}
          <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Encrypted Room Chat
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              P2P Active
            </span>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
            {messages.map((msg) => {
              if (msg.isSystemEvent) {
                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono leading-relaxed"
                  >
                    {msg.content}
                  </div>
                );
              }

              const isMe = msg.user === (userProfile.displayName || userProfile.username);

              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  {msg.avatar ? (
                    <img
                      src={msg.avatar}
                      alt={msg.user}
                      className="w-7 h-7 rounded-xl object-cover flex-shrink-0 ring-2 ring-amber-500/30"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-zinc-800 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xs font-black flex-shrink-0">
                      {msg.user[0]?.toUpperCase() || 'V'}
                    </div>
                  )}

                  <div className={`space-y-1 max-w-[80%] ${isMe ? 'text-right' : ''}`}>
                    <div className={`flex items-center space-x-1.5 ${isMe ? 'justify-end' : ''}`}>
                      <span className="font-bold text-white text-[11px]">{msg.user}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {msg.badge || 'VIP'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-amber-500 text-black font-medium shadow-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <form onSubmit={handleSendMessage} className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message in VIP watch party chat..."
                className="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black hover:brightness-110 transition-all shadow-md flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
