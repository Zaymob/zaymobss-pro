import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  Maximize2,
  Minimize2,
  Search,
  X,
  Lock,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ProxyBrowserTab } from '../types';
import { formatProxyDestination, getDisplayDomain } from '../proxy/url-utils';
import { getProxiedUrl, registerScramjetWorker } from '../proxy/scramjet';
import { getUltravioletProxiedUrl, registerUltravioletWorker } from '../proxy/ultraviolet';
import { getFlipgridProxiedUrl } from '../proxy/flipgrid';
import {
  getProxyHistory,
  addProxyHistory,
  ProxyHistoryItem,
} from '../utils/historyManager';

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
  },
  {
    name: 'Discord',
    url: 'https://discord.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=discord.com&sz=128',
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/en/b/bd/Reddit_Logo_Icon.svg',
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com',
    iconUrl: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=128',
  },
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com',
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg',
  },
  {
    name: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    iconUrl: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
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
        historyIndex: 0,
        loading: false,
        error: null,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [proxyEngine, setProxyEngine] = useState<ProxyEngine>('ultraviolet');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

    const lower = rawTarget.trim().toLowerCase();
    if (lower.includes('rare-secret.lol')) {
      try {
        localStorage.setItem('yuno_force_rare_secret', 'true');
        window.dispatchEvent(new CustomEvent('yuno-secret-triggered'));
      } catch {}

      const currentHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      const newHistory = [...currentHistory, 'https://rare-secret.lol'];

      updateActiveTab({
        url: 'https://rare-secret.lol',
        inputUrl: 'rare-secret.lol',
        title: 'Rare Secret • Yunø',
        history: newHistory,
        historyIndex: newHistory.length - 1,
        loading: false,
        error: null,
      });
      return;
    }

    let targetUrl = rawTarget.trim();

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        targetUrl = formatProxyDestination(targetUrl);
      }
    }

    const currentHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
    const newHistory = [...currentHistory, targetUrl];
    const displayDomain = getDisplayDomain(targetUrl);

    addProxyHistory({
      url: targetUrl,
      title: displayDomain,
      domain: displayDomain,
      iconUrl: `https://www.google.com/s2/favicons?domain=${displayDomain}&sz=128`,
    });

    updateActiveTab({
      url: targetUrl,
      inputUrl: targetUrl,
      title: displayDomain,
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
      error: 'Failed to load page.',
    });
  };

  const getIframeSrc = () => {
    if (proxyEngine === 'flipgrid') {
      if (!activeTab.url || activeTab.url === 'https://flipgrid.gq') {
        return 'https://flipgrid.gq';
      }
      return getFlipgridProxiedUrl(activeTab.url);
    }

    if (!activeTab.url) return 'about:blank';

    if (proxyEngine === 'ultraviolet') {
      return getUltravioletProxiedUrl(activeTab.url);
    } else {
      return getProxiedUrl(activeTab.url);
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#07040a] transition-all duration-200 select-none ${
        isExpanded ? 'fixed inset-0 z-50 p-0 m-0 w-screen h-screen' : 'w-full h-[calc(100vh-4.5rem)]'
      }`}
    >
      {/* Chrome / Browser Header */}
      <div className="bg-[#0b0614] border-b border-[#211236] px-3 py-2 flex flex-col gap-2">
        {/* Tab Strip */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium max-w-[160px] truncate cursor-pointer transition-colors border ${
                  isActive
                    ? 'bg-[#1b0f2e] text-white border-[#4f2680]'
                    : 'bg-[#0f091c] text-zinc-400 hover:text-white border-transparent hover:border-[#221338]'
                }`}
              >
                <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="text-zinc-500 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          <button
            onClick={() => handleCreateNewTab('')}
            className="p-1.5 rounded-lg bg-[#140b22] hover:bg-[#221338] text-zinc-400 hover:text-white border border-[#231338] transition-colors cursor-pointer"
            title="New Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address & Controls Bar */}
        <div className="flex items-center space-x-2">
          {/* Controls: Back, Forward, Reload, Home */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleGoBack}
              disabled={activeTab.historyIndex <= 0}
              className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] disabled:opacity-30 text-zinc-300 border border-[#221338] transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleGoForward}
              disabled={activeTab.historyIndex >= activeTab.history.length - 1}
              className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] disabled:opacity-30 text-zinc-300 border border-[#221338] transition-colors cursor-pointer"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] text-zinc-300 border border-[#221338] transition-colors cursor-pointer"
              title="Reload"
            >
              <RotateCw className={`w-3.5 h-3.5 ${activeTab.loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                updateActiveTab({ url: '', inputUrl: '', title: 'New Tab' });
              }}
              className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] text-zinc-300 border border-[#221338] transition-colors cursor-pointer"
              title="Proxy Home"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Omnibox URL Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigateActiveTab(activeTab.inputUrl);
            }}
            className="flex-1 flex items-center space-x-2 bg-[#07040a] px-3 py-1.5 rounded-lg border border-[#26143c] focus-within:border-[#6b21a8] transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={activeTab.inputUrl}
              onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
              placeholder="Search or enter URL (e.g. youtube.com, discord.com)..."
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-[#2b1747] hover:bg-[#3d2063] text-purple-200 text-xs font-semibold border border-[#522987] transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Engine Selector Dropdown */}
          <select
            value={proxyEngine}
            onChange={(e) => {
              setProxyEngine(e.target.value as ProxyEngine);
              if (activeTab.url) handleReload();
            }}
            className="bg-[#120a1f] text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg border border-[#2a1744] focus:outline-none cursor-pointer"
          >
            <option value="ultraviolet">Ultraviolet</option>
            <option value="scramjet">Scramjet</option>
            <option value="flipgrid">Flipgrid</option>
          </select>

          {/* Popout & Maximize */}
          <div className="flex items-center space-x-1">
            {activeTab.url && (
              <a
                href={activeTab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] text-zinc-300 border border-[#221338] transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-[#130b20] hover:bg-[#201236] text-zinc-300 border border-[#221338] transition-colors cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
        {!activeTab.url ? (
          /* Clean Start Page */
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-xl mx-auto w-full text-center">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#2b1746] bg-[#0c0714] shadow-xl">
              <img src="/yuno-logo.jpg" alt="Yuno" className="w-full h-full object-cover" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">Yuno Proxy</h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigateActiveTab(activeTab.inputUrl);
              }}
              className="w-full bg-[#0d0716] border border-[#25143b] focus-within:border-[#6b21a8] rounded-xl px-4 py-2.5 flex items-center space-x-3 transition-colors shadow-lg"
            >
              <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                value={activeTab.inputUrl}
                onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
                placeholder="Search web or enter address..."
                className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-[#24133b] hover:bg-[#341b55] text-purple-200 text-xs font-semibold border border-[#482475] transition-colors cursor-pointer"
              >
                Launch
              </button>
            </form>

            {/* Quick Bookmark Buttons */}
            <div className="grid grid-cols-4 gap-2.5 w-full pt-2">
              {DEFAULT_BOOKMARKS.map((bm) => (
                <button
                  key={bm.name}
                  onClick={() => navigateActiveTab(bm.url)}
                  className="p-2.5 rounded-xl bg-[#0c0714] border border-[#221338] hover:border-[#522987] hover:bg-[#150a24] transition-all flex flex-col items-center space-y-1.5 cursor-pointer group"
                >
                  <img src={bm.iconUrl} alt={bm.name} className="w-6 h-6 object-contain" />
                  <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white truncate w-full text-center">
                    {bm.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : activeTab.url.includes('rare-secret.lol') ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#07040a] select-none">
            <div className="w-14 h-14 rounded-xl bg-[#1a0e2d] border border-[#552c8c] flex items-center justify-center text-purple-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                Rare Secret Discovered
              </h2>
              <p className="text-xs text-purple-300 font-mono">
                "if you're seeing this screen shot and send it to me btw."
              </p>
              <p className="text-[11px] text-zinc-400">
                Secret phrase armed. Return to the Home page to watch it display for 15 seconds!
              </p>
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('yuno_force_rare_secret', 'true');
                  window.dispatchEvent(new CustomEvent('yuno-secret-triggered'));
                } catch {}
                onNavigateHome?.();
              }}
              className="px-4 py-2 bg-[#201236] hover:bg-[#2c1a47] text-white border border-[#552c8c] hover:border-[#793ebd] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Return to Home Page
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={getIframeSrc()}
            title={activeTab.title}
            className="w-full h-full border-0 bg-white"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allowFullScreen
            allow="autoplay; payment; microphone; camera; midi; geolocation; gyroscope; accelerometer; cross-origin-isolated; encrypted-media; fullscreen"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
};
