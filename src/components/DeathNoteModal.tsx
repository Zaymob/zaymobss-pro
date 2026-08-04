import React, { useState, useEffect } from 'react';
import {
  Skull,
  Feather,
  X,
  Minimize2,
  Maximize2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  GripHorizontal,
  RefreshCw,
  Search,
  AlertTriangle,
  Send,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface BanAppealItem {
  id: string;
  username: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  type: 'BAN' | 'TIMEOUT';
}

interface DeathNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  bannedUsers: string[];
  timedOutUsers: Array<{ name: string; until: string }>;
  appeals: BanAppealItem[];
  onRefreshData?: () => void;
  showFeedback?: (msg: string, isErr?: boolean) => void;
}

export const DeathNoteModal: React.FC<DeathNoteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  bannedUsers = [],
  timedOutUsers = [],
  appeals = [],
  onRefreshData,
  showFeedback,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [sizeMode, setSizeMode] = useState<'normal' | 'large' | 'compact'>('normal');
  const [activeTab, setActiveTab] = useState<'notebook' | 'rules' | 'appeals' | 'roster'>('notebook');

  // Notebook Input State
  const [commandInput, setCommandInput] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'ban' | 'timeout'>('ban');
  const [timeoutMins, setTimeoutMins] = useState<number>(15);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const [isWriting, setIsWriting] = useState<boolean>(false);

  // Filter state for appeals/roster
  const [searchQuery, setSearchQuery] = useState<string>('');

  const displayNotice = (msg: string, isErr = false) => {
    setFeedback({ text: msg, error: isErr });
    if (showFeedback) showFeedback(msg, isErr);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Process writing in Death Note
  const handleWriteDeathNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setIsWriting(true);

    const input = commandInput.trim();
    let action: 'ban' | 'timeout' = selectedAction;
    let target = input;
    let mins = timeoutMins;

    // Parse natural command if user typed "ban username" or "timeout username 30"
    const lower = input.toLowerCase();
    if (lower.startsWith('ban ')) {
      action = 'ban';
      target = input.slice(4).trim();
    } else if (lower.startsWith('timeout ')) {
      action = 'timeout';
      const parts = input.slice(8).trim().split(' ');
      target = parts[0];
      if (parts[1] && !isNaN(Number(parts[1]))) {
        mins = Number(parts[1]);
      }
    }

    if (!target) {
      displayNotice('Please specify a target username in the Death Note.', true);
      setIsWriting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser || 'yuno',
          action: action === 'ban' ? 'ban_user' : 'timeout_user',
          targetUser: target,
          durationMinutes: mins,
        }),
      });

      const data = await res.json();
      if (data.success) {
        displayNotice(
          action === 'ban'
            ? `💀 Name inscribed! User '${target}' has been banished by the Death Note.`
            : `⏳ Name inscribed! User '${target}' timed out for ${mins} mins by Death Note.`
        );
        setCommandInput('');
        if (onRefreshData) onRefreshData();
      } else {
        displayNotice(data.error || 'The Death Note rejected the entry.', true);
      }
    } catch (err) {
      displayNotice('Error communicating with the Death Note realm.', true);
    } finally {
      setIsWriting(false);
    }
  };

  const handleEraseName = async (targetUser: string) => {
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser || 'yuno',
          action: 'unban_user',
          targetUser: targetUser,
        }),
      });

      const data = await res.json();
      if (data.success) {
        displayNotice(`✨ Name erased! '${targetUser}' is freed from Death Note banishment.`);
        if (onRefreshData) onRefreshData();
      } else {
        displayNotice(data.error || 'Failed to erase name from Death Note', true);
      }
    } catch (e) {
      displayNotice('Error erasing name from Death Note', true);
    }
  };

  const handleRemoveTimeout = async (targetUser: string) => {
    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser || 'yuno',
          action: 'remove_timeout',
          targetUser: targetUser,
        }),
      });

      const data = await res.json();
      if (data.success) {
        displayNotice(`✨ Timeout lifted for '${targetUser}'.`);
        if (onRefreshData) onRefreshData();
      } else {
        displayNotice(data.error || 'Failed to remove timeout', true);
      }
    } catch (e) {
      displayNotice('Error removing timeout', true);
    }
  };

  const handleResolveAppeal = async (appealId: string, decision: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/appeals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: currentUser || 'yuno',
          appealId,
          decision,
        }),
      });

      const data = await res.json();
      if (data.success) {
        displayNotice(data.message || `Appeal ${decision === 'approve' ? 'Approved' : 'Rejected'}.`);
        if (onRefreshData) onRefreshData();
      } else {
        displayNotice(data.error || 'Failed to resolve appeal', true);
      }
    } catch (e) {
      displayNotice('Error responding to appeal', true);
    }
  };

  if (!isOpen) return null;

  // MINIMIZED FLOATING DEATH NOTE
  if (isMinimized) {
    return (
      <AnimatePresence>
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-6 left-6 z-50 pointer-events-auto bg-stone-950 border-2 border-stone-700 p-3 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex items-center space-x-3 text-stone-100 cursor-grab active:cursor-grabbing select-none border-t-2 border-t-stone-500 font-serif"
        >
          <div className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-700/50">
            <Skull className="w-5 h-5 animate-pulse" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest uppercase text-stone-200 flex items-center gap-1.5 font-serif">
              DEATH NOTE
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </span>
            <span className="text-[10px] font-mono text-stone-400">
              {bannedUsers.length} Banished • {appeals.filter((a) => a.status === 'PENDING').length} Appeals
            </span>
          </div>

          <div className="flex items-center space-x-1 pl-2 border-l border-stone-800">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-all"
              title="Expand Death Note"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 transition-all"
              title="Close Death Note"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Size styling classes
  const widthClass =
    sizeMode === 'large'
      ? 'max-w-6xl h-[90vh]'
      : sizeMode === 'compact'
      ? 'max-w-xl h-[70vh]'
      : 'max-w-4xl h-[82vh]';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-4 font-serif">
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`pointer-events-auto relative w-full ${widthClass} bg-stone-950 border-2 border-stone-800 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-stone-100 transition-all duration-300`}
        >
          {/* Authentic Black Leather Header Bar (Drag handle) */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-stone-950 via-zinc-900 to-stone-950 border-b border-stone-800 flex items-center justify-between cursor-grab active:cursor-grabbing select-none flex-shrink-0">
            <div className="flex items-center space-x-3">
              <GripHorizontal className="w-5 h-5 text-stone-600" />
              <div className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-800/60 shadow-inner">
                <Skull className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-stone-100 tracking-[0.2em] font-serif uppercase drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
                  DEATH NOTE
                </h2>
                <p className="text-[11px] text-stone-400 font-mono tracking-wide hidden sm:block">
                  Notebook of Banishments • Drag window header to move around screen
                </p>
              </div>
            </div>

            {/* Window Controls (Minimize, Resize, Close) */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() =>
                  setSizeMode((prev) => (prev === 'normal' ? 'large' : prev === 'large' ? 'compact' : 'normal'))
                }
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 text-xs font-mono"
                title={`Resize Window (Current: ${sizeMode})`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800"
                title="Minimize Death Note"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/50"
                title="Close Death Note"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Notebook Inscriptions / Rules / Appeals / Banned Roster) */}
          <div className="bg-stone-900/90 border-b border-stone-800 px-4 py-2 flex items-center justify-between flex-shrink-0 overflow-x-auto text-xs font-mono">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('notebook')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'notebook'
                    ? 'bg-stone-100 text-stone-950 shadow-md font-serif'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                <span>✍️ Inscribe Name</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appeals')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'appeals'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>📜 Appeals ({appeals.filter((a) => a.status === 'PENDING').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'roster'
                    ? 'bg-red-900 text-red-100 border border-red-700/50'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Skull className="w-3.5 h-3.5" />
                <span>💀 Banishments ({bannedUsers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                  activeTab === 'rules'
                    ? 'bg-stone-800 text-stone-100'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 Rules: How to Use It</span>
              </button>
            </div>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                className="p-1.5 rounded-lg bg-stone-950 text-stone-400 hover:text-stone-200 transition-colors"
                title="Refresh Death Note data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Feedback Banner */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-2 text-xs font-mono font-bold text-center border-b ${
                  feedback.error
                    ? 'bg-red-950/90 text-red-200 border-red-800'
                    : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                }`}
              >
                {feedback.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN PAGE BODY CONTENT */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-stone-800">
            {/* TAB 1: NOTEBOOK INSCRIBE PAGE (Authentic Parchment Paper Style) */}
            {activeTab === 'notebook' && (
              <div className="space-y-6">
                {/* Lined Notebook Paper Container */}
                <div className="relative p-6 sm:p-8 rounded-3xl bg-[#f8f6f0] text-stone-900 shadow-2xl border-2 border-stone-800 font-serif min-h-[380px] flex flex-col justify-between overflow-hidden">
                  {/* Subtle Notebook Blue Horizontal Lines & Left Red Margin */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{
                      backgroundImage:
                        'linear-gradient(to bottom, transparent 27px, #2563eb 28px)',
                      backgroundSize: '100% 28px',
                    }}
                  />
                  <div className="absolute top-0 bottom-0 left-12 w-[2px] bg-red-400/50 pointer-events-none" />

                  {/* Header Rules Quote */}
                  <div className="relative z-10 space-y-2 border-b-2 border-stone-900/80 pb-4 text-center">
                    <h3 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-[0.25em] uppercase font-serif">
                      HOW TO USE IT: I
                    </h3>
                    <p className="text-xs sm:text-sm italic text-stone-700 font-serif max-w-2xl mx-auto font-medium">
                      "The human whose name is written in this note shall be banished or timed out from the realm."
                    </p>
                  </div>

                  {/* Inscription Form */}
                  <form onSubmit={handleWriteDeathNote} className="relative z-10 my-6 space-y-5">
                    <div className="space-y-2">
                      <label className="block text-xs font-mono font-bold text-stone-900 uppercase tracking-widest flex items-center space-x-2">
                        <Feather className="w-4 h-4 text-stone-950" />
                        <span>Inscribe Command or Username (e.g. `ban Vortex_99` or `timeout Vortex_99 15`):</span>
                      </label>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Write target human name in notebook..."
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl bg-stone-100/90 border-2 border-stone-900 text-stone-950 font-serif text-base placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950 shadow-inner font-semibold"
                          />
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value as any)}
                            className="px-3 py-3 rounded-2xl bg-stone-900 text-stone-100 border-2 border-stone-950 text-xs font-mono font-bold focus:outline-none"
                          >
                            <option value="ban">💀 Banish (Permanent)</option>
                            <option value="timeout">⏳ Spell Timeout</option>
                          </select>

                          {selectedAction === 'timeout' && (
                            <select
                              value={timeoutMins}
                              onChange={(e) => setTimeoutMins(Number(e.target.value))}
                              className="px-3 py-3 rounded-2xl bg-stone-900 text-stone-100 border-2 border-stone-950 text-xs font-mono font-bold focus:outline-none"
                            >
                              <option value={5}>5 Mins</option>
                              <option value={15}>15 Mins</option>
                              <option value={60}>1 Hour</option>
                              <option value={1440}>24 Hours</option>
                            </select>
                          )}

                          <button
                            type="submit"
                            disabled={isWriting || !commandInput.trim()}
                            className="px-6 py-3 rounded-2xl bg-stone-950 hover:bg-red-950 text-stone-100 font-extrabold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center space-x-2 shadow-xl cursor-pointer"
                          >
                            <Feather className="w-4 h-4 text-red-400" />
                            <span>Inscribe Name</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-stone-600 italic">
                      Tip: You can type direct names or commands like <code className="text-stone-900 font-bold">ban &lt;username&gt;</code> / <code className="text-stone-900 font-bold">timeout &lt;username&gt; &lt;minutes&gt;</code>.
                    </div>
                  </form>

                  {/* Active Inscriptions Counter */}
                  <div className="relative z-10 pt-3 border-t border-stone-400 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-stone-800 gap-2">
                    <div>
                      <strong>Death Note Record:</strong> {bannedUsers.length} Banished • {timedOutUsers.length} Timed Out
                    </div>
                    <div className="italic text-stone-600">
                      Written by Shinigami: <span className="font-bold text-stone-950">{currentUser || 'yuno'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Roster Snippet inside Notebook tab */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
                    <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center justify-between border-b border-stone-800 pb-2">
                      <span>💀 Recent Banished Souls ({bannedUsers.length})</span>
                    </h4>
                    {bannedUsers.length === 0 ? (
                      <p className="text-xs text-stone-500 italic font-mono">No names written in Death Note yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {bannedUsers.slice(0, 5).map((u) => (
                          <div
                            key={u}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-red-900/40"
                          >
                            <span className="text-xs font-serif italic text-red-300">~ {u} ~</span>
                            <button
                              type="button"
                              onClick={() => handleEraseName(u)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] font-mono hover:bg-emerald-900"
                            >
                              Erase Name
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-900/60 border border-stone-800 space-y-3">
                    <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-stone-800 pb-2">
                      ⏳ Timed Out Inscriptions ({timedOutUsers.length})
                    </h4>
                    {timedOutUsers.length === 0 ? (
                      <p className="text-xs text-stone-500 italic font-mono">No timed out users.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {timedOutUsers.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-amber-900/40"
                          >
                            <span className="text-xs font-serif italic text-amber-300">~ {t.name} ~</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] font-mono text-amber-500">{t.until}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTimeout(t.name)}
                                className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px]"
                              >
                                Lift
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: APPEALS MANAGEMENT */}
            {activeTab === 'appeals' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center space-x-2 font-mono">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Submitted Ban & Timeout Appeals</span>
                  </h3>
                  <p className="text-xs text-stone-400 font-mono">
                    Review appeal petitions submitted by banished or timed out users. Approving an appeal erases their name from the Death Note.
                  </p>
                </div>

                {/* Appeals Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-500" />
                  <input
                    type="text"
                    placeholder="Search appeals by username or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Appeals List */}
                {appeals.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-500 italic font-mono text-xs">
                    No ban/timeout appeals submitted yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appeals
                      .filter(
                        (a) =>
                          !searchQuery ||
                          a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.reason.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((appeal) => (
                        <div
                          key={appeal.id}
                          className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-3 shadow-lg"
                        >
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-stone-100 font-serif">
                                ~ {appeal.username} ~
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                  appeal.type === 'BAN'
                                    ? 'bg-red-950 text-red-300 border border-red-800/50'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                }`}
                              >
                                {appeal.type} APPEAL
                              </span>
                            </div>

                            <div className="flex items-center space-x-2 text-[11px] font-mono">
                              <span className="text-stone-500">{appeal.timestamp}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  appeal.status === 'PENDING'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : appeal.status === 'APPROVED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                }`}
                              >
                                {appeal.status}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-stone-300 font-serif italic bg-stone-950 p-3 rounded-xl border border-stone-800/80">
                            "{appeal.reason}"
                          </div>

                          {appeal.status === 'PENDING' && (
                            <div className="flex items-center justify-end space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleResolveAppeal(appeal.id, 'reject')}
                                className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700/50 text-xs font-mono font-bold transition-all flex items-center space-x-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject Appeal</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResolveAppeal(appeal.id, 'approve')}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center space-x-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve (Erase Name)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BANISHED ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-red-400 font-mono flex items-center space-x-2">
                      <Skull className="w-4 h-4 text-red-500" />
                      <span>All Banished Souls ({bannedUsers.length})</span>
                    </h3>
                    <p className="text-xs text-stone-400 font-mono mt-1">
                      Full registry of usernames currently written in the Death Note notebook.
                    </p>
                  </div>
                </div>

                {bannedUsers.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-500 italic font-mono text-xs">
                    No users are currently banished.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bannedUsers.map((u) => (
                      <div
                        key={u}
                        className="p-3.5 rounded-2xl bg-stone-900/90 border border-red-900/40 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <Skull className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-serif italic text-stone-200">~ {u} ~</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleEraseName(u)}
                          className="px-3 py-1 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-xs font-mono font-bold transition-all"
                        >
                          Erase Name
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: DEATH NOTE RULES PAGE */}
            {activeTab === 'rules' && (
              <div className="space-y-6 bg-stone-900/80 p-6 rounded-3xl border border-stone-800 font-serif leading-relaxed text-sm text-stone-300">
                <div className="text-center border-b border-stone-800 pb-4 space-y-1">
                  <h3 className="text-2xl font-black text-stone-100 uppercase tracking-[0.2em]">
                    DEATH NOTE: OFFICIAL RULES
                  </h3>
                  <p className="text-xs font-mono text-stone-500">Shinigami Realm Rules & Protocols</p>
                </div>

                <div className="space-y-4 font-serif text-xs sm:text-sm">
                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                    <strong className="text-stone-100 block font-mono text-xs text-red-400">HOW TO USE IT: I</strong>
                    <p>
                      The human whose name is written in this notebook shall be banished or timed out from the chat realm.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                    <strong className="text-stone-100 block font-mono text-xs text-red-400">HOW TO USE IT: II</strong>
                    <p>
                      This note will not take effect unless the writer has the person's face/username in mind when writing their name. Therefore, people sharing the same name will not be affected.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                    <strong className="text-stone-100 block font-mono text-xs text-red-400">HOW TO USE IT: III</strong>
                    <p>
                      If the command is written as <code className="text-amber-400">ban &lt;username&gt;</code>, the user will be permanently banished. If written as <code className="text-amber-400">timeout &lt;username&gt; &lt;minutes&gt;</code>, the spell will bind them for the specified duration.
                    </p>
                  </div>

                  <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                    <strong className="text-stone-100 block font-mono text-xs text-red-400">HOW TO USE IT: IV</strong>
                    <p>
                      If a banished human submits a Ban Appeal, the Shinigami (Admin) may review their petition in the Appeals record and erase their name from the notebook to restore full access.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
