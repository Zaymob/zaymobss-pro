import React, { useState, useEffect } from 'react';
import { YouTubeVideo } from '../types';
import {
  Search,
  Tv,
  Play,
  ArrowLeft,
  X,
  Share2,
  Calendar,
  User,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  ExternalLink,
  Flame,
  Film,
  Copy,
  Check,
  Radio,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  MessageSquare,
  Send,
  MoreVertical,
  SlidersHorizontal,
  Bell,
  Heart,
  Eye,
  TrendingUp,
  Compass,
  History,
  FolderHeart,
  Plus,
  Minimize2,
  Maximize2,
  Users,
  Palette,
  Smile,
  Zap,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORY_PILLS = [
  'All',
  'Gaming',
  'Music',
  'Minecraft',
  'Live',
  'Podcasts',
  'Programming',
  'Trailers',
  'Lofi Beats',
  'Science',
  'Tech',
  'Anime',
  'Cyberpunk'
];

export type SkinTheme = 'crimson' | 'cyberpunk' | 'obsidian' | 'emerald' | 'gold';

interface SkinConfig {
  id: SkinTheme;
  name: string;
  badge: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  glow: string;
  gradient: string;
  btnBg: string;
}

const SKINS: SkinConfig[] = [
  {
    id: 'crimson',
    name: 'Crimson Red',
    badge: 'CLASSIC',
    accentBg: 'bg-red-600',
    accentText: 'text-red-500',
    accentBorder: 'border-red-500/40',
    glow: 'shadow-[0_0_25px_rgba(239,68,68,0.4)]',
    gradient: 'from-red-600 via-red-500 to-rose-700',
    btnBg: 'bg-red-600 hover:bg-red-500',
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    badge: 'NEON',
    accentBg: 'bg-cyan-500',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/40',
    glow: 'shadow-[0_0_25px_rgba(6,182,212,0.45)]',
    gradient: 'from-cyan-500 via-fuchsia-500 to-purple-600',
    btnBg: 'bg-cyan-500 hover:bg-cyan-400 text-black',
  },
  {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    badge: 'SLEEK',
    accentBg: 'bg-zinc-100',
    accentText: 'text-zinc-200',
    accentBorder: 'border-zinc-700',
    glow: 'shadow-[0_0_25px_rgba(255,255,255,0.15)]',
    gradient: 'from-zinc-700 via-zinc-800 to-zinc-950',
    btnBg: 'bg-zinc-100 hover:bg-white text-zinc-950',
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    badge: 'SYNTH',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    glow: 'shadow-[0_0_25px_rgba(16,185,129,0.4)]',
    gradient: 'from-emerald-600 via-teal-500 to-green-700',
    btnBg: 'bg-emerald-600 hover:bg-emerald-500',
  },
  {
    id: 'gold',
    name: 'Golden Aura',
    badge: 'LUXURY',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    gradient: 'from-amber-500 via-yellow-500 to-orange-600',
    btnBg: 'bg-amber-500 hover:bg-amber-400 text-black',
  },
];

interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
  badge?: 'CREATOR' | 'VIP' | 'MEMBER' | 'MOD' | 'PRO';
  userLiked?: boolean;
}

interface ReactionBubble {
  id: number;
  emoji: string;
  x: number;
}

interface YoutubeViewProps {
  onSetPipVideo?: (video: YouTubeVideo | null) => void;
  activePipVideoId?: string;
  initialSelectedVideo?: YouTubeVideo | null;
}

