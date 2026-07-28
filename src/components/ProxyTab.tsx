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
  Compass,
  Sparkles,
  Lock,
  Radio,
  Tv,
  Gamepad2,
  Bookmark
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
  { name: 'Roblox', url: 'https://nowgg.fun/apps/a/19900/b.html', icon: '🎮', color: 'from-purple-600 to-indigo-800' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆', color: 'from-orange-500 to-amber-600' },
  { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️', color: 'from-red-600 to-red-800' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '🌐', color: 'from-zinc-500 to-zinc-700' },
  { name: 'Bing Search', url: 'https://www.bing.com', icon: '🔍', color: 'from-blue-500 to-teal-600' },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: '💬', color: 'from-orange-600 to-red-600' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', color: 'from-zinc-700 to-zinc-900' },
  { name: 'Minecraft Web', url: 'https://classic.minecraft.net', icon: '⛏️', color: 'from-emerald-600 to-green-800' },
  { name: 'Twitch', url: 'https://www.twitch.tv', icon: '💜', color: 'from-purple-600 to-indigo-700' },
];

export const ProxyTab: React.FC<ProxyTabProps> = ({ initialUrl, onNavigateHome }) => {
  const [tabs, setTabs] = useState<ProxyBrowserTab[]>(() => {
    const startUrl = initialUrl ? formatProxyDestination(initialUrl) : '';
    return [
      {
        id: 'tab-1',
        title: startUrl ? getDisplayDomain(startUrl) : 'New Tab',
        url: startUrl,
        inputUrl: startUrl,
        history: startUrl ? [startUrl] : [],
        historyIndex: startUrl ? 0 : -1,
        loading: !!startUrl,
        error: null,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [swActive, setSwActive] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize Scramjet Worker on mount
  useEffect(() => {
    registerScramjetWorker().then((success) => {
      setSwActive(success);
    });
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Auto safety dismiss for loading state so iframe is never stuck hidden
  useEffect(() => {
    if (activeTab.loading) {
      const timer = setTimeout(() => {
        updateTab(activeTabId, { loading: false });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [activeTab.loading, activeTabId, activeTab.url]);

  const updateTab = (id: string, updater: Partial<ProxyBrowserTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, ...updater } : tab))
    );
  };

  const createNewTab = (targetUrl: string = '') => {
    const newId = `tab-${Date.now()}`;
    const formatted = targetUrl ? formatProxyDestination(targetUrl) : '';
    const newTabObj: ProxyBrowserTab = {
      id: newId,
      title: formatted ? getDisplayDomain(formatted) : 'New Tab',
      url: formatted,
      inputUrl: formatted,
      history: formatted ? [formatted] : [],
      historyIndex: formatted ? 0 : -1,
      loading: !!formatted,
      error: null,
    };
    setTabs((prev) => [...prev, newTabObj]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // If closing last tab, reset to empty tab
      updateTab(id, {
        url: '',
        inputUrl: '',
        title: 'New Tab',
        history: [],
        historyIndex: -1,
        loading: false,
        error: null,
      });
      return;
    }

    const filtered = tabs.filter((t) => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  const navigateActiveTab = (destinationUrl: string) => {
    if (!destinationUrl.trim()) return;
    const formatted = formatProxyDestination(destinationUrl);
    const currentHist = activeTab.history.slice(0, activeTab.historyIndex + 1);
    const nextHist = [...currentHist, formatted];

    updateTab(activeTabId, {
      url: formatted,
      inputUrl: formatted,
      title: getDisplayDomain(formatted),
      history: nextHist,
      historyIndex: nextHist.length - 1,
      loading: true,
      error: null,
    });
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab.inputUrl.trim()) {
      navigateActiveTab(activeTab.inputUrl);
    }
  };

  const handleBack = () => {
    if (activeTab.historyIndex > 0) {
      const prevIdx = activeTab.historyIndex - 1;
      const prevUrl = activeTab.history[prevIdx];
      updateTab(activeTabId, {
        url: prevUrl,
        inputUrl: prevUrl,
        title: getDisplayDomain(prevUrl),
        historyIndex: prevIdx,
        loading: true,
        error: null,
      });
    }
  };

  const handleForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const nextIdx = activeTab.historyIndex + 1;
      const nextUrl = activeTab.history[nextIdx];
      updateTab(activeTabId, {
        url: nextUrl,
        inputUrl: nextUrl,
        title: getDisplayDomain(nextUrl),
        historyIndex: nextIdx,
        loading: true,
        error: null,
      });
    }
  };

  const handleReload = () => {
    if (activeTab.url) {
      updateTab(activeTabId, { loading: true, error: null });
      if (iframeRef.current) {
        iframeRef.current.src = getProxiedUrl(activeTab.url);
      }
    }
  };

  const handleHome = () => {
    updateTab(activeTabId, {
      url: '',
      inputUrl: '',
      title: 'New Tab',
      error: null,
      loading: false,
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col bg-zinc-950 text-white border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'min-h-[85vh] h-[85vh]'
      }`}
    >
      {/* SCRAMJET BROWSER TOP BAR */}
      <div className="bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 p-2 space-y-2 select-none flex-shrink-0">
        
        {/* TABS HEADERS BAR */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 px-1">
          {tabs.map((t) => {
            const isActive = t.id === activeTabId;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all max-w-[180px] sm:max-w-[220px] min-w-[110px] flex-shrink-0 border ${
                  isActive
                    ? 'bg-zinc-800 text-white border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:bg-zinc-800/60'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span className="truncate flex-1 font-mono text-[11px]">{t.title}</span>
                <button
                  onClick={(e) => closeTab(t.id, e)}
                  className="p-0.5 rounded-md hover:bg-zinc-700/80 text-zinc-400 hover:text-red-300 transition-colors opacity-70 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {/* Add New Tab Button */}
          <button
            onClick={() => createNewTab('')}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-cyan-300 transition-colors flex-shrink-0"
            title="Open New Proxy Tab (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Scramjet Engine Status Badge */}
          <div className="ml-auto hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>Scramjet Proxy Active</span>
          </div>
        </div>

        {/* NAVIGATION TOOLBAR */}
        <div className="flex items-center space-x-2 px-1">
          {/* Back Button */}
          <button
            onClick={handleBack}
            disabled={activeTab.historyIndex <= 0}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-all active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Forward Button */}
          <button
            onClick={handleForward}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:hover:bg-zinc-900 transition-all active:scale-95"
            title="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Reload Button */}
          <button
            onClick={handleReload}
            disabled={!activeTab.url}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 transition-all active:scale-95"
            title="Reload"
          >
            <RotateCw className={`w-4 h-4 ${activeTab.loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Home Button */}
          <button
            onClick={handleHome}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all active:scale-95"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* URL BAR & SEARCH FORM */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center relative">
            <div className="absolute left-3 flex items-center space-x-1.5 text-zinc-400 pointer-events-none">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <input
              type="text"
              value={activeTab.inputUrl}
              onChange={(e) => updateTab(activeTabId, { inputUrl: e.target.value })}
              placeholder="Search the web or enter a URL (e.g. youtube.com)..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-cyan-500/60 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all"
            />

            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-[11px] rounded-lg shadow transition-all flex items-center space-x-1"
            >
              <Search className="w-3 h-3" />
              <span className="hidden sm:inline">Go</span>
            </button>
          </form>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-all active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* BROWSER VIEWPORT CONTAINER */}
      <div className="relative flex-1 bg-zinc-950 overflow-hidden">
        
        {/* EMPTY STATE: WHEN NO URL IS LOADED */}
        {!activeTab.url && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 md:p-12 text-center space-y-8 overflow-y-auto">
            
            {/* Scramjet Proxy Hero Emblem */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 max-w-xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <Globe className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Scramjet Web Proxy
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-sans">
                Enter any website URL or search query to browse unblocked with high-speed proxying.
              </p>
            </motion.div>

            {/* Big Search Input Card */}
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleUrlSubmit}
              className="w-full max-w-2xl flex items-center bg-zinc-900/90 border border-cyan-500/30 rounded-2xl p-2 shadow-2xl focus-within:border-cyan-400 transition-all"
            >
              <Search className="w-5 h-5 text-cyan-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={activeTab.inputUrl}
                onChange={(e) => updateTab(activeTabId, { inputUrl: e.target.value })}
                placeholder="Search Google or type a web address..."
                className="w-full px-3 py-2 bg-transparent text-sm font-sans text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 font-bold text-xs text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-1.5"
              >
                <span>Launch</span>
                <Compass className="w-4 h-4" />
              </button>
            </motion.form>

            {/* Quick Bookmarks Grid */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-3xl space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider px-1">
                <span className="flex items-center space-x-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Popular Destinations</span>
                </span>
                <span>Click to Open</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DEFAULT_BOOKMARKS.map((bm) => (
                  <button
                    key={bm.name}
                    onClick={() => navigateActiveTab(bm.url)}
                    className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/40 text-left transition-all group hover:scale-105 active:scale-95 shadow-md"
                  >
                    <div className="text-xl p-2 rounded-xl bg-zinc-800 group-hover:scale-110 transition-transform flex-shrink-0">
                      {bm.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {bm.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate">
                        {bm.url.replace(/^https?:\/\//i, '')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

          </div>
        )}

        {/* NON-BLOCKING LOADING INDICATOR & PROGRESS BAR */}
        {activeTab.loading && activeTab.url && (
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
            <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 animate-pulse w-full shadow-[0_0_12px_#22d3ee]" />
            <div className="absolute top-3 right-4 bg-zinc-950/90 border border-cyan-500/40 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs text-cyan-300 font-mono">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Proxy connecting...</span>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {activeTab.error && (
          <div className="absolute inset-0 z-30 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-bold text-white">Unable to load this website</h2>
              <p className="text-xs text-zinc-400 font-mono">
                The requested URL <span className="text-red-300">{activeTab.url}</span> could not be retrieved through the proxy engine.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleReload}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleHome}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-xs font-bold text-white transition-all shadow-md"
              >
                Go Home
              </button>
              {activeTab.historyIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors"
                >
                  Back
                </button>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE PROXIED IFRAME */}
        {activeTab.url && (
          <iframe
            ref={iframeRef}
            key={`${activeTab.id}-${activeTab.url}`}
            src={getProxiedUrl(activeTab.url)}
            title={activeTab.title}
            className="w-full h-full border-none bg-white"
            onLoad={() => {
              updateTab(activeTabId, { loading: false });
            }}
            onError={() => {
              updateTab(activeTabId, { loading: false, error: 'Proxy request failed' });
            }}
            sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
          />
        )}
      </div>
    </div>
  );
};
