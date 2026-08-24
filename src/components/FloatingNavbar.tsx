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
  Gear,
} from '@phosphor-icons/react';

interface FloatingNavbarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  activeTab,
  onNavigate,
}) => {
  const navItems = [
    { id: 'home' as NavTab, icon: House, title: 'Home' },
    { id: 'proxy' as NavTab, icon: Globe, title: 'Proxy' },
    { id: 'links' as NavTab, icon: LinkSimple, title: 'Links' },
    { id: 'games' as NavTab, icon: GameController, title: 'Games' },
    { id: 'movies' as NavTab, icon: FilmStrip, title: 'Media' },
    { id: 'youtube' as NavTab, icon: Television, title: 'Videos' },
    { id: 'ai' as NavTab, icon: Robot, title: "Jack's cough" },
    { id: 'community' as NavTab, icon: ChatCircleText, title: 'Chat' },
    { id: 'music' as NavTab, icon: MusicNotes, title: 'Music' },
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
          <span className="text-sm font-black text-white tracking-widest uppercase">YUNO</span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 rounded">HUB</span>
        </button>

        {/* Tab Items Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
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
      </div>
    </header>
  );
};
