import React from 'react';
import { NavTab } from '../types';
import {
  Home,
  Gamepad2,
  Bot,
  Film,
  Music,
  Settings,
  History,
  ShieldCheck,
} from 'lucide-react';

interface TopNavbarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenHistory?: () => void;
  onOpenPartners?: () => void;
  onOpenTabMask?: () => void;
  isAdmin?: boolean;
  onOpenAdminDashboard?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onNavigate,
  onOpenHistory,
  onOpenPartners,
  onOpenTabMask,
  isAdmin,
  onOpenAdminDashboard,
}) => {
  const navTabs: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'vivi', label: 'Ai', icon: Bot },
    { id: 'movies', label: 'Cinema', icon: Film },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#07040a] border-none px-3 sm:px-6 flex items-center justify-between select-none">
      {/* Left: Brand Logo & Title */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center space-x-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#2b1746] bg-[#0c0714] flex-shrink-0">
          <img
            src="/yuno-logo.jpg"
            alt="Yuno"
            className="w-full h-full object-cover"
          />
        </div>
        <span className="font-bold text-base tracking-tight text-white group-hover:text-purple-300 transition-colors">
          Yuno
        </span>
      </button>

      {/* Center: Top Navigation Tabs */}
      <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto scrollbar-none py-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 border ${
                isActive
                  ? 'bg-[#1e1333] text-white border-[#552c8c] font-semibold'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-[#130b20] border-transparent hover:border-[#221338]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: History, Cloak & Admin Controls */}
      <div className="flex items-center space-x-1.5">


        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="h-8 px-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 flex items-center space-x-1.5 transition-colors cursor-pointer text-xs font-medium bg-transparent border-0"
            title="History"
          >
            <History className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
          </button>
        )}

        {isAdmin && onOpenAdminDashboard && (
          <button
            onClick={onOpenAdminDashboard}
            className="w-8 h-8 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-700/50 hover:bg-purple-900/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Admin Moderation Terminal"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
