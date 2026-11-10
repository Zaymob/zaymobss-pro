import React, { useEffect, useRef } from 'react';

export interface WallpaperEffectSettings {
  effect: 'none' | 'rain';
  intensity: number; // 0 to 100
  speed: number; // 0 to 100
  blur: number; // 0 to 20 px
  brightness: number; // 20 to 120 %
  vignette: boolean;
}

export const DEFAULT_EFFECT_SETTINGS: WallpaperEffectSettings = {
  effect: 'rain',
  intensity: 35,
  speed: 40,
  blur: 0,
  brightness: 90,
  vignette: false,
};

export const getSavedEffectSettings = (): WallpaperEffectSettings => {
  try {
    const saved = localStorage.getItem('yuno_wallpaper_effects');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.effect !== 'none') {
        parsed.effect = 'rain';
      }
      return { ...DEFAULT_EFFECT_SETTINGS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_EFFECT_SETTINGS;
};

export const saveEffectSettings = (settings: WallpaperEffectSettings) => {
  try {
    localStorage.setItem('yuno_wallpaper_effects', JSON.stringify(settings));
  } catch (e) {}
};

interface WallpaperCanvasEffectsProps {
  settings: WallpaperEffectSettings;
}

export const WallpaperCanvasEffects: React.FC<WallpaperCanvasEffectsProps> = ({ settings }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (settings.effect !== 'rain') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const intensity = Math.max(5, settings.intensity || 35);
    const speed = Math.max(5, settings.speed || 40) / 50;

    // --- Rain Setup (Very small, subtle but noticeable raindrops) ---
    interface Drop {
      x: number;
      y: number;
      len: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }

    const dropCount = Math.floor(((width * height) / 10000) * (intensity / 30));
    const drops: Drop[] = [];
    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: Math.random() * 8 + 6, // very small crisp droplets
        speedY: (Math.random() * 8 + 10) * speed,
        speedX: -1.2 * speed,
        opacity: Math.random() * 0.35 + 0.35,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        ctx.strokeStyle = `rgba(180, 195, 230, ${d.opacity})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.speedX * 0.8, d.y + d.len);
        ctx.stroke();

        d.y += d.speedY;
        d.x += d.speedX;

        if (d.y > height) {
          d.y = -d.len;
          d.x = Math.random() * (width + 100);
        }
        if (d.x < -20) {
          d.x = width + 20;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings.effect, settings.intensity, settings.speed]);

  if (settings.effect !== 'rain') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{
        filter: settings.blur ? `blur(${settings.blur}px)` : undefined,
        opacity: (settings.brightness || 90) / 100,
      }}
    />
  );
};
