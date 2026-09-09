import React from 'react';
import { NavTab } from '../types';
import {
  House,
  Globe,
  LinkSimple,
  FilmStrip,
  GameController,
  Television,
  Robot,
  ChatCircleText,
  MusicNotes,
  Handshake,
  Gear,
  ClockCounterClockwise,
  ShieldCheck,
  User,
} from '@phosphor-icons/react';

interface FloatingNavbarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
  isAdmin?: boolean;
  onOpenAdminDashboard?: () => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  activeTab,
  onNavigate,
  onOpenHistory,
  onOpenProfile,
  isAdmin,
  onOpenAdminDashboard,
}) => {
  const navItems = [
    { id: 'home' as NavTab, icon: House, title: 'Home' },
    { id: 'games' as NavTab, icon: GameController, title: 'Games' },
    { id: 'ai' as NavTab, icon: Robot, title: 'Dior Ai' },
    { id: 'proxy' as NavTab, icon: Globe, title: 'Proxy' },
    { id: 'community' as NavTab, icon: ChatCircleText, title: 'Chat' },
    { id: 'movies' as NavTab, icon: FilmStrip, title: 'Cinema' },
    { id: 'music' as NavTab, icon: MusicNotes, title: 'Music' },
    { id: 'partners' as NavTab, icon: Handshake, title: 'Partners' },
    { id: 'settings' as NavTab, icon: Gear, title: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0d11] border-b border-zinc-800">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-2 text-left cursor-pointer flex-shrink-0"
        >
          <span className="text-sm font-black text-white tracking-widest uppercase">DIOR</span>
        </button>

        {/* Tab Items Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1 flex-1 justify-center max-w-3xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" weight={isActive ? 'fill' : 'regular'} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Utility Actions */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center space-x-1 text-xs"
              title="Activity & Search / Watch History"
            >
              <ClockCounterClockwise className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">History</span>
            </button>
          )}

          {isAdmin && onOpenAdminDashboard && (
            <button
              onClick={onOpenAdminDashboard}
              className="px-2 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition-colors flex items-center space-x-1 text-xs"
              title="Admin Moderation Terminal"
            >
              <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Edit Profile"
            >
              <User className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

