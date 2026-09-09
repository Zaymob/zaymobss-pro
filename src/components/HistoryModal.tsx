import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Film,
  Music,
  Gamepad2,
  Trash2,
  X,
  Play,
  Clock,
  ArrowRight,
  Sparkles,
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
        return <Film className="w-4 h-4 text-purple-400" />;
      case 'music':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Search className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Activity & History Center</h3>
                <p className="text-xs text-zinc-400">Search logs, watch history, music stream logs & games played</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 text-xs font-semibold border border-zinc-800 hover:border-rose-900/60 transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter your history records..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              {(['all', 'watch', 'music', 'search', 'game'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab === 'all' ? 'All Logs' : tab === 'watch' ? 'Watch' : tab === 'music' ? 'Music' : tab === 'search' ? 'Search' : 'Games'}
                </button>
              ))}
            </div>
          </div>

          {/* History List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-600 flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-300">No History Records Found</p>
                  <p className="text-xs text-zinc-500">
                    Your searches, movie views, music tracks and game sessions will be recorded here.
                  </p>
                </div>
              </div>
            ) : (
              filteredItems.map((item) => {
                const dateStr = new Date(item.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div
                      onClick={() => {
                        onSelectHistoryItem?.(item);
                        onClose();
                      }}
                      className="flex items-center space-x-3.5 flex-1 min-w-0 cursor-pointer"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-12 h-12 rounded-xl object-cover border border-zinc-800 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0">
                          {getIconForType(item.type)}
                        </div>
                      )}

                      <div className="truncate flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {item.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono capitalize bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            {item.type}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.subtitle}</p>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center space-x-1">
                          <Clock className="w-3 h-3 inline" />
                          <span>{dateStr}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectHistoryItem?.(item);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 transition-colors"
                        title="Resume / Replay / View"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Remove record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
