import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Check, Play, Radio as Broadcast } from 'lucide-react';
import { StreamSource } from '../types';

export interface StreamServerConfig {
  id: StreamSource;
  label: string;
  badge: string;
  badgeColor: string;
  category: 'movies_tv' | 'anime' | 'both';
  description: string;
}

export const STREAM_SERVERS: StreamServerConfig[] = [
  {
    id: 'vidcore',
    label: 'VidCore',
    badge: 'AutoPlay',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    category: 'movies_tv',
    description: 'Instant auto-playing high-speed 1080p stream',
  },
  {
    id: 'vidlink_pro',
    label: 'VidLink Pro',
    badge: 'Fast HD',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    category: 'both',
    description: 'Ultra fast bufferless player with high uptime',
  },
  {
    id: 'vidfast_pro',
    label: 'VidFast Pro',
    badge: 'Direct',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    category: 'movies_tv',
    description: 'Clean direct high-bitrate video stream',
  },
  {
    id: 'vidfast_vc',
    label: 'VidFast VC',
    badge: 'AutoPlay',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    category: 'movies_tv',
    description: 'Fast auto-loading cloud mirror server',
  },
  {
    id: 'viduki',
    label: 'Viduki / StreamRip',
    badge: 'Multi-Host',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    category: 'movies_tv',
    description: 'Multi-host streaming engine with custom colors',
  },
  {
    id: 'vidsrc_to',
    label: 'VidSrc TO',
    badge: 'Classic',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    category: 'movies_tv',
    description: 'Extensive movie and TV catalog mirror',
  },
  {
    id: 'smashystream',
    label: 'SmashyStream',
    badge: 'Multi-Res',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    category: 'both',
    description: 'High-res player with subtitles and audio streams',
  },
  {
    id: 'vidlink_anime',
    label: 'VidLink Anime',
    badge: 'Sub / Dub',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    category: 'anime',
    description: 'Japanese & English anime streaming engine',
  },
  {
    id: 'streamrip_anime',
    label: 'StreamRip Anime',
    badge: 'Anime HD',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    category: 'anime',
    description: 'AniList catalog dedicated anime episode server',
  },
  {
    id: 'videasy_anime',
    label: 'PlayVideasy Anime',
    badge: 'Beta',
    badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    category: 'anime',
    description: 'Clean modern anime embed player',
  },
];

export interface StreamSourceDropdownProps {
  currentSource: StreamSource;
  onSelectSource: (source: StreamSource) => void;
  isAnime?: boolean;
  align?: 'left' | 'right';
  variant?: 'compact' | 'player';
}

export const StreamSourceDropdown: React.FC<StreamSourceDropdownProps> = ({
  currentSource,
  onSelectSource,
  isAnime = false,
  align = 'right',
  variant = 'compact',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig =
    STREAM_SERVERS.find((s) => s.id === currentSource) || STREAM_SERVERS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const moviesTvSources = STREAM_SERVERS.filter(
    (s) => s.category === 'movies_tv' || s.category === 'both'
  );
  const animeSources = STREAM_SERVERS.filter(
    (s) => s.category === 'anime' || s.category === 'both'
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 rounded-xl transition-all duration-200 border ${
          isOpen
            ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg ring-1 ring-red-500/40'
            : variant === 'player'
            ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700/80 text-zinc-200 hover:text-white px-3 py-1.5'
            : 'bg-zinc-900 hover:bg-zinc-800/90 border-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5'
        } text-xs font-mono select-none`}
      >
        <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
        <span className="text-[11px] font-bold text-zinc-400 hidden sm:inline uppercase">
          Source:
        </span>
        <span className="font-bold text-white tracking-wide truncate max-w-[110px] sm:max-w-[140px]">
          {activeConfig.label}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${activeConfig.badgeColor}`}
        >
          {activeConfig.badge}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-red-400' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } top-full mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-950/98 backdrop-blur-2xl border border-zinc-800 shadow-2xl p-2 z-50 overflow-hidden ring-1 ring-white/10`}
          >
            {/* Header info */}
            <div className="px-2.5 py-2 border-b border-zinc-800/80 flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold text-zinc-400 uppercase">
                <Broadcast className="w-3.5 h-3.5 text-red-500" />
                <span>Select Stream Mirror</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                Auto-Proxied
              </span>
            </div>

            {/* Scrollable list */}
            <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
              {/* Shows & Movies Section */}
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                Shows & Movies Engines
              </div>
              {moviesTvSources.map((server) => {
                const isActive = server.id === currentSource;
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => {
                      onSelectSource(server.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-red-600/15 border border-red-500/40 text-white shadow-sm'
                        : 'hover:bg-zinc-800/70 text-zinc-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold font-mono ${
                            isActive
                              ? 'text-red-400 font-extrabold'
                              : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {server.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${server.badgeColor}`}
                        >
                          {server.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {server.description}
                      </p>
                    </div>
                    {isActive ? (
                      <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 opacity-0 group-hover:opacity-60 flex-shrink-0 flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-zinc-400" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Anime Engines Section */}
              <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold border-t border-zinc-800/60 mt-1">
                Anime Dedicated Engines
              </div>
              {animeSources.map((server) => {
                const isActive = server.id === currentSource;
                return (
                  <button
                    key={server.id}
                    type="button"
                    onClick={() => {
                      onSelectSource(server.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-red-600/15 border border-red-500/40 text-white shadow-sm'
                        : 'hover:bg-zinc-800/70 text-zinc-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs font-bold font-mono ${
                            isActive
                              ? 'text-red-400 font-extrabold'
                              : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {server.label}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${server.badgeColor}`}
                        >
                          {server.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {server.description}
                      </p>
                    </div>
                    {isActive ? (
                      <Check className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 opacity-0 group-hover:opacity-60 flex-shrink-0 flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-zinc-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
