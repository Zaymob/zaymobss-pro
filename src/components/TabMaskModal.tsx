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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0d0716] border border-[#25143b] rounded-xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#25143b] flex items-center justify-between bg-[#090510]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a0e2d] border border-[#3e2264] flex items-center justify-center text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Tab Masking & Stealth Cloaker</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Disguise your browser tab's title & favicon or launch inside an invisible `about:blank` frame.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#150a24] hover:bg-[#201036] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-[#2d164a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Live Browser Tab Preview Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <span>Live Browser Tab Disguise Preview</span>
              <span className="text-emerald-400 font-bold">● Active in Browser</span>
            </div>

            <div className="p-3 bg-[#07040a] rounded-lg border border-[#25143b]">
              <div className="flex items-center space-x-2">
                {/* Simulated Chrome/Firefox Tab Pill */}
                <div className="flex items-center space-x-2.5 px-3 py-1.5 bg-[#140b22] rounded-lg border border-[#2d164a] max-w-sm sm:max-w-md w-full">
                  <img
                    src={currentDisplayIcon}
                    alt="Favicon"
                    className="w-4 h-4 rounded-sm object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://www.google.com/favicon.ico';
                    }}
                  />
                  <span className="text-xs font-medium text-zinc-200 truncate flex-1 font-sans">
                    {currentDisplayTitle}
                  </span>
                  <X className="w-3 h-3 text-zinc-500 hover:text-zinc-300 cursor-default flex-shrink-0" />
                </div>

                <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-[#0d0716] rounded-lg text-[11px] text-zinc-400 border border-[#25143b]">
                  <span>Tab ID:</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {settings.activeMaskId.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick about:blank Launcher Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Launch about:blank */}
            <div className="p-3.5 rounded-lg bg-[#0e0916] border border-[#25143b] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Open in `about:blank`</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Embeds the app in a clean `about:blank` tab. Leaves zero history logs and conceals URL bar.
                </p>
              </div>

              <button
                onClick={handleLaunchAboutBlank}
                className="w-full py-2 px-3 rounded-lg bg-[#201236] hover:bg-[#2c1a47] text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer border border-[#552c8c] hover:border-[#793ebd]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch `about:blank` Window</span>
              </button>
            </div>

            {/* Launch Blob URL Cloak */}
            <div className="p-3.5 rounded-lg bg-[#0e0916] border border-[#25143b] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Blob URL Cloaker</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Generates an ephemeral `blob:https://...` frame. Useful when popups are restricted.
                </p>
              </div>

              <button
                onClick={handleLaunchBlob}
                className="w-full py-2 px-3 rounded-lg bg-[#150a24] hover:bg-[#201036] text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer border border-[#2d164a] hover:border-[#4d2382]"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Launch Blob Cloaked Tab</span>
              </button>
            </div>
          </div>

          {/* Launch Status Feedback */}
          {launchStatus === 'success' && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>Cloaked window launched successfully in new tab!</span>
            </div>
          )}

          {launchStatus === 'blocked' && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Popup blocked by browser. Please allow popups for this site or try Blob Cloak.</span>
            </div>
          )}

          {/* Preset Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Select Tab Disguise Mask
                </span>
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                      selectedCategory === cat
                        ? 'bg-[#201236] text-white border-[#5b2a94] font-semibold'
                        : 'bg-transparent text-zinc-400 hover:text-white border-transparent hover:border-[#2b1647]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredPresets.map((preset) => {
                const isSelected = settings.activeMaskId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2.5 rounded-lg border text-left transition-colors flex items-center space-x-2.5 cursor-pointer group ${
                      isSelected
                        ? 'bg-[#201236] border-[#5b2a94] text-white font-medium'
                        : 'bg-[#07040a] border-[#25143b] text-zinc-300 hover:bg-[#130b20] hover:border-[#3e2264]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded bg-[#130b20] border border-[#25143b] flex items-center justify-center p-1 flex-shrink-0">
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
                        <span className="text-xs font-semibold text-white truncate block">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
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
          <div className="p-3.5 rounded-lg bg-[#0e0916] border border-[#25143b] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Custom Tab Disguise
              </span>
              <button
                onClick={handleResetToDefault}
                className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center space-x-1 transition-colors cursor-pointer"
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
                  className="w-full px-3 py-1.5 bg-[#07040a] border border-[#2a1744] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6b21a8] transition-colors"
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
                    className="flex-1 px-3 py-1.5 bg-[#07040a] border border-[#2a1744] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6b21a8] transition-colors"
                  />
                  <label className="p-1.5 rounded-lg bg-[#140b22] hover:bg-[#1e1333] border border-[#2a1744] text-zinc-300 cursor-pointer flex-shrink-0" title="Upload Favicon Image">
                    <Upload className="w-4 h-4 text-purple-400" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#25143b]">
            {/* Panic Key Config */}
            <div className="p-3.5 rounded-lg bg-[#0e0916] border border-[#25143b] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Keyboard className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Emergency Panic Hotkey</span>
                </div>
                <button
                  onClick={() => setIsRecordingPanicKey(true)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                    isRecordingPanicKey
                      ? 'bg-purple-600 text-white border-purple-400 animate-pulse'
                      : 'bg-[#150a24] text-purple-300 border-[#3e2264] hover:border-purple-400'
                  }`}
                >
                  {isRecordingPanicKey ? 'Press any key...' : `Key: [ ${settings.panicKey || '`'} ]`}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  Decoy Redirect URL
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
                  className="w-full px-3 py-1.5 bg-[#07040a] border border-[#2a1744] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6b21a8] transition-colors"
                />
              </div>
            </div>

            {/* Anti-Close Prompt Switch */}
            <div className="p-3.5 rounded-lg bg-[#0e0916] border border-[#25143b] flex items-center justify-between">
              <div className="space-y-1 max-w-[200px]">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">Anti-Close Guard</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Prompts confirmation before tab closes to protect your work and tab state.
                </p>
              </div>

              <button
                onClick={handleToggleAntiClose}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  settings.antiCloseEnabled
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-[#150a24] text-zinc-400 border-[#2d164a] hover:text-white hover:border-[#4d2382]'
                }`}
              >
                {settings.antiCloseEnabled ? 'Protected' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#25143b] bg-[#090510] flex items-center justify-between">
          <span className="text-xs text-zinc-500 font-mono">
            Mask applied in real-time. Safe to close this dialog.
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#201236] hover:bg-[#2c1a47] text-white font-semibold text-xs transition-colors cursor-pointer border border-[#552c8c] hover:border-[#793ebd]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
