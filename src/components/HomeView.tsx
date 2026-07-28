import React, { useState, useEffect } from 'react';
import { NavTab, MusicTrack } from '../types';
import { WeatherWidget } from './WeatherWidget';
import {
  Image,
  Sparkles,
  Gamepad2,
  Bot,
  Tv,
  Film,
  Music,
  MessageSquare,
  Compass,
  Check,
  ChevronDown,
  Star,
  Flame,
  Radio,
  Sliders,
  Sun,
  Moon,
  Search,
  Globe,
  ArrowRight,
  Play,
  Pause,
  Headphones,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import autumnBg from '../assets/images/autumn_landscape_1785047200293.jpg';

interface HomeViewProps {
  onNavigate: (tab: NavTab) => void;
  onLaunchProxy?: (urlOrQuery: string) => void;
  onSelectMovie?: (id: string) => void;
  onSelectGame?: (id: string) => void;
  onPlayTrack?: (track: MusicTrack) => void;
  currentTrack?: MusicTrack | null;
  isPlaying?: boolean;
  currentWallpaper?: string;
}

interface WallpaperOption {
  id: string;
  name: string;
  url: string;
  gradient?: string;
}

const BIBLE_VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?", reference: "Psalm 27:1" },
  { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" },
  { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", reference: "Isaiah 40:31" },
  { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
  { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", reference: "Psalm 118:24" },
  { text: "Your word is a lamp for my feet, a light on my path.", reference: "Psalm 119:105" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "You are the light of the world. A town built on a hill cannot be hidden.", reference: "Matthew 5:14" },
  { text: "And now these three remain: faith, hope and love. But the greatest of these is love.", reference: "1 Corinthians 13:13" },
  { text: "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.", reference: "John 14:27" },
  { text: "Give thanks to the Lord, for he is good; his love endures forever.", reference: "Psalm 107:1" },
  { text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", reference: "Proverbs 18:10" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", reference: "Psalm 51:10" },
];

const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'autumn',
    name: 'Warm Autumn Canopy',
    url: autumnBg,
  },
  {
    id: 'cyberpunk',
    name: 'Cyber Neon City',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'cosmos',
    name: 'Midnight Stars',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'sunset',
    name: 'Golden Sunset Horizon',
    url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2000&auto=format&fit=crop',
  },
];

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchProxy,
  onPlayTrack,
  currentTrack,
  isPlaying,
  currentWallpaper,
}) => {
  const [dayStr, setDayStr] = useState<string>('Thursday');
  const [timeStr, setTimeStr] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('Popular');
  const [homeProxyInput, setHomeProxyInput] = useState<string>('');
  const [bibleVerse] = useState(() => BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)]);

  // Listening History Recommendations
  const [listenedTracks, setListenedTracks] = useState<MusicTrack[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yuno_recently_played');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setListenedTracks(parsed);
          return;
        }
      }
    } catch (e) {}

    // Fallback default popular recommendations
    setListenedTracks([
      {
        id: 'rec-1',
        songId: '289904577',
        title: 'FE!N',
        artist: 'Travis Scott ft. Playboi Carti',
        album: 'UTOPIA',
        duration: 191,
        cover: 'https://img4.kuwo.cn/star/albumcover/600/s4s47/88/3517788953.jpg',
        audioUrl: 'https://kw-api.cenguigui.cn?id=289904577&type=song&level=exhigh&format=mp3',
        lrcUrl: 'https://kw-api.cenguigui.cn?id=289904577&type=lyr&format=all',
      },
      {
        id: 'rec-2',
        songId: '69401359',
        title: 'EARFQUAKE',
        artist: 'Tyler, The Creator',
        album: 'IGOR',
        duration: 190,
        cover: 'https://img4.kuwo.cn/star/albumcover/600/51/9/1525237681.jpg',
        audioUrl: 'https://kw-api.cenguigui.cn?id=69401359&type=song&level=exhigh&format=mp3',
        lrcUrl: 'https://kw-api.cenguigui.cn?id=69401359&type=lyr&format=all',
      },
      {
        id: 'rec-3',
        songId: '360089861',
        title: 'Roommates',
        artist: 'Malcolm Todd',
        album: 'Sweet Boy',
        duration: 180,
        cover: 'https://img4.kuwo.cn/star/albumcover/600/s3s3/1/296666671.jpg',
        audioUrl: 'https://kw-api.cenguigui.cn?id=360089861&type=song&level=exhigh&format=mp3',
        lrcUrl: 'https://kw-api.cenguigui.cn?id=360089861&type=lyr&format=all',
      },
      {
        id: 'rec-4',
        songId: '6140099',
        title: 'No Role Modelz',
        artist: 'J. Cole',
        album: '2014 Forest Hills Drive',
        duration: 293,
        cover: 'https://img4.kuwo.cn/star/albumcover/600/s4s80/29/494680643.jpg',
        audioUrl: 'https://kw-api.cenguigui.cn?id=6140099&type=song&level=exhigh&format=mp3',
        lrcUrl: 'https://kw-api.cenguigui.cn?id=6140099&type=lyr&format=all',
      },
    ]);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setDayStr(now.toLocaleDateString([], { weekday: 'long' }));
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeWallpaperUrl = currentWallpaper || autumnBg;
  const isVideoWallpaper = activeWallpaperUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i) || activeWallpaperUrl.startsWith('data:video/');

  const categoryPills = [
    { id: 'Popular', label: 'Popular', action: () => setActiveCategory('Popular') },
    { id: 'Web Proxy', label: 'Web Proxy', action: () => onNavigate('proxy') },
    { id: 'Games', label: 'Games', action: () => onNavigate('games') },
    { id: 'AI Tools', label: 'AI Tools', action: () => onNavigate('ai') },
    { id: 'Yunø Tube', label: 'Yunø Tube', action: () => onNavigate('youtube') },
    { id: 'Yunø Flix', label: 'Yunø Flix', action: () => onNavigate('movies') },
    { id: 'Music', label: 'Music', action: () => onNavigate('music') },
    { id: 'Community', label: 'Community', action: () => onNavigate('community') },
  ];

  return (
    <div className="relative w-full min-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-amber-900/30 flex flex-col justify-between p-6 md:p-12 text-white select-none transition-all">
      
      {/* BACKGROUND WALLPAPER WITH SOFT ATMOSPHERIC LIGHTING */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {isVideoWallpaper ? (
          <video
            src={activeWallpaperUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center scale-105 transition-all duration-700 brightness-90 contrast-[1.05]"
          />
        ) : (
          <img
            src={activeWallpaperUrl}
            alt="Wallpaper"
            className="w-full h-full object-cover object-center scale-105 transition-all duration-700 brightness-90 contrast-[1.05]"
          />
        )}
        {/* Soft Vignette and Warm Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-amber-950/20 mix-blend-color-burn" />
      </div>

      {/* TOP BAR: CLOCK STATUS & WEATHER WIDGET */}
      <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-mono text-zinc-300 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{timeStr || '11:47 PM'}</span>
        </div>

        {/* Live Weather Widget Card */}
        <div className="w-full sm:w-auto sm:max-w-sm">
          <WeatherWidget />
        </div>
      </div>

      {/* CENTER HERO DISPLAY: DAY OF WEEK, TITLE & TAGLINE */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center my-auto py-12 space-y-3">
        
        {/* Day Name Display (e.g. "Thursday") */}
        <motion.h1
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl sm:text-7xl md:text-8xl font-extralight text-white tracking-tight font-sans drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
        >
          {dayStr}
        </motion.h1>

        {/* Randomized Bible Verse Slogan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-xl mx-auto space-y-1.5 px-4 drop-shadow-md"
        >
          <p className="text-sm sm:text-base italic text-amber-100/95 font-serif leading-relaxed">
            &quot;{bibleVerse.text}&quot;
          </p>
          <p className="text-xs font-mono tracking-widest text-amber-300/80 uppercase font-semibold">
            — {bibleVerse.reference}
          </p>
        </motion.div>

        {/* HOMEPAGE WEB PROXY SEARCH BAR */}
        <motion.form
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (homeProxyInput.trim()) {
              if (onLaunchProxy) {
                onLaunchProxy(homeProxyInput.trim());
              } else {
                onNavigate('proxy');
              }
            }
          }}
          className="w-full max-w-xl mx-auto my-4 flex items-center bg-black/60 hover:bg-black/75 backdrop-blur-2xl border border-amber-300/30 hover:border-amber-300/60 rounded-2xl p-1.5 sm:p-2 shadow-2xl transition-all group"
        >
          <div className="pl-3 pr-2 text-amber-300 flex items-center justify-center">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 group-hover:scale-110 transition-transform flex-shrink-0" />
          </div>
          <input
            type="text"
            value={homeProxyInput}
            onChange={(e) => setHomeProxyInput(e.target.value)}
            placeholder="Search the web or enter a URL..."
            className="w-full py-1.5 bg-transparent text-xs sm:text-sm text-white placeholder-zinc-300/80 focus:outline-none font-sans"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-zinc-950 font-extrabold text-xs shadow-lg transition-all flex items-center space-x-1.5 flex-shrink-0 cursor-pointer active:scale-95"
          >
            <span>Search</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.form>

        {/* CATEGORY PILLS BAR (IN PLACE OF APPS) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-4 flex flex-wrap items-center justify-center gap-2 max-w-3xl"
        >
          {categoryPills.map((pill) => {
            const isActive = activeCategory === pill.id;
            return (
              <button
                key={pill.id}
                onClick={pill.action}
                className={`px-5 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 backdrop-blur-md shadow-lg ${
                  isActive
                    ? 'bg-amber-100/90 text-zinc-950 font-bold shadow-amber-500/20 scale-105'
                    : 'bg-black/40 text-zinc-200 hover:bg-black/60 hover:text-white border border-white/10 hover:border-white/25 hover:scale-105'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </motion.div>

        {/* BASED OFF WHAT YOU LISTENED TO MUSIC RECOMMENDATIONS SECTION */}
        {listenedTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="w-full max-w-4xl mx-auto mt-10 pt-6 border-t border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Headphones className="w-4 h-4 text-amber-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Based on what you listened to
                </h3>
              </div>
              <button
                onClick={() => onNavigate('music')}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors flex items-center space-x-1"
              >
                <span>Open Music Vault</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {listenedTracks.slice(0, 4).map((track) => {
                const isThisPlaying = isPlaying && currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => onPlayTrack && onPlayTrack(track)}
                    className="group relative bg-black/50 hover:bg-black/75 backdrop-blur-xl border border-white/10 hover:border-amber-400/40 rounded-2xl p-3 transition-all duration-300 hover:scale-[1.02] cursor-pointer flex flex-col justify-between shadow-xl"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-900 mb-2.5">
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          {isThisPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};
