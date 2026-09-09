import React, { useState, useEffect } from 'react';
import { DEFAULT_ANNOUNCEMENTS } from '../data/portalData';
import {
  AnnouncementItem,
  TabCloakSettings,
  TabMaskPreset,
} from '../types';
import {
  Sparkles,
  Shield,
  Bell,
  Sliders,
  Palette,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Zap,
  EyeOff,
  Sun,
  Lock,
  Upload,
  FileText,
  ChevronRight,
  CloudRain,
  Snowflake,
  Flame,
  CloudFog,
  Image as ImageIcon,
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

export type SettingsCategory =
  | 'background'
  | 'cloaking'
  | 'theme'
  | 'updates'
  | 'security';

interface SettingsViewProps {
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  effectSettings: WallpaperEffectSettings;
  onChangeEffectSettings: (settings: WallpaperEffectSettings) => void;
  onReplayBoot: () => void;
  userProfile?: any;
  onSaveProfile?: (profile: any) => void;
  onOpenAppealModal?: () => void;
  isYunoLiteEnabled?: boolean;
  onToggleYunoLite?: (enabled: boolean) => void;
  isAdmin?: boolean;
  onTriggerAdminLogin?: () => void;
  onOpenAdminDashboard?: () => void;
  onAdminLogout?: () => void;
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
  isAdmin = false,
  onTriggerAdminLogin,
  onOpenAdminDashboard,
  onAdminLogout,
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

  // --- 2. Updates / Announcements State ---
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);

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

  // --- 3. Tab Cloaking State ---
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

  // Nav Items Configuration (Monochrome)
  const navCategories: Array<{
    id: SettingsCategory;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      id: 'background',
      label: 'Background',
      description: 'Wallpaper & effects',
      icon: Sparkles,
    },
    {
      id: 'cloaking',
      label: 'Cloak',
      description: 'Tab disguise',
      icon: Shield,
    },
    {
      id: 'theme',
      label: 'Theme',
      description: 'Appearance & Lite mode',
      icon: Palette,
      badge: 'Lite',
    },
    {
      id: 'updates',
      label: 'Updates',
      description: 'Changelog',
      icon: Bell,
    },
    ...(isAdmin
      ? [
          {
            id: 'security' as SettingsCategory,
            label: 'Admin Terminal',
            description: 'Moderation & terminal',
            icon: Lock,
            badge: 'ADMIN',
          },
        ]
      : []),
  ];

  return (
    <div className="w-full max-w-7xl mx-auto pb-16 text-white px-2 sm:px-4">
      {/* Top Header */}
      <div className="mb-6 border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5 uppercase font-sans">
            <Sliders className="w-5 h-5 text-white" />
            <span>Settings</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Preferences
          </p>
        </div>

        {isYunoLiteEnabled && (
          <div className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono flex items-center gap-2 self-start sm:self-auto">
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Lite Mode</span>
          </div>
        )}
      </div>

      {/* Main Settings 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR NAVIGATION CATEGORIES */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-1.5 bg-zinc-950 p-2 sm:p-2.5 rounded-2xl border border-zinc-800 sticky top-20 shadow-xl">
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
                      ? 'bg-zinc-800 text-white border-zinc-700 shadow-md font-semibold'
                      : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-zinc-700 text-white border border-zinc-600'
                          : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                        <span className={isActive ? 'text-white' : 'text-zinc-300'}>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">{item.description}</div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 transition-transform ${
                      isActive ? 'text-white translate-x-0.5' : 'text-zinc-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Quick Action Reset Boot */}
          <div className="pt-3 mt-2 border-t border-zinc-800 px-2 space-y-1.5">
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
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-zinc-300" />
                      Live Screen Weather &amp; Particle Overlays
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
                            ? 'bg-zinc-800 border-white text-white ring-1 ring-white/30 shadow-lg'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`p-1.5 rounded-md ${
                              isSelected ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
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
                        <span className="font-mono text-white">{effectSettings.intensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={effectSettings.intensity}
                        onChange={(e) => handleUpdateEffect({ intensity: Number(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Light</span>
                        <span>Heavy Storm</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300 font-medium">Particle Fall Speed</span>
                        <span className="font-mono text-white">{effectSettings.speed}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={effectSettings.speed}
                        onChange={(e) => handleUpdateEffect({ speed: Number(e.target.value) })}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
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
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-zinc-300" />
                  Background Lighting &amp; Blur Adjustments
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">Background Blur</span>
                      <span className="font-mono text-white">{effectSettings.blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={effectSettings.blur}
                      onChange={(e) => handleUpdateEffect({ blur: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Sharp (0px)</span>
                      <span>Heavy Blur (20px)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">Background Brightness / Dim</span>
                      <span className="font-mono text-white">{effectSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="120"
                      step="5"
                      value={effectSettings.brightness}
                      onChange={(e) => handleUpdateEffect({ brightness: Number(e.target.value) })}
                      className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
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
                    <div className="text-[11px] text-zinc-500">Darkens window edges for high-contrast presentation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdateEffect({ vignette: !effectSettings.vignette })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      effectSettings.vignette
                        ? 'bg-zinc-800 text-white border-zinc-600 font-semibold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {effectSettings.vignette ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Wallpaper Pictures Gallery & Custom URL */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-zinc-300" />
                      Workspace Wallpaper
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Select interactive star constellation, upload a custom file, or apply an image/video URL.</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    {currentWallpaper === 'constellation' || !currentWallpaper ? 'OG Stars Active' : 'Custom Wallpaper'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: OG Star Constellation */}
                  <div
                    onClick={() => onSelectWallpaper('constellation')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      currentWallpaper === 'constellation' || !currentWallpaper || currentWallpaper === 'stars'
                        ? 'bg-zinc-950 border-white ring-1 ring-white/50 text-white shadow-xl'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {(currentWallpaper === 'constellation' || !currentWallpaper || currentWallpaper === 'stars') && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-black font-bold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">OG Star Constellation</div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Floating interactive stars with live physics, mouse repulsion & cursor tracking beams.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Upload Custom Wallpaper */}
                  <label className="p-4 rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-300 transition-all cursor-pointer flex flex-col justify-between">
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              onSelectWallpaper(ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">
                        Image / Video
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Upload Custom Wallpaper</div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Upload your personal image, GIF, or MP4 video background.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Minimalist Solid Monochrome Tones */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="text-xs font-medium text-zinc-400">Minimalist Solid Tones</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { name: 'Dior Noir', value: '#000000' },
                      { name: 'Deep Obsidian', value: '#070709' },
                      { name: 'Graphite', value: '#121215' },
                      { name: 'Carbon', value: '#18181b' },
                      { name: 'Slate', value: '#27272a' },
                    ].map((theme) => {
                      const isSelected = currentWallpaper === theme.value;
                      return (
                        <button
                          key={theme.name}
                          type="button"
                          onClick={() => onSelectWallpaper(theme.value)}
                          className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-white bg-zinc-800 text-white ring-1 ring-white/40'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-zinc-700"
                              style={{ backgroundColor: theme.value }}
                            />
                            <span>{theme.name}</span>
                          </div>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>
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
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl transition-colors border border-zinc-700 cursor-pointer"
                    >
                      Apply Wallpaper
                    </button>
                  </form>
                  {wallpaperUrlError && (
                    <p className="text-[11px] text-red-400 font-mono">Please enter a valid image or video URL.</p>
                  )}
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
                      <Bell className="w-4 h-4 text-zinc-300" />
                      Official Portal Updates &amp; Changelog
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Check out the latest features, releases, and fixes deployed to DIØR.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between space-x-4 shadow-sm"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
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
                      <Shield className="w-4 h-4 text-zinc-300" />
                      Tab Disguise &amp; Cloaker
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
                        : TAB_MASK_PRESETS.find((p) => p.id === cloakSettings.activeMaskId)?.title || 'DIØR Workspace'}
                    </span>
                  </div>

                  <span className="text-xs text-zinc-300 font-mono px-2 py-0.5 bg-zinc-850 rounded-md border border-zinc-700">
                    Active Mask: {cloakSettings.activeMaskId}
                  </span>
                </div>

                {launchStatus === 'success' && (
                  <div className="p-2.5 rounded-xl bg-zinc-800 text-white text-xs border border-zinc-700">
                    Stealth window opened in about:blank tab.
                  </div>
                )}

                {launchStatus === 'blocked' && (
                  <div className="p-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs border border-zinc-750">
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
                              ? 'bg-zinc-800 border-white text-white ring-1 ring-white/30 shadow-md'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:border-zinc-700'
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
                          {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
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
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Custom Favicon URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/favicon.ico"
                      value={cloakSettings.customIcon}
                      onChange={(e) => handleCustomTabMask(cloakSettings.customTitle, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
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
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white border border-zinc-700 cursor-pointer"
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
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
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
                          ? 'bg-white text-black border-white font-semibold'
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
              CATEGORY 6: THEME SETTINGS (MONOCHROME PALETTES & LITE MODE)
              ======================================================== */}
          {activeCategory === 'theme' && (
            <div className="space-y-6">
              {/* DIØR Minimal Theme Selector */}
              <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Palette className="w-5 h-5 text-white" />
                    <h2 className="text-base font-bold text-white font-sans uppercase">Monochrome Design System</h2>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Active
                  </span>
                </div>

                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed">
                  Clean pure black and white styling with high-contrast typography, border dividers, and zero visual clutter.
                </p>

                {/* Minimal Monochrome Layout Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'Monochrome Noir', active: true, desc: 'Pure black & white' },
                    { name: 'Obsidian Slate', active: false, desc: 'Deep zinc tones' },
                    { name: 'Carbon High-Contrast', active: false, desc: 'Crisp borders' },
                    { name: 'Minimal Constellation', active: false, desc: 'Connected nodes' },
                  ].map((thm) => (
                    <div
                      key={thm.name}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                        thm.active
                          ? 'bg-zinc-800 border-white text-white ring-1 ring-white/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{thm.name}</span>
                        {thm.active && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">{thm.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CORE FUNCTIONAL THEME FEATURE: DIOR LITE MODE */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-white" />
                      DIØR Lite Performance Mode
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Ultra-clean minimalist performance mode. Disables decorative particle canvas,
                      clears background pictures, and boosts browsing performance.
                    </p>
                  </div>

                  {onToggleYunoLite && (
                    <button
                      type="button"
                      onClick={() => onToggleYunoLite(!isYunoLiteEnabled)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isYunoLiteEnabled
                          ? 'bg-white text-black border-white shadow-lg'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {isYunoLiteEnabled ? 'DIØR Lite: ON' : 'DIØR Lite: OFF'}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-white' : 'text-zinc-600'}`} />
                    <span>Hides background wallpapers &amp; particle overlays</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-white' : 'text-zinc-600'}`} />
                    <span>Optimizes arcade game rendering</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-white' : 'text-zinc-600'}`} />
                    <span>Disables heavy blur for maximum smoothness</span>
                  </div>
                  <div className="flex items-center space-x-2 text-zinc-300">
                    <Check className={`w-4 h-4 ${isYunoLiteEnabled ? 'text-white' : 'text-zinc-600'}`} />
                    <span>Pure high-contrast black and white styling</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. Security & Admin Category (Only visible when authenticated) */}
          {activeCategory === 'security' && isAdmin && (
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Shield className="w-5 h-5 text-white" />
                  <span>Administrator Clearance &amp; Terminal</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Active master clearance with full site moderation, announcements, and partner controls.
                </p>
              </div>

              {/* Status Card */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl border flex items-center justify-center bg-amber-500/10 border-amber-500/30 text-amber-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white">
                          Administrator Authenticated
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-zinc-950">
                          VERIFIED
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Master moderation permissions active.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={onOpenAdminDashboard}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Open Terminal</span>
                    </button>
                    <button
                      type="button"
                      onClick={onAdminLogout}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-300 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ban Appeal Box */}
          {onOpenAppealModal && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Account Restrictions &amp; Appeals</h2>
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
