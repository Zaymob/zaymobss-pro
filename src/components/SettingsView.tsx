import React, { useState } from 'react';
import {
  TAB_MASK_PRESETS,
  getSavedCloakSettings,
  saveCloakSettings,
  launchInAboutBlank,
} from '../utils/tabCloak';
import { TabCloakSettings, UserProfile } from '../types';
import {
  WallpaperEffectSettings,
  DEFAULT_EFFECT_SETTINGS,
} from './WallpaperCanvasEffects';


export interface SettingsViewProps {
  currentWallpaper?: string;
  onSelectWallpaper?: (url: string) => void;
  effectSettings?: WallpaperEffectSettings;
  onChangeEffectSettings?: (settings: WallpaperEffectSettings) => void;
  onReplayBoot?: () => void;
  onOpenAppealModal?: () => void;
  isYunoLiteEnabled?: boolean;
  onToggleYunoLite?: (enabled: boolean) => void;
  isAdmin?: boolean;
  onOpenAdminDashboard?: () => void;
  onAdminLogout?: () => void;
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentWallpaper = '#07040a',
  onSelectWallpaper,
  effectSettings = DEFAULT_EFFECT_SETTINGS,
  onChangeEffectSettings,
  userProfile = {
    username: 'Guest',
    displayName: 'Guest',
    avatar: '',
    banner: '',
    status: 'Online',
    bio: '',
    badge: '',
    accentColor: '#18181b',
  },
  onUpdateProfile,
}) => {
  const [cloakSettings, setCloakSettings] = useState<TabCloakSettings>(getSavedCloakSettings);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const showSaved = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  };

  const handleUpdateCloak = (partial: Partial<TabCloakSettings>) => {
    const updated = { ...cloakSettings, ...partial };
    setCloakSettings(updated);
    saveCloakSettings(updated);
    showSaved();
  };

  const handleSelectPreset = (presetId: string) => {
    handleUpdateCloak({ activeMaskId: presetId });
  };

  const isRainActive = effectSettings.effect === 'rain';
  const handleToggleRain = () => {
    const updated: WallpaperEffectSettings = {
      ...effectSettings,
      effect: isRainActive ? 'none' : 'rain',
    };
    onChangeEffectSettings?.(updated);
    showSaved();
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 py-2 pb-24 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#311756]">
        <h1 className="text-xs font-semibold uppercase tracking-wider text-purple-200">Settings</h1>
        {savedFeedback && (
          <span className="text-[11px] text-purple-300 font-mono">Saved</span>
        )}
      </div>



      {/* 4. Browser & Ambient Settings */}
      <div className="bg-[#130a24]/90 border border-[#311756] rounded-xl divide-y divide-[#261042] overflow-hidden text-xs shadow-xl">
        {/* Rainfall */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-white">Rainfall</p>
            <p className="text-[11px] text-purple-300/80">Ambient background rain effect</p>
          </div>
          <button
            type="button"
            onClick={handleToggleRain}
            aria-label="Toggle rainfall"
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
              isRainActive ? 'bg-purple-600' : 'bg-[#1e0f36] border border-[#3e1e6f]'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${
                isRainActive ? 'left-6 bg-white' : 'left-1 bg-purple-300/60'
              }`}
            />
          </button>
        </div>

        {/* About:Blank */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-white">About:Blank</p>
            <p className="text-[11px] text-purple-300/80">Open portal in a clean, untracked tab</p>
          </div>
          <button
            type="button"
            onClick={() => launchInAboutBlank()}
            className="px-3.5 py-1.5 bg-[#251242] hover:bg-[#351961] text-purple-200 border border-[#482080] rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            Open
          </button>
        </div>

        {/* Panic Key */}
        <div className="p-4 space-y-3">
          <div>
            <p className="font-medium text-white">Panic Key</p>
            <p className="text-[11px] text-purple-300/80">Press hotkey to instantly escape to a decoy site</p>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="col-span-1">
              <label className="text-[10px] text-purple-300/70 block mb-1 font-mono">Hotkey</label>
              <input
                type="text"
                maxLength={1}
                value={cloakSettings.panicKey || '`'}
                onChange={(e) => handleUpdateCloak({ panicKey: e.target.value })}
                className="w-full bg-[#0b0517] border border-[#311756] focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-purple-300/70 block mb-1 font-mono">Redirect URL</label>
              <input
                type="text"
                value={cloakSettings.panicUrl || 'https://classroom.google.com'}
                onChange={(e) => handleUpdateCloak({ panicUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#0b0517] border border-[#311756] focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Cloak */}
        <div className="p-4 space-y-2">
          <div>
            <p className="font-medium text-white">Tab Cloak</p>
            <p className="text-[11px] text-purple-300/80">Disguise browser tab title and favicon</p>
          </div>
          <div className="pt-1">
            <select
              value={cloakSettings.activeMaskId || 'default'}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-[#0b0517] border border-[#311756] focus:border-purple-500 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              {TAB_MASK_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#120a22] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
