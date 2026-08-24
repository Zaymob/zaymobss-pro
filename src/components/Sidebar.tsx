import React from 'react';
import { NavTab } from '../types';
import { YunoLogo } from './YunoLogo';
import {
  House,
  Globe,
  FilmStrip,
  GameController,
  Television,
  Robot,
  ChatCircleText,
  MusicNotes,
  Gear,
  CaretLeft,
  CaretRight,
  X,
  SidebarSimple,
  ShieldCheck,
  Sparkle,
  ArrowClockwise,
  User,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  closed: boolean;
  setClosed: (closed: boolean) => void;
  onReplayBoot: () => void;
  onOpenProfileModal?: () => void;
  currentUser?: string;
  currentAvatar?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  closed,
  setClosed,
  onReplayBoot,
  onOpenProfileModal,
  currentUser,
  currentAvatar,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: House },
    { id: 'proxy' as NavTab, label: 'Proxy Browser', icon: Globe },
    { id: 'movies' as NavTab, label: 'Movies & TV', icon: FilmStrip },
    { id: 'games' as NavTab, label: 'Arcade Games', icon: GameController },
    { id: 'youtube' as NavTab, label: 'Yunø Tube', icon: Television },
    { id: 'ai' as NavTab, label: "Jack's cough", icon: Robot },
    { id: 'community' as NavTab, label: 'Community Chat', icon: ChatCircleText },
    { id: 'music' as NavTab, label: 'Music', icon: MusicNotes },
    { id: 'settings' as NavTab, label: 'Settings', icon: Gear },
  ];

  const defaultAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';

  return (
    <>
      {/* Floating Toggle Button when Sidebar is Completely Closed */}
      {closed && (
        <button
          onClick={() => setClosed(false)}
          className="fixed top-4 left-4 z-50 p-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-amber-400 hover:text-white hover:bg-zinc-900 shadow-2xl backdrop-blur-xl transition-all flex items-center space-x-2 group hover:scale-105 active:scale-95 cursor-pointer"
          title="Open Navigation Sidebar"
        >
          <SidebarSimple className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-white pr-1">Menu</span>
        </button>
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-zinc-950/90 backdrop-blur-2xl border-r border-zinc-800/70 transition-all duration-300 ease-in-out ${
          closed
            ? '-translate-x-full opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Top Header Logo */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between p-3.5 border-b border-white/10">
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
            >
              <YunoLogo className="w-9 h-9" variant="badge" />
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <span className="font-bold text-base text-white tracking-tight">
                    Yunø
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Dashboard</span>
                </motion.div>
              )}
            </div>

            {/* Controls: Collapse & Close completely */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 rounded-lg bg-black/40 hover:bg-black/80 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title={collapsed ? 'Expand sidebar' : 'Collapse to compact'}
              >
                {collapsed ? <CaretRight className="w-3.5 h-3.5" /> : <CaretLeft className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setClosed(true)}
                className="p-1 rounded-lg bg-black/40 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 border border-white/10 transition-colors cursor-pointer"
                title="Close sidebar completely"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation list */}
        <nav className="p-2.5 space-y-1 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  isActive
                    ? 'text-zinc-950 bg-amber-400 font-bold shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-amber-300'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate flex-1 text-left font-medium tracking-normal text-xs">
                    {item.label}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-black/90 text-white text-xs rounded-lg shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Fixed Footer controls at bottom */}
        <div className="p-2.5 border-t border-zinc-800/70 space-y-1.5 flex-shrink-0 bg-zinc-950">
          {/* Replay boot screen button */}
          <button
            onClick={onReplayBoot}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-[11px] text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/60 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Replay Yunø Boot Animation"
          >
            <ArrowClockwise className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            {!collapsed && <span>Replay Boot Sequence</span>}
          </button>

          {/* User profile snippet (Clickable to Edit Name & Avatar!) */}
          <button
            onClick={onOpenProfileModal}
            className={`w-full flex items-center space-x-2.5 p-2 rounded-xl bg-zinc-900/70 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-cyan-500/50 transition-all text-left group shadow-lg ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Click to edit your name and profile picture"
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="User avatar"
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-cyan-500/40 flex-shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col truncate min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-cyan-300 transition-colors">
                  {currentUser || 'Guest'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 font-semibold">
                  <User className="w-3 h-3 text-cyan-400" />
                  Edit Profile
                </span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

