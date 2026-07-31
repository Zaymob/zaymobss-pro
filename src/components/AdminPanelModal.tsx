import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  Clock,
  Megaphone,
  Sparkles,
  Trash2,
  RefreshCw,
  UserX,
  UserCheck,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  Globe,
  Sliders,
  Terminal,
  Volume2,
  X,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  RadioTower,
  Bell,
  Eye,
  Settings,
  Crown,
  Award,
  Star,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onRevokeAdmin?: () => void;
}

interface ServerTelemetry {
  cpuUsage: number;
  memoryUsageMB: number;
  activeSockets: number;
  latencyMs: number;
  uptimeSeconds: number;
  logs: string[];
}

export type UserRole = 'ADMIN' | 'MODERATOR' | 'PARTNER' | 'VIP' | 'MEMBER';

export interface RoleUserItem {
  username: string;
  role: UserRole;
  badge: string;
  partnerPerks: {
    featuredSpotlight: boolean;
    highSpeedProxy: boolean;
    goldChatGlow: boolean;
    verifiedBadge: boolean;
  };
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onRevokeAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'moderation' | 'roles' | 'telemetry' | 'announcements' | 'site_controls' | 'trolls' | 'filters'
  >('moderation');

  const [targetUser, setTargetUser] = useState<string>('');
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'emergency'>('info');
  const [timeoutMins, setTimeoutMins] = useState<number>(10);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // User Roles & Partner Management State
  const [userRoles, setUserRoles] = useState<RoleUserItem[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_user_roles_list');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        username: 'Exantus',
        role: 'ADMIN',
        badge: '👑 ADMIN',
        partnerPerks: { featuredSpotlight: true, highSpeedProxy: true, goldChatGlow: true, verifiedBadge: true },
      },
      {
        username: 'Vortex_Dev',
        role: 'PARTNER',
        badge: '⚡ PARTNER',
        partnerPerks: { featuredSpotlight: true, highSpeedProxy: true, goldChatGlow: true, verifiedBadge: true },
      },
      {
        username: 'Aura_Gamer',
        role: 'PARTNER',
        badge: '⚡ PARTNER',
        partnerPerks: { featuredSpotlight: true, highSpeedProxy: true, goldChatGlow: true, verifiedBadge: true },
      },
      {
        username: 'Shadow_Mod',
        role: 'MODERATOR',
        badge: '🛡️ MOD',
        partnerPerks: { featuredSpotlight: false, highSpeedProxy: true, goldChatGlow: false, verifiedBadge: true },
      },
      {
        username: 'Luna_VIP',
        role: 'VIP',
        badge: '💎 VIP',
        partnerPerks: { featuredSpotlight: false, highSpeedProxy: true, goldChatGlow: false, verifiedBadge: true },
      },
      {
        username: 'Cyber_User',
        role: 'MEMBER',
        badge: '👤 MEMBER',
        partnerPerks: { featuredSpotlight: false, highSpeedProxy: false, goldChatGlow: false, verifiedBadge: false },
      },
    ];
  });

  const [newRoleUsername, setNewRoleUsername] = useState<string>('');
  const [newRoleSelected, setNewRoleSelected] = useState<UserRole>('PARTNER');

  useEffect(() => {
    try {
      localStorage.setItem('yuno_user_roles_list', JSON.stringify(userRoles));
    } catch (e) {}
  }, [userRoles]);

  const handleUpdateRole = (username: string, nextRole: UserRole) => {
    setUserRoles((prev) =>
      prev.map((u) => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          let badge = '👤 MEMBER';
          if (nextRole === 'ADMIN') badge = '👑 ADMIN';
          if (nextRole === 'MODERATOR') badge = '🛡️ MOD';
          if (nextRole === 'PARTNER') badge = '⚡ PARTNER';
          if (nextRole === 'VIP') badge = '💎 VIP';

          const isPartner = nextRole === 'PARTNER' || nextRole === 'ADMIN';
          return {
            ...u,
            role: nextRole,
            badge,
            partnerPerks: {
              featuredSpotlight: isPartner,
              highSpeedProxy: true,
              goldChatGlow: isPartner,
              verifiedBadge: isPartner || nextRole === 'MODERATOR' || nextRole === 'VIP',
            },
          };
        }
        return u;
      })
    );
    showFeedback(`Updated role for '${username}' to ${nextRole}`);
    addTelemetryLog(`Changed role of ${username} -> ${nextRole}`);
  };

  const handleTogglePartnerPerk = (username: string, perkKey: keyof RoleUserItem['partnerPerks']) => {
    setUserRoles((prev) =>
      prev.map((u) => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          return {
            ...u,
            partnerPerks: {
              ...u.partnerPerks,
              [perkKey]: !u.partnerPerks[perkKey],
            },
          };
        }
        return u;
      })
    );
    showFeedback(`Updated Partner Perk '${perkKey}' for ${username}`);
  };

  const handleAddUserRole = () => {
    if (!newRoleUsername.trim()) return;
    const name = newRoleUsername.trim();
    if (userRoles.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
      showFeedback(`User '${name}' already exists in role matrix.`, true);
      return;
    }

    let badge = '👤 MEMBER';
    if (newRoleSelected === 'ADMIN') badge = '👑 ADMIN';
    if (newRoleSelected === 'MODERATOR') badge = '🛡️ MOD';
    if (newRoleSelected === 'PARTNER') badge = '⚡ PARTNER';
    if (newRoleSelected === 'VIP') badge = '💎 VIP';

    const isPartner = newRoleSelected === 'PARTNER' || newRoleSelected === 'ADMIN';

    const newUser: RoleUserItem = {
      username: name,
      role: newRoleSelected,
      badge,
      partnerPerks: {
        featuredSpotlight: isPartner,
        highSpeedProxy: true,
        goldChatGlow: isPartner,
        verifiedBadge: isPartner || newRoleSelected === 'MODERATOR' || newRoleSelected === 'VIP',
      },
    };

    setUserRoles([...userRoles, newUser]);
    setNewRoleUsername('');
    showFeedback(`Added user '${name}' with role ${newRoleSelected}`);
    addTelemetryLog(`Added role mapping: ${name} -> ${newRoleSelected}`);
  };

  // Global Site Toggles State
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(() => {
    return localStorage.getItem('yuno_maintenance_mode') === 'true';
  });
  const [proxyStrictFilter, setProxyStrictFilter] = useState<boolean>(true);
  const [customBannerMessage, setCustomBannerMessage] = useState<string>(() => {
    return localStorage.getItem('yuno_global_announcement') || '';
  });

  // Banned / Timed out users list in state
  const [bannedUsers, setBannedUsers] = useState<string[]>(['SpamBot_99', 'AbusiveUser_12']);
  const [timedOutUsers, setTimedOutUsers] = useState<Array<{ name: string; until: string }>>([
    { name: 'TrollGuy', until: '15m remaining' },
  ]);

  // Telemetry simulation
  const [telemetry, setTelemetry] = useState<ServerTelemetry>({
    cpuUsage: 18,
    memoryUsageMB: 142,
    activeSockets: 24,
    latencyMs: 14,
    uptimeSeconds: 84920,
    logs: [
      '[SYSTEM] Yunø Core Server running on Node.js v20.12',
      '[AUTH] Secret Developer Override validated via AI Chat',
      '[WEBSOCKET] 24 active realtime peer sockets connected',
      '[PROXY] Latency average 14ms across proxy relays',
    ],
  });

  // Custom badwords
  const [badwords, setBadwords] = useState<string[]>(['spam', 'scam', 'abuse']);
  const [newBadword, setNewBadword] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Refresh telemetry metrics periodically
      const interval = setInterval(() => {
        setTelemetry((prev) => ({
          ...prev,
          cpuUsage: Math.min(95, Math.max(8, prev.cpuUsage + (Math.floor(Math.random() * 9) - 4))),
          memoryUsageMB: Math.min(500, Math.max(120, prev.memoryUsageMB + (Math.floor(Math.random() * 5) - 2))),
          latencyMs: Math.min(45, Math.max(9, prev.latencyMs + (Math.floor(Math.random() * 5) - 2))),
        }));
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showFeedback = (text: string, error = false) => {
    setFeedbackMsg({ text, error });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const addTelemetryLog = (msg: string) => {
    setTelemetry((prev) => ({
      ...prev,
      logs: [`[ADMIN ACTION ${new Date().toLocaleTimeString()}] ${msg}`, ...prev.logs.slice(0, 20)],
    }));
  };

  const handleBanUser = () => {
    if (!targetUser.trim()) return;
    const name = targetUser.trim();
    if (!bannedUsers.includes(name)) {
      setBannedUsers([...bannedUsers, name]);
      showFeedback(`User '${name}' has been banned.`);
      addTelemetryLog(`Banned user: ${name}`);
    }
    setTargetUser('');
  };

  const handleUnbanUser = (name: string) => {
    setBannedUsers(bannedUsers.filter((u) => u !== name));
    showFeedback(`Unbanned user '${name}'.`);
    addTelemetryLog(`Unbanned user: ${name}`);
  };

  const handleTimeoutUser = () => {
    if (!targetUser.trim()) return;
    const name = targetUser.trim();
    setTimedOutUsers([...timedOutUsers, { name, until: `${timeoutMins} mins` }]);
    showFeedback(`Timed out '${name}' for ${timeoutMins} minutes.`);
    addTelemetryLog(`Timed out ${name} for ${timeoutMins}m`);
    setTargetUser('');
  };

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) return;
    const msg = announcementText.trim();
    setCustomBannerMessage(msg);

    try {
      await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iconEmoji: announcementType === 'emergency' ? '🚨' : announcementType === 'warning' ? '⚠️' : '📢',
          title: 'Global Broadcast:',
          description: msg,
          content: msg,
          badge: announcementType.toUpperCase(),
          author: 'Admin',
        }),
      });
    } catch (e) {
      console.error('Failed to post announcement:', e);
    }

    showFeedback('Global announcement broadcasted to server successfully!');
    addTelemetryLog(`Broadcasted announcement: ${msg}`);
    setAnnouncementText('');
  };

  const handleClearAnnouncements = async () => {
    setCustomBannerMessage('');
    try {
      await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: 'Yuno dev isa',
          action: 'clear_announcements',
        }),
      });
    } catch (e) {
      console.error('Failed to clear announcements:', e);
    }
    showFeedback('Cleared all global announcements on server.');
    addTelemetryLog('Cleared global announcements.');
  };

  const handleToggleMaintenance = () => {
    const nextVal = !maintenanceMode;
    setMaintenanceMode(nextVal);
    localStorage.setItem('yuno_maintenance_mode', String(nextVal));
    showFeedback(nextVal ? 'Maintenance Mode ENABLED' : 'Maintenance Mode DISABLED');
    addTelemetryLog(`Maintenance Mode set to ${nextVal}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-zinc-950 border border-amber-500/40 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Bar Header */}
          <div className="p-5 bg-gradient-to-r from-amber-950/80 via-zinc-900 to-zinc-950 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Yunø Developer & Admin System Controls
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black shadow">
                    SECRET ACCESS GRANTED
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  User moderation, real-time telemetry, site controls, global announcements & troll tools
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {onRevokeAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onRevokeAdmin();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono text-xs transition-colors flex items-center space-x-1"
                  title="Lock & Revoke Admin Clearance"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Admin</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isAdmin ? (
            /* Restricted View */
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 mx-auto flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Clearance Required</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Admin controls are restricted. Pass the secret override phrase to the AI Assistant to grant full developer privileges.
              </p>
            </div>
          ) : (
            <>
              {/* Tabs Navigation */}
              <div className="flex items-center space-x-1 px-5 pt-3 bg-zinc-900/80 border-b border-zinc-800 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('moderation')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'moderation'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  <span>User Moderation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'roles'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Roles & Partner Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('telemetry')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'telemetry'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Server Telemetry</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'announcements'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Global Broadcasts</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('site_controls')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'site_controls'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Site & System Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('trolls')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'trolls'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Troll Utilities</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('filters')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-2xl text-xs font-bold transition-all border-t border-x ${
                    activeTab === 'filters'
                      ? 'bg-zinc-950 border-amber-500/50 text-amber-400 shadow-lg'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Chat Filters</span>
                </button>
              </div>

              {/* Feedback toast */}
              {feedbackMsg && (
                <div
                  className={`px-5 py-2 text-xs font-bold flex items-center justify-between ${
                    feedbackMsg.error
                      ? 'bg-red-500/20 text-red-300 border-b border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
                  }`}
                >
                  <span>{feedbackMsg.text}</span>
                  <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setFeedbackMsg(null)} />
                </div>
              )}

              {/* Tab Contents */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-200">
                {/* TAB 1: MODERATION */}
                {activeTab === 'moderation' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                      <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Target User Action
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Target Username (e.g. Vortex_99)"
                          value={targetUser}
                          onChange={(e) => setTargetUser(e.target.value)}
                          className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />

                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-zinc-400">Timeout:</span>
                          <select
                            value={timeoutMins}
                            onChange={(e) => setTimeoutMins(Number(e.target.value))}
                            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500 flex-1"
                          >
                            <option value={5}>5 Minutes</option>
                            <option value={15}>15 Minutes</option>
                            <option value={60}>1 Hour</option>
                            <option value={1440}>24 Hours</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTimeoutUser}
                            disabled={!targetUser}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-bold disabled:opacity-50 transition-all"
                          >
                            Timeout
                          </button>
                          <button
                            type="button"
                            onClick={handleBanUser}
                            disabled={!targetUser}
                            className="flex-1 py-2 px-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 text-xs font-bold disabled:opacity-50 transition-all"
                          >
                            Ban User
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Banned List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-mono font-bold text-red-400 uppercase flex items-center justify-between">
                          <span>Banned Users ({bannedUsers.length})</span>
                        </h4>
                        {bannedUsers.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic">No banned users.</p>
                        ) : (
                          <div className="space-y-2">
                            {bannedUsers.map((u) => (
                              <div
                                key={u}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/20 border border-red-500/30"
                              >
                                <span className="text-xs font-bold text-red-200">{u}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUnbanUser(u)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/30"
                                >
                                  Unban
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">
                          Timed Out Chatters ({timedOutUsers.length})
                        </h4>
                        <div className="space-y-2">
                          {timedOutUsers.map((t, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30"
                            >
                              <span className="text-xs font-bold text-amber-200">{t.name}</span>
                              <span className="text-[10px] font-mono text-amber-400">{t.until}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: ROLES & PARTNER MATRIX */}
                {activeTab === 'roles' && (
                  <div className="space-y-6">
                    {/* Top Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 flex items-center space-x-3">
                        <Crown className="w-8 h-8 text-amber-400 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Active Partners</div>
                          <div className="text-xl font-black text-amber-300">
                            {userRoles.filter((u) => u.role === 'PARTNER').length} Verified
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <Award className="w-8 h-8 text-cyan-400 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Total Privileged Roles</div>
                          <div className="text-xl font-black text-white">
                            {userRoles.filter((u) => u.role !== 'MEMBER').length} Users
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <Star className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                        <div>
                          <div className="text-[10px] text-zinc-400 font-mono uppercase font-bold">Partner Spotlight Perks</div>
                          <div className="text-xl font-black text-white">Unlimited High-Speed</div>
                        </div>
                      </div>
                    </div>

                    {/* Add New User Role */}
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                      <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Assign Role or Promote Partner</span>
                      </h3>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="Username to assign (e.g. Nexus_Creator)"
                          value={newRoleUsername}
                          onChange={(e) => setNewRoleUsername(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />

                        <select
                          value={newRoleSelected}
                          onChange={(e) => setNewRoleSelected(e.target.value as UserRole)}
                          className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        >
                          <option value="PARTNER">⚡ PARTNER (Gold Verification & Perks)</option>
                          <option value="ADMIN">👑 ADMIN (Full Control Clearance)</option>
                          <option value="MODERATOR">🛡️ MODERATOR (Chat & User Mod)</option>
                          <option value="VIP">💎 VIP (Custom Badge)</option>
                          <option value="MEMBER">👤 MEMBER (Standard User)</option>
                        </select>

                        <button
                          type="button"
                          onClick={handleAddUserRole}
                          disabled={!newRoleUsername.trim()}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                        >
                          Grant Role
                        </button>
                      </div>
                    </div>

                    {/* Roles Matrix User Directory */}
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          User Roles Directory & Partner Perks Control
                        </h4>
                        <span className="text-[11px] font-mono text-amber-400 font-bold">
                          {userRoles.length} Managed Users
                        </span>
                      </div>

                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {userRoles.map((u) => {
                          const isPartnerRole = u.role === 'PARTNER' || u.role === 'ADMIN';

                          return (
                            <div
                              key={u.username}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                u.role === 'PARTNER'
                                  ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                                  : u.role === 'ADMIN'
                                  ? 'bg-amber-500/10 border-amber-500/50'
                                  : 'bg-zinc-950/60 border-zinc-800'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white">
                                  {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-white text-xs">{u.username}</span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                                        u.role === 'PARTNER'
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                          : u.role === 'ADMIN'
                                          ? 'bg-amber-500 text-black border-amber-400'
                                          : u.role === 'MODERATOR'
                                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                          : u.role === 'VIP'
                                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                      }`}
                                    >
                                      {u.badge}
                                    </span>
                                  </div>

                                  {/* Partner Specific Perks Toggles */}
                                  {isPartnerRole && (
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePartnerPerk(u.username, 'featuredSpotlight')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all border ${
                                          u.partnerPerks.featuredSpotlight
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                        }`}
                                      >
                                        ⭐ Spotlight
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleTogglePartnerPerk(u.username, 'highSpeedProxy')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all border ${
                                          u.partnerPerks.highSpeedProxy
                                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                        }`}
                                      >
                                        ⚡ Priority Proxy
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleTogglePartnerPerk(u.username, 'goldChatGlow')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all border ${
                                          u.partnerPerks.goldChatGlow
                                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                        }`}
                                      >
                                        ✨ Gold Chat
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Role Selector */}
                              <div className="flex items-center space-x-2 w-full md:w-auto">
                                <span className="text-[11px] text-zinc-400 font-mono">Role:</span>
                                <select
                                  value={u.role}
                                  onChange={(e) => handleUpdateRole(u.username, e.target.value as UserRole)}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                                >
                                  <option value="MEMBER">Member</option>
                                  <option value="VIP">VIP</option>
                                  <option value="MODERATOR">Moderator</option>
                                  <option value="PARTNER">Partner ⚡</option>
                                  <option value="ADMIN">Admin 👑</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TELEMETRY */}
                {activeTab === 'telemetry' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <Cpu className="w-8 h-8 text-amber-400" />
                        <div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">CPU Load</div>
                          <div className="text-xl font-black text-white">{telemetry.cpuUsage}%</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <HardDrive className="w-8 h-8 text-cyan-400" />
                        <div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">Memory</div>
                          <div className="text-xl font-black text-white">{telemetry.memoryUsageMB} MB</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <RadioTower className="w-8 h-8 text-emerald-400" />
                        <div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">Active Sockets</div>
                          <div className="text-xl font-black text-white">{telemetry.activeSockets}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center space-x-3">
                        <Zap className="w-8 h-8 text-purple-400" />
                        <div>
                          <div className="text-[10px] text-zinc-500 font-mono uppercase">Latency</div>
                          <div className="text-xl font-black text-white">{telemetry.latencyMs} ms</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center space-x-2">
                          <Terminal className="w-4 h-4" />
                          <span>Realtime Server System Log Stream</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setTelemetry((p) => ({ ...p, logs: [] }))}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono"
                        >
                          Clear Logs
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black font-mono text-xs text-emerald-400 max-h-56 overflow-y-auto space-y-1 border border-zinc-800">
                        {telemetry.logs.length === 0 ? (
                          <div className="text-zinc-600 italic">No logs recorded.</div>
                        ) : (
                          telemetry.logs.map((log, i) => <div key={i}>{log}</div>)
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ANNOUNCEMENTS */}
                {activeTab === 'announcements' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                      <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Broadcast Site-Wide Banner Announcement
                      </h3>
                      <textarea
                        rows={3}
                        placeholder="Type global broadcast message..."
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-zinc-400">Banner Style:</span>
                          {(['info', 'warning', 'emergency'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setAnnouncementType(t)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize ${
                                announcementType === t
                                  ? 'bg-amber-500 text-black'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleClearAnnouncements}
                            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold"
                          >
                            Clear Announcement
                          </button>
                          <button
                            type="button"
                            onClick={handlePostAnnouncement}
                            disabled={!announcementText.trim()}
                            className="px-5 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow hover:brightness-110 disabled:opacity-50"
                          >
                            Broadcast Now
                          </button>
                        </div>
                      </div>
                    </div>

                    {customBannerMessage && (
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                        <strong className="block text-amber-400 mb-1 uppercase font-mono">Current Active Broadcast:</strong>
                        {customBannerMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: SITE CONTROLS */}
                {activeTab === 'site_controls' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Maintenance Mode */}
                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Maintenance Mode</h4>
                          <p className="text-xs text-zinc-400">Displays system maintenance message to visitors</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleToggleMaintenance}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            maintenanceMode
                              ? 'bg-red-500 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {maintenanceMode ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      {/* Proxy Strict Mode */}
                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">Strict Proxy Safety Filter</h4>
                          <p className="text-xs text-zinc-400">Enforce domain blacklisting on web proxy tab</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProxyStrictFilter(!proxyStrictFilter);
                            showFeedback(`Proxy strict filter set to ${!proxyStrictFilter}`);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            proxyStrictFilter
                              ? 'bg-emerald-500 text-black'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {proxyStrictFilter ? 'ACTIVE' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: TROLL UTILITIES */}
                {activeTab === 'trolls' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                        <h4 className="text-sm font-bold text-white">🎉 Confetti Shower</h4>
                        <p className="text-xs text-zinc-400">Triggers screen-wide celebration confetti effect</p>
                        <button
                          type="button"
                          onClick={() => {
                            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                            showFeedback('🎉 Confetti launched!');
                          }}
                          className="w-full py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-500/30"
                        >
                          Launch Confetti
                        </button>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                        <h4 className="text-sm font-bold text-white">⚠️ Fake System Alert</h4>
                        <p className="text-xs text-zinc-400">Trigger a simulated system warning toast</p>
                        <button
                          type="button"
                          onClick={() => showFeedback('⚠️ System OVERDRIVE: Developer override active!', true)}
                          className="w-full py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30"
                        >
                          Trigger Alert
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 6: FILTERS */}
                {activeTab === 'filters' && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                      <h3 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Chat Badword Filter Management
                      </h3>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newBadword}
                          onChange={(e) => setNewBadword(e.target.value)}
                          placeholder="Add badword to censor list..."
                          className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newBadword.trim() && !badwords.includes(newBadword.trim().toLowerCase())) {
                              setBadwords([...badwords, newBadword.trim().toLowerCase()]);
                              setNewBadword('');
                              showFeedback('Added badword to censor list.');
                            }
                          }}
                          className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl"
                        >
                          Add Word
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {badwords.map((w) => (
                          <span
                            key={w}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center space-x-1"
                          >
                            <span>{w}</span>
                            <X
                              className="w-3 h-3 text-red-400 hover:text-red-300 cursor-pointer ml-1"
                              onClick={() => setBadwords(badwords.filter((item) => item !== w))}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
