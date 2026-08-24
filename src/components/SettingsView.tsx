import React, { useState, useEffect } from 'react';
import { DEFAULT_ANNOUNCEMENTS } from '../data/portalData';
import {
  AnnouncementItem,
  TabCloakSettings,
  TabMaskPreset,
  UserProfile,
  AiPersonalitySettings,
  AiSpeakingStyle,
  AiResponseSpeed,
  AiEmojiMode,
  ChatPreferences,
} from '../types';
import {
  Sparkles,
  Shield,
  Bell,
  Sliders,
  Image as ImageIcon,
  User,
  MessageSquare,
  Palette,
  Bot,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  Volume2,
  VolumeX,
  Zap,
  Clock,
  Key,
  Flame,
  CloudRain,
  Snowflake,
  CloudFog,
  EyeOff,
  Sun,
  Lock,
  Upload,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  Brain,
  Smile,
  Hash,
  Wand2,
} from 'lucide-react';
import {
  TAB_MASK_PRESETS,
  getSavedCloakSettings,
  saveCloakSettings,
  launchInAboutBlank,
  launchInBlobCloak,
} from '../utils/tabCloak';
import { WallpaperEffectSettings, DEFAULT_EFFECT_SETTINGS } from './WallpaperCanvasEffects';
import { WALLPAPERS } from '../data/portalData';
import {
  getSavedAiSettings,
  saveAiSettings,
  DEFAULT_AI_SETTINGS,
  generateSystemInstruction,
  JACKS_COUGH_CATCHPHRASES,
  getRandomCatchphrase,
} from '../utils/aiSettings';
import {
  getSavedChatPreferences,
  saveChatPreferences,
  DEFAULT_CHAT_PREFERENCES,
} from '../utils/chatSettings';

export type SettingsCategory =
  | 'background'
  | 'avatar'
  | 'chat'
  | 'updates'
  | 'cloaking'
  | 'theme'
  | 'ai';

