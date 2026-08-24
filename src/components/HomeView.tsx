import React, { useState } from 'react';
import { NavTab } from '../types';
import {
  MagnifyingGlass as Search,
  GameController as Gamepad2,
  FilmStrip as Film,
  Television as Tv,
  ChatCircleText as MessageSquare,
  Globe,
  BookOpen,
  ArrowClockwise as RotateCw,
  LinkSimple as Link2,
  MusicNotes as Music,
  SlidersHorizontal as Sliders,
  ArrowSquareOut as ExternalLink,
} from '@phosphor-icons/react';
import { BibleVerse, getRandomBibleVerse } from '../data/bibleVerses';

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
  const [proxyInput, setProxyInput] = useState('');
  const [bibleVerse, setBibleVerse] = useState<BibleVerse>(() => getRandomBibleVerse());

  const handleNextVerse = () => {
    setBibleVerse(getRandomBibleVerse());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proxyInput.trim()) return;
    if (onLaunchProxy) {
      onLaunchProxy(proxyInput.trim());
    } else {
      onNavigate('proxy');
    }
  };

  const quickNav = [
    { id: 'proxy' as NavTab, label: 'Proxy Browser', icon: Globe, desc: 'Web navigation' },
    { id: 'games' as NavTab, label: 'Game Library', icon: Gamepad2, desc: 'Playable web titles' },
    { id: 'movies' as NavTab, label: 'Media Stream', icon: Film, desc: 'Shows and movies' },
    { id: 'youtube' as NavTab, label: 'Video Player', icon: Tv, desc: 'Video search & stream' },
    { id: 'community' as NavTab, label: 'Community Chat', icon: MessageSquare, desc: 'Direct rooms & calls' },
    { id: 'music' as NavTab, label: 'Music Library', icon: Music, desc: 'Tracks & lyrics' },
    { id: 'links' as NavTab, label: 'Link Generator', icon: Link2, desc: 'Active mirror links' },
    { id: 'settings' as NavTab, label: 'Settings', icon: Sliders, desc: 'Preferences & profile' },
  ];

  const searchPresets = [
    { label: 'Google', query: 'https://google.com' },
    { label: 'YouTube', query: 'https://youtube.com' },
    { label: 'Discord', query: 'https://discord.com' },
    { label: 'Wikipedia', query: 'https://wikipedia.org' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pt-2 pb-12 text-zinc-100">
      
      {/* Top Brand & Omnibar Search Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#111115] border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-5">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-white tracking-tight">Yuno Workspace</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-zinc-400">Web applications, tools, and media platform</p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Connected</span>
          </div>
        </div>

        {/* Omnibar Search Form */}
        <form onSubmit={handleSearch} className="space-y-2.5">
          <div className="flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-zinc-600 rounded-xl px-3.5 py-2 transition-colors">
            <Search className="w-4 h-4 text-zinc-400 mr-2.5 flex-shrink-0" />
            <input
              type="text"
              value={proxyInput}
              onChange={(e) => setProxyInput(e.target.value)}
              placeholder="Enter a web URL (e.g. google.com) or search term..."
              className="w-full bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer flex-shrink-0"
            >
              Open URL
            </button>
          </div>

          {/* Quick Preset Queries */}
          <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
            <span className="text-[11px] text-zinc-500 mr-1 font-mono">Quick launch:</span>
            {searchPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setProxyInput(preset.query);
                  if (onLaunchProxy) {
                    onLaunchProxy(preset.query);
                  } else {
                    onNavigate('proxy');
                  }
                }}
                className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Quick Services Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="p-4 rounded-xl bg-[#111115] hover:bg-[#18181f] border border-zinc-800 hover:border-zinc-700 text-left transition-all group flex flex-col justify-between h-28 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-200 group-hover:text-white block">
                  {item.label}
                </span>
                <span className="text-[11px] text-zinc-500 block truncate">
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Layout: Scripture & Mirror Finder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Scripture Card */}
        <div className="p-5 rounded-2xl bg-[#111115] border border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-200">Daily Scripture</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                  {bibleVerse.translation || 'NIV'}
                </span>
                {bibleVerse.theme && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300">
                    {bibleVerse.theme}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 italic leading-relaxed">
              "{bibleVerse.text}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 font-mono">
              {bibleVerse.reference}
            </span>
            <button
              onClick={handleNextVerse}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Next Verse</span>
            </button>
          </div>
        </div>

        {/* Link Finder Fast Access Card */}
        <div className="p-5 rounded-2xl bg-[#111115] border border-zinc-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Link2 className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-200">Mirror Link Generator</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generate direct web mirrors and proxy endpoints with authenticated tokens.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-500">Configured</span>
            <button
              onClick={() => onNavigate('links')}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
            >
              Open Links
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
