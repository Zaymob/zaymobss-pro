import React, { useState } from 'react';
import { WALLPAPERS } from '../data/portalData';
import {
  WallpaperEffectSettings,
  DEFAULT_EFFECT_SETTINGS,
} from './WallpaperCanvasEffects';
import {
  CloudRain,
  Snowflake,
  Sparkles,
  Flame,
  CloudFog,
  EyeOff,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  Check,
  Upload,
  Sun,
  Layers,
  Sparkle,
} from 'lucide-react';

interface BackgroundSettingsTabProps {
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  effectSettings: WallpaperEffectSettings;
  onChangeEffectSettings: (settings: WallpaperEffectSettings) => void;
  onReplayBoot: () => void;
}

export const BackgroundSettingsTab: React.FC<BackgroundSettingsTabProps> = ({
  currentWallpaper,
  onSelectWallpaper,
  effectSettings,
  onChangeEffectSettings,
  onReplayBoot,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState(false);

  const effectOptions: Array<{
    id: WallpaperEffectSettings['effect'];
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'none', label: 'None', description: 'Clean background with no overlay particles', icon: EyeOff },
    { id: 'rain', label: 'Rain Drops', description: 'Gentle to heavy falling rain drizzle', icon: CloudRain },
    { id: 'snow', label: 'Light Snow', description: 'Calm winter snowfall and drifting flakes', icon: Snowflake },
    { id: 'stars', label: 'Twinkling Stars', description: 'Subtle twinkling starfield overlay', icon: Sparkles },
    { id: 'fireflies', label: 'Fireflies', description: 'Warm floating embers and glowing lights', icon: Flame },
    { id: 'fog', label: 'Misty Fog', description: 'Drifting cloud mist atmosphere', icon: CloudFog },
  ];

  const handleUpdate = (partial: Partial<WallpaperEffectSettings>) => {
    onChangeEffectSettings({ ...effectSettings, ...partial });
  };

  const handleResetEffects = () => {
    onChangeEffectSettings(DEFAULT_EFFECT_SETTINGS);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    try {
      new URL(customUrl.trim());
      onSelectWallpaper(customUrl.trim());
      setCustomError(false);
    } catch {
      // allow relative or data url
      if (customUrl.startsWith('data:') || customUrl.startsWith('/')) {
        onSelectWallpaper(customUrl.trim());
        setCustomError(false);
      } else {
        setCustomError(true);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-cyan-400" />
            Atmosphere & Wallpaper Effects
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure live particle weather (rain, snow, stars), background blur, and lighting adjustments across all tabs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetEffects}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors cursor-pointer"
          >
            Reset Effects
          </button>
          <button
            type="button"
            onClick={onReplayBoot}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Boot</span>
          </button>
        </div>
      </div>

      {/* Screen Effects Selector Cards */}
      <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Overlay Particle Effect
          </h3>
          <span className="text-xs font-mono text-zinc-500 capitalize">
            Current: {effectSettings.effect}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {effectOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = effectSettings.effect === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleUpdate({ effect: opt.id })}
                className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-zinc-800 border-white ring-1 ring-white/50 text-white'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Sliders for active weather effect */}
        {effectSettings.effect !== 'none' && (
          <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Intensity / Rain Density Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">
                  {effectSettings.effect === 'rain'
                    ? 'Rain Intensity / Density'
                    : effectSettings.effect === 'snow'
                    ? 'Snow Density'
                    : 'Particle Count'}
                </span>
                <span className="font-mono text-zinc-400">{effectSettings.intensity}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={effectSettings.intensity}
                onChange={(e) => handleUpdate({ intensity: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Light</span>
                <span>Heavy Storm</span>
              </div>
            </div>

            {/* Fall Speed Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Particle Fall Speed</span>
                <span className="font-mono text-zinc-400">{effectSettings.speed}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={effectSettings.speed}
                onChange={(e) => handleUpdate({ speed: Number(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>Slow / Gentle</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Adjustments (Blur, Brightness, Vignette) */}
      <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-zinc-400" />
          Background Visual Adjustments
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Background Blur Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Background Blur</span>
              <span className="font-mono text-zinc-400">{effectSettings.blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={effectSettings.blur}
              onChange={(e) => handleUpdate({ blur: Number(e.target.value) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Sharp (0px)</span>
              <span>Ultra Blurry (20px)</span>
            </div>
          </div>

          {/* Background Brightness Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Background Brightness / Dim</span>
              <span className="font-mono text-zinc-400">{effectSettings.brightness}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="120"
              step="5"
              value={effectSettings.brightness}
              onChange={(e) => handleUpdate({ brightness: Number(e.target.value) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Dark (20%)</span>
              <span>Bright (120%)</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-300">Vignette Edge Shadow</div>
            <div className="text-[11px] text-zinc-500">Darkens screen edges for enhanced contrast and depth</div>
          </div>
          <button
            type="button"
            onClick={() => handleUpdate({ vignette: !effectSettings.vignette })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              effectSettings.vignette
                ? 'bg-zinc-800 text-white border-zinc-600'
                : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {effectSettings.vignette ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Actual Background Pictures Grid */}
      <div className="p-4 sm:p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            Background Wallpapers
          </h3>
          <span className="text-xs font-mono text-zinc-500">
            {WALLPAPERS.length} Wallpapers
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {WALLPAPERS.map((wp) => {
            const isSelected = currentWallpaper === wp.url;
            return (
              <div
                key={wp.id}
                onClick={() => onSelectWallpaper(wp.url)}
                className={`group relative rounded-lg overflow-hidden aspect-video cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-white ring-2 ring-white shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <img
                  src={wp.thumbnail}
                  alt={wp.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-2 right-2">
                  <span className="text-[10px] font-medium text-white truncate block">
                    {wp.name}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom Image URL Form */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="text-xs font-medium text-zinc-300">Apply Custom Image or Video Wallpaper</div>
          <form onSubmit={handleCustomSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setCustomError(false);
              }}
              placeholder="Paste direct wallpaper image/video URL (e.g. https://...)"
              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-lg transition-colors border border-zinc-700 cursor-pointer"
            >
              Apply
            </button>
          </form>
          {customError && (
            <p className="text-[11px] text-red-400">Please enter a valid URL.</p>
          )}
        </div>
      </div>
    </div>
  );
};
