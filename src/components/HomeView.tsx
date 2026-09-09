import React, { useState, useEffect } from 'react';
import { NavTab } from '../types';
import {
  MagnifyingGlass as Search,
  ArrowSquareOut as ExternalLink,
  GameController,
  Sparkle,
  Globe,
  FilmStrip,
  MusicNotes,
  ChatCircleText,
  ShieldCheck,
  Lightning,
  X,
  Compass,
} from '@phosphor-icons/react';
import { addHistoryItem } from './HistoryModal';

interface HomeViewProps {
  currentWallpaper?: string;
  onNavigate: (tab: NavTab) => void;
  onLaunchProxy?: (urlOrQuery: string) => void;
  onSelectMovie?: (id: string) => void;
  onSelectGame?: (id: string) => void;
  onPlayTrack?: (track: any) => void;
  currentTrack?: any;
  isPlaying?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onLaunchProxy,
}) => {
  const [query, setQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<'proxy' | 'google' | 'duckduckgo' | 'youtube' | 'bing'>('proxy');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;

    let target = clean;
    if (searchEngine === 'google' && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      target = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
    } else if (searchEngine === 'duckduckgo' && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      target = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
    } else if (searchEngine === 'youtube' && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      target = `https://www.youtube.com/results?search_query=${encodeURIComponent(clean)}`;
    } else if (searchEngine === 'bing' && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      target = `https://www.bing.com/search?q=${encodeURIComponent(clean)}`;
    }

    addHistoryItem({
      type: 'search',
      title: clean,
      subtitle: `DIØR Web Engine (${searchEngine.toUpperCase()})`,
    });

    if (onLaunchProxy) {
      onLaunchProxy(target);
    } else {
      onNavigate('proxy');
    }
  };

  const quickLinks = [
    { label: 'YouTube', url: 'https://youtube.com' },
    { label: 'Discord', url: 'https://discord.com/app' },
    { label: 'Roblox', url: 'https://roblox.com' },
    { label: 'ChatGPT', url: 'https://chat.openai.com' },
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'Twitch', url: 'https://twitch.tv' },
    { label: 'Spotify', url: 'https://open.spotify.com' },
    { label: 'TikTok', url: 'https://tiktok.com' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-10 text-zinc-100 select-none">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
        
        {/* Brand Header */}
        <div className="space-y-1">
          <h1
            className="text-5xl sm:text-6xl font-normal tracking-[0.2em] leading-none uppercase text-zinc-100"
            style={{
              fontFamily: "'Bodoni Moda', 'Cinzel', 'Playfair Display', Georgia, serif",
            }}
          >
            DIØR
          </h1>
          <p className="text-xs text-zinc-400 font-mono tracking-wider pt-1">
            {currentTimeStr ? `${currentTimeStr} • FAST WEB PORTAL` : 'FAST WEB PORTAL'}
          </p>
        </div>

        {/* Search Omnibox */}
        <form onSubmit={handleSearch} className="w-full space-y-2.5">
          <div className="relative flex items-center bg-zinc-900 border border-zinc-700 focus-within:border-zinc-500 rounded-xl px-4 py-3 shadow-sm transition-colors">
            <Search className="w-4 h-4 text-zinc-400 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Google, DuckDuckGo or enter URL..."
              className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              autoFocus
            />
            {query.trim() && (
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Open
                </button>
              </div>
            )}
          </div>

          {/* Engine Selector Pills */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 pt-0.5 text-xs text-zinc-400">
            <span className="text-[11px] font-mono text-zinc-500 mr-1">Search:</span>
            {[
              { id: 'proxy', label: 'Direct URL' },
              { id: 'google', label: 'Google' },
              { id: 'duckduckgo', label: 'DuckDuckGo' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'bing', label: 'Bing' },
            ].map((eng) => (
              <button
                key={eng.id}
                type="button"
                onClick={() => setSearchEngine(eng.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer border ${
                  searchEngine === eng.id
                    ? 'bg-zinc-800 text-white border-zinc-600 font-medium'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {eng.label}
              </button>
            ))}
          </div>
        </form>

        {/* Clean Shortcuts Grid */}
        <div className="w-full pt-4">
          <div className="text-left mb-2.5 px-1 flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>QUICK SHORTCUTS</span>
            <span className="text-[10px] text-zinc-500">CLICK TO LAUNCH</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => {
                  setQuery(link.url);
                  if (onLaunchProxy) {
                    onLaunchProxy(link.url);
                  } else {
                    onNavigate('proxy');
                  }
                }}
                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-left transition-colors cursor-pointer flex items-center justify-between group"
              >
                <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                  {link.label}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
