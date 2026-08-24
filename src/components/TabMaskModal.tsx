import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  RotateCcw,
  Check,
  AlertTriangle,
  Zap,
  Lock,
  Layers,
  Sparkles,
  X,
  Keyboard,
  Compass,
  FileCode,
  Copy,
  Upload,
} from 'lucide-react';
import {
  TAB_MASK_PRESETS,
  DEFAULT_CLOAK_SETTINGS,
  getSavedCloakSettings,
  saveCloakSettings,
  launchInAboutBlank,
  launchInBlobCloak,
  applyTabMask,
} from '../utils/tabCloak';
import { TabMaskPreset, TabCloakSettings } from '../types';

interface TabMaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TabMaskModal: React.FC<TabMaskModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<TabCloakSettings>(getSavedCloakSettings);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const [isRecordingPanicKey, setIsRecordingPanicKey] = useState(false);

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      setSettings(getSavedCloakSettings());
    }
  }, [isOpen]);

  // Key recording listener for panic key
  useEffect(() => {
    if (!isRecordingPanicKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keyName = e.key;
      setSettings((prev) => {
        const next = { ...prev, panicKey: keyName };
        saveCloakSettings(next);
        return next;
      });
      setIsRecordingPanicKey(false);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isRecordingPanicKey]);

  if (!isOpen) return null;

  const currentPreset = TAB_MASK_PRESETS.find((p) => p.id === settings.activeMaskId);
  const currentDisplayTitle =
    settings.activeMaskId === 'custom'
      ? settings.customTitle || 'Custom Mask'
      : currentPreset?.title || 'Yunø • The Unblocked Web Portal';
  const currentDisplayIcon =
    settings.activeMaskId === 'custom'
      ? settings.customIcon || 'https://www.google.com/favicon.ico'
      : currentPreset?.icon || '/favicon.ico';

  const handleSelectPreset = (preset: TabMaskPreset) => {
    const updated: TabCloakSettings = {
      ...settings,
      activeMaskId: preset.id,
    };
    setSettings(updated);
    saveCloakSettings(updated);
  };

  const handleCustomChange = (title: string, icon: string) => {
    const updated: TabCloakSettings = {
      ...settings,
      activeMaskId: 'custom',
      customTitle: title,
      customIcon: icon,
    };
    setSettings(updated);
    saveCloakSettings(updated);
  };

  const handleToggleAntiClose = () => {
    const updated: TabCloakSettings = {
      ...settings,
      antiCloseEnabled: !settings.antiCloseEnabled,
    };
    setSettings(updated);
    saveCloakSettings(updated);
  };

  const handleLaunchAboutBlank = () => {
    setLaunchStatus('launching');
    const success = launchInAboutBlank(
      window.location.href,
      currentDisplayTitle,
      currentDisplayIcon
    );

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
    const success = launchInBlobCloak(
      window.location.href,
      currentDisplayTitle,
      currentDisplayIcon
    );
    if (success) {
      setLaunchStatus('success');
      setTimeout(() => setLaunchStatus(null), 3000);
    } else {
      setLaunchStatus('blocked');
      setTimeout(() => setLaunchStatus(null), 5000);
    }
  };

  const handleResetToDefault = () => {
    const defaultSettings: TabCloakSettings = {
      ...DEFAULT_CLOAK_SETTINGS,
      activeMaskId: 'default',
    };
    setSettings(defaultSettings);
    saveCloakSettings(defaultSettings);
    applyTabMask('Yunø • The Unblocked Web Portal', '/favicon.ico');
  };

  const filteredPresets =
    selectedCategory === 'All'
      ? TAB_MASK_PRESETS
      : TAB_MASK_PRESETS.filter((p) => p.category === selectedCategory || p.id === 'default');

  const categories = ['All', 'Google', 'School', 'Tools', 'Reference'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#101015] border border-zinc-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-extrabold text-white">Tab Masking & Stealth Cloaker</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DISGUISE ENGINE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Disguise your browser tab's title & favicon or launch inside an invisible `about:blank` frame.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Live Browser Tab Preview Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <span>Live Browser Tab Disguise Preview</span>
              <span className="text-emerald-400 font-bold">● Active in Browser</span>
            </div>

            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-inner">
              <div className="flex items-center space-x-2">
                {/* Simulated Chrome/Firefox Tab Pill */}
                <div className="flex items-center space-x-2.5 px-4 py-2 bg-[#181820] rounded-xl border border-zinc-700/80 shadow-md max-w-sm sm:max-w-md w-full">
                  <img
                    src={currentDisplayIcon}
                    alt="Favicon"
                    className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://www.google.com/favicon.ico';
                    }}
                  />
                  <span className="text-xs font-semibold text-zinc-200 truncate flex-1 font-sans">
                    {currentDisplayTitle}
                  </span>
                  <X className="w-3 h-3 text-zinc-500 hover:text-zinc-300 cursor-default flex-shrink-0" />
                </div>

                <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900/60 rounded-xl text-[11px] text-zinc-400 border border-zinc-800">
                  <span>Tab ID:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {settings.activeMaskId.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick about:blank Launcher Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Launch about:blank */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-sm font-bold text-white">Open in `about:blank`</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Embeds the app in a clean `about:blank` tab. Leaves zero history logs and conceals URL bar.
                </p>
              </div>

              <button
                onClick={handleLaunchAboutBlank}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch `about:blank` Window</span>
              </button>
            </div>

            {/* Launch Blob URL Cloak */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-sm font-bold text-white">Blob URL Cloaker</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Generates an ephemeral `blob:https://...` frame. Useful when popups are restricted.
                </p>
              </div>

              <button
                onClick={handleLaunchBlob}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer border border-zinc-700"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Launch Blob Cloaked Tab</span>
              </button>
            </div>
          </div>

          {/* Launch Status Feedback */}
          {launchStatus === 'success' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Cloaked window launched successfully in new tab!</span>
            </div>
          )}

          {launchStatus === 'blocked' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Popup blocked by browser. Please allow popups for this site or try Blob Cloak.</span>
            </div>
          )}

          {/* Preset Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Select Tab Disguise Preset
                </span>
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-zinc-700 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredPresets.map((preset) => {
                const isSelected = settings.activeMaskId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center space-x-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                        : 'bg-zinc-900/70 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-1.5 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      <img
                        src={preset.icon}
                        alt={preset.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://www.google.com/favicon.ico';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate block">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {preset.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Disguise Inputs */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-zinc-300 uppercase">
                Custom Tab Disguise
              </span>
              <button
                onClick={handleResetToDefault}
                className="text-[11px] text-zinc-400 hover:text-amber-300 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Custom Tab Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Homework - Biology Doc"
                  value={settings.customTitle}
                  onChange={(e) => handleCustomChange(e.target.value, settings.customIcon)}
                  className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                  Custom Favicon Icon URL
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    placeholder="https://example.com/favicon.ico"
                    value={settings.customIcon}
                    onChange={(e) => handleCustomChange(settings.customTitle, e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                  />
                  <label className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer flex-shrink-0" title="Upload Favicon Image">
                    <Upload className="w-4 h-4 text-amber-400" />
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
                              handleCustomChange(settings.customTitle, ev.target.result as string);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Panic Key & Anti-Close Protection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-zinc-800/80">
            {/* Panic Key Config */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Keyboard className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold text-white">Emergency Panic Hotkey</span>
                </div>
                <button
                  onClick={() => setIsRecordingPanicKey(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    isRecordingPanicKey
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700'
                  }`}
                >
                  {isRecordingPanicKey ? 'Press any key...' : `Key: [ ${settings.panicKey || ']'} ]`}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  Decoy Redirect URL (Triggers on Panic Key)
                </label>
                <input
                  type="url"
                  value={settings.panicUrl}
                  onChange={(e) => {
                    const updated = { ...settings, panicUrl: e.target.value };
                    setSettings(updated);
                    saveCloakSettings(updated);
                  }}
                  placeholder="https://classroom.google.com"
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Anti-Close Prompt Switch */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="space-y-1 max-w-[200px]">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Anti-Close Guard</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Prompts confirmation before tab closes so you won't lose your work or get closed out.
                </p>
              </div>

              <button
                onClick={handleToggleAntiClose}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  settings.antiCloseEnabled
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {settings.antiCloseEnabled ? 'Protected' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            Mask applied in real-time. Safe to close this dialog.
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-colors cursor-pointer border border-zinc-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
