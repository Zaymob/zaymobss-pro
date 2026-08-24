import React, { useEffect, useRef } from 'react';

export interface WallpaperEffectSettings {
  effect: 'none' | 'rain' | 'snow' | 'matrix' | 'stars' | 'fireflies' | 'fog';
  intensity: number; // 0 to 100
  speed: number; // 0 to 100
  blur: number; // 0 to 20 px
  brightness: number; // 20 to 120 %
  vignette: boolean;
}

export const DEFAULT_EFFECT_SETTINGS: WallpaperEffectSettings = {
  effect: 'rain',
  intensity: 50,
  speed: 50,
  blur: 0,
  brightness: 80,
  vignette: false,
};

export const getSavedEffectSettings = (): WallpaperEffectSettings => {
  try {
    const saved = localStorage.getItem('yuno_wallpaper_effects');
    if (saved) {
      return { ...DEFAULT_EFFECT_SETTINGS, ...JSON.parse(saved) };
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

    const intensity = Math.max(5, settings.intensity);
    const speed = Math.max(5, settings.speed) / 50;

    // --- Rain Setup ---
    interface Drop {
      x: number;
      y: number;
      len: number;
      speedY: number;
      speedX: number;
      opacity: number;
    }
    const dropCount = Math.floor((width * height) / 10000 * (intensity / 35));
    const drops: Drop[] = [];
    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        len: Math.random() * 20 + 12,
        speedY: (Math.random() * 12 + 14) * speed,
        speedX: -2 * speed,
        opacity: Math.random() * 0.4 + 0.2,
      });
    }

    // --- Snow Setup ---
    interface Flake {
      x: number;
      y: number;
      r: number;
      speedY: number;
      speedX: number;
      opacity: number;
      swing: number;
    }
    const flakeCount = Math.floor((width * height) / 15000 * (intensity / 30));
    const flakes: Flake[] = [];
    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.5 + 1,
        speedY: (Math.random() * 1.5 + 0.8) * speed,
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.3,
        swing: Math.random() * Math.PI * 2,
      });
    }

    // --- Stars / Starfield Setup ---
    interface Star {
      x: number;
      y: number;
      r: number;
      alpha: number;
      twinkleSpeed: number;
    }
    const starCount = Math.floor((width * height) / 8000 * (intensity / 40));
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.5,
        alpha: Math.random(),
        twinkleSpeed: (Math.random() * 0.03 + 0.01) * speed,
      });
    }

    // --- Fireflies Setup ---
    interface Firefly {
      x: number;
      y: number;
      r: number;
      angle: number;
      speed: number;
      opacity: number;
    }
    const fireflyCount = Math.floor((width * height) / 25000 * (intensity / 40));
    const fireflies: Firefly[] = [];
    for (let i = 0; i < fireflyCount; i++) {
      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1.5,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.8 + 0.3) * speed,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    // --- Fog Setup ---
    interface FogParticle {
      x: number;
      y: number;
      r: number;
      speedX: number;
      opacity: number;
    }
    const fogCount = Math.floor(15 * (intensity / 50));
    const fogParticles: FogParticle[] = [];
    for (let i = 0; i < fogCount; i++) {
      fogParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 200 + 150,
        speedX: (Math.random() * 0.4 + 0.1) * speed,
        opacity: Math.random() * 0.08 + 0.03,
      });
    }

    // --- Render Loop ---
    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      if (settings.effect === 'rain') {
        ctx.strokeStyle = 'rgba(186, 215, 255, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.speedX * 2, d.y + d.len);
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
        ctx.stroke();
      } else if (settings.effect === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        for (let i = 0; i < flakes.length; i++) {
          const f = flakes[i];
          f.swing += 0.02 * speed;
          f.y += f.speedY;
          f.x += Math.sin(f.swing) * 0.6 + f.speedX;

          if (f.y > height) {
            f.y = -5;
            f.x = Math.random() * width;
          }
          if (f.x > width) f.x = 0;
          if (f.x < 0) f.x = width;

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(240, 246, 255, ${f.opacity})`;
          ctx.fill();
        }
      } else if (settings.effect === 'stars') {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.alpha += s.twinkleSpeed;
          const currentAlpha = Math.abs(Math.sin(s.alpha)) * 0.8 + 0.2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
          ctx.fill();
        }
      } else if (settings.effect === 'fireflies') {
        for (let i = 0; i < fireflies.length; i++) {
          const ff = fireflies[i];
          ff.angle += (Math.random() - 0.5) * 0.2;
          ff.x += Math.cos(ff.angle) * ff.speed;
          ff.y += Math.sin(ff.angle) * ff.speed;

          if (ff.x < 0) ff.x = width;
          if (ff.x > width) ff.x = 0;
          if (ff.y < 0) ff.y = height;
          if (ff.y > height) ff.y = 0;

          const glow = Math.sin(frame * 0.05 + i) * 0.4 + 0.6;
          ctx.beginPath();
          ctx.arc(ff.x, ff.y, ff.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(250, 204, 21, ${ff.opacity * glow})`;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else if (settings.effect === 'fog') {
        for (let i = 0; i < fogParticles.length; i++) {
          const p = fogParticles[i];
          p.x += p.speedX;
          if (p.x - p.r > width) {
            p.x = -p.r;
            p.y = Math.random() * height;
          }
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          grad.addColorStop(0, `rgba(220, 230, 245, ${p.opacity})`);
          grad.addColorStop(1, 'rgba(220, 230, 245, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (settings.effect !== 'none') {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (settings.effect !== 'none') {
      render();
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [settings.effect, settings.intensity, settings.speed]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[2]">
      {/* Canvas for dynamic particles (rain, snow, fireflies, stars, fog) */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Optional Vignette Shadow */}
      {settings.vignette && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 140px rgba(0, 0, 0, 0.85)',
          }}
        />
      )}
    </div>
  );
};
