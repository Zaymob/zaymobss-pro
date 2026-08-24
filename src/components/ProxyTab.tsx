import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  Maximize2,
  Minimize2,
  Globe,
  Search,
  X,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
  Tv,
  Gamepad2,
  Bookmark,
  Layers,
  Zap,
  Cpu,
  Shield,
  Radio,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProxyBrowserTab } from '../types';
import { formatProxyDestination, getDisplayDomain } from '../proxy/url-utils';
import { getProxiedUrl, registerScramjetWorker } from '../proxy/scramjet';
import { getUltravioletProxiedUrl, registerUltravioletWorker } from '../proxy/ultraviolet';
import { getFlipgridProxiedUrl } from '../proxy/flipgrid';

export type ProxyEngine = 'ultraviolet' | 'scramjet' | 'flipgrid';

interface ProxyTabProps {
  initialUrl?: string;
  onNavigateHome?: () => void;
}

const DEFAULT_BOOKMARKS = [
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
    category: 'Media',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=128',
    category: 'Social',
  },
  {
    name: 'Bloxd.io',
    url: 'https://bloxd.io',
    iconUrl: 'https://www.google.com/s2/favicons?domain=bloxd.io&sz=128',
    category: 'Voxel Game',
  },
  {
    name: 'Discord',
    url: 'https://discord.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=discord.com&sz=128',
    category: 'Social',
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/en/b/bd/Reddit_Logo_Icon.svg',
    category: 'Community',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
    category: 'Code',
  },
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
    category: 'Streaming',
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    category: 'Music',
  },
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128',
    category: 'AI',
  },
  {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=128',
    category: 'Search',
  },
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    iconUrl: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
    category: 'Wiki',
  },
  {
    name: 'Minecraft Classic',
    url: 'https://classic.minecraft.net',
    iconUrl: 'https://www.google.com/s2/favicons?domain=minecraft.net&sz=128',
    category: 'Game',
  },
];

