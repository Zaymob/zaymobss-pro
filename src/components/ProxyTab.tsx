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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProxyBrowserTab } from '../types';
import { formatProxyDestination, getDisplayDomain } from '../proxy/url-utils';
import { getProxiedUrl, registerScramjetWorker } from '../proxy/scramjet';

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
    color: 'from-red-600 to-red-800',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=128',
    category: 'Social',
    color: 'from-cyan-600 to-pink-600',
  },
  {
    name: 'Bloxd.io',
    url: 'https://bloxd.io',
    iconUrl: 'https://www.google.com/s2/favicons?domain=bloxd.io&sz=128',
    category: 'Voxel Game',
    color: 'from-emerald-600 to-teal-800',
  },
  {
    name: 'Discord',
    url: 'https://discord.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=discord.com&sz=128',
    category: 'Social',
    color: 'from-indigo-600 to-blue-700',
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/en/b/bd/Reddit_Logo_Icon.svg',
    category: 'Community',
    color: 'from-orange-600 to-red-600',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
    category: 'Code',
    color: 'from-zinc-700 to-zinc-900',
  },
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
    category: 'Streaming',
    color: 'from-purple-600 to-indigo-700',
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
    category: 'Music',
    color: 'from-emerald-500 to-green-700',
  },
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128',
    category: 'AI',
    color: 'from-teal-600 to-emerald-800',
  },
  {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=128',
    category: 'Search',
    color: 'from-orange-500 to-amber-700',
  },
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    iconUrl: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
    category: 'Wiki',
    color: 'from-zinc-600 to-zinc-800',
  },
  {
    name: 'Minecraft Classic',
    url: 'https://classic.minecraft.net',
    iconUrl: 'https://www.google.com/s2/favicons?domain=minecraft.net&sz=128',
    category: 'Game',
    color: 'from-green-600 to-lime-800',
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
  const [proxyMode, setProxyMode] = useState<'server' | 'direct'>('server');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize and clear any stale workers on mount
  useEffect(() => {
    registerScramjetWorker().catch(() => {});
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

    // Check if user input is a search query or URL
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        // Search query -> DuckDuckGo
        targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(targetUrl)}`;
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
      // Reset the single tab to home
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

  // Determine iframe source URL based on proxy mode
  const getIframeSrc = () => {
    if (!activeTab.url) return 'about:blank';
    if (proxyMode === 'server') {
      return getProxiedUrl(activeTab.url);
    }
    return activeTab.url;
  };

  return (
    <div
      className={`flex flex-col bg-zinc-950/95 border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl' : 'w-full h-[calc(100vh-140px)] min-h-[600px]'
      }`}
    >
      {/* Top Browser Chrome Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800/80 px-4 py-2.5 flex flex-col space-y-2 select-none">
        {/* Tabs Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group relative flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all max-w-[200px] min-w-[120px] ${
                  isActive
                    ? 'bg-zinc-800 text-cyan-400 border border-zinc-700/80 shadow-md'
                    : 'bg-zinc-950/60 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
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
            className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700/50"
            title="New Tab"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Address Bar Controls */}
        <div className="flex items-center space-x-2">
          {/* Navigation Controls */}
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
                activeTab.loading ? 'animate-spin text-cyan-400' : ''
              }`}
              title="Reload"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            {onNavigateHome && (
              <button
                onClick={() => {
                  updateActiveTab({ url: '', inputUrl: '', title: 'New Tab' });
                }}
                className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 transition-all"
                title="Proxy Home"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* URL Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateActiveTab(activeTab.inputUrl);
            }}
            className="flex-1 flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-2xl border border-zinc-800 focus-within:border-cyan-500/60 transition-all shadow-inner"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <input
              type="text"
              value={activeTab.inputUrl}
              onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
              placeholder="Search web or enter URL (e.g. youtube.com, wikipedia.org)..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
            >
              Launch
            </button>
          </form>

          {/* Engine Selector & Expand */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setProxyMode(proxyMode === 'server' ? 'direct' : 'server')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center space-x-1.5 ${
                proxyMode === 'server'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
              title="Toggle Proxy Transport Mode"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{proxyMode === 'server' ? 'Server Proxy' : 'Direct Embed'}</span>
            </button>

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

      {/* Main Content Area */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden flex flex-col">
        {activeTab.loading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800 z-30 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 animate-pulse w-full" />
          </div>
        )}

        {!activeTab.url ? (
          /* New Tab Home Screen */
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 max-w-5xl mx-auto w-full flex flex-col justify-center">
            {/* Header Banner */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20">
                <Sparkles className="w-4 h-4" />
                <span>Yunø High-Speed Scramjet Proxy Engine</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Yuno Web
              </h1>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                Search the web or launch popular sites directly with zero tracking or restrictions.
              </p>
            </div>

            {/* Quick Launch Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigateActiveTab(activeTab.inputUrl);
              }}
              className="max-w-2xl mx-auto w-full flex items-center space-x-2 bg-zinc-900/90 p-2 rounded-2xl border border-zinc-800 shadow-2xl focus-within:border-cyan-500"
            >
              <Search className="w-5 h-5 text-cyan-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={activeTab.inputUrl}
                onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
                placeholder="Enter web address or search terms..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all"
              >
                Search & Launch
              </button>
            </form>

            {/* Bookmarks Grid */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  <Bookmark className="w-4 h-4 text-cyan-400" />
                  <span>Popular Destinations</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Click to launch unblocked</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {DEFAULT_BOOKMARKS.map((bookmark) => (
                  <button
                    key={bookmark.name}
                    onClick={() => navigateActiveTab(bookmark.url)}
                    className="p-4 rounded-2xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800/80 hover:border-cyan-500/40 transition-all flex items-center space-x-3.5 group text-left shadow-lg hover:scale-[1.02]"
                  >
                    <img
                      src={bookmark.iconUrl}
                      alt={bookmark.name}
                      className="w-8 h-8 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800 flex-shrink-0 group-hover:scale-110 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                        {bookmark.name}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                        {getDisplayDomain(bookmark.url)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Proxied Web Frame */
          <div className="relative flex-1 w-full h-full">
            {activeTab.error ? (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
                <div className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Proxy Request Blocked or Refused</h3>
                <p className="text-xs text-zinc-400 max-w-md">{activeTab.error}</p>
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    onClick={handleReload}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all border border-zinc-700"
                  >
                    Retry Loading
                  </button>
                  <a
                    href={activeTab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold transition-all shadow-md"
                  >
                    Open in New Tab
                  </a>
                </div>
              </div>
            ) : null}

            <iframe
              ref={iframeRef}
              src={getIframeSrc()}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full border-none bg-white"
              title={activeTab.title}
              sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
            />
          </div>
        )}
      </div>
    </div>
  );
};
