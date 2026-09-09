import React, { useState, useEffect } from 'react';
import {
  Shield,
  X,
  UserX,
  Clock,
  Flag,
  Bug,
  Megaphone,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Search,
  Check,
  Ban,
  UserCheck,
  RefreshCw,
  Key,
  Lock,
  Copy,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BanInfo, UserReportItem, BugReportItem, BanAppealItem } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUsername?: string;
  onRefreshStatus?: () => void;
  onLogout?: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  adminUsername = 'Admin',
  onRefreshStatus,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'bans' | 'timeouts' | 'reports' | 'bugs' | 'appeals' | 'ban_screen' | 'announcements' | 'security'>('bans');
  
  // Data state
  const [bannedList, setBannedList] = useState<BanInfo[]>([]);
  const [timeoutsList, setTimeoutsList] = useState<Array<{ name: string; until: string; reason?: string }>>([]);
  const [reportsList, setReportsList] = useState<UserReportItem[]>([]);
  const [bugReportsList, setBugReportsList] = useState<BugReportItem[]>([]);
  const [appealsList, setAppealsList] = useState<BanAppealItem[]>([]);
  const [banScreenImage, setBanScreenImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states
  const [newBanUser, setNewBanUser] = useState('');
  const [newBanReason, setNewBanReason] = useState('');
  const [newTimeoutUser, setNewTimeoutUser] = useState('');
  const [newTimeoutMins, setNewTimeoutMins] = useState(15);
  const [newTimeoutReason, setNewTimeoutReason] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [customBanImageUrl, setCustomBanImageUrl] = useState('');

  // Security tab states
  const [newAdminPasscode, setNewAdminPasscode] = useState('');
  const [confirmAdminPasscode, setConfirmAdminPasscode] = useState('');
  const [securityStatusMsg, setSecurityStatusMsg] = useState<string | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      if (data.bannedDetails && Array.isArray(data.bannedDetails)) {
        setBannedList(data.bannedDetails);
      } else if (data.bannedUsers && Array.isArray(data.bannedUsers)) {
        setBannedList(data.bannedUsers.map((u: string) => ({
          username: u,
          reason: 'Violating site rules and community guidelines',
          bannedAt: 'Recently',
          bannedBy: 'Admin',
        })));
      }

      if (data.timeouts) {
        const tList = Object.entries(data.timeouts).map(([name, expiry]: [string, any]) => {
          const remainingMs = Math.max(0, expiry - Date.now());
          const mins = Math.ceil(remainingMs / 60000);
          const detail = data.timeoutDetails?.[name];
          return {
            name,
            until: `${mins}m remaining`,
            reason: detail?.reason || 'Temporary moderation cooldown',
          };
        });
        setTimeoutsList(tList);
      }

      if (data.reports) setReportsList(data.reports);
      if (data.bugReports) setBugReportsList(data.bugReports);
      if (data.appeals) setAppealsList(data.appeals);
      if (data.banScreenImage) {
        setBanScreenImage(data.banScreenImage);
        setCustomBanImageUrl(data.banScreenImage);
      }
    } catch (err) {
      console.error('Failed to fetch admin status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanUser.trim()) return;

    try {
      const res = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUser: newBanUser.trim(),
          reason: newBanReason.trim() || 'Violating community guidelines and portal policies',
          adminName: adminUsername || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`User ${newBanUser} has been permanently banned from the entire site.`);
        setNewBanUser('');
        setNewBanReason('');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error banning user.');
    }
  };

  const handleUnbanUser = async (username: string) => {
    try {
      const res = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUser: username }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`User ${username} has been unbanned.`);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error unbanning user.');
    }
  };

  const handleTimeoutUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeoutUser.trim()) return;

    try {
      const res = await fetch('/api/admin/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUser: newTimeoutUser.trim(),
          durationMinutes: newTimeoutMins,
          reason: newTimeoutReason.trim() || 'Temporary cooldown',
          adminName: adminUsername || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`User ${newTimeoutUser} timed out for ${newTimeoutMins}m.`);
        setNewTimeoutUser('');
        setNewTimeoutReason('');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error applying timeout.');
    }
  };

  const handleRemoveTimeout = async (username: string) => {
    try {
      const res = await fetch('/api/admin/remove-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUser: username }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Timeout removed for ${username}.`);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error removing timeout.');
    }
  };

  const handleUpdateBanScreenImage = async () => {
    if (!customBanImageUrl.trim()) return;
    try {
      const res = await fetch('/api/admin/set-ban-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: customBanImageUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Ban screen lockout artwork updated successfully.');
        setBanScreenImage(customBanImageUrl.trim());
      }
    } catch (err) {
      showStatus('Failed to update ban image.');
    }
  };

  const handleBanImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const dataUri = event.target.result as string;
          setCustomBanImageUrl(dataUri);
          try {
            await fetch('/api/admin/set-ban-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: dataUri }),
            });
            setBanScreenImage(dataUri);
            showStatus('Custom ban image uploaded and applied successfully.');
          } catch (err) {}
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReportAction = async (reportId: string, action: 'resolve' | 'dismiss' | 'ban_target', targetUser?: string) => {
    try {
      const res = await fetch('/api/reports/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          action,
          adminName: adminUsername || 'Admin',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Report marked as ${action}.`);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error processing report.');
    }
  };

  const handleBugAction = async (bugId: string, status: 'open' | 'in_progress' | 'fixed') => {
    try {
      const res = await fetch('/api/bug-reports/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId, status }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(`Bug report updated to ${status}.`);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error updating bug status.');
    }
  };

  const handleAppealDecision = async (appealId: string, decision: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/appeals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: 'yuno',
          appealId,
          decision,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus(data.message || `Appeal ${decision}d.`);
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error resolving appeal.');
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester: 'yuno',
          action: 'post_announcement',
          announcementContent: announcementText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('Global broadcast published!');
        setAnnouncementText('');
        fetchAdminData();
      }
    } catch (err) {
      showStatus('Error posting announcement.');
    }
  };

  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPasscode.trim()) {
      setSecurityStatusMsg('Please enter a new passcode or passphrase.');
      return;
    }
    if (newAdminPasscode.trim().length < 3) {
      setSecurityStatusMsg('Passcode must be at least 3 characters.');
      return;
    }
    if (newAdminPasscode !== confirmAdminPasscode) {
      setSecurityStatusMsg('Passcodes do not match.');
      return;
    }

    try {
      const savedToken = localStorage.getItem('yuno_admin_token') || 'admin-auth-8560';
      const res = await fetch('/api/admin/change-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: savedToken,
          newCode: newAdminPasscode.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSecurityStatusMsg('Master admin passcode updated and securely stored!');
        setNewAdminPasscode('');
        setConfirmAdminPasscode('');
        showStatus('Admin passcode updated successfully!');
      } else {
        setSecurityStatusMsg(data.error || 'Failed to update passcode.');
      }
    } catch {
      setSecurityStatusMsg('Error communicating with security backend.');
    }
  };

  const handleCopyRecovery = () => {
    navigator.clipboard.writeText('yuno-master-override-99');
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
  };

  const handleLogoutSession = () => {
    try {
      localStorage.removeItem('yuno_is_admin');
      localStorage.removeItem('yuno_admin_token');
    } catch {}
    if (onLogout) onLogout();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-white tracking-wide">Administrator Master Dashboard</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-zinc-950">
                    MASTER CONTROL
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Moderation, Site Lockout, Custom Ban Art, Reports & System Broadcasts</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={fetchAdminData}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </motion.div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 p-2 bg-zinc-900/40 border-b border-zinc-800 overflow-x-auto scrollbar-none flex-shrink-0 text-xs font-medium">
            <button
              onClick={() => setActiveTab('bans')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'bans' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bans ({bannedList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('timeouts')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'timeouts' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeouts ({timeoutsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ban_screen')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'ban_screen' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Ban Screen Art</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'reports' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>User Reports ({reportsList.filter((r) => r.status === 'open').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bugs')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'bugs' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Bug Reports ({bugReportsList.filter((b) => b.status === 'open').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('appeals')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'appeals' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Appeals ({appealsList.filter((a) => a.status === 'pending' || (a as any).status === 'PENDING').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'announcements' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl transition-colors whitespace-nowrap ${
                activeTab === 'security' ? 'bg-amber-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Security & Passcode</span>
            </button>
          </div>

          {/* Main Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
            {/* 1. BANS TAB */}
            {activeTab === 'bans' && (
              <div className="space-y-6">
                {/* Form to ban new user with custom reason */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center space-x-2">
                    <UserX className="w-5 h-5 text-rose-400" />
                    <h3 className="text-sm font-bold text-white">Ban User from Site</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Banned users are completely locked out of the site and will only see the custom lockout image and your exact reason.
                  </p>

                  <form onSubmit={handleBanUser} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Target username (@handle)..."
                        value={newBanUser}
                        onChange={(e) => setNewBanUser(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Reason for Ban (shown to user)..."
                        value={newBanReason}
                        onChange={(e) => setNewBanReason(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newBanUser.trim()}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        <span>Execute Site-Wide Ban</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Banned Users Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Currently Banned Accounts ({bannedList.length})
                  </h4>

                  {bannedList.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500">
                      No users are currently banned. The community is clean!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bannedList.map((ban, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">@{ban.username}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                BANNED
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300">
                              <span className="text-zinc-500">Reason:</span> {ban.reason}
                            </p>
                            <div className="flex items-center space-x-3 text-[10px] text-zinc-500 font-mono">
                              <span>Date: {ban.bannedAt || 'Recently'}</span>
                              <span>By: {ban.bannedBy || 'Admin'}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleUnbanUser(ban.username)}
                            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-xs font-semibold text-zinc-300 transition-colors flex items-center space-x-1.5 flex-shrink-0"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unban User</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. TIMEOUTS TAB */}
            {activeTab === 'timeouts' && (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Apply User Timeout</h3>
                  </div>

                  <form onSubmit={handleTimeoutUser} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Target username..."
                        value={newTimeoutUser}
                        onChange={(e) => setNewTimeoutUser(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        required
                      />

                      <select
                        value={newTimeoutMins}
                        onChange={(e) => setNewTimeoutMins(Number(e.target.value))}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value={5}>5 Minutes</option>
                        <option value={15}>15 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={1440}>24 Hours</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Timeout reason..."
                        value={newTimeoutReason}
                        onChange={(e) => setNewTimeoutReason(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!newTimeoutUser.trim()}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Apply Timeout</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Active Timeouts ({timeoutsList.length})
                  </h4>

                  {timeoutsList.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500">
                      No active timeouts.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeoutsList.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">@{t.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {t.until}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">{t.reason}</p>
                          </div>

                          <button
                            onClick={() => handleRemoveTimeout(t.name)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                          >
                            Remove Timeout
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. BAN SCREEN IMAGE ART TAB */}
            {activeTab === 'ban_screen' && (
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Custom Banned Lockout Screen Image</h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Set the image that banned users will see when they visit the site. You can upload an image file (including GIFs!) or paste a direct image URL.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col items-center justify-center p-5 rounded-2xl bg-zinc-950 border border-dashed border-zinc-700 hover:border-amber-500 cursor-pointer transition-colors text-xs text-zinc-300 space-y-2">
                      <Upload className="w-6 h-6 text-amber-400" />
                      <span className="font-semibold">Upload Image or GIF...</span>
                      <span className="text-[10px] text-zinc-500">PNG, JPG, WEBP, GIF</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBanImageUpload} />
                    </label>

                    <div className="space-y-3 flex flex-col justify-center">
                      <label className="text-xs font-mono text-zinc-400 uppercase">Or Paste Direct URL:</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="url"
                          value={customBanImageUrl}
                          onChange={(e) => setCustomBanImageUrl(e.target.value)}
                          placeholder="https://image-url.jpg or .gif..."
                          className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateBanScreenImage}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors"
                        >
                          Save Art
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Current Ban Screen Preview
                  </h4>
                  <div className="relative h-64 w-full rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                    {banScreenImage ? (
                      <img src={banScreenImage} alt="Ban Screen Lockout" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-zinc-600 text-xs">No custom image set (using default)</div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-6 text-center">
                      <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mb-2">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-black text-white">ACCESS SUSPENDED — ACCOUNT BANNED</h3>
                      <p className="text-xs text-zinc-300 max-w-md mt-1">
                        Reason: Violating community standards and guidelines
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. USER & CHAT REPORTS TAB */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                    Moderation Reports Queue ({reportsList.length})
                  </h4>
                </div>

                {reportsList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500">
                    No reports submitted yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportsList.map((rep) => (
                      <div
                        key={rep.id}
                        className={`p-4 rounded-2xl bg-zinc-900 border ${
                          rep.status === 'open' ? 'border-amber-500/40' : 'border-zinc-800 opacity-70'
                        } space-y-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-amber-400 border border-zinc-700">
                                {rep.type.toUpperCase()} REPORT
                              </span>
                              <span className="text-xs text-zinc-400 font-mono">From @{rep.reporter}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{rep.timestamp}</span>
                            </div>

                            {rep.targetUser && (
                              <p className="text-xs font-bold text-white">
                                Target User: <span className="text-amber-400">@{rep.targetUser}</span>
                              </p>
                            )}

                            {rep.messageContent && (
                              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono">
                                "{rep.messageContent}"
                              </div>
                            )}

                            <p className="text-xs text-zinc-200">
                              <span className="text-zinc-500 font-medium">Reason:</span> {rep.reason}
                            </p>
                            {rep.details && (
                              <p className="text-xs text-zinc-400">
                                <span className="text-zinc-500 font-medium">Details:</span> {rep.details}
                              </p>
                            )}
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                              rep.status === 'open'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : rep.status === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {rep.status.toUpperCase()}
                          </span>
                        </div>

                        {rep.status === 'open' && (
                          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                            {rep.targetUser && (
                              <button
                                onClick={() => handleReportAction(rep.id, 'ban_target', rep.targetUser)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                              >
                                Ban @{rep.targetUser}
                              </button>
                            )}
                            <button
                              onClick={() => handleReportAction(rep.id, 'dismiss')}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleReportAction(rep.id, 'resolve')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. BUG REPORTS TAB */}
            {activeTab === 'bugs' && (
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Submitted Bug Reports ({bugReportsList.length})
                </h4>

                {bugReportsList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500">
                    No bug reports found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bugReportsList.map((bug) => (
                      <div
                        key={bug.id}
                        className={`p-4 rounded-2xl bg-zinc-900 border ${
                          bug.status === 'open' ? 'border-amber-500/40' : 'border-zinc-800 opacity-75'
                        } space-y-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-cyan-400 border border-zinc-700">
                                {bug.category}
                              </span>
                              <span className="text-xs text-zinc-400">By @{bug.reporter}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{bug.timestamp}</span>
                            </div>

                            <h4 className="text-sm font-bold text-white">{bug.title}</h4>
                            <p className="text-xs text-zinc-300 leading-relaxed font-sans">{bug.description}</p>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                              bug.status === 'open'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : bug.status === 'in_progress'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {bug.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                          {bug.status !== 'in_progress' && (
                            <button
                              onClick={() => handleBugAction(bug.id, 'in_progress')}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition-colors"
                            >
                              In Progress
                            </button>
                          )}
                          {bug.status !== 'fixed' && (
                            <button
                              onClick={() => handleBugAction(bug.id, 'fixed')}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                            >
                              Mark Fixed
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. APPEALS TAB */}
            {activeTab === 'appeals' && (
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Ban & Timeout Petitions ({appealsList.length})
                </h4>

                {appealsList.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500">
                    No pending appeals.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appealsList.map((appeal) => {
                      const isPending = appeal.status === 'pending' || (appeal as any).status === 'PENDING';
                      return (
                        <div
                          key={appeal.id}
                          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">@{appeal.username}</span>
                                <span className="text-[10px] text-zinc-500 font-mono">{appeal.timestamp}</span>
                              </div>
                              <p className="text-xs text-zinc-300 italic">"{appeal.reason}"</p>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                                isPending
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : appeal.status === 'approved' || (appeal as any).status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {appeal.status.toUpperCase()}
                            </span>
                          </div>

                          {isPending && (
                            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                              <button
                                onClick={() => handleAppealDecision(appeal.id, 'reject')}
                                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-600 hover:text-white text-xs font-semibold text-zinc-300 transition-colors"
                              >
                                Reject Appeal
                              </button>
                              <button
                                onClick={() => handleAppealDecision(appeal.id, 'approve')}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                              >
                                Approve & Restore Access
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 7. BROADCAST ANNOUNCEMENTS TAB */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Megaphone className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Publish Global Broadcast</h3>
                  </div>

                  <form onSubmit={handlePostAnnouncement} className="space-y-3">
                    <textarea
                      rows={3}
                      placeholder="Write global broadcast message for all active users..."
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      required
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!announcementText.trim()}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Megaphone className="w-4 h-4" />
                        <span>Send Broadcast</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 8. SECURITY & PASSCODE MANAGEMENT TAB */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <Key className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Change Admin Master Passcode</h3>
                      <p className="text-xs text-zinc-400">Update your security passcode or keyphrase for logging into the admin terminal.</p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePasscode} className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          New Passcode / Passphrase
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new master passcode..."
                          value={newAdminPasscode}
                          onChange={(e) => {
                            setNewAdminPasscode(e.target.value);
                            setSecurityStatusMsg(null);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Confirm New Passcode
                        </label>
                        <input
                          type="password"
                          placeholder="Re-enter to confirm..."
                          value={confirmAdminPasscode}
                          onChange={(e) => {
                            setConfirmAdminPasscode(e.target.value);
                            setSecurityStatusMsg(null);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {securityStatusMsg && (
                      <p className="text-xs text-amber-400 font-medium">
                        {securityStatusMsg}
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={!newAdminPasscode.trim() || !confirmAdminPasscode.trim()}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Update Master Passcode</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Master Recovery Key Info */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Master Override Recovery Key
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        If you ever forget your custom passcode, you can always authenticate using this permanent override key.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyRecovery}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      {copiedRecovery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRecovery ? 'Copied!' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-amber-400 select-all">
                    yuno-master-override-99
                  </div>
                </div>

                {/* Session Logout Control */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Lock Terminal & End Session
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Clears your device authentication token and returns to standard user mode.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoutSession}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out Admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
