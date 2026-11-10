import React, { useState, useEffect } from 'react';
import {
  Film as FilmStrip,
  Music as MusicNotes,
  Gamepad2 as GameController,
  Search as MagnifyingGlass,
  History as ClockCounterClockwise,
  Trash2 as Trash,
  X,
  Play,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface HistoryItem {
  id: string;
  type: 'search' | 'watch' | 'music' | 'game';
  title: string;
  subtitle?: string;
  thumbnail?: string;
  timestamp: number;
  data?: any;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryItem?: (item: HistoryItem) => void;
}

const STORAGE_KEY = 'yuno_unified_activity_history';

export const getSavedHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
};

export const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
  try {
    const prev = getSavedHistory();
    const newItem: HistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    // Deduplicate same title & type in recent items
    const filtered = prev.filter((p) => !(p.type === item.type && p.title === item.title));
    const updated = [newItem, ...filtered].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
};

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectHistoryItem,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'watch' | 'music' | 'search' | 'game'>('all');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistoryList(getSavedHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (window.confirm('Clear all recorded activity history?')) {
      localStorage.removeItem(STORAGE_KEY);
      setHistoryList([]);
    }
  };

  const handleRemoveItem = (id: string) => {
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const filteredItems = historyList.filter((item) => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'watch':
        return <FilmStrip className="w-4 h-4 text-purple-400" />;
      case 'music':
        return <MusicNotes className="w-4 h-4 text-purple-300" />;
      case 'game':
        return <GameController className="w-4 h-4 text-purple-400" />;
      default:
        return <MagnifyingGlass className="w-4 h-4 text-purple-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'watch':
        return 'Movie / TV';
      case 'music':
        return 'Music';
      case 'game':
        return 'Game';
      default:
        return 'Search';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-2xl rounded-xl bg-[#0d0716] border border-[#25143b] shadow-2xl text-white overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#25143b] bg-[#090510]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1a0e2d] border border-[#3e2264] text-purple-400 flex items-center justify-center flex-shrink-0">
                <ClockCounterClockwise className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                  ACTIVITY & HISTORY
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Logged stream sessions, games, and browsing activity
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 rounded-lg bg-[#150a24] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 text-xs font-medium border border-[#2d164a] hover:border-rose-900/50 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-[#150a24] text-zinc-400 hover:text-white hover:bg-[#201036] border border-[#2d164a] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 bg-[#07040a] border-b border-[#25143b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <MagnifyingGlass className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search history records..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0d0716] border border-[#25143b] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6b21a8] transition-colors"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
              {(['all', 'watch', 'music', 'game', 'search'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                    activeTab === tab
                      ? 'bg-[#201236] text-white border-[#5b2a94] font-semibold'
                      : 'bg-transparent text-zinc-400 hover:text-white border-transparent hover:border-[#2b1647]'
                  }`}
                >
                  {tab === 'all'
                    ? 'All'
                    : tab === 'watch'
                    ? 'Cinema & TV'
                    : tab === 'music'
                    ? 'Music'
                    : tab === 'game'
                    ? 'Games'
                    : 'Search'}
                </button>
              ))}
            </div>
          </div>

          {/* History List Content */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-lg bg-[#140b22] border border-[#25143b] text-purple-400 flex items-center justify-center mx-auto">
                  <ClockCounterClockwise className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">No History Records</p>
                  <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                    Activity from movies, TV series, music streams, and games will appear here.
                  </p>
                </div>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const dateStr = new Date(item.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="p-2.5 rounded-lg bg-[#0e0916] hover:bg-[#150e21] border border-[#221338] hover:border-[#4d2382] transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => {
                        onSelectHistoryItem?.(item);
                        onClose();
                      }}
                      className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-10 h-10 rounded-lg object-cover border border-[#25143b] bg-[#07040a] flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#1a0e2d] border border-[#2e154e] flex items-center justify-center flex-shrink-0">
                          {getIconForType(item.type)}
                        </div>
                      )}

                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                            {item.title}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-zinc-400 truncate">{item.subtitle}</p>
                        )}
                        <div className="text-[10px] text-zinc-500 font-mono flex items-center space-x-1.5 mt-0.5">
                          <span>{getTypeLabel(item.type)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 inline" />
                            <span>{dateStr}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectHistoryItem?.(item);
                          onClose();
                        }}
                        className="p-1.5 rounded-lg bg-[#1a0e2d] hover:bg-purple-600 text-zinc-300 hover:text-white border border-[#341b57] transition-colors cursor-pointer"
                        title="Resume / Replay"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg bg-[#1a0e2d] hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-[#341b57] transition-colors cursor-pointer"
                        title="Remove record"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
