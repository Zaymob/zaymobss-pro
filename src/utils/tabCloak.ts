import { TabMaskPreset, TabCloakSettings } from '../types';

export const TAB_MASK_PRESETS: TabMaskPreset[] = [
  {
    id: 'default',
    name: 'Yuno (Default)',
    title: 'Yuno',
    icon: '/yuno-logo.jpg',
    category: 'Custom',
    description: 'Default Yuno logo & title',
  },
  {
    id: 'drive',
    name: 'Google Drive',
    title: 'Google Drive - My Drive',
    icon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
    category: 'Google',
    description: 'Disguises as Google Drive cloud storage',
  },
  {
    id: 'classroom',
    name: 'Google Classroom',
    title: 'Classes',
    icon: 'https://ssl.gstatic.com/classroom/favicon.png',
    category: 'School',
    description: 'Disguises as Google Classroom dashboard',
  },
  {
    id: 'canvas',
    name: 'Canvas LMS',
    title: 'Dashboard',
    icon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico',
    category: 'School',
    description: 'Disguises as Canvas Student Course portal',
  },
  {
    id: 'canva-site',
    name: 'Canva Website (my.canva.site)',
    title: 'Design Project - Canva',
    icon: 'https://static.canva.com/static/images/favicon-1.ico',
    category: 'School',
    description: 'Disguises as a student Canva presentation site (my.canva.site)',
  },
  {
    id: 'docs',
    name: 'Google Docs',
    title: 'Untitled document - Google Docs',
    icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico',
    category: 'Google',
    description: 'Disguises as an active Google Document',
  },
  {
    id: 'slides',
    name: 'Google Slides',
    title: 'Untitled presentation - Google Slides',
    icon: 'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico',
    category: 'Google',
    description: 'Disguises as Google Slides presentation',
  },
  {
    id: 'desmos',
    name: 'Desmos Calculator',
    title: 'Desmos | Graphing Calculator',
    icon: 'https://www.desmos.com/favicon.ico',
    category: 'Tools',
    description: 'Disguises as Desmos Math Graphing tool',
  },
  {
    id: 'khan',
    name: 'Khan Academy',
    title: 'Dashboard | Khan Academy',
    icon: 'https://www.khanacademy.org/favicon.ico',
    category: 'School',
    description: 'Disguises as Khan Academy educational dashboard',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    title: 'Wikipedia, the free encyclopedia',
    icon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
    category: 'Reference',
    description: 'Disguises as Wikipedia article reference',
  },
  {
    id: 'edpuzzle',
    name: 'Edpuzzle',
    title: 'Edpuzzle',
    icon: 'https://edpuzzle.imgix.net/favicons/favicon-32.png',
    category: 'School',
    description: 'Disguises as Edpuzzle assignment page',
  },
  {
    id: 'quizlet',
    name: 'Quizlet',
    title: 'Flashcards, learning tools and textbook solutions | Quizlet',
    icon: 'https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://quizlet.com&size=128',
    category: 'School',
    description: 'Disguises as Quizlet Study Flashcards',
  },
  {
    id: 'kahoot',
    name: 'Kahoot!',
    title: 'Play Kahoot! - Enter game PIN here!',
    icon: 'https://kahoot.it/favicon.ico',
    category: 'School',
    description: 'Disguises as Kahoot Game PIN entry page',
  },
  {
    id: 'google',
    name: 'Google Search',
    title: 'Google',
    icon: 'https://www.google.com/favicon.ico',
    category: 'Google',
    description: 'Disguises as standard Google Search homepage',
  },
];

export const DEFAULT_CLOAK_SETTINGS: TabCloakSettings = {
  activeMaskId: 'default',
  customTitle: '',
  customIcon: '',
  panicKey: ']',
  panicUrl: 'https://classroom.google.com',
  antiCloseEnabled: false,
  autoAboutBlank: false,
};

/**
 * Applies tab title and favicon in document head reliably across all browsers
 */
