import React, { useState } from 'react';
import {
  Search as MagnifyingGlass,
  Gamepad2 as GameController,
  Sparkles as Sparkle,
  Film as FilmStrip,
  Music as MusicNotes,
  Settings as GearSix,
  ExternalLink as ArrowSquareOut,
} from 'lucide-react';
import { DiorLogo } from './DiorLogo';

interface BrowserHomeViewProps {
  onNavigateProtocol: (url: string) => void;
  onSearch: (query: string, engine: string) => void;
}

export const BrowserHomeView: React.FC<BrowserHomeViewProps> = ({
  onNavigateProtocol,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<'brave' | 'google' | 'duckduckgo' | 'bing'>('brave');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;

    if (clean.startsWith('dior://') || clean.startsWith('http://') || clean.startsWith('https://')) {
      onNavigateProtocol(clean);
    } else {
      onSearch(clean, searchEngine);
    }
  };

  const DIOR_PROTOCOLS = [
    { proto: 'dior://g', label: 'Games', icon: GameController, desc: 'Web games & arcade' },
    { proto: 'dior://a', label: 'AI Assistant', icon: Sparkle, desc: 'Neural AI chat' },
    { proto: 'dior://movies', label: 'Cinema', icon: FilmStrip, desc: 'Cinema & streaming' },
    { proto: 'dior://music', label: 'Music', icon: MusicNotes, desc: 'Player & lyrics' },
  ];

  const QUICK_BOOKMARKS = [
    { title: 'YouTube', domain: 'youtube.com', url: 'https://youtube.com' },
    { title: 'Discord', domain: 'discord.com', url: 'https://discord.com/app' },
    { title: 'GitHub', domain: 'github.com', url: 'https://github.com' },
    { title: 'Reddit', domain: 'reddit.com', url: 'https://reddit.com' },
    { title: 'Twitch', domain: 'twitch.tv', url: 'https://twitch.tv' },
    { title: 'Wikipedia', domain: 'wikipedia.org', url: 'https://wikipedia.org' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#1e2022] text-[#e4e6eb] px-4 py-16 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Authentic Dior Wordmark Header */}
        <div className="flex flex-col items-center mb-8 select-none">
          <DiorLogo variant="wordmark" size="xl" className="tracking-[0.4em] mb-2" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-px bg-[#383c41]" />
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-400">
              BROWSER
            </span>
            <span className="w-6 h-px bg-[#383c41]" />
          </div>
        </div>

        {/* Omnibox Search Field */}
        <form onSubmit={handleSubmit} className="w-full mb-8">
          <div className="flex items-center bg-[#25282a] border border-[#383c41] focus-within:border-[#5a6068] rounded">
            <div className="pl-3.5 text-zinc-400">
              <MagnifyingGlass size={16} />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search or type a URL (or yuno://g, yuno://a)...`}
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-transparent px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />

            <div className="pr-2.5 flex items-center gap-1.5">
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value as any)}
                className="bg-[#1e2022] border border-[#383c41] text-zinc-300 text-[11px] px-2 py-1 rounded focus:outline-none cursor-pointer"
              >
                <option value="brave">Brave</option>
                <option value="google">Google</option>
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="bing">Bing</option>
              </select>
            </div>
          </div>
        </form>

        {/* The 4 Feature Protocols */}
        <div className="w-full mb-8">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center justify-between">
            <span>Protocols</span>
            <span className="font-mono text-[10px] text-zinc-400">dior://</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIOR_PROTOCOLS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.proto}
                  onClick={() => onNavigateProtocol(p.proto)}
                  className="p-3 bg-[#25282a] hover:bg-[#2b2e31] border border-[#383c41] hover:border-[#4d5258] rounded transition-colors text-left flex flex-col gap-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-200">
                      {p.proto}
                    </span>
                    <Icon size={14} className="text-zinc-400 group-hover:text-zinc-200" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">{p.label}</span>
                  <span className="text-[10px] text-zinc-400 truncate">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Web Bookmarks */}
        <div className="w-full">
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-2.5">
            Quick Links
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {QUICK_BOOKMARKS.map((b) => (
              <button
                key={b.title}
                onClick={() => onNavigateProtocol(b.url)}
                className="p-2.5 bg-[#25282a] hover:bg-[#2b2e31] border border-[#383c41] hover:border-[#4d5258] rounded transition-colors text-left flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-medium text-zinc-200">{b.title}</div>
                  <div className="text-[10px] text-zinc-400">{b.domain}</div>
                </div>
                <ArrowSquareOut size={13} className="text-zinc-400 group-hover:text-zinc-200" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserHomeView;
