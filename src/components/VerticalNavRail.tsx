import React from 'react';
import { NavTab } from '../types';
import {
  Home as House,
  Globe,
  Gamepad2 as GameController,
  Film as FilmStrip,
  Music as MusicNotes,
  Settings as Gear,
  Handshake,
  ShieldCheck,
} from 'lucide-react';

interface VerticalNavRailProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenPartners?: () => void;
  isAdmin?: boolean;
  onOpenAdminDashboard?: () => void;
}

export const VerticalNavRail: React.FC<VerticalNavRailProps> = ({
  activeTab,
  onNavigate,
  onOpenPartners,
  isAdmin,
  onOpenAdminDashboard,
}) => {
  const navItems = [
    { id: 'home' as NavTab, icon: House, label: 'Home', desc: 'Home' },
    { id: 'games' as NavTab, icon: GameController, label: 'Games', desc: 'Games' },
    { id: 'proxy' as NavTab, icon: Globe, label: 'Proxy', desc: 'Proxy' },
    { id: 'movies' as NavTab, icon: FilmStrip, label: 'Cinema', desc: 'Cinema' },
    { id: 'music' as NavTab, icon: MusicNotes, label: 'Music', desc: 'Music' },
    { id: 'settings' as NavTab, icon: Gear, label: 'Settings', desc: 'Settings' },
  ];

  return (
    <aside className="fixed top-0 left-0 bottom-0 z-50 w-16 sm:w-[72px] bg-[#09090b] border-r border-zinc-800 flex flex-col items-center justify-between py-5 select-none transition-colors">
      {/* Center Nav Items */}
      <nav className="flex flex-col items-center space-y-2.5 overflow-y-auto scrollbar-none py-2 my-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-zinc-800 text-white font-bold border border-zinc-700'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5" />

              {/* Active solid indicator bar */}
              {isActive && (
                <span className="absolute -left-1.5 w-1 h-5 rounded-r-full bg-emerald-500" />
              )}

              {/* Tooltip Card */}
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs rounded-lg border border-zinc-800 shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-100 flex flex-col">
                <span className="font-semibold text-zinc-100">{item.label}</span>
                <span className="text-[10px] text-zinc-400 font-mono">{item.desc}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Utility Items */}
      <div className="flex flex-col items-center space-y-2.5 pt-3 border-t border-zinc-800 w-full px-2">
        {onOpenPartners && (
          <button
            onClick={onOpenPartners}
            className="w-9 h-9 rounded-xl text-purple-400 hover:text-white hover:bg-[#1a0e2d] border border-transparent hover:border-[#3d196b] flex items-center justify-center transition-colors cursor-pointer"
            title="Partners"
          >
            <Handshake className="w-4 h-4" />
          </button>
        )}

        {isAdmin && onOpenAdminDashboard && (
          <button
            onClick={onOpenAdminDashboard}
            className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center justify-center transition-colors cursor-pointer"
            title="Admin Moderation Terminal"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