export const YoutubeView: React.FC<YoutubeViewProps> = ({
  onSetPipVideo,
  activePipVideoId,
  initialSelectedVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('Trending Videos');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(initialSelectedVideo || null);

  useEffect(() => {
    if (initialSelectedVideo) {
      setSelectedVideo(initialSelectedVideo);
    }
  }, [initialSelectedVideo]);
  const [miniPlayerVideo, setMiniPlayerVideo] = useState<YouTubeVideo | null>(null);
  const [activeSkin, setActiveSkin] = useState<SkinTheme>('crimson');
  const [showSkinMenu, setShowSkinMenu] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showFullDesc, setShowFullDesc] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Watch Party State
  const [isWatchParty, setIsWatchParty] = useState<boolean>(false);
  const [partyRoomCode, setPartyRoomCode] = useState<string>('YUNO-9821');
  const [copiedPartyCode, setCopiedPartyCode] = useState<boolean>(false);
  const [partyReactions, setPartyReactions] = useState<ReactionBubble[]>([]);

  // User Interactive State
  const [subscribedChannels, setSubscribedChannels] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('yuno_yt_subs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [savedVideoIds, setSavedVideoIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_yt_saved');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [likedVideoIds, setLikedVideoIds] = useState<Record<string, boolean>>({});
  const [dislikedVideoIds, setDislikedVideoIds] = useState<Record<string, boolean>>({});
  const [activeTabMode, setActiveTabMode] = useState<'home' | 'saved' | 'history'>('home');
  const [watchHistory, setWatchHistory] = useState<YouTubeVideo[]>([]);

  // Comments / Live Chat state
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [newCommentText, setNewCommentText] = useState<string>('');

  const currentSkin = SKINS.find((s) => s.id === activeSkin) || SKINS[0];

  // Persist Subscriptions
  useEffect(() => {
    try {
      localStorage.setItem('yuno_yt_subs', JSON.stringify(subscribedChannels));
    } catch (e) {
      console.error(e);
    }
  }, [subscribedChannels]);

  // Persist Saved
  useEffect(() => {
    try {
      localStorage.setItem('yuno_yt_saved', JSON.stringify(savedVideoIds));
    } catch (e) {
      console.error(e);
    }
  }, [savedVideoIds]);

  // Decode HTML entities
  const decodeHtml = (text: string) => {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Date Formatter
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  // Initial Fetch Videos
  const fetchVideos = async (queryToSearch: string, isCategory = false) => {
    setIsLoading(true);
    setError(null);
    setApiNotice(null);
    setNextPageToken(null);

    try {
      const targetQuery = queryToSearch.trim() || 'Trending';
      const displayLabel = queryToSearch.trim() ? queryToSearch.trim() : 'Trending Videos';

      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(targetQuery)}&maxResults=30`);
      const data = await res.json();

      if (data.success && Array.isArray(data.videos)) {
        setVideos(data.videos);
        setActiveQuery(displayLabel);
        setNextPageToken(data.nextPageToken || null);
        if (data.message) {
          setApiNotice(data.message);
        }
      } else {
        setError(data.error || 'Failed to fetch YouTube videos.');
      }
    } catch (err: any) {
      console.error('YouTube search error:', err);
      setError('Network error searching YouTube. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load More / Pagination
  const fetchMoreVideos = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const queryToSearch = activeQuery === 'Trending Videos' ? 'Trending' : activeQuery;
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(queryToSearch)}&pageToken=${encodeURIComponent(nextPageToken)}&maxResults=20`);
      const data = await res.json();

      if (data.success && Array.isArray(data.videos)) {
        const existingIds = new Set(videos.map(v => v.videoId));
        const newVids = data.videos.filter((v: YouTubeVideo) => !existingIds.has(v.videoId));
        setVideos(prev => [...prev, ...newVids]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (err) {
      console.error('Error fetching more videos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVideos('');
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSelectedVideo(null);
    setSelectedCategory('All');
    setActiveTabMode('home');
    fetchVideos(searchQuery.trim());
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setSelectedVideo(null);
    setActiveTabMode('home');
    if (category === 'All') {
      setSearchQuery('');
      fetchVideos('');
    } else {
      setSearchQuery(category);
      fetchVideos(category, true);
    }
  };

  const handleSelectVideo = (video: YouTubeVideo) => {
    // Dismiss mini player if it was the same video
    if (miniPlayerVideo?.videoId === video.videoId) {
      setMiniPlayerVideo(null);
    }
    setSelectedVideo(video);
    setShowFullDesc(false);

    // Add to history
    setWatchHistory(prev => {
      const filtered = prev.filter(v => v.videoId !== video.videoId);
      return [video, ...filtered];
    });

    // Seed default comments for video if empty
    if (!commentsMap[video.videoId]) {
      setCommentsMap(prev => ({
        ...prev,
        [video.videoId]: [
          {
            id: 'c1',
            author: 'Aura_Gamer99',
            avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Aura',
            text: 'This video stream is pure gold! The quality and audio clarity is insane 🔥',
            timeAgo: '2m ago',
            likes: 42,
            badge: 'VIP'
          },
          {
            id: 'c2',
            author: 'CodeMaster_Yunø',
            avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Dev',
            text: 'Yunø Live Chat feels so smooth! Exactly what I wanted for live watch parties.',
            timeAgo: '5m ago',
            likes: 18,
            badge: 'CREATOR'
          },
          {
            id: 'c3',
            author: 'Pixel_Vibes',
            avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Pixel',
            text: 'Loving the custom player skin and instant reactions! 🚀🎉',
            timeAgo: '12m ago',
            likes: 95,
            badge: 'PRO'
          }
        ]
      }));
    }
  };

  // Enable Mini Player
  const handleMinimizePlayer = () => {
    if (selectedVideo) {
      setMiniPlayerVideo(selectedVideo);
      setSelectedVideo(null);
    }
  };

  // Restore video from Mini Player
  const handleMaximizeMiniPlayer = () => {
    if (miniPlayerVideo) {
      setSelectedVideo(miniPlayerVideo);
      setMiniPlayerVideo(null);
    }
  };

  const triggerPartyReaction = (emoji: string) => {
    const newReaction: ReactionBubble = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10
    };
    setPartyReactions(prev => [...prev.slice(-15), newReaction]);
  };

  const toggleSubscribe = (channelTitle: string) => {
    setSubscribedChannels(prev => ({
      ...prev,
      [channelTitle]: !prev[channelTitle]
    }));
  };

  const toggleSaveVideo = (videoId: string) => {
    setSavedVideoIds(prev =>
      prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
    );
  };

  const handleLike = (videoId: string) => {
    setLikedVideoIds(prev => ({ ...prev, [videoId]: !prev[videoId] }));
    if (dislikedVideoIds[videoId]) {
      setDislikedVideoIds(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleDislike = (videoId: string) => {
    setDislikedVideoIds(prev => ({ ...prev, [videoId]: !prev[videoId] }));
    if (likedVideoIds[videoId]) {
      setLikedVideoIds(prev => ({ ...prev, [videoId]: false }));
    }
  };

  const handleAddComment = (videoId: string) => {
    if (!newCommentText.trim()) return;
    const newComment: CommentItem = {
      id: Date.now().toString(),
      author: 'You (Yunø Member)',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=YouUser',
      text: newCommentText.trim(),
      timeAgo: 'Just now',
      likes: 0,
      badge: 'PRO'
    };

    setCommentsMap(prev => ({
      ...prev,
      [videoId]: [newComment, ...(prev[videoId] || [])]
    }));
    setNewCommentText('');
  };

  const handleCopyLink = (videoId: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPartyCode = () => {
    navigator.clipboard.writeText(partyRoomCode);
    setCopiedPartyCode(true);
    setTimeout(() => setCopiedPartyCode(false), 2000);
  };

  // Get displayed videos based on tab
  const getDisplayedVideos = () => {
    if (activeTabMode === 'saved') {
      return videos.filter(v => savedVideoIds.includes(v.videoId));
    }
    if (activeTabMode === 'history') {
      return watchHistory;
    }
    return videos;
  };

  const displayedVideos = getDisplayedVideos();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto min-h-screen text-zinc-100 pb-24 relative">
      
      {/* FLOATING MINI PLAYER (PICTURE-IN-PICTURE) */}
      <AnimatePresence>
        {miniPlayerVideo && !selectedVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className={`fixed bottom-6 right-6 w-80 md:w-96 z-50 bg-zinc-950/95 border ${currentSkin.accentBorder} rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl ${currentSkin.glow}`}
          >
            <div className="flex items-center justify-between p-3 bg-zinc-900/90 border-b border-zinc-800">
              <div className="flex items-center space-x-2 truncate pr-2">
                <span className={`w-2.5 h-2.5 rounded-full ${currentSkin.accentBg} animate-pulse`} />
                <span className="text-xs font-black text-white truncate">{decodeHtml(miniPlayerVideo.title)}</span>
              </div>

              <div className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={handleMaximizeMiniPlayer}
                  title="Expand Fullscreen"
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setMiniPlayerVideo(null)}
                  title="Close Mini Player"
                  className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="w-full aspect-video bg-black relative">
              <iframe
                src={`https://www.youtube.com/embed/${miniPlayerVideo.videoId}?autoplay=1&enablejsapi=1`}
                title={miniPlayerVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
            
            <div className="p-3 bg-zinc-950/90 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 truncate">{miniPlayerVideo.channelTitle}</span>
              <button
                onClick={handleMaximizeMiniPlayer}
                className={`font-extrabold ${currentSkin.accentText} hover:underline flex items-center space-x-1`}
              >
                <span>Expand</span>
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YOUTUBE TOP NAVBAR & SEARCH */}
      <div className="bg-zinc-950/95 border-2 border-dashed border-red-500/40 handmade-box p-5 shadow-2xl backdrop-blur-xl sticky top-2 z-40 transition-all">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => { setSelectedVideo(null); setActiveTabMode('home'); }}
          >
            <div className="w-11 h-11 handmade-box bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-3">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-sketch font-bold text-amber-100 tracking-tight flex items-center gap-1">
                  Yunø<span className="text-red-500 font-extrabold">Tube</span>
                </h1>
                <span className="handmade-stamp text-[9px] py-0 px-1.5 text-red-400">HANDMADE</span>
              </div>
              <p className="text-[11px] font-handwriting text-amber-200/70">Hand-curated streaming player for YouTube Data API v3</p>
            </div>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full md:w-auto flex-1 max-w-2xl relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search YouTube videos (e.g. Minecraft, Lofi, Gaming, Tech)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 pr-28 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:${currentSkin.accentBorder} focus:ring-2 focus:ring-zinc-700 transition-all shadow-inner`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-24 text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className={`absolute right-1.5 px-4 py-2 ${currentSkin.btnBg} text-white font-bold text-xs rounded-xl active:scale-95 shadow-md transition-all flex items-center space-x-1.5`}
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* User Nav Modes & Theme Skin Picker */}
          <div className="flex items-center space-x-2">
            
            {/* Skin Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSkinMenu(!showSkinMenu)}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center space-x-1.5 transition-all"
              >
                <Palette className={`w-3.5 h-3.5 ${currentSkin.accentText}`} />
                <span className="hidden sm:inline">{currentSkin.name}</span>
              </button>

              <AnimatePresence>
                {showSkinMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1 backdrop-blur-2xl"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                      Yunø Tube Skins
                    </div>
                    {SKINS.map((skin) => (
                      <button
                        key={skin.id}
                        onClick={() => {
                          setActiveSkin(skin.id);
                          setShowSkinMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeSkin === skin.id
                            ? 'bg-zinc-800 text-white border border-zinc-700'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${skin.accentBg}`} />
                          <span>{skin.name}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {skin.badge}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { setActiveTabMode('home'); setSelectedVideo(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'home'
                  ? `${currentSkin.accentBg} text-white shadow-lg`
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => { setActiveTabMode('saved'); setSelectedVideo(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 relative ${
                activeTabMode === 'saved'
                  ? `${currentSkin.accentBg} text-white shadow-lg`
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5 text-rose-400" />
              <span>Saved</span>
              {savedVideoIds.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {savedVideoIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTabMode('history'); setSelectedVideo(null); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTabMode === 'history'
                  ? `${currentSkin.accentBg} text-white shadow-lg`
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>History</span>
            </button>
          </div>
        </div>

        {/* YOUTUBE CATEGORY PILLS BAR */}
        {!selectedVideo && activeTabMode === 'home' && (
          <div className="pt-4 mt-2 border-t border-zinc-800/60 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {CATEGORY_PILLS.map((pill) => {
              const isActive = selectedCategory === pill;
              return (
                <button
                  key={pill}
                  onClick={() => handleCategoryClick(pill)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-md shadow-white/10'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/80'
                  }`}
                >
                  {pill}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* API KEY NOTICE IF FALLBACK */}
      {apiNotice && !selectedVideo && (
        <div className="p-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{apiNotice}</span>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="p-6 bg-red-950/30 border border-red-500/30 rounded-3xl text-center space-y-3">
          <p className="text-sm text-red-300 font-medium">{error}</p>
          <button
            onClick={() => fetchVideos(activeQuery)}
            className={`px-4 py-2 rounded-xl ${currentSkin.btnBg} text-white font-bold text-xs transition-colors`}
          >
            Retry Search
          </button>
        </div>
      )}

      {/* EMBEDDED PLAYER WATCH PAGE */}
      {selectedVideo ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="space-y-6"
        >
          {/* Back & Mini-Player Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedVideo(null)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold transition-all shadow-lg hover:border-zinc-700"
              >
                <ArrowLeft className={`w-4 h-4 ${currentSkin.accentText}`} />
                <span>Back to Videos Grid</span>
              </button>

              <button
                onClick={handleMinimizePlayer}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold transition-all shadow-lg hover:border-zinc-700"
              >
                <Minimize2 className={`w-4 h-4 ${currentSkin.accentText}`} />
                <span>Dock Mini Player</span>
              </button>
            </div>

            {/* Watch Party Toggle & Room Code */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsWatchParty(!isWatchParty)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                  isWatchParty
                    ? `${currentSkin.accentBg} text-white ${currentSkin.glow}`
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{isWatchParty ? 'Watch Party Active' : 'Start Watch Party'}</span>
              </button>

              {isWatchParty && (
                <button
                  onClick={handleCopyPartyCode}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white"
                >
                  {copiedPartyCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  <span>{partyRoomCode}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Video & Details (2 Cols) */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Responsive 16:9 Video Frame with floating reaction particles */}
              <div className={`relative w-full aspect-video bg-black rounded-3xl overflow-hidden border ${currentSkin.accentBorder} shadow-2xl ${currentSkin.glow}`}>
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1&enablejsapi=1`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />

                {/* Floating Watch Party Emoji Animations */}
                <AnimatePresence>
                  {partyReactions.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 1, y: 200, scale: 0.5 }}
                      animate={{ opacity: 0, y: -80, scale: 1.8 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.2, ease: 'easeOut' }}
                      style={{ left: `${r.x}%` }}
                      className="absolute bottom-4 text-3xl pointer-events-none z-30 filter drop-shadow-lg"
                    >
                      {r.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Watch Party Live Floating Reactions Bar */}
                {isWatchParty && (
                  <div className="absolute bottom-3 left-3 z-30 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-400">REACT:</span>
                    {['🎉', '🔥', '🚀', '❤️', '👏', '😂'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => triggerPartyReaction(emoji)}
                        className="hover:scale-130 transition-transform text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title, Channel Header & Actions */}
              <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-6 space-y-5">
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                  {decodeHtml(selectedVideo.title)}
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  {/* Channel Meta & Subscribe */}
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedVideo.channelAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedVideo.channelTitle)}`}
                      alt={selectedVideo.channelTitle}
                      className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center space-x-1">
                        <span>{selectedVideo.channelTitle}</span>
                        <CheckCircle2 className={`w-4 h-4 ${currentSkin.accentText}`} />
                      </h4>
                      <span className="text-[11px] text-zinc-400 block">2.4M subscribers</span>
                    </div>

                    <button
                      onClick={() => toggleSubscribe(selectedVideo.channelTitle)}
                      className={`ml-3 px-4 py-2 rounded-full text-xs font-extrabold transition-all ${
                        subscribedChannels[selectedVideo.channelTitle]
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                          : `${currentSkin.btnBg} text-white shadow-lg`
                      }`}
                    >
                      {subscribedChannels[selectedVideo.channelTitle] ? 'Subscribed' : 'Subscribe'}
                    </button>
                  </div>

                  {/* Actions Bar (Like/Dislike, Save, Share) */}
                  <div className="flex items-center space-x-2">
                    {/* Like / Dislike Group */}
                    <div className="flex items-center rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <button
                        onClick={() => handleLike(selectedVideo.videoId)}
                        className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold transition-colors ${
                          likedVideoIds[selectedVideo.videoId] ? `${currentSkin.accentText} bg-white/5` : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{likedVideoIds[selectedVideo.videoId] ? '143K' : '142K'}</span>
                      </button>
                      <div className="w-[1px] h-4 bg-zinc-800" />
                      <button
                        onClick={() => handleDislike(selectedVideo.videoId)}
                        className={`px-3 py-2 text-xs font-bold transition-colors ${
                          dislikedVideoIds[selectedVideo.videoId] ? `${currentSkin.accentText} bg-white/5` : 'text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bookmark / Save */}
                    <button
                      onClick={() => toggleSaveVideo(selectedVideo.videoId)}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                        savedVideoIds.includes(selectedVideo.videoId)
                          ? `bg-rose-500/20 text-rose-400 border-rose-500/40`
                          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{savedVideoIds.includes(selectedVideo.videoId) ? 'Saved' : 'Save'}</span>
                    </button>

                    {/* PiP Floating Window Popout Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedVideo && onSetPipVideo) {
                          onSetPipVideo(selectedVideo);
                          setSelectedVideo(null);
                        }
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-xs font-extrabold text-red-400 transition-all shadow-md shadow-red-500/10"
                      title="Pop out video into floating Picture-in-Picture window"
                    >
                      <Tv className="w-3.5 h-3.5 text-red-400" />
                      <span>PiP Popout</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => handleCopyLink(selectedVideo.videoId)}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Share</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center space-x-1 px-3 py-2 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 text-xs font-bold transition-colors`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Description Card */}
                <div className="bg-zinc-900/80 p-4 rounded-2xl text-xs text-zinc-300 space-y-2 leading-relaxed">
                  <div className="flex items-center space-x-3 text-xs font-bold text-white pb-1">
                    <span>{selectedVideo.viewCount || '1.2M views'}</span>
                    <span>•</span>
                    <span>{formatDate(selectedVideo.publishedAt)}</span>
                  </div>
                  <p className={showFullDesc ? '' : 'line-clamp-3'}>
                    {decodeHtml(selectedVideo.description) || 'No video description provided by channel.'}
                  </p>
                  {selectedVideo.description.length > 100 && (
                    <button
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className={`${currentSkin.accentText} font-bold hover:underline block pt-1`}
                    >
                      {showFullDesc ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>

                {/* YUNØ CUSTOM LIVE CHAT & COMMENTS AESTHETIC (NOT DISCORD) */}
                <div className="pt-4 border-t border-zinc-800/80 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-xl bg-zinc-900 border ${currentSkin.accentBorder} flex items-center justify-center`}>
                        <MessageSquare className={`w-4 h-4 ${currentSkin.accentText}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white tracking-tight flex items-center space-x-2">
                          <span>Yunø Live Chat</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        </h3>
                        <p className="text-[10px] text-zinc-400">Stream community discussion & instant reactions</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800 text-xs font-mono">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">1,842 Live</span>
                    </div>
                  </div>

                  {/* Add Comment / Live Chat Input */}
                  <div className="bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80 space-y-3 shadow-inner">
                    <div className="flex items-start space-x-3">
                      <img
                        src="https://api.dicebear.com/7.x/identicon/svg?seed=YouUser"
                        alt="You"
                        className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0"
                      />
                      <div className="flex-1 space-y-2">
                        <textarea
                          rows={2}
                          placeholder="Type a message or live reaction on Yunø Tube..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleAddComment(selectedVideo.videoId);
                            }
                          }}
                          className={`w-full bg-zinc-950/80 border border-zinc-800 focus:${currentSkin.accentBorder} rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none transition-all`}
                        />
                        <div className="flex items-center justify-between">
                          {/* Quick Emoji Bar */}
                          <div className="flex items-center space-x-1.5 text-xs text-zinc-400">
                            {['🔥', '❤️', '🚀', '💯', '👏'].map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => setNewCommentText((prev) => prev + ' ' + e)}
                                className="p-1 hover:scale-125 transition-transform"
                              >
                                {e}
                              </button>
                            ))}
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setNewCommentText('')}
                              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white font-medium"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddComment(selectedVideo.videoId)}
                              disabled={!newCommentText.trim()}
                              className={`px-4 py-1.5 rounded-xl ${currentSkin.btnBg} disabled:opacity-40 text-white font-extrabold text-xs shadow-lg flex items-center space-x-1 transition-all`}
                            >
                              <Send className="w-3 h-3" />
                              <span>Post</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comments / Chat Feed List */}
                  <div className="space-y-3 pt-1">
                    {(commentsMap[selectedVideo.videoId] || []).map((cmt) => (
                      <div
                        key={cmt.id}
                        className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="relative">
                              <img
                                src={cmt.avatar}
                                alt={cmt.author}
                                className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 object-cover"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-xs text-white">{cmt.author}</span>
                              {cmt.badge && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                                  cmt.badge === 'CREATOR'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : cmt.badge === 'VIP'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                }`}>
                                  {cmt.badge}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] text-zinc-500 font-mono">{cmt.timeAgo}</span>
                        </div>

                        <p className="text-xs text-zinc-200 leading-relaxed pl-10">
                          {cmt.text}
                        </p>

                        <div className="flex items-center space-x-4 text-zinc-500 pl-10 text-[11px] font-medium pt-1">
                          <button className="flex items-center space-x-1 hover:text-white transition-colors">
                            <ThumbsUp className="w-3 h-3 text-zinc-400" />
                            <span>{cmt.likes}</span>
                          </button>
                          <button className="hover:text-white transition-colors">Reply</button>
                          <button className="hover:text-white transition-colors opacity-0 group-hover:opacity-100">Report</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar / Up Next Recommended Videos */}
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl space-y-3">
                <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
                  <Flame className={`w-4 h-4 ${currentSkin.accentText}`} />
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">UP NEXT / RECOMMENDED</h3>
                </div>

                <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                  {videos
                    .filter((v) => v.videoId !== selectedVideo.videoId)
                    .map((item) => (
                      <div
                        key={item.videoId}
                        onClick={() => handleSelectVideo(item)}
                        className={`flex space-x-3 p-2 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900 border border-transparent hover:${currentSkin.accentBorder} cursor-pointer transition-all group`}
                      >
                        <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-white">
                            {item.duration || '12:00'}
                          </div>
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                            <Play className="w-5 h-5 text-white opacity-80 group-hover:scale-125 transition-transform" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 py-0.5">
                          <h4 className={`text-xs font-bold text-white line-clamp-2 leading-snug group-hover:${currentSkin.accentText} transition-colors`}>
                            {decodeHtml(item.title)}
                          </h4>
                          <span className="text-[10px] text-zinc-400 block truncate">{item.channelTitle}</span>
                          <span className="text-[10px] text-zinc-500 block">{item.viewCount || '250K views'}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* YOUTUBE VIDEO GRID RESULTS VIEW */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
                {activeTabMode === 'home' && <span>Results for "{activeQuery}"</span>}
                {activeTabMode === 'saved' && <span>Saved Watch Later Videos</span>}
                {activeTabMode === 'history' && <span>Recently Watched History</span>}
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-mono">
                  {displayedVideos.length} videos
                </span>
              </h2>
            </div>
          </div>

          {isLoading ? (
            /* Loading Skeleton Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-3 space-y-3 animate-pulse">
                  <div className="w-full aspect-video bg-zinc-900 rounded-2xl" />
                  <div className="h-4 bg-zinc-900 rounded-lg w-3/4" />
                  <div className="h-3 bg-zinc-900 rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedVideos.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center space-y-4 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl p-8 max-w-xl mx-auto">
              <Tv className="w-12 h-12 text-zinc-700 mx-auto" />
              <h4 className="text-base font-bold text-zinc-300">
                {activeTabMode === 'saved' ? 'No saved videos yet' : activeTabMode === 'history' ? 'No watch history yet' : `No videos found for "${activeQuery}"`}
              </h4>
              <p className="text-xs text-zinc-500">
                {activeTabMode === 'saved' ? 'Click the Save button on any video player to bookmark it for later.' : 'Videos you watch on Yunø Tube will appear here.'}
              </p>
              <button
                onClick={() => { setActiveTabMode('home'); handleCategoryClick('All'); }}
                className={`px-4 py-2 rounded-xl ${currentSkin.btnBg} text-white font-bold text-xs transition-colors`}
              >
                Browse All Videos
              </button>
            </div>
          ) : (
            /* Video Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {displayedVideos.map((video) => (
                <motion.div
                  key={video.videoId}
                  onClick={() => handleSelectVideo(video)}
                  whileHover={{ y: -4 }}
                  className={`group bg-zinc-950/90 border border-zinc-800/80 hover:${currentSkin.accentBorder} rounded-3xl p-3 cursor-pointer shadow-xl transition-all duration-300 flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    {/* Thumbnail Frame */}
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className={`w-12 h-12 rounded-full ${currentSkin.accentBg} text-white flex items-center justify-center shadow-lg ${currentSkin.glow} scale-90 group-hover:scale-100 transition-transform`}>
                          <Play className="w-5 h-5 ml-0.5 fill-white" />
                        </div>
                      </div>

                      {/* Video Duration / Live Badge */}
                      <span className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white ${
                        video.isLive ? 'bg-red-600 animate-pulse' : 'bg-black/80 border border-zinc-700'
                      }`}>
                        {video.duration || '10:00'}
                      </span>
                    </div>

                    {/* Metadata & Channel Avatar */}
                    <div className="flex items-start space-x-2.5 px-0.5">
                      <img
                        src={video.channelAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(video.channelTitle)}`}
                        alt={video.channelTitle}
                        className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className={`text-xs font-black text-white line-clamp-2 leading-snug group-hover:${currentSkin.accentText} transition-colors`}>
                          {decodeHtml(video.title)}
                        </h4>

                        <p className="text-[11px] font-medium text-zinc-400 flex items-center space-x-1 truncate">
                          <span className="truncate">{video.channelTitle}</span>
                          <CheckCircle2 className={`w-3 h-3 ${currentSkin.accentText} flex-shrink-0`} />
                        </p>

                        <div className="text-[10px] text-zinc-500 flex items-center space-x-1">
                          <span>{video.viewCount || '500K views'}</span>
                          <span>•</span>
                          <span>{formatDate(video.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 px-1 font-mono">
                    <span className="text-zinc-600 font-bold">HD STREAM</span>
                    <span className={`${currentSkin.accentText} font-bold group-hover:underline`}>WATCH →</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* LOAD MORE / NEXT PAGE TOKEN BUTTON */}
          {nextPageToken && !isLoading && activeTabMode === 'home' && (
            <div className="pt-6 text-center">
              <button
                onClick={fetchMoreVideos}
                disabled={isLoadingMore}
                className="px-8 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-extrabold text-xs transition-all shadow-xl hover:border-zinc-500 flex items-center space-x-2 mx-auto"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className={`w-4 h-4 animate-spin ${currentSkin.accentText}`} />
                    <span>Loading Next YouTube Page...</span>
                  </>
                ) : (
                  <>
                    <Plus className={`w-4 h-4 ${currentSkin.accentText}`} />
                    <span>Load More YouTube Videos</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
