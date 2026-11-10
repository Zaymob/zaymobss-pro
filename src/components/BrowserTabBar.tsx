import React from 'react';
import {
  Plus,
  X,
  Gamepad2 as GameController,
  Sparkles as Sparkle,
  Film as FilmStrip,
  Tv as Television,
  Music as MusicNotes,
  LayoutGrid as SquaresFour,
  History as ClockCounterClockwise,
  Settings as GearSix,
  Globe,
  Home as House,
  ShieldCheck,
  EyeOff as EyeSlash,
} from 'lucide-react';
import { DiorLogo } from './DiorLogo';

export interface DiorBrowserTab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
}

interface BrowserTabBarProps {
  tabs: DiorBrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
  onOpenCloakModal: () => void;
  isCloaked?: boolean;
}

export const BrowserTabBar: React.FC<BrowserTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onOpenCloakModal,
  isCloaked,
}) => {
  const getTabIcon = (url: string) => {
    if (url.includes('dior://g') || url.includes('dior://games')) return <GameController size={13} className="text-zinc-400" />;
    if (url.includes('dior://a') || url.includes('dior://ai')) return <Sparkle size={13} className="text-zinc-400" />;
    if (url.includes('dior://movies')) return <FilmStrip size={13} className="text-zinc-400" />;
    if (url.includes('dior://anime')) return <Television size={13} className="text-zinc-400" />;
    if (url.includes('dior://music')) return <MusicNotes size={13} className="text-zinc-400" />;
    if (url.includes('dior://apps')) return <SquaresFour size={13} className="text-zinc-400" />;
    if (url.includes('dior://history')) return <ClockCounterClockwise size={13} className="text-zinc-400" />;
    if (url.includes('dior://settings')) return <GearSix size={13} className="text-zinc-400" />;
    if (url.includes('dior://home') || url.includes('dior://newtab')) return <House size={13} className="text-zinc-400" />;
    if (url.startsWith('dior://')) return <DiorLogo variant="monogram" size="sm" className="w-3.5 h-3.5 text-zinc-400" />;
    return <Globe size={13} className="text-zinc-400" />;
  };

  return (
    <div className="h-[38px] bg-[#222528] border-b border-[#383c41] flex items-stretch px-2 gap-1 overflow-x-auto overflow-y-hidden select-none select-none">
      {/* Dior Monogram in Tab Bar Chrome */}
      <div className="flex items-center px-2 mr-1">
        <DiorLogo variant="monogram" size="sm" className="text-zinc-300" />
      </div>

      {/* Tabs */}
      <div className="flex items-stretch gap-1 flex-1 min-w-0">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 min-w-[120px] max-w-[200px] flex-1 text-xs cursor-pointer border-r border-[#2e3236] transition-colors ${
                isActive
                  ? 'bg-[#1e2022] text-zinc-100 font-medium border-t-2 border-t-zinc-300'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#282b2f]'
              }`}
            >
              <div className="shrink-0">{getTabIcon(tab.url)}</div>
              <span className="truncate flex-1">{tab.title}</span>
              <button
                onClick={e => onCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#383c41] text-zinc-400 hover:text-zinc-100 transition-opacity"
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className="self-center p-1.5 ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#2c3034] rounded transition-colors"
          title="New Tab (dior://home)"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Right Utility Chips */}
      <div className="flex items-center gap-2 pl-2">
        <button
          onClick={onOpenCloakModal}
          className={`flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded border transition-colors ${
            isCloaked
              ? 'bg-zinc-800 text-emerald-400 border-emerald-700/50'
              : 'bg-[#282b2f] text-zinc-400 border-[#383c41] hover:text-zinc-200'
          }`}
          title="Tab Cloak / Disguise"
        >
          <EyeSlash size={12} />
          <span className="hidden sm:inline">{isCloaked ? 'Cloaked' : 'Cloak'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#282b2f] border border-[#383c41] rounded text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono text-[10px] text-zinc-300">1,248</span>
        </div>
      </div>
    </div>
  );
};

export default BrowserTabBar;