export const ProxyTab: React.FC<ProxyTabProps> = ({ initialUrl = '', onNavigateHome }) => {
  const [tabs, setTabs] = useState<ProxyBrowserTab[]>(() => {
    const startUrl = initialUrl.trim() || '';
    return [
      {
        id: 'tab-1',
        title: startUrl ? getDisplayDomain(startUrl) : 'New Tab',
        url: startUrl,
        inputUrl: startUrl,
        history: startUrl ? [startUrl] : [''],
        historyIndex: startUrl ? 0 : 0,
        loading: false,
        error: null,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('ultraviolet');
  const [proxyMode, setProxyMode] = useState<'server' | 'direct'>('server');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize Ultraviolet worker on mount
  useEffect(() => {
    registerUltravioletWorker().catch(() => {});
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (initialUrl && initialUrl !== activeTab.url) {
      navigateActiveTab(initialUrl);
    }
  }, [initialUrl]);

  const updateActiveTab = (updater: Partial<ProxyBrowserTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updater } : tab))
    );
  };

  const navigateActiveTab = (rawTarget: string) => {
    if (!rawTarget.trim()) return;

    let targetUrl = rawTarget.trim();

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(targetUrl)}`;
      }
    }

    const currentHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    const newHistory = [...currentHistory, targetUrl];

    updateActiveTab({
      url: targetUrl,
      inputUrl: targetUrl,
      title: getDisplayDomain(targetUrl),
      history: newHistory,
      historyIndex: newHistory.length - 1,
      loading: true,
      error: null,
    });
  };

  const handleCreateNewTab = (url: string = '') => {
    const newId = `tab-${Date.now()}`;
    const newTab: ProxyBrowserTab = {
      id: newId,
      title: url ? getDisplayDomain(url) : 'New Tab',
      url: url,
      inputUrl: url,
      history: url ? [url] : [''],
      historyIndex: 0,
      loading: !!url,
      error: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setTabs([
        {
          id: 'tab-1',
          title: 'New Tab',
          url: '',
          inputUrl: '',
          history: [''],
          historyIndex: 0,
          loading: false,
          error: null,
        },
      ]);
      setActiveTabId('tab-1');
      return;
    }

    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[nextTabs.length - 1].id);
    }
  };

  const handleGoBack = () => {
    if (activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[newIndex];
      updateActiveTab({
        url: prevUrl,
        inputUrl: prevUrl,
        title: prevUrl ? getDisplayDomain(prevUrl) : 'New Tab',
        historyIndex: newIndex,
        loading: !!prevUrl,
        error: null,
      });
    }
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[newIndex];
      updateActiveTab({
        url: nextUrl,
        inputUrl: nextUrl,
        title: getDisplayDomain(nextUrl),
        historyIndex: newIndex,
        loading: true,
        error: null,
      });
    }
  };

  const handleReload = () => {
    if (activeTab.url) {
      updateActiveTab({ loading: true, error: null });
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    }
  };

  const handleIframeLoad = () => {
    updateActiveTab({ loading: false });
  };

  const handleIframeError = () => {
    updateActiveTab({
      loading: false,
      error: 'Failed to load page. The target site may be blocking proxy requests.',
    });
  };

  // Determine iframe source URL based on selected proxy engine
  const getIframeSrc = () => {
    if (proxyEngine === 'flipgrid') {
      if (!activeTab.url || activeTab.url === 'https://flipgrid.gq') {
        return 'https://flipgrid.gq';
      }
      return getFlipgridProxiedUrl(activeTab.url);
    }

    if (!activeTab.url) return 'about:blank';
    if (proxyMode === 'direct') {
      return activeTab.url;
    }

    if (proxyEngine === 'ultraviolet') {
      return getUltravioletProxiedUrl(activeTab.url);
    } else {
      return getProxiedUrl(activeTab.url);
    }
  };

  return (
    <div
      className={`flex flex-col bg-zinc-950/95 border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl' : 'w-full h-[calc(100vh-140px)] min-h-[600px]'
      }`}
    >
      {/* Top Chrome Header Bar */}
      <div className="bg-[#202124] border-b border-zinc-800 px-3 py-2 flex flex-col space-y-2 select-none">
        {/* Window Dots & Tab Controls Bar */}
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
          {/* macOS / Chrome Window Control Dots */}
          <div className="flex items-center space-x-1.5 pl-1 pr-2 flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-black/20" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-black/20" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-black/20" />
          </div>

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group relative flex items-center space-x-2 px-3.5 py-1.5 rounded-t-xl text-xs font-medium cursor-pointer transition-all max-w-[220px] min-w-[130px] ${
                  isActive
                    ? 'bg-[#323639] text-white border-t border-x border-zinc-700/80 shadow-md'
                    : 'bg-[#18191c]/70 text-zinc-400 hover:bg-[#282a2d] hover:text-zinc-200'
                }`}
              >
                <img
                  src="https://www.google.com/favicon.ico"
                  alt="Google"
                  className="w-3.5 h-3.5 flex-shrink-0"
                />
                <span className="truncate flex-1">{tab.title || 'Google Search'}</span>
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-60 hover:opacity-100 p-0.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => handleCreateNewTab('')}
            className="p-1.5 rounded-lg bg-[#282a2d] hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="New Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar & Navigation Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Back, Forward, Reload, Home Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleGoBack}
              disabled={activeTab.historyIndex <= 0}
              className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/60 text-zinc-300 transition-all"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={activeTab.historyIndex >= activeTab.history.length - 1}
              className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-800/60 text-zinc-300 transition-all"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReload}
              className={`p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition-all ${
                activeTab.loading ? 'animate-spin text-zinc-100' : ''
              }`}
              title="Reload"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                updateActiveTab({ url: '', inputUrl: '', title: 'New Tab' });
              }}
              className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition-all"
              title="Proxy Home"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* URL / Search Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateActiveTab(activeTab.inputUrl);
            }}
            className="flex-1 min-w-[240px] flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-2xl border border-zinc-800 focus-within:border-zinc-600 transition-all"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              value={activeTab.inputUrl}
              onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
              placeholder="Search web or enter address (e.g. youtube.com, wikipedia.org)..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all"
            >
              Launch
            </button>
          </form>

            <div className="flex items-center space-x-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setProxyEngine('ultraviolet');
                if (activeTab.url) handleReload();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                proxyEngine === 'ultraviolet'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Ultraviolet Proxy Engine"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Ultraviolet</span>
            </button>

            <button
              onClick={() => {
                setProxyEngine('scramjet');
                if (activeTab.url) handleReload();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                proxyEngine === 'scramjet'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Scramjet Proxy Engine"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Scramjet</span>
            </button>

            <button
              onClick={() => {
                setProxyEngine('flipgrid');
                if (!activeTab.url || activeTab.url === 'about:blank') {
                  updateActiveTab({
                    url: 'https://flipgrid.gq',
                    inputUrl: 'https://flipgrid.gq',
                    title: 'flipgrid',
                    loading: true,
                    error: null,
                  });
                } else {
                  handleReload();
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                proxyEngine === 'flipgrid'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Flipgrid Proxy Engine"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Flipgrid</span>
            </button>
          </div>

          {/* External & Expand */}
          <div className="flex items-center space-x-1.5">
            {activeTab.url && (
              <a
                href={activeTab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/50"
                title="Open in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/50"
              title={isExpanded ? 'Minimize Browser' : 'Maximize Browser'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden flex flex-col">
        {activeTab.loading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800 z-30 overflow-hidden">
            <div className="h-full bg-amber-500 animate-pulse w-full" />
          </div>
        )}

        {!activeTab.url ? (
          /* Google Search Homepage */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center text-center select-none">
            {/* Top Right Apps Indicator */}
            <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-sans px-2">
              <span className="text-[11px] font-mono text-zinc-500">
                Google Engine: <span className="text-amber-400 font-bold uppercase">{proxyEngine}</span>
              </span>
              <div className="flex items-center space-x-4">
                <span className="hover:underline cursor-pointer">Gmail</span>
                <span className="hover:underline cursor-pointer">Images</span>
                <div className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-200 cursor-pointer">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Colorful Google Logo */}
            <div className="pt-6 pb-2">
              <h1 className="text-6xl sm:text-7xl font-bold tracking-tight font-sans">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </h1>
            </div>

            {/* Google Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigateActiveTab(activeTab.inputUrl);
              }}
              className="w-full max-w-2xl bg-[#202124] hover:bg-[#303134] focus-within:bg-[#303134] border border-zinc-700 focus-within:border-amber-500/60 rounded-full px-5 py-3 flex items-center space-x-3 shadow-xl transition-all"
            >
              <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
              <input
                type="text"
                value={activeTab.inputUrl}
                onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
                placeholder="Search Google or type a URL..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex-shrink-0"
              >
                Search
              </button>
            </form>

            {/* Search Shortcuts Grid */}
            <div className="w-full pt-6 space-y-4">
              <div className="text-xs text-zinc-500 font-mono">Top Shortcuts</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {DEFAULT_BOOKMARKS.slice(0, 8).map((bm) => (
                  <button
                    key={bm.name}
                    onClick={() => navigateActiveTab(bm.url)}
                    className="p-3.5 rounded-2xl bg-[#202124] hover:bg-[#303134] border border-zinc-800 hover:border-amber-500/30 transition-all flex items-center space-x-3 text-left group cursor-pointer"
                  >
                    <img
                      src={bm.iconUrl}
                      alt={bm.name}
                      className="w-6 h-6 rounded-lg object-contain bg-black/40 p-0.5 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 truncate">
                        {bm.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {getDisplayDomain(bm.url)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Proxied Frame Viewport */
          <div className="relative flex-1 w-full h-full">
            {activeTab.error && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Proxy Request Blocked</h3>
                <p className="text-xs text-zinc-400 max-w-md">{activeTab.error}</p>
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleReload}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700"
                  >
                    Retry Loading
                  </button>
                  <button
                    onClick={() => {
                      // Switch to another engine and retry
                      const nextEngine = proxyEngine === 'ultraviolet' ? 'scramjet' : proxyEngine === 'scramjet' ? 'flipgrid' : 'ultraviolet';
                      setProxyEngine(nextEngine);
                      handleReload();
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all border border-zinc-700"
                  >
                    Try Alternative Engine
                  </button>
                  <a
                    href={activeTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition-all"
                  >
                    Open Directly
                  </a>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={getIframeSrc()}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-none bg-white"
              title={activeTab.title}
              allowFullScreen
              allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; screen-wake-lock; speaker-selection; web-share; xr-spatial-tracking"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
    </div>
  );
};