export function applyTabMask(title: string, iconUrl: string) {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  document.title = title || 'Yuno';

  // 2. Remove ALL existing icon and apple-touch-icon links from <head>
  // This is required because Chrome/Edge will ignore dynamically changed icon hrefs
  // if an SVG or older link tag remains in the DOM.
  const existingIcons = document.querySelectorAll(
    "link[rel*='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']"
  );
  existingIcons.forEach((el) => {
    el.parentNode?.removeChild(el);
  });

  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  const resolvedIcon = iconUrl || '/yuno-logo.jpg';

  // 3. Append clean primary favicon
  const mainIcon = document.createElement('link');
  mainIcon.rel = 'icon';
  mainIcon.type = resolvedIcon.endsWith('.ico')
    ? 'image/x-icon'
    : resolvedIcon.endsWith('.png')
    ? 'image/png'
    : resolvedIcon.endsWith('.svg')
    ? 'image/svg+xml'
    : 'image/jpeg';
  mainIcon.href = resolvedIcon;
  head.appendChild(mainIcon);

  // 4. Append shortcut icon for older engines
  const shortcutIcon = document.createElement('link');
  shortcutIcon.rel = 'shortcut icon';
  shortcutIcon.href = resolvedIcon;
  head.appendChild(shortcutIcon);

  // 5. Append apple-touch-icon
  const appleIcon = document.createElement('link');
  appleIcon.rel = 'apple-touch-icon';
  appleIcon.href = resolvedIcon;
  head.appendChild(appleIcon);
}

/**
 * Loads saved cloaking settings from localStorage
 */
export function getSavedCloakSettings(): TabCloakSettings {
  if (typeof window === 'undefined') return DEFAULT_CLOAK_SETTINGS;
  try {
    const raw = localStorage.getItem('yuno_cloak_settings');
    if (raw) {
      return { ...DEFAULT_CLOAK_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading cloak settings:', e);
  }
  return DEFAULT_CLOAK_SETTINGS;
}

/**
 * Saves and applies cloaking configuration
 */
export function saveCloakSettings(settings: TabCloakSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('yuno_cloak_settings', JSON.stringify(settings));

    let titleToApply = 'Yuno';
    let iconToApply = '/yuno-logo.jpg';

    if (settings.activeMaskId === 'custom') {
      titleToApply = settings.customTitle || 'Google';
      iconToApply = settings.customIcon || 'https://www.google.com/favicon.ico';
    } else {
      const preset = TAB_MASK_PRESETS.find((p) => p.id === settings.activeMaskId);
      if (preset && preset.id !== 'default') {
        titleToApply = preset.title;
        iconToApply = preset.icon;
      }
    }

    applyTabMask(titleToApply, iconToApply);
    toggleAntiCloseProtection(settings.antiCloseEnabled);
  } catch (e) {
    console.warn('Error saving cloak settings:', e);
  }
}

/**
 * Activates or disables beforeunload window prompt
 */
export function toggleAntiCloseProtection(enabled: boolean) {
  if (typeof window === 'undefined') return;

  if (enabled) {
    window.onbeforeunload = (e) => {
      const msg = 'Leave site? Changes you made may not be saved.';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    };
  } else {
    window.onbeforeunload = null;
  }
}

/**
 * Launches the current app window or URL inside a pristine about:blank popup
 */
export function launchInAboutBlank(
  targetUrl?: string,
  customTitle?: string,
  customIcon?: string
): boolean {
  if (typeof window === 'undefined') return false;

  const url = targetUrl || window.location.href;
  const title = customTitle || document.title;
  const icon = customIcon || (document.querySelector("link[rel*='icon']") as HTMLLinkElement)?.href;

  const win = window.open('about:blank', '_blank');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // Popup was blocked by browser
    return false;
  }

  const doc = win.document;
  doc.title = title;

  if (icon) {
    const link = doc.createElement('link');
    link.rel = 'shortcut icon';
    link.href = icon;
    doc.head.appendChild(link);
  }

  // Set up full bleed iframe styling
  const style = doc.createElement('style');
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #09090b; }
    iframe { width: 100vw; height: 100vh; border: none; outline: none; display: block; }
  `;
  doc.head.appendChild(style);

  const iframe = doc.createElement('iframe');
  iframe.src = url;
  iframe.allow = 'camera; microphone; geolocation; fullscreen; autoplay; clipboard-write; encrypted-media';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  doc.body.appendChild(iframe);
  return true;
}

/**
 * Launches the app in a Blob URL cloak window (Fallback when about:blank popups are restricted)
 */
export function launchInBlobCloak(
  targetUrl?: string,
  customTitle?: string,
  customIcon?: string
): boolean {
  if (typeof window === 'undefined') return false;

  const url = targetUrl || window.location.href;
  const title = customTitle || document.title;
  const icon = customIcon || (document.querySelector("link[rel*='icon']") as HTMLLinkElement)?.href || '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link rel="shortcut icon" href="${icon}">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #09090b; }
        iframe { width: 100vw; height: 100vh; border: none; display: block; }
      </style>
    </head>
    <body>
      <iframe src="${url}" allow="camera; microphone; geolocation; fullscreen; autoplay; clipboard-write; encrypted-media"></iframe>
    </body>
    </html>
  `;

  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    return !!win;
  } catch (e) {
    console.error('Failed to open Blob Cloak:', e);
    return false;
  }
}
