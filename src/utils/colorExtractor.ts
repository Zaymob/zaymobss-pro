/**
 * Utility to extract dominant and accent colors from wallpaper images/videos
 */

export interface ExtractedTheme {
  primary: string;
  accent: string;
  highlight: string;
  glow: string;
}

export function extractWallpaperColors(imageUrl: string): Promise<ExtractedTheme> {
  return new Promise((resolve) => {
    // If it's a video data URL or video link, we can use a canvas element or video frame
    if (imageUrl.startsWith('data:video') || imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov')) {
      const video = document.createElement('video');
      video.crossOrigin = 'Anonymous';
      video.muted = true;
      video.src = imageUrl;

      const timeout = setTimeout(() => {
        resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
      }, 2000);

      video.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, 100, 100);
            const data = ctx.getImageData(0, 0, 100, 100).data;
            clearTimeout(timeout);
            resolve(processImageData(data));
            return;
          }
        } catch (e) {}
        clearTimeout(timeout);
        resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
      };

      return;
    }

    // Standard Image URL / Data URL
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    const timeout = setTimeout(() => {
      resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
    }, 2500);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 100, 100);
          const data = ctx.getImageData(0, 0, 100, 100).data;
          clearTimeout(timeout);
          resolve(processImageData(data));
          return;
        }
      } catch (e) {}
      clearTimeout(timeout);
      resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' });
    };

    img.src = imageUrl;
  });
}

function processImageData(data: Uint8ClampedArray): ExtractedTheme {
  let rSum = 0, gSum = 0, bSum = 0;
  let count = 0;
  let maxSat = -1;
  let vibrantColor = { r: 6, g: 182, b: 212 }; // Default cyan
  let highlightColor = { r: 59, g: 130, b: 246 }; // Default blue

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    rSum += r;
    gSum += g;
    bSum += b;
    count++;

    // Calculate saturation to locate colorful pixels for accent
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;

    if (sat > maxSat && max > 40 && min < 225) {
      maxSat = sat;
      vibrantColor = { r, g, b };
    } else if (sat > 0.2 && Math.abs(r - vibrantColor.r) > 25) {
      highlightColor = { r, g, b };
    }
  }

  if (count === 0) {
    return { primary: '#06b6d4', accent: '#3b82f6', highlight: '#38bdf8', glow: 'rgba(6, 182, 212, 0.4)' };
  }

  const avgR = Math.round(rSum / count);
  const avgG = Math.round(gSum / count);
  const avgB = Math.round(bSum / count);

  const primaryHex = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;
  const accentHex = `#${vibrantColor.r.toString(16).padStart(2, '0')}${vibrantColor.g.toString(16).padStart(2, '0')}${vibrantColor.b.toString(16).padStart(2, '0')}`;
  const highlightHex = `#${highlightColor.r.toString(16).padStart(2, '0')}${highlightColor.g.toString(16).padStart(2, '0')}${highlightColor.b.toString(16).padStart(2, '0')}`;
  const glowRgb = `rgba(${vibrantColor.r}, ${vibrantColor.g}, ${vibrantColor.b}, 0.45)`;

  return {
    primary: primaryHex,
    accent: accentHex,
    highlight: highlightHex,
    glow: glowRgb,
  };
}

export function applyThemeToCSS(theme: ExtractedTheme) {
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-accent', theme.accent);
  document.documentElement.style.setProperty('--theme-highlight', theme.highlight);
  document.documentElement.style.setProperty('--theme-glow', theme.glow);
}