interface SettingsViewProps {
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  effectSettings: WallpaperEffectSettings;
  onChangeEffectSettings: (settings: WallpaperEffectSettings) => void;
  onReplayBoot: () => void;
  userProfile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => void;
  onOpenAppealModal?: () => void;
  isYunoLiteEnabled?: boolean;
  onToggleYunoLite?: (enabled: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentWallpaper,
  onSelectWallpaper,
  effectSettings,
  onChangeEffectSettings,
  onReplayBoot,
  userProfile,
  onSaveProfile,
  onOpenAppealModal,
  isYunoLiteEnabled = false,
  onToggleYunoLite,
}) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('background');

  // --- 1. Background Settings State ---
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState('');
  const [wallpaperUrlError, setWallpaperUrlError] = useState(false);

  const handleUpdateEffect = (partial: Partial<WallpaperEffectSettings>) => {
    onChangeEffectSettings({ ...effectSettings, ...partial });
  };

  const handleApplyCustomWallpaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWallpaperUrl.trim()) return;
    try {
      new URL(customWallpaperUrl.trim());
      onSelectWallpaper(customWallpaperUrl.trim());
      setWallpaperUrlError(false);
    } catch {
      if (customWallpaperUrl.startsWith('data:') || customWallpaperUrl.startsWith('/')) {
        onSelectWallpaper(customWallpaperUrl.trim());
        setWallpaperUrlError(false);
      } else {
        setWallpaperUrlError(true);
      }
    }
  };

  // --- 2. Avatar Settings State (NO PRESETS) ---
  const defaultProfile: UserProfile = {
    username: 'Guest',
    displayName: 'Guest',
    avatar: '',
    banner: '',
    status: 'Online',
    bio: 'Yunø workspace user',
    badge: 'Member',
    accentColor: '#f59e0b',
  };

  const [profileForm, setProfileForm] = useState<UserProfile>(() => {
    if (userProfile) return userProfile;
    try {
      const saved = localStorage.getItem('yuno_user_profile');
      if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultProfile;
  });

  const [profileSavedToast, setProfileSavedToast] = useState(false);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileForm((prev) => ({ ...prev, avatar: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileForm((prev) => ({ ...prev, banner: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profileForm,
      username: profileForm.username.trim() || 'Guest',
      displayName: profileForm.displayName.trim() || profileForm.username.trim() || 'Guest',
    };
    try {
      localStorage.setItem('yuno_user_profile', JSON.stringify(updated));
    } catch (err) {}
    if (onSaveProfile) onSaveProfile(updated);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  // --- 3. Chat Settings State ---
  const [chatPrefs, setChatPrefs] = useState<ChatPreferences>(getSavedChatPreferences);
  const [newBlockedWord, setNewBlockedWord] = useState('');

  const handleUpdateChatPrefs = (partial: Partial<ChatPreferences>) => {
    const next = { ...chatPrefs, ...partial };
    setChatPrefs(next);
    saveChatPreferences(next);
  };

  const handleAddBlockedWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedWord.trim()) return;
    const word = newBlockedWord.trim().toLowerCase();
    if (!chatPrefs.blockedWords.includes(word)) {
      handleUpdateChatPrefs({ blockedWords: [...chatPrefs.blockedWords, word] });
    }
    setNewBlockedWord('');
  };

  const handleRemoveBlockedWord = (word: string) => {
    handleUpdateChatPrefs({
      blockedWords: chatPrefs.blockedWords.filter((w) => w !== word),
    });
  };

  // --- 4. Updates / Announcements State ---
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);
  const [isAddingAnn, setIsAddingAnn] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnDesc, setNewAnnDesc] = useState('');

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnDesc.trim()) return;
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAnnTitle.trim(),
          description: newAnnDesc.trim(),
          author: profileForm.username || 'Admin',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
        setNewAnnTitle('');
        setNewAnnDesc('');
        setIsAddingAnn(false);
      }
    } catch (e) {}
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: profileForm.username || 'Admin' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements);
      }
    } catch (e) {}
  };

  // --- 5. Tab Cloaking State ---
  const [cloakSettings, setCloakSettings] = useState<TabCloakSettings>(getSavedCloakSettings);
  const [selectedMaskCategory, setSelectedMaskCategory] = useState<string>('All');
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const [isRecordingPanicKey, setIsRecordingPanicKey] = useState(false);

  useEffect(() => {
    if (!isRecordingPanicKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keyName = e.key;
      setCloakSettings((prev) => {
        const next = { ...prev, panicKey: keyName };
        saveCloakSettings(next);
        return next;
      });
      setIsRecordingPanicKey(false);
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isRecordingPanicKey]);

  const handleSelectTabPreset = (preset: TabMaskPreset) => {
    const updated: TabCloakSettings = { ...cloakSettings, activeMaskId: preset.id };
    setCloakSettings(updated);
    saveCloakSettings(updated);
  };

  const handleCustomTabMask = (title: string, icon: string) => {
    const updated: TabCloakSettings = {
      ...cloakSettings,
      activeMaskId: 'custom',
      customTitle: title,
      customIcon: icon,
    };
    setCloakSettings(updated);
    saveCloakSettings(updated);
  };

  const handleToggleAntiClose = () => {
    const updated: TabCloakSettings = {
      ...cloakSettings,
      antiCloseEnabled: !cloakSettings.antiCloseEnabled,
    };
    setCloakSettings(updated);
    saveCloakSettings(updated);
  };

  const handleLaunchAboutBlank = () => {
    setLaunchStatus('launching');
    const preset = TAB_MASK_PRESETS.find((p) => p.id === cloakSettings.activeMaskId);
    const title = cloakSettings.activeMaskId === 'custom' ? cloakSettings.customTitle : preset?.title;
    const icon = cloakSettings.activeMaskId === 'custom' ? cloakSettings.customIcon : preset?.icon;
    const success = launchInAboutBlank(window.location.href, title, icon);
    if (success) {
      setLaunchStatus('success');
      setTimeout(() => setLaunchStatus(null), 3000);
    } else {
      setLaunchStatus('blocked');
      setTimeout(() => setLaunchStatus(null), 5000);
    }
  };

  const handleLaunchBlob = () => {
    setLaunchStatus('launching');
    const preset = TAB_MASK_PRESETS.find((p) => p.id === cloakSettings.activeMaskId);
    const title = cloakSettings.activeMaskId === 'custom' ? cloakSettings.customTitle : preset?.title;
    const icon = cloakSettings.activeMaskId === 'custom' ? cloakSettings.customIcon : preset?.icon;
    const success = launchInBlobCloak(window.location.href, title, icon);
    if (success) {
      setLaunchStatus('success');
      setTimeout(() => setLaunchStatus(null), 3000);
    } else {
      setLaunchStatus('blocked');
      setTimeout(() => setLaunchStatus(null), 5000);
    }
  };

  // --- 6. AI Settings State ---
  const [aiSettings, setAiSettings] = useState<AiPersonalitySettings>(getSavedAiSettings);
  const [aiSettingsToast, setAiSettingsToast] = useState(false);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [previewCatchphraseIdx, setPreviewCatchphraseIdx] = useState(0);

  const handleUpdateAiSettings = (partial: Partial<AiPersonalitySettings>) => {
    const next = { ...aiSettings, ...partial };
    setAiSettings(next);
    saveAiSettings(next);
    setAiSettingsToast(true);
    setTimeout(() => setAiSettingsToast(false), 2000);
  };

  const handleAddMemory = () => {
    if (!newMemoryInput.trim()) return;
    const currentMemories = aiSettings.memories || [];
    if (!currentMemories.includes(newMemoryInput.trim())) {
      handleUpdateAiSettings({ memories: [...currentMemories, newMemoryInput.trim()] });
      setNewMemoryInput('');
    }
  };

  const handleRemoveMemory = (index: number) => {
    const currentMemories = [...(aiSettings.memories || [])];
    currentMemories.splice(index, 1);
    handleUpdateAiSettings({ memories: currentMemories });
  };

  // Nav Items Configuration
  const navCategories: Array<{
    id: SettingsCategory;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'background',
      label: 'Background Settings',
      description: 'Particles, blur, brightness & wallpaper pictures',
      icon: Sparkles,
    },
    {
      id: 'avatar',
      label: 'Avatar Settings',
      description: 'Custom profile photo, banner, bio & tags (No presets)',
      icon: User,
    },
    {
      id: 'chat',
      label: 'Chat Settings',
      description: 'Profanity filter, blocked words & notifications',
      icon: MessageSquare,
    },
    {
      id: 'updates',
      label: 'Updates',
      description: 'Changelog announcements & official news',
      icon: Bell,
    },
    {
      id: 'cloaking',
      label: 'Tab Cloaking',
      description: 'Disguise tab title, favicon, panic hotkey & about:blank',
      icon: Shield,
    },
    {
      id: 'theme',
      label: 'Theme Settings',
      description: 'Coming Soon themes & Yunø Lite mode',
      icon: Palette,
      badge: 'Lite Mode',
    },
    {
      id: 'ai',
      label: 'AI Settings',
      description: 'Persona, tone, speaking speed & custom user moniker',
      icon: Bot,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 text-white px-2 sm:px-4">
      {/* Top Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-amber-400" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure your workspace environment, cloaking disguises, avatar, chat preferences, and AI behavior.
          </p>
        </div>

        {isYunoLiteEnabled && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2 self-start sm:self-auto">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Yunø Lite Active</span>
          </div>
        )}
      </div>

      {/* Main Settings 2-Column Layout with Categories on the Left */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR NAVIGATION CATEGORIES */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-1.5 bg-zinc-950/80 p-2 sm:p-2.5 rounded-2xl border border-zinc-800/80 sticky top-20 shadow-xl">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Categories
          </div>

          <div className="space-y-1">
            {navCategories.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCategory(item.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between group cursor-pointer border ${
                    isActive
                      ? 'bg-zinc-800/90 text-white border-zinc-700 shadow-md ring-1 ring-white/10'
                      : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className={isActive ? 'text-white' : 'text-zinc-300'}>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">{item.description}</div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isActive ? 'text-amber-400 translate-x-0.5' : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Action Reset Boot / Fast Cloak */}
          <div className="pt-3 mt-2 border-t border-zinc-800/80 px-2 space-y-1.5">
            <button
              type="button"
              onClick={onReplayBoot}
              className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay Boot Sequence</span>
            </button>
          </div>
        </div>

        {/* RIGHT SIDE MAIN SETTINGS CONTENT PANEL */}
        <div className="lg:col-span-8 xl:col-span-8.5 space-y-6">
          {/* ========================================================
              CATEGORY 1: BACKGROUND SETTINGS
              ======================================================== */}
          {activeCategory === 'background' && (
            <div className="space-y-6">
              {/* Particle Effects Section */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-zinc-300" />
                      Live Screen Weather & Particle Overlays
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Renders real-time ambient particle effects across all portal tabs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChangeEffectSettings(DEFAULT_EFFECT_SETTINGS)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                  >
                    Reset Weather
                  </button>
                </div>

                {/* Particle Preset Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'none', label: 'None', desc: 'Clean background with zero particles', icon: EyeOff },
                    { id: 'rain', label: 'Rain Drops', desc: 'Falling drizzle to storm rain', icon: CloudRain },
                    { id: 'snow', label: 'Snowfall', desc: 'Drifting calm winter flakes', icon: Snowflake },
                    { id: 'stars', label: 'Starfield', desc: 'Twinkling starry night sky', icon: Sparkles },
                    { id: 'fireflies', label: 'Fireflies', desc: 'Floating embers & glowing lights', icon: Flame },
                    { id: 'fog', label: 'Misty Fog', desc: 'Atmospheric drifting cloud mist', icon: CloudFog },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = effectSettings.effect === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleUpdateEffect({ effect: opt.id as any })}
                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800 border-amber-400 text-white ring-1 ring-amber-400/40 shadow-lg'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`p-1.5 rounded-md ${
                              isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{opt.label}</div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Effect Intensity & Fall Speed Sliders */}
                {effectSettings.effect !== 'none' && (
                  <div className="pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Particle Intensity / Density</span>
                        <span className="font-mono text-amber-400">{effectSettings.intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={effectSettings.intensity}
                        onChange={(e) => handleUpdateEffect({ intensity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Light</span>
                        <span>Heavy Storm</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Particle Fall Speed</span>
                        <span className="font-mono text-amber-400">{effectSettings.speed}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={effectSettings.speed}
                        onChange={(e) => handleUpdateEffect({ speed: Number(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Slow</span>
                        <span>Rapid</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Visual Adjustments (Blur, Brightness, Vignette) */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Background Lighting & Blur Adjustments
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">Background Blur</span>
                      <span className="font-mono text-amber-400">{effectSettings.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={effectSettings.blur}
                      onChange={(e) => handleUpdateEffect({ blur: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Sharp (0px)</span>
                      <span>Heavy Blur (20px)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">Background Brightness / Dim</span>
                      <span className="font-mono text-amber-400">{effectSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      step="5"
                      value={effectSettings.brightness}
                      onChange={(e) => handleUpdateEffect({ brightness: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Dim (20%)</span>
                      <span>Bright (120%)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-300">Vignette Edge Shadow</div>
                    <div className="text-[11px] text-zinc-500">Darkens window edges for cinematic contrast</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateEffect({ vignette: !effectSettings.vignette })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      effectSettings.vignette
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {effectSettings.vignette ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Wallpaper Pictures Gallery & Custom URL */}
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      Wallpaper Pictures
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Select from wallpapers or apply a custom URL.</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{WALLPAPERS.length} Wallpapers</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {WALLPAPERS.map((wp) => {
                    const isSelected = currentWallpaper === wp.url;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => onSelectWallpaper(wp.url)}
                        className={`group relative rounded-xl overflow-hidden aspect-video cursor-pointer border transition-all ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400 shadow-lg scale-[1.02]'
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        <img
                          src={wp.thumbnail}
                          alt={wp.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/60" />
                        <div className="absolute bottom-1.5 left-2 right-2">
                          <span className="text-[10px] font-medium text-white truncate block">{wp.name}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-500 text-zinc-950 font-bold">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom Wallpaper Input Form */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="text-xs font-medium text-zinc-300">Custom Image or MP4 Video Wallpaper URL</div>
                  <form onSubmit={handleApplyCustomWallpaper} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={customWallpaperUrl}
                      onChange={(e) => {
                        setCustomWallpaperUrl(e.target.value);
                        setWallpaperUrlError(false);
                      }}
                      placeholder="Paste direct wallpaper URL (https://... or data:...)"
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-colors border border-zinc-700 cursor-pointer"
                    >
                      Apply Wallpaper
                    </button>
                  </form>
                  {wallpaperUrlError && (
                    <p className="text-[11px] text-red-400">Please enter a valid image or video URL.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              CATEGORY 2: AVATAR SETTINGS (STRICTLY NO PRESETS)
              ======================================================== */}
          {activeCategory === 'avatar' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfileForm} className="space-y-6">
                {/* Profile Banner & Avatar Preview Card */}
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden relative shadow-xl">
                  {/* Banner */}
                  <div className="h-32 w-full bg-zinc-950 relative overflow-hidden border-b border-zinc-800">
                    {profileForm.banner ? (
                      <img src={profileForm.banner} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 text-xs font-mono">
                        No custom banner uploaded
                      </div>
                    )}
                  </div>

                  {/* Profile Details Container */}
                  <div className="p-5 pt-0 relative">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-12 mb-4 gap-3">
                      {/* Custom Avatar Preview */}
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl bg-zinc-950 border-2 border-zinc-800 overflow-hidden shadow-2xl flex items-center justify-center">
                          {profileForm.avatar ? (
                            <img
                              src={profileForm.avatar}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-400 text-xl font-bold font-mono">
                              {profileForm.displayName ? profileForm.displayName.charAt(0).toUpperCase() : 'G'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                          {profileForm.status || 'Online'}
                        </span>
                        {profileForm.badge && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                            {profileForm.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-white">
                        {profileForm.displayName || profileForm.username || 'Guest'}
                      </h2>
                      <div className="text-xs text-zinc-400 font-mono">@{profileForm.username || 'guest'}</div>
                      <p className="text-xs text-zinc-300 mt-2">{profileForm.bio || 'No bio provided.'}</p>
                    </div>
                  </div>
                </div>

                {/* Avatar & Banner Upload Controls (No presets) */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Custom Avatar & Profile Photos (No Presets)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Upload your own personal custom avatar and banner files directly, or link your image URLs.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Avatar Upload */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        Custom Avatar Image
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs font-medium text-center cursor-pointer transition-colors flex items-center justify-center space-x-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Avatar File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileUpload}
                            className="hidden"
                          />
                        </label>
                        {profileForm.avatar && (
                          <button
                            type="button"
                            onClick={() => setProfileForm((p) => ({ ...p, avatar: '' }))}
                            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800"
                            title="Remove avatar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={profileForm.avatar}
                          onChange={(e) => setProfileForm((p) => ({ ...p, avatar: e.target.value }))}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Banner Upload */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                        Custom Profile Banner
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs font-medium text-center cursor-pointer transition-colors flex items-center justify-center space-x-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Banner File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerFileUpload}
                            className="hidden"
                          />
                        </label>
                        {profileForm.banner && (
                          <button
                            type="button"
                            onClick={() => setProfileForm((p) => ({ ...p, banner: '' }))}
                            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800"
                            title="Remove banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          value={profileForm.banner}
                          onChange={(e) => setProfileForm((p) => ({ ...p, banner: e.target.value }))}
                          placeholder="Or paste direct banner URL (https://...)"
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Identity & Bio Form */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Identity, Status & Bio
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Display Name</label>
                      <input
                        type="text"
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm((p) => ({ ...p, displayName: e.target.value }))}
                        placeholder="Your display name"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Username (Handle)</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                        placeholder="username"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Status Message</label>
                      <input
                        type="text"
                        value={profileForm.status}
                        onChange={(e) => setProfileForm((p) => ({ ...p, status: e.target.value }))}
                        placeholder="Online, Coding, Gaming..."
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={profileForm.badge}
                        onChange={(e) => setProfileForm((p) => ({ ...p, badge: e.target.value }))}
                        placeholder="e.g. Pro, VIP, Builder"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Custom Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Write a brief bio about yourself..."
                      rows={3}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      Changes are saved locally and synced with community & chat.
                    </span>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors flex items-center space-x-1.5 shadow-lg cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Avatar & Profile</span>
                    </button>
                  </div>

                  {profileSavedToast && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Avatar profile updated successfully!</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ========================================================
              CATEGORY 3: CHAT SETTINGS (PROFANITY FILTER & MORE)
              ======================================================== */}
          {activeCategory === 'chat' && (
            <div className="space-y-6">
              {/* Profanity Filter Section */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Profanity Filter & Content Guard
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Automatically mask swear words and offensive language in community chat.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateChatPrefs({
                        enableProfanityFilter: !chatPrefs.enableProfanityFilter,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      chatPrefs.enableProfanityFilter
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {chatPrefs.enableProfanityFilter ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  {/* Direct Blur Profanity Toggle */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                        Blur Profane & Sensitive Words
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Visually blur sensitive words with an interactive spoiler effect across all chats.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateChatPrefs({
                          blurProfanity: !chatPrefs.blurProfanity,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        chatPrefs.blurProfanity
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {chatPrefs.blurProfanity ? 'Blur ON' : 'Blur OFF'}
                    </button>
                  </div>

                  {chatPrefs.enableProfanityFilter && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-medium text-zinc-300">Filter Strictness</div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { id: 'standard', label: 'Standard', desc: 'Masks severe profanity' },
                          { id: 'strict', label: 'Strict / School', desc: 'Masks mild & heavy slurs' },
                          { id: 'off', label: 'Off', desc: 'Disable censorship' },
                        ].map((lvl) => {
                          const isSel = chatPrefs.profanityStrictness === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => handleUpdateChatPrefs({ profanityStrictness: lvl.id as any })}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isSel
                                  ? 'bg-zinc-800 border-amber-400 text-white ring-1 ring-amber-400/30'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              <div className="text-xs font-semibold text-white">{lvl.label}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{lvl.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Blocked Words Manager */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Custom Blocked Words & Phrases
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Add custom words or phrases to be blurred or filtered automatically in your chats.
                  </p>
                </div>

                <form onSubmit={handleAddBlockedWord} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newBlockedWord}
                    onChange={(e) => setNewBlockedWord(e.target.value)}
                    placeholder="Enter word or phrase to block..."
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-colors border border-zinc-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Word</span>
                  </button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {chatPrefs.blockedWords.length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">No custom blocked words added yet.</span>
                  ) : (
                    chatPrefs.blockedWords.map((word) => (
                      <span
                        key={word}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center space-x-1.5"
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockedWord(word)}
                          className="text-zinc-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Experience & Display Preferences */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-zinc-300" />
                  Chat Behavior & Audio
                </h2>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-zinc-300">Message Notification Sounds</div>
                      <div className="text-[11px] text-zinc-500">Play a subtle chime sound when receiving new chat messages</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateChatPrefs({ soundEffects: !chatPrefs.soundEffects })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        chatPrefs.soundEffects
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {chatPrefs.soundEffects ? 'Sound On' : 'Muted'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-zinc-300">Compact Message Layout</div>
                      <div className="text-[11px] text-zinc-500">Reduce spacing between messages for high-density reading</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateChatPrefs({ compactMode: !chatPrefs.compactMode })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        chatPrefs.compactMode
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {chatPrefs.compactMode ? 'Compact' : 'Normal'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-zinc-300">Display Message Timestamps</div>
                      <div className="text-[11px] text-zinc-500">Show exact time next to each message bubble</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateChatPrefs({ showTimestamps: !chatPrefs.showTimestamps })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        chatPrefs.showTimestamps
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {chatPrefs.showTimestamps ? 'Shown' : 'Hidden'}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-zinc-300">Auto-Scroll on New Messages</div>
                      <div className="text-[11px] text-zinc-500">Automatically jump to bottom when messages arrive</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateChatPrefs({ autoScroll: !chatPrefs.autoScroll })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        chatPrefs.autoScroll
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {chatPrefs.autoScroll ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              CATEGORY 4: UPDATES & CHANGELOG
              ======================================================== */}
          {activeCategory === 'updates' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      Official Portal Updates & Changelog
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Check out the latest features, releases, and fixes deployed to Yunø.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start justify-between space-x-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              CATEGORY 5: TAB CLOAKING
              ======================================================== */}
          {activeCategory === 'cloaking' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Tab Disguise & Cloaker
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Mask your browser tab title and favicon or open in stealth unblocked window.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleLaunchAboutBlank}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Open about:blank
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchBlob}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Open Blob Cloak
                    </button>
                  </div>
                </div>

                {/* Live Disguise Bar */}
                <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 text-xs text-zinc-300">
                    <img
                      src={
                        cloakSettings.activeMaskId === 'custom'
                          ? cloakSettings.customIcon || 'https://www.google.com/favicon.ico'
                          : TAB_MASK_PRESETS.find((p) => p.id === cloakSettings.activeMaskId)?.icon || '/favicon.ico'
                      }
                      alt="Favicon"
                      className="w-4 h-4 rounded-sm object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://www.google.com/favicon.ico';
                      }}
                    />
                    <span className="font-semibold text-white truncate">
                      {cloakSettings.activeMaskId === 'custom'
                        ? cloakSettings.customTitle || 'Custom Mask'
                        : TAB_MASK_PRESETS.find((p) => p.id === cloakSettings.activeMaskId)?.title || 'Yunø Workspace'}
                    </span>
                  </div>

                  <span className="text-xs text-amber-400 font-mono px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                    Active Mask: {cloakSettings.activeMaskId}
                  </span>
                </div>

                {launchStatus === 'success' && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                    Stealth window opened in about:blank tab.
                  </div>
                )}

                {launchStatus === 'blocked' && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30">
                    Pop-up was blocked by browser. Please allow popups for this site.
                  </div>
                )}

                {/* Preset Masks Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Presets</span>
                    <div className="flex items-center space-x-1">
                      {['All', 'Google', 'School', 'Tools', 'Reference'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedMaskCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            selectedMaskCategory === cat
                              ? 'bg-zinc-700 text-white font-semibold'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(selectedMaskCategory === 'All'
                      ? TAB_MASK_PRESETS
                      : TAB_MASK_PRESETS.filter((p) => p.category === selectedMaskCategory || p.id === 'default')
                    ).map((preset) => {
                      const isSelected = cloakSettings.activeMaskId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectTabPreset(preset)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-800 border-amber-400 text-white ring-1 ring-amber-400/30 shadow-md'
                              : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <img
                            src={preset.icon}
                            alt={preset.name}
                            className="w-4 h-4 object-contain flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://www.google.com/favicon.ico';
                            }}
                          />
                          <span className="text-xs font-medium truncate flex-1">{preset.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Tab Mask Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Custom Tab Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Google Docs"
                      value={cloakSettings.customTitle}
                      onChange={(e) => handleCustomTabMask(e.target.value, cloakSettings.customIcon)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Custom Favicon URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/favicon.ico"
                      value={cloakSettings.customIcon}
                      onChange={(e) => handleCustomTabMask(cloakSettings.customTitle, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Panic Key & Anti-Close Guard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">Panic Emergency Hotkey</span>
                      <button
                        type="button"
                        onClick={() => setIsRecordingPanicKey(true)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-amber-300 border border-zinc-700 cursor-pointer"
                      >
                        {isRecordingPanicKey ? 'Press any key...' : `Key: [ ${cloakSettings.panicKey || ']'} ]`}
                      </button>
                    </div>

                    <div>
                      <input
                        type="url"
                        value={cloakSettings.panicUrl}
                        onChange={(e) => {
                          const updated = { ...cloakSettings, panicUrl: e.target.value };
                          setCloakSettings(updated);
                          saveCloakSettings(updated);
                        }}
                        placeholder="Panic redirect URL (e.g. https://classroom.google.com)"
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-300 block">Anti-Close Guard</span>
                      <span className="text-[11px] text-zinc-500">Prompts confirmation before tab closes</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAntiClose}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        cloakSettings.antiCloseEnabled
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {cloakSettings.antiCloseEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              CATEGORY 6: THEME SETTINGS (COMING SOON + YUNO LITE)
              ======================================================== */}
          {activeCategory === 'theme' && (
            <div className="space-y-6">
              {/* Coming Soon Themes Banner */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Palette className="w-5 h-5 text-amber-400" />
                    <h2 className="text-base font-bold text-white">Custom Theme Engine</h2>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Coming Soon
                  </span>
                </div>

                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                  Full custom theme engine & color paletting (Midnight Neon, Cyber Amber, Sakura Blossom, Velvet Obsidian)
                  is currently under active engineering for the next major release.
                </p>

                {/* Coming Soon Preview Mockup Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-60 pointer-events-none">
                  {[
                    { name: 'Midnight Neon', color: 'bg-indigo-950 border-indigo-700' },
                    { name: 'Cyber Amber', color: 'bg-amber-950 border-amber-700' },
                    { name: 'Sakura Rose', color: 'bg-pink-950 border-pink-700' },
                    { name: 'Velvet Obsidian', color: 'bg-zinc-950 border-zinc-800' },
                  ].map((thm) => (
                    <div
                      key={thm.name}
                      className={`p-3 rounded-xl border ${thm.color} text-left flex flex-col justify-between h-20`}
                    >
                      <span className="text-[11px] font-bold text-white">{thm.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Coming Soon</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CORE FUNCTIONAL THEME FEATURE: YUNO LITE */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Yunø Lite Mode
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Ultra-clean minimalist performance mode. Removes decorative icons, disables particle weather FX,
                      clears background pictures, and shows games with only clean image thumbnails (no text titles or descriptions).
                    </p>
                  </div>

                  {onToggleYunoLite && (
                    <button
                      type="button"
                      onClick={() => onToggleYunoLite(!isYunoLiteEnabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        isYunoLiteEnabled
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {isYunoLiteEnabled ? 'Yunø Lite: ON' : 'Yunø Lite: OFF'}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span>Hides background wallpapers & canvas weather FX</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span>Displays games with pictures only (hides titles & descriptions)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span>Disables heavy blur & backdrop-filters for maximum FPS</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span>Removes extra decorative icons and UI badges</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              CATEGORY 7: AI SETTINGS (JACK'S COUGH, EMOJIS, MEMORY, SPEED, TONES, SYMBOLS)
              ======================================================== */}
          {activeCategory === 'ai' && (
            <div className="space-y-6">
              {/* Jack's Cough Header & Catchphrases Showcase */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bot className="w-4 h-4 text-amber-400" />
                      <span>Jack's cough Persona & Greeting Catchphrases</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure your AI assistant's personality, greetings, cross-chat memory, and custom instructions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewCatchphraseIdx((prev) => (prev + 1) % JACKS_COUGH_CATCHPHRASES.length)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-amber-400 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Shuffle Catchphrase</span>
                  </button>
                </div>

                {/* Catchphrase Card */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Active Greeting Preview
                    </span>
                    <p className="text-xs text-white font-mono font-medium">
                      "{JACKS_COUGH_CATCHPHRASES[previewCatchphraseIdx].replace('{user}', aiSettings.userCallSign?.trim() || profileForm.displayName || 'user')}"
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {previewCatchphraseIdx + 1} / {JACKS_COUGH_CATCHPHRASES.length}
                  </span>
                </div>

                {/* Catchphrases List Pills */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-300 block">Available Catchphrases:</span>
                  <div className="flex flex-wrap gap-2">
                    {JACKS_COUGH_CATCHPHRASES.map((phrase, idx) => (
                      <span
                        key={idx}
                        onClick={() => setPreviewCatchphraseIdx(idx)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          previewCatchphraseIdx === idx
                            ? 'bg-amber-400/10 text-amber-300 border-amber-400/40 font-medium'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        {phrase.replace('{user}', aiSettings.userCallSign?.trim() || profileForm.displayName || 'user')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Characteristics & Tones */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>AI Characteristics & Tone</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Select how Jack's cough behaves and responds to your questions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'jacks_cough',
                      label: "Jack's Cough (Original)",
                      desc: "Witty, roasty, chaotic slang, hilarious banter ('bruh use claude atp 😭🙏', '0.4 gpa'), but razor-sharp & accurate.",
                    },
                    {
                      id: 'sarcastic',
                      label: 'Witty & Sarcastic',
                      desc: 'Dry humor, clever playful roasts, and lighthearted sarcasm.',
                    },
                    {
                      id: 'chill',
                      label: 'Chill & Casual',
                      desc: "Laid-back, relaxed homie vibes ('duuuuuuude', no stress).",
                    },
                    {
                      id: 'concise',
                      label: 'Ultra-Concise',
                      desc: 'Direct, zero fluff, straight to code/answers with bullet points.',
                    },
                    {
                      id: 'academic',
                      label: 'Academic Scholar',
                      desc: 'Deeply structured, formal, thorough research breakdowns.',
                    },
                    {
                      id: 'tutor',
                      label: 'Socratic Tutor',
                      desc: 'Step-by-step patient learning guide with questions.',
                    },
                    {
                      id: 'custom',
                      label: 'Custom Persona',
                      desc: 'Specify your own custom tone and behavioral instructions.',
                    },
                  ].map((style) => {
                    const isSel = aiSettings.style === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => handleUpdateAiSettings({ style: style.id as AiSpeakingStyle })}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-zinc-800 border-amber-400 text-white ring-1 ring-amber-400/30'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">{style.label}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-[11px] text-zinc-500 leading-relaxed">{style.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tone Input if Custom Selected */}
                {aiSettings.style === 'custom' && (
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                      Describe Your Custom AI Tone & Style
                    </label>
                    <textarea
                      value={aiSettings.customToneText || ''}
                      onChange={(e) => handleUpdateAiSettings({ customToneText: e.target.value })}
                      placeholder="e.g. Sassy British professor who talks about astronomy and uses tea emojis..."
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* What AI Calls You, Emojis & Thinking Speed */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-300" />
                  <span>Callsign, Emojis & Thinking Speed</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1. What AI Calls You */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      What Should AI Call You?
                    </label>
                    <input
                      type="text"
                      value={aiSettings.userCallSign}
                      onChange={(e) => handleUpdateAiSettings({ userCallSign: e.target.value })}
                      placeholder="e.g. user, bruh, Chief, Boss, or your name"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Defaults to "{aiSettings.userCallSign?.trim() || profileForm.displayName || 'user'}".
                    </p>
                  </div>

                  {/* 2. Emoji Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1.5">
                      <Smile className="w-3.5 h-3.5 text-amber-400" />
                      <span>Use Emojis in Responses</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'heavily', label: 'Heavy (😭🙏🙌)', desc: 'High emoji' },
                        { id: 'standard', label: 'Balanced', desc: 'Standard' },
                        { id: 'minimal', label: 'Minimal', desc: 'Max 1 emoji' },
                        { id: 'none', label: 'No Emojis', desc: 'Pure text' },
                      ].map((em) => {
                        const isSel = (aiSettings.emojiMode || 'standard') === em.id;
                        return (
                          <button
                            key={em.id}
                            type="button"
                            onClick={() => handleUpdateAiSettings({ emojiMode: em.id as AiEmojiMode })}
                            className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-zinc-800 border-amber-400 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="text-[11px] font-bold text-white">{em.label}</div>
                            <div className="text-[10px] text-zinc-500">{em.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Thinking / Speed Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Response & Thinking Mode</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: 'fast', label: 'Fast Answers', desc: 'Instant & snappy' },
                        { id: 'smooth', label: 'Smooth Thinking', desc: 'In-depth logic' },
                      ].map((spd) => {
                        const isSel = (aiSettings.speed === spd.id) || (spd.id === 'fast' && (aiSettings.speed === 'instant' || aiSettings.speed === 'balanced'));
                        return (
                          <button
                            key={spd.id}
                            type="button"
                            onClick={() => handleUpdateAiSettings({ speed: spd.id as AiResponseSpeed })}
                            className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-zinc-800 border-amber-400 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <div className="text-xs font-bold text-white">{spd.label}</div>
                            <div className="text-[10px] text-zinc-500">{spd.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cross-Chat Memory */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Brain className="w-4 h-4 text-zinc-300" />
                      <span>Memory From Other Chats</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Allow Jack's cough to remember facts, goals, and context across all your chat sessions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateAiSettings({ memoryEnabled: !aiSettings.memoryEnabled })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      aiSettings.memoryEnabled !== false
                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {aiSettings.memoryEnabled !== false ? 'Memory Enabled' : 'Memory Disabled'}
                  </button>
                </div>

                {aiSettings.memoryEnabled !== false && (
                  <div className="space-y-3 pt-2">
                    {/* Add Memory Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMemoryInput}
                        onChange={(e) => setNewMemoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMemory();
                          }
                        }}
                        placeholder="Add a fact for AI to remember (e.g. 'I am studying for AP Calculus', 'I code in TypeScript')..."
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMemory}
                        disabled={!newMemoryInput.trim()}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-semibold border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Fact</span>
                      </button>
                    </div>

                    {/* Memories List */}
                    <div className="space-y-1.5">
                      {(!aiSettings.memories || aiSettings.memories.length === 0) ? (
                        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-500 text-center">
                          No cross-chat memories stored yet. Add one above!
                        </div>
                      ) : (
                        aiSettings.memories.map((mem, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 group"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                              <span>{mem}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMemory(idx)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 rounded transition-opacity"
                              title="Delete memory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Symbol Rules & Custom Instructions */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <span>Custom Instructions & Symbol Formatting Rules</span>
                </h2>

                <div className="space-y-4">
                  {/* Symbol Formatting Rules */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Custom Symbol Rules (e.g. "Use symbols for these types of prompts")
                    </label>
                    <textarea
                      value={aiSettings.customSymbolRules || ''}
                      onChange={(e) => handleUpdateAiSettings({ customSymbolRules: e.target.value })}
                      placeholder="e.g. Always use bullet symbols (➔, ★, ◆, ⚡) for key takeaways, use ASCII box diagrams for systems, or use [NOTE] / [WARN] tags..."
                      rows={2}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-zinc-500">Quick insert:</span>
                      {['➔ Arrow headers', '★ Star rankings', '◆ Diamond bullets', '⚡ Lightning speed notes', '⚙ System tags'].map((sym, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            const cur = aiSettings.customSymbolRules || '';
                            handleUpdateAiSettings({
                              customSymbolRules: cur ? `${cur}\n- ${sym}` : `- ${sym}`,
                            });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          + {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* General Custom Instructions Prompt */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      General Custom AI Instructions
                    </label>
                    <textarea
                      value={aiSettings.customPrompt}
                      onChange={(e) => handleUpdateAiSettings({ customPrompt: e.target.value })}
                      placeholder="Enter any additional rules or background context for Jack's cough (e.g. Always format code in TypeScript, solve math step-by-step, roast my homework, etc.)..."
                      rows={3}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {aiSettingsToast && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Jack's cough settings updated and active!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ban Appeal Box */}
          {onOpenAppealModal && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Account Restrictions & Appeals</h2>
                <p className="text-xs text-zinc-400">Submit a formal appeal if your account was muted or restricted.</p>
              </div>
              <button
                type="button"
                onClick={onOpenAppealModal}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
              >
                Submit Appeal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
