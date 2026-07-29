import React from 'react';
import { NavTab } from '../types';
import {
  Home,
  Globe,
  Film,
  Gamepad2,
  Tv,
  Bot,
  MessageSquare,
  Music,
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  PanelLeft,
  User,
  Shield,
  Sparkles,
} from 'lucide-react';
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
  isPrivateChatUnlocked?: boolean;
  onUnlockPrivateChat?: () => void;
  isHaloUnlocked?: boolean;
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
  isPrivateChatUnlocked = false,
  isHaloUnlocked = false,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home, badge: '' },
    { id: 'proxy' as NavTab, label: 'ProxyTab', icon: Globe, badge: 'PROXY' },
    { id: 'movies' as NavTab, label: 'Movies & TV', icon: Film, badge: 'HD' },
    { id: 'games' as NavTab, label: 'Arcade Games', icon: Gamepad2, badge: 'HOT' },
    { id: 'youtube' as NavTab, label: 'Yunø Tube', icon: Tv, badge: 'NEW' },
    { id: 'ai' as NavTab, label: 'Yunø AI Studio', icon: Bot, badge: 'GEMINI' },
    ...(isHaloUnlocked
      ? [{ id: 'halo' as NavTab, label: 'Halo Faith AI', icon: Sparkles, badge: 'HOLY' }]
      : []),
    { id: 'community' as NavTab, label: 'Community Chat', icon: MessageSquare, badge: 'LIVE' },
    ...(isPrivateChatUnlocked
      ? [{ id: 'private_chat' as NavTab, label: 'VIP Watch Party', icon: Shield, badge: 'VIP' }]
      : []),
    { id: 'music' as NavTab, label: 'Music Vault', icon: Music, badge: '' },
    { id: 'settings' as NavTab, label: 'Customization', icon: Settings, badge: '' },
  ];

  const defaultAvatar =
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';

  return (
    <>
      {/* Floating Toggle Button when Sidebar is Completely Closed */}
      {closed && (
        <button
          onClick={() => setClosed(false)}
          className="fixed top-4 left-4 z-50 p-2.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-cyan-400 hover:text-white hover:bg-zinc-900 shadow-2xl backdrop-blur-xl transition-all flex items-center space-x-2 group hover:scale-105 active:scale-95"
          title="Open Navigation Sidebar"
        >
          <PanelLeft className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-bold text-white pr-1">Menu</span>
        </button>
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col justify-between bg-zinc-950/90 backdrop-blur-2xl border-r border-zinc-800/70 transition-all duration-300 ease-in-out ${
          closed
            ? '-translate-x-full opacity-0 pointer-events-none'
            : 'translate-x-0 opacity-100'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Top Header Logo */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 cursor-pointer group overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:scale-105 transition-transform flex-shrink-0">
                Ø
              </div>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col"
                >
                  <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
                    Yunø! <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-medium border border-cyan-500/30">PRO</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Workspace & Media</span>
                </motion.div>
              )}
            </div>

            {/* Controls: Collapse & Close completely */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                title={collapsed ? 'Expand sidebar' : 'Collapse to compact'}
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setClosed(true)}
                className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-300 border border-zinc-800 transition-colors"
                title="Close sidebar completely"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border border-cyan-500/30 shadow-lg shadow-cyan-950/30'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Active side indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-r-full shadow-[0_0_10px_#22d3ee]"
                    />
                  )}

                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  />

                  {!collapsed && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}

                  {!collapsed && item.badge && (
                    <span
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        item.badge === 'GEMINI'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : item.badge === 'LIVE'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Collapsed Tooltip */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-white text-xs rounded-lg shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-zinc-800/50 space-y-2">
          {/* Replay boot screen button */}
          <button
            onClick={onReplayBoot}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/60 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Replay Yunø Boot Animation"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            {!collapsed && <span>Replay Boot Sequence</span>}
          </button>

          {/* User profile snippet (Clickable to Edit Name & Avatar!) */}
          <button
            onClick={onOpenProfileModal}
            className={`w-full flex items-center space-x-3 p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-cyan-500/50 transition-all text-left group shadow-lg ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Click to change your name and profile picture"
          >
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="User avatar"
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-cyan-500/40 flex-shrink-0 group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400 flex-shrink-0 group-hover:scale-105 transition-transform">
                <User className="w-4 h-4" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col truncate min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-cyan-300 transition-colors">
                  {currentUser || 'Guest'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 font-medium">
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

