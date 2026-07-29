import React, { useState, useEffect } from 'react';
import { WALLPAPERS, DEFAULT_ANNOUNCEMENTS, DEFAULT_PARTNERS } from '../data/portalData';
import { WallpaperOption, AnnouncementItem, PartnerItem } from '../types';
import {
  Settings,
  Image,
  RotateCcw,
  Palette,
  Check,
  Sparkles,
  Sliders,
  Upload,
  ShieldAlert,
  Lock,
  ToggleLeft,
  ToggleRight,
  Pipette,
  RefreshCw,
  Megaphone,
  Handshake,
  ExternalLink,
  Plus,
  Trash2,
  Globe,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { extractWallpaperColors, applyThemeToCSS, ExtractedTheme } from '../utils/colorExtractor';

interface SettingsViewProps {
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  onReplayBoot: () => void;
  onOpenAdminPanel?: () => void;
  isAdmin?: boolean;
  onRevokeAdmin?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentWallpaper,
  onSelectWallpaper,
  onReplayBoot,
  onOpenAdminPanel,
  isAdmin = false,
  onRevokeAdmin,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [extractedTheme, setExtractedTheme] = useState<ExtractedTheme | null>(() => {
    try {
      const saved = localStorage.getItem('yuno_active_wallpaper_theme');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isAdminPanelEnabled, setIsAdminPanelEnabled] = useState<boolean>(() => {
    return localStorage.getItem('yuno_admin_panel_enabled') !== 'false';
  });

  // Announcements State & Admin Creator
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);
  const [isAddingAnn, setIsAddingAnn] = useState(false);
  const [newAnnEmoji, setNewAnnEmoji] = useState('🚀');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnDesc, setNewAnnDesc] = useState('');

  // Partners State & Admin Creator
  const [partners, setPartners] = useState<PartnerItem[]>(DEFAULT_PARTNERS);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerUrl, setPartnerUrl] = useState('');
  const [partnerLogo, setPartnerLogo] = useState('');
  const [partnerDesc, setPartnerDesc] = useState('');

  // Fetch announcements & partners from global server with localStorage backup
  const fetchGlobalData = async () => {
    try {
      // First sync client local items with server
      const localAnnRaw = localStorage.getItem('yuno_announcements');
      const localPartRaw = localStorage.getItem('yuno_partners');
      const clientAnnouncements = localAnnRaw ? JSON.parse(localAnnRaw) : [];
      const clientPartners = (localPartRaw ? JSON.parse(localPartRaw) : []).filter(
        (p: any) => p && p.id !== 'part-1' && p.id !== 'part-2' && !/gartic|vidsrc/i.test(p.name || '')
      );

      if (clientAnnouncements.length > 0 || clientPartners.length > 0) {
        await fetch('/api/sync-persisted-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientAnnouncements, clientPartners }),
        }).catch(() => {});
      }

      const [annRes, partRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/partners'),
      ]);
      if (annRes.ok) {
        const annData = await annRes.json();
        if (Array.isArray(annData.announcements)) {
          setAnnouncements(annData.announcements);
          localStorage.setItem('yuno_announcements', JSON.stringify(annData.announcements));
        }
      }
      if (partRes.ok) {
        const partData = await partRes.json();
        if (Array.isArray(partData.partners)) {
          const cleanPartners = partData.partners.filter(
            (p: any) => p && p.id !== 'part-1' && p.id !== 'part-2' && !/gartic|vidsrc/i.test(p.name || '')
          );
          setPartners(cleanPartners);
          localStorage.setItem('yuno_partners', JSON.stringify(cleanPartners));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch global announcements/partners:', e);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleExtractTheme = async (urlToProcess?: string) => {
    const target = urlToProcess || currentWallpaper;
    if (!target) return;
    setIsExtractingColors(true);
    try {
      const theme = await extractWallpaperColors(target);
      setExtractedTheme(theme);
      applyThemeToCSS(theme);
      localStorage.setItem('yuno_active_wallpaper_theme', JSON.stringify(theme));
    } catch (e) {
      console.warn("Color extraction notice:", e);
    } finally {
      setIsExtractingColors(false);
    }
  };

  useEffect(() => {
    if (extractedTheme) {
      applyThemeToCSS(extractedTheme);
    }
  }, []);

  const getCurrentUsername = () => {
    try {
      const saved = localStorage.getItem('yuno_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username) return parsed.username;
      }
    } catch (e) {}
    return 'Guest';
  };

  const currentUsername = getCurrentUsername();

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnDesc.trim()) return;

    let formattedTitle = newAnnTitle.trim();
    if (!formattedTitle.endsWith(':') && !formattedTitle.endsWith('!')) {
      formattedTitle += ':';
    }

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          iconEmoji: newAnnEmoji || '🚀',
          title: formattedTitle,
          description: newAnnDesc.trim(),
          badge: 'ADMIN',
          author: currentUsername || 'Admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      }
    } catch (err) {
      console.error('Error posting announcement to server:', err);
    }

    setNewAnnTitle('');
    setNewAnnDesc('');
    setIsAddingAnn(false);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      }
    } catch (err) {
      console.error('Error deleting announcement from server:', err);
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim() || !partnerUrl.trim()) return;

    let targetUrl = partnerUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const res = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: partnerName.trim(),
          logo: partnerLogo.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          url: targetUrl,
          description: partnerDesc.trim() || 'Verified official partner of Yunø.',
          addedAt: new Date().toLocaleDateString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.partners)) {
          setPartners(data.partners);
        }
      }
    } catch (err) {
      console.error('Error adding partner to server:', err);
    }

    setPartnerName('');
    setPartnerUrl('');
    setPartnerLogo('');
    setPartnerDesc('');
    setIsAddingPartner(false);
  };

  const handleDeletePartner = async (id: string) => {
    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.partners)) {
          setPartners(data.partners);
        }
      }
    } catch (err) {
      console.error('Error deleting partner from server:', err);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelectWallpaper(customUrl.trim());
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="border-b border-zinc-800/80 pb-6">
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
          <Settings className="w-4 h-4" />
          <span>Yunø System Preferences</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white mt-1">Customization & Admin Controls</h1>
      </div>

      {/* Admin Panel Access Section */}
      {isAdmin ? (
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.1)] space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Developer Admin Panel</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                  CLEARANCE VERIFIED
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-xl">
                System administration active: moderate users, view live telemetry, broadcast announcements, add partners, and control site features.
              </p>
            </div>

            {onRevokeAdmin && (
              <button
                type="button"
                onClick={onRevokeAdmin}
                className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono text-xs transition-colors flex items-center space-x-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Admin Mode</span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400">
              ● Admin Privileges Active
            </span>

            <button
              onClick={() => {
                if (onOpenAdminPanel) onOpenAdminPanel();
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Open Developer Admin Panel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-zinc-800 text-zinc-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Developer Admin Controls</h3>
              <p className="text-xs text-zinc-400">Panel locked. Admin clearance required.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700">
            LOCKED
          </span>
        </div>
      )}

      {/* UPDATE LOGS & ANNOUNCEMENTS SECTION (Matching attached design) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Megaphone className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                Update Logs & Announcements
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Indicator Dot */}
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" title="System Live Updates Active" />

            {isAdmin && !isAddingAnn && (
              <button
                type="button"
                onClick={() => setIsAddingAnn(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 hover:text-black text-cyan-300 font-bold text-xs transition-all flex items-center space-x-1.5 border border-cyan-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Announcement</span>
              </button>
            )}
          </div>
        </div>

        {/* Subheader Title Bar */}
        <div className="px-1 text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
          WHAT'S NEW / UPDATE LOGS
        </div>

        {/* Admin Announcement Creator Form */}
        {isAdmin && isAddingAnn && (
          <form onSubmit={handleAddAnnouncement} className="p-5 rounded-3xl bg-zinc-900 border border-cyan-500/40 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                Publish Admin Announcement
              </span>
              <button
                type="button"
                onClick={() => setIsAddingAnn(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-zinc-400">Choose Icon Emoji:</span>
                {['🚀', '⚡', '🎉', '📢', '🛡️', '🔥', '✨', '🎬'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAnnEmoji(emoji)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all ${
                      newAnnEmoji === emoji ? 'bg-cyan-500/20 border border-cyan-500 scale-110' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. v2.0 System Update:"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Description Text</label>
                <textarea
                  placeholder="e.g. Upgraded desktop interface and smooth animations."
                  value={newAnnDesc}
                  onChange={(e) => setNewAnnDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingAnn(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold shadow-lg shadow-cyan-500/20"
              >
                Publish Announcement
              </button>
            </div>
          </form>
        )}

        {/* Announcement Box Styled Exactly as Screenshot */}
        <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800/90 shadow-2xl space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs font-mono">
              No system logs or announcements posted yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {announcements.map((ann) => (
                <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 group">
                  <div className="flex items-start space-x-3.5">
                    <span className="text-xl sm:text-2xl leading-none pt-0.5 select-none">{ann.iconEmoji || '🚀'}</span>
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-extrabold text-white tracking-wide">{ann.title}</span>
                        <span className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">{ann.description}</span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950 hover:text-red-400 text-zinc-500 transition-colors border border-zinc-800 flex-shrink-0"
                      title="Delete Announcement (Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHECK OUT OUR PARTNERS SECTION */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Handshake className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Check Out Our Partners</h2>
              <p className="text-xs text-zinc-400">Verified official partners and media platform integrations.</p>
            </div>
          </div>

          {isAdmin && !isAddingPartner && (
            <button
              type="button"
              onClick={() => setIsAddingPartner(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500 hover:text-black text-purple-300 font-bold text-xs transition-all flex items-center space-x-1.5 border border-purple-500/30 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Partner</span>
            </button>
          )}
        </div>

        {/* Admin Partner Creator Form */}
        {isAdmin && isAddingPartner && (
          <form onSubmit={handleAddPartner} className="p-5 rounded-3xl bg-zinc-900 border border-purple-500/40 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                Add Official Partner (Admin)
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPartner(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Partner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gartic Phone"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Partner Link URL</label>
                <input
                  type="url"
                  placeholder="https://garticphone.com"
                  value={partnerUrl}
                  onChange={(e) => setPartnerUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            {/* Partner Logo Upload or Link */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">Partner Logo (Upload File or Paste Image URL)</label>
              <div className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                {partnerLogo ? (
                  <img src={partnerLogo} alt="Logo Preview" className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/40 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1 space-y-1.5 min-w-0">
                  <label className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-bold cursor-pointer transition-colors border border-zinc-700">
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                    <span>Upload Logo Image...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setPartnerLogo(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <input
                    type="url"
                    placeholder="or paste logo image URL..."
                    value={partnerLogo}
                    onChange={(e) => setPartnerLogo(e.target.value)}
                    className="w-full px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-purple-500 truncate"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-400 block mb-1">Partner Description</label>
              <input
                type="text"
                placeholder="e.g. The Telephone Game - draw & guess with friends live."
                value={partnerDesc}
                onChange={(e) => setPartnerDesc(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingPartner(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-extrabold shadow-lg shadow-purple-500/20"
              >
                Save Partner
              </button>
            </div>
          </form>
        )}

        {/* Partner Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {partners.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-zinc-500 text-xs font-mono bg-zinc-900/40 rounded-3xl border border-zinc-800">
              No partners listed yet.
            </div>
          ) : (
            partners.map((partner) => (
              <div
                key={partner.id}
                className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3.5">
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/30 bg-zinc-950 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                        <Handshake className="w-6 h-6" />
                      </div>
                    )}

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                        <span>{partner.name}</span>
                      </h4>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{partner.description}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeletePartner(partner.id)}
                      className="p-1.5 rounded-lg bg-zinc-950 hover:bg-red-950 hover:text-red-400 text-zinc-500 transition-colors border border-zinc-800 flex-shrink-0"
                      title="Delete Partner (Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-purple-400/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Verified Partner</span>
                  </span>

                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-purple-500 hover:text-black text-zinc-200 text-xs font-bold transition-all flex items-center space-x-1.5 border border-zinc-700/60"
                  >
                    <span>Visit Partner</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Boot Animation Replay Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Yunø Boot Screen Sequence
          </h3>
          <p className="text-xs text-zinc-400">
            Replay the startup animation with "Yun" dissolving into the "Ø" logo transition.
          </p>
        </div>

        <button
          onClick={onReplayBoot}
          className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Replay Boot Screen</span>
        </button>
      </div>

      {/* Wallpaper Picker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Image className="w-5 h-5 text-cyan-400" />
            Background Wallpapers
          </h3>
          <span className="text-xs font-mono text-zinc-500">Live Workspace Canvas</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {WALLPAPERS.map((wp) => {
            const isSelected = currentWallpaper === wp.url;

            return (
              <div
                key={wp.id}
                onClick={() => onSelectWallpaper(wp.url)}
                className={`group relative rounded-2xl overflow-hidden aspect-video cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-500/40 shadow-xl'
                    : 'border-zinc-800 hover:border-zinc-700 hover:scale-105'
                }`}
              >
                <img src={wp.thumbnail} alt={wp.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}

                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-[10px] font-bold text-white truncate block">{wp.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Image / Video Upload & URL */}
        <div className="pt-2 space-y-4">
          <div>
            <label className="text-xs font-mono text-zinc-400 block mb-1.5 flex items-center space-x-2">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>UPLOAD LOCAL WALLPAPER (IMAGE, GIF, MP4/MOV VIDEO)</span>
            </label>
            <div className="relative border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-zinc-900/50 hover:bg-zinc-900/80 cursor-pointer">
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime,.gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        const dataUrl = event.target.result as string;
                        onSelectWallpaper(dataUrl);
                        handleExtractTheme(dataUrl);
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs text-zinc-300 font-medium">
                  Click or drag file here to set as workspace wallpaper
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Supports PNG, JPG, animated GIF, MP4, MOV
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCustomSubmit}>
            <label className="text-xs font-mono text-zinc-400 block mb-1.5">
              OR ENTER IMAGE / GIF DIRECT URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://images.unsplash.com/your-image.jpg"
                className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Apply URL
              </button>
            </div>
          </form>

          {/* Wallpaper Dynamic Color Theme Extractor */}
          <div className="mt-6 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Pipette className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Wallpaper Color Theme Extractor</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    AUTOMATIC CANVAS ANALYSIS
                  </span>
                </div>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Extract vibrant primary, accent, and glow colors directly from your active or custom uploaded wallpaper to dynamically theme buttons, borders, and accents across the site.
                </p>
              </div>

              <button
                onClick={() => handleExtractTheme()}
                disabled={isExtractingColors}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:brightness-110 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isExtractingColors ? 'animate-spin' : ''}`} />
                <span>{isExtractingColors ? 'Extracting Theme...' : 'Detect & Apply Wallpaper Theme'}</span>
              </button>
            </div>

            {/* Extracted Color Swatches Preview */}
            {extractedTheme && (
              <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-4">
                <span className="text-xs font-mono text-zinc-400">Active Theme Palette:</span>

                <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: extractedTheme.primary }} />
                  <span className="text-zinc-300">Primary: {extractedTheme.primary}</span>
                </div>

                <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: extractedTheme.accent }} />
                  <span className="text-zinc-300">Accent: {extractedTheme.accent}</span>
                </div>

                <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: extractedTheme.highlight }} />
                  <span className="text-zinc-300">Highlight: {extractedTheme.highlight}</span>
                </div>

                <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs font-mono">
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: extractedTheme.glow }} />
                  <span className="text-zinc-300">Glow Aura</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

