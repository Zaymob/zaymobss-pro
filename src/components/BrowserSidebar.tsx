import React from 'react';
import {
  Home as House,
  Gamepad2 as GameController,
  Sparkles as Sparkle,
  Film as FilmStrip,
  Music as MusicNotes,
  Settings as GearSix,
} from 'lucide-react';

interface BrowserSidebarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
}

export const BrowserSidebar: React.FC<BrowserSidebarProps> = ({
  currentUrl,
  onNavigate,
}) => {
  const navItems = [
    { proto: 'dior://home', label: 'Home', icon: House },
    { proto: 'dior://g', label: 'Games', icon: GameController },
    { proto: 'dior://a', label: 'AI Assistant', icon: Sparkle },
    { proto: 'dior://movies', label: 'Cinema', icon: FilmStrip },
    { proto: 'dior://music', label: 'Music', icon: MusicNotes },
  ];

  const isCurrentActive = (proto: string) => {
    if (proto === 'dior://home' && (currentUrl === 'dior://home' || currentUrl === 'dior://newtab')) return true;
    if (proto === 'dior://g' && (currentUrl === 'dior://g' || currentUrl.startsWith('dior://games'))) return true;
    if (proto === 'dior://a' && (currentUrl === 'dior://a' || currentUrl.startsWith('dior://ai'))) return true;
    if (proto === 'dior://movies' && currentUrl.startsWith('dior://movies')) return true;
    if (proto === 'dior://music' && currentUrl.startsWith('dior://music')) return true;
    return false;
  };

  return (
    <div className="w-12 bg-[#25282a] border-r border-[#383c41] flex flex-col items-center py-2 shrink-0 select-none">
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.proto);
          return (
            <button
              key={item.proto}
              onClick={() => onNavigate(item.proto)}
              title={`${item.label} (${item.proto})`}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
                active
                  ? 'bg-[#32363b] text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2e32]'
              }`}
            >
              <Icon size={18} className={active ? 'text-zinc-100' : 'text-zinc-400'} />

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1e2022] border border-[#383c41] rounded text-[11px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                <span className="font-medium">{item.label}</span>
                <span className="text-zinc-500 ml-1.5 font-mono">{item.proto}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Settings at Bottom */}
      <div className="w-full px-1.5">
        <button
          onClick={() => onNavigate('dior://settings')}
          title="Settings (dior://settings)"
          className={`w-9 h-9 flex items-center justify-center rounded transition-colors relative group ${
            currentUrl.startsWith('dior://settings')
              ? 'bg-[#32363b] text-zinc-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2e32]'
          }`}
        >
          <GearSix size={18} className={currentUrl.startsWith('dior://settings') ? 'text-zinc-100' : 'text-zinc-400'} />
          <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1e2022] border border-[#383c41] rounded text-[11px] text-zinc-200 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <span className="font-medium">Settings</span>
            <span className="text-zinc-500 ml-1.5 font-mono">dior://settings</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BrowserSidebar;
