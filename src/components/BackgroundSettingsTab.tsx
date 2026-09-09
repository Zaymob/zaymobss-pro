import React, { useState, useRef } from 'react';
import {
  WallpaperEffectSettings,
  DEFAULT_EFFECT_SETTINGS,
} from './WallpaperCanvasEffects';
import {
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Check,
  Upload,
  Sun,
  RotateCcw,
  Sparkle,
  Trash2,
  FileVideo,
  EyeOff,
  CloudRain,
  Snowflake,
  Flame,
  CloudFog,
} from 'lucide-react';

interface BackgroundSettingsTabProps {
  currentWallpaper: string;
  onSelectWallpaper: (url: string) => void;
  effectSettings: WallpaperEffectSettings;
  onChangeEffectSettings: (settings: WallpaperEffectSettings) => void;
  onReplayBoot: () => void;
}

const SOLID_THEMES = [
  { id: 'noir', name: 'Dior Noir', value: '#000000' },
  { id: 'obsidian', name: 'Deep Obsidian', value: '#070709' },
  { id: 'graphite', name: 'Graphite', value: '#121215' },
  { id: 'carbon', name: 'Carbon', value: '#18181b' },
  { id: 'slate', name: 'Slate', value: '#27272a' },
];

export const BackgroundSettingsTab: React.FC<BackgroundSettingsTabProps> = ({
  currentWallpaper,
  onSelectWallpaper,
  effectSettings,
  onChangeEffectSettings,
  onReplayBoot,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectOptions: Array<{
    id: WallpaperEffectSettings['effect'];
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'none', label: 'Clean / None', description: 'Zero extra particles over your background', icon: EyeOff },
    { id: 'rain', label: 'Rain Drops', description: 'Falling rain mist', icon: CloudRain },
    { id: 'snow', label: 'Snowfall', description: 'Drifting winter flakes', icon: Snowflake },
    { id: 'stars', label: 'Star Dust', description: 'Ambient star sparkles', icon: Sparkles },
    { id: 'fireflies', label: 'Embers', description: 'Floating embers', icon: Flame },
    { id: 'fog', label: 'Misty Fog', description: 'Atmospheric mist', icon: CloudFog },
  ];

  const handleUpdate = (partial: Partial<WallpaperEffectSettings>) => {
    onChangeEffectSettings({ ...effectSettings, ...partial });
  };

  const handleResetEffects = () => {
    onChangeEffectSettings(DEFAULT_EFFECT_SETTINGS);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customUrl.trim();
    if (!clean) return;
    try {
      new URL(clean);
      onSelectWallpaper(clean);
      setCustomError(false);
      setCustomUrl('');
    } catch {
      if (clean.startsWith('data:') || clean.startsWith('/') || clean.startsWith('#')) {
        onSelectWallpaper(clean);
        setCustomError(false);
        setCustomUrl('');
      } else {
        setCustomError(true);
      }
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onSelectWallpaper(e.target.result as string);
        setCustomError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const isConstellation = currentWallpaper === 'constellation' || !currentWallpaper || currentWallpaper === 'stars';
  const isGucciMorty =
    currentWallpaper === '/gucci_morty_field.mp4' ||
    currentWallpaper === '/gucci_morty_field.webm' ||
    currentWallpaper === '/HQG59KtWkAAuw25.jpg' ||
    currentWallpaper.includes('gucci_morty');

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-zinc-300" />
            Wallpaper & Atmosphere
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select Gucci Morty live video wallpaper, interactive star constellation, or upload your custom media.
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

      {/* Primary Wallpaper Selection */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
            Active Background
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {isGucciMorty
              ? 'Gucci Morty Video Wallpaper'
              : isConstellation
              ? 'OG Interactive Stars'
              : 'Custom Wallpaper'}
          </span>
        </div>

        {/* Featured: Gucci Morty Video Wallpaper vs OG Stars vs Custom */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Option 1: Gucci Morty Video Wallpaper */}
          <div
            onClick={() => onSelectWallpaper('/gucci_morty_field.mp4')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
              isGucciMorty
                ? 'bg-zinc-950 border-white ring-1 ring-white/50 text-white shadow-xl'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center gap-1.5">
                <FileVideo className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                  Video
                </span>
                {isGucciMorty && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-black font-bold uppercase">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Preview */}
            <div className="w-full h-24 rounded-lg overflow-hidden mb-3 border border-zinc-800 relative bg-black">
              <img
                src="/HQG59KtWkAAuw25.jpg"
                alt="Gucci Morty"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/80 flex items-end p-2 border-t border-zinc-800">
                <span className="text-[10px] font-medium text-white flex items-center gap-1">
                  <FileVideo className="w-3 h-3 text-amber-400" />
                  Gucci Morty • Animated Loop
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-white">Gucci Morty Video</div>
              <p className="text-xs text-zinc-400 mt-1">
                Animated field video wallpaper with sun lens flare and gentle drift.
              </p>
            </div>
          </div>

          {/* Option 2: OG Star Constellation */}
          <div
            onClick={() => onSelectWallpaper('constellation')}
            className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              isConstellation
                ? 'bg-zinc-950 border-white ring-1 ring-white/50 text-white shadow-xl'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                <Sparkles className="w-5 h-5" />
              </div>
              {isConstellation && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-black font-bold uppercase">
                  Active
                </span>
              )}
            </div>
            <div className="w-full h-24 rounded-lg overflow-hidden mb-3 border border-zinc-800 relative bg-[#050507] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
              <span className="absolute text-[10px] font-mono text-zinc-400 bottom-2">Live Physics Canvas</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">OG Star Constellation</div>
              <p className="text-xs text-zinc-400 mt-1">
                Connected stars with live physics, mouse repulsion & cursor tracking beams.
              </p>
            </div>
          </div>

          {/* Option 3: Upload File / Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between ${
              dragActive
                ? 'border-white bg-zinc-800/80 text-white'
                : !isConstellation && !isGucciMorty && !currentWallpaper.startsWith('#')
                ? 'border-zinc-700 bg-zinc-950 text-zinc-200'
                : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-zinc-800 text-white border border-zinc-700">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase text-zinc-500">
                Custom Media
              </span>
            </div>
            <div className="w-full h-24 rounded-lg overflow-hidden mb-3 border border-dashed border-zinc-800 bg-zinc-950/80 flex flex-col items-center justify-center p-2 text-center">
              <Upload className="w-5 h-5 text-zinc-500 mb-1" />
              <span className="text-[10px] text-zinc-400">MP4, WebM, GIF, JPG</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Upload Custom Media</div>
              <p className="text-xs text-zinc-400 mt-1">
                Drop or browse an image, animated GIF, or MP4 video here.
              </p>
            </div>
          </div>
        </div>

        {/* Minimalist Solid Monochrome Tones */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <div className="text-xs font-medium text-zinc-400">Minimalist Solid Tones</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SOLID_THEMES.map((theme) => {
              const isSelected = currentWallpaper === theme.value;
              return (
                <button
                  key={theme.id}
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

        {/* Custom Image or Video URL Form */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <div className="text-xs font-medium text-zinc-400">Apply Image or Video by URL</div>
          <form onSubmit={handleCustomSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setCustomError(false);
              }}
              placeholder="Paste direct wallpaper URL (https://... or data:...)"
              className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-lg transition-colors border border-zinc-700 cursor-pointer"
            >
              Apply
            </button>
          </form>
          {customError && (
            <p className="text-[11px] text-red-400 font-mono">Please enter a valid image or video URL.</p>
          )}
        </div>
      </div>

      {/* Overlay Atmosphere Effects */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            Atmosphere Particle Overlay
          </h3>
          <span className="text-xs font-mono text-zinc-500 capitalize">
            {effectSettings.effect}
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
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 border-white text-white ring-1 ring-white/50'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Particle Density</span>
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
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Particle Speed</span>
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
            </div>
          </div>
        )}
      </div>

      {/* Visual Adjustments (Blur, Brightness, Vignette) */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md space-y-4 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-zinc-400" />
          Lighting & Blur Adjustments
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Background Brightness</span>
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
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-300">Vignette Edge Shadow</div>
            <div className="text-[11px] text-zinc-500">Darkens screen edges for enhanced contrast</div>
          </div>
          <button
            type="button"
            onClick={() => handleUpdate({ vignette: !effectSettings.vignette })}
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
    </div>
  );
};
