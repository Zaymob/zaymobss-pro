import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
  Paperclip,
  CodeXml,
  MessageSquare,
  Download,
  Play,
  Code,
  Eye,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Columns,
  FileCode,
  RefreshCw,
  Edit2,
  Archive,
  FilePlus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import JSZip from 'jszip';

export interface ViviMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  attachments?: Array<{
    name: string;
    type: string;
    dataUrl?: string;
    textContent?: string;
    sizeKb?: number;
  }>;
  citations?: Array<{
    title: string;
    url: string;
  }>;
  generatedImageUrl?: string;
  isError?: boolean;
}

export interface ViviChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ViviMessage[];
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' | 'text';
}

export interface ViviProject {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  files: ProjectFile[];
  activeFileId: string;
  openFileIds: string[];
  messages: ViviMessage[];
  htmlCode?: string; // legacy backward compatibility
}

const RANDOM_ONE_LINERS = [
  'Frutiger Aero Yams',
  'The yams did it',
  '“For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future.” — Jeremiah 29:11',
  '“I can do all things through Christ who strengthens me.” — Philippians 4:13',
  '“Trust in the Lord with all your heart and lean not on your own understanding.” — Proverbs 3:5',
  '“Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.” — Matthew 7:7',
];

const THINKING_PHRASES = [
  'Generating response',
  'Thinking...',
  'Pondering...',
  'Making a sandwich...',
  'Crunching numbers...',
  'Doing homework...',
  'Reading files...',
  'Polishing math symbols...',
  'Building project...',
];

export function inferLanguage(filePath: string): ProjectFile['language'] {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs')) return 'javascript';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  return 'text';
}

export function getFileLanguageLabel(language: ProjectFile['language']): { label: string; color: string } {
  switch (language) {
    case 'html':
      return { label: 'HTML', color: '#f97316' };
    case 'css':
      return { label: 'CSS', color: '#38bdf8' };
    case 'javascript':
      return { label: 'JS', color: '#eab308' };
    case 'typescript':
      return { label: 'TS', color: '#60a5fa' };
    case 'json':
      return { label: 'JSON', color: '#10b981' };
    case 'markdown':
      return { label: 'MD', color: '#c084fc' };
    default:
      return { label: 'TXT', color: '#a1a1aa' };
  }
}

export const DEFAULT_PROJECT_FILES: ProjectFile[] = [
  {
    id: 'f_index',
    name: 'index.html',
    path: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yam Clicker</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="game-card">
    <h1>🍠 Yam Clicker</h1>
    <div class="score-display" id="yams">0</div>
    <div class="cps-display">yams per second: <span id="cps">0</span></div>

    <button class="click-target" id="clickerBtn" aria-label="Click Yam">🍠</button>

    <div class="upgrades">
      <button class="upgrade-btn" id="btnAutoYam">
        <div><strong>Auto-Harvester</strong><br><small>+1 yam / sec</small></div>
        <div class="btn-cost" id="costAutoYam">15 Yams</div>
      </button>

      <button class="upgrade-btn" id="btnYamFarm">
        <div><strong>Yam Greenhouse</strong><br><small>+5 yams / sec</small></div>
        <div class="btn-cost" id="costYamFarm">100 Yams</div>
      </button>

      <button class="upgrade-btn" id="btnGoldenYam">
        <div><strong>Frutiger Fertilizer</strong><br><small>+2 per click</small></div>
        <div class="btn-cost" id="costGoldenYam">50 Yams</div>
      </button>
    </div>
  </div>

  <script src="js/clicker.js"></script>
</body>
</html>`,
  },
  {
    id: 'f_css',
    name: 'style.css',
    path: 'css/style.css',
    language: 'css',
    content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.game-card {
  background: #141418;
  border: 1px solid #27272a;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

h1 {
  font-size: 26px;
  margin-bottom: 8px;
  font-weight: 700;
  color: #ffffff;
}

.score-display {
  font-size: 38px;
  font-weight: 800;
  color: #e4e4e7;
  margin: 15px 0 5px;
}

.cps-display {
  font-size: 13px;
  color: #a1a1aa;
  margin-bottom: 25px;
}

.click-target {
  font-size: 80px;
  background: #1c1c22;
  border: 2px solid #3f3f46;
  border-radius: 50%;
  width: 150px;
  height: 150px;
  margin: 0 auto 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.08s ease;
  outline: none;
}

.click-target:active {
  transform: scale(0.92);
}

.upgrades {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.upgrade-btn {
  background: #202026;
  border: 1px solid #33333b;
  border-radius: 12px;
  padding: 12px 16px;
  color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.upgrade-btn:hover:not(:disabled) {
  background: #272730;
}

.upgrade-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-cost {
  font-weight: 700;
  color: #cbd5e1;
}`,
  },
  {
    id: 'f_js',
    name: 'clicker.js',
    path: 'js/clicker.js',
    language: 'javascript',
    content: `let yams = 0;
let clickPower = 1;
let cps = 0;

let autoHarvesters = 0;
let costAuto = 15;

let greenhouses = 0;
let costGreenhouse = 100;

let clickUpgrades = 0;
let costClick = 50;

const yamsEl = document.getElementById('yams');
const cpsEl = document.getElementById('cps');
const clickerBtn = document.getElementById('clickerBtn');

const btnAuto = document.getElementById('btnAutoYam');
const costAutoEl = document.getElementById('costAutoYam');

const btnGreenhouse = document.getElementById('btnYamFarm');
const costGreenhouseEl = document.getElementById('costYamFarm');

const btnClick = document.getElementById('btnGoldenYam');
const costClickEl = document.getElementById('costGoldenYam');

function updateUI() {
  yamsEl.textContent = Math.floor(yams).toLocaleString();
  cpsEl.textContent = cps.toLocaleString();

  btnAuto.disabled = yams < costAuto;
  costAutoEl.textContent = costAuto + ' Yams (' + autoHarvesters + ')';

  btnGreenhouse.disabled = yams < costGreenhouse;
  costGreenhouseEl.textContent = costGreenhouse + ' Yams (' + greenhouses + ')';

  btnClick.disabled = yams < costClick;
  costClickEl.textContent = costClick + ' Yams (+' + clickPower + '/click)';
}

clickerBtn.addEventListener('click', () => {
  yams += clickPower;
  updateUI();
});

btnAuto.addEventListener('click', () => {
  if (yams >= costAuto) {
    yams -= costAuto;
    autoHarvesters++;
    cps += 1;
    costAuto = Math.floor(costAuto * 1.25);
    updateUI();
  }
});

btnGreenhouse.addEventListener('click', () => {
  if (yams >= costGreenhouse) {
    yams -= costGreenhouse;
    greenhouses++;
    cps += 5;
    costGreenhouse = Math.floor(costGreenhouse * 1.3);
    updateUI();
  }
});

btnClick.addEventListener('click', () => {
  if (yams >= costClick) {
    yams -= costClick;
    clickUpgrades++;
    clickPower += 2;
    costClick = Math.floor(costClick * 1.5);
    updateUI();
  }
});

setInterval(() => {
  if (cps > 0) {
    yams += cps / 10;
    updateUI();
  }
}, 100);

updateUI();`,
  },
  {
    id: 'f_readme',
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    content: `# 🍠 Yam Clicker

Interactive multi-file game workspace powered by Vivi.

## Project Structure
- \`index.html\`: Document skeleton, elements, and stylesheets
- \`css/style.css\`: High-contrast dark styling and animations
- \`js/clicker.js\`: Core game loop, upgrade logic, and persistent score

## Features
- Edit any file in the monospaced editor tab bar
- Create new subfolders and files
- Live sandbox updates on save
- Full folder hierarchy preserved on ZIP download!`,
  },
];

// Helper to escape regex special characters
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Assemble index.html with inlined css & js from project files
export function composePreviewHtml(files: ProjectFile[]): string {
  if (!files || files.length === 0) {
    return `<!DOCTYPE html><html><body style="background:#09090b;color:#71717a;font-family:sans-serif;padding:30px;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div>No files in project.</div></body></html>`;
  }

  // 1. Find entry html file
  const entryHtml =
    files.find((f) => f.path === 'index.html' || f.name === 'index.html') ||
    files.find((f) => f.path.endsWith('.html') || f.name.endsWith('.html')) ||
    files[0];

  if (!entryHtml.path.endsWith('.html') && entryHtml.language !== 'html') {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>body { background:#09090b; color:#fafafa; font-family:monospace; padding:20px; white-space:pre-wrap; }</style>
</head>
<body>
  <div style="font-size:12px;color:#a1a1aa;margin-bottom:12px;border-bottom:1px solid #27272a;padding-bottom:6px;">${entryHtml.path}</div>
  <pre>${entryHtml.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
  }

  let html = entryHtml.content;

  // 2. Inline CSS files
  const cssFiles = files.filter((f) => f.path.endsWith('.css') || f.language === 'css');
  for (const css of cssFiles) {
    const escapedPath = escapeRegExp(css.path);
    const escapedName = escapeRegExp(css.name);
    const linkRegex = new RegExp(`<link[^>]*href=["'](?:\\.?\\/)?(?:${escapedPath}|${escapedName})["'][^>]*>`, 'gi');
    if (linkRegex.test(html)) {
      html = html.replace(linkRegex, `<style data-source="${css.path}">\n${css.content}\n</style>`);
    } else {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style data-source="${css.path}">\n${css.content}\n</style>\n</head>`);
      } else {
        html = `<style data-source="${css.path}">\n${css.content}\n</style>\n` + html;
      }
    }
  }

  // 3. Inline JS files
  const jsFiles = files.filter(
    (f) => (f.path.endsWith('.js') || f.language === 'javascript') && !f.path.endsWith('.d.ts')
  );
  for (const js of jsFiles) {
    const escapedPath = escapeRegExp(js.path);
    const escapedName = escapeRegExp(js.name);
    const scriptRegex = new RegExp(
      `<script[^>]*src=["'](?:\\.?\\/)?(?:${escapedPath}|${escapedName})["'][^>]*>\\s*<\\/script>`,
      'gi'
    );
    if (scriptRegex.test(html)) {
      html = html.replace(scriptRegex, `<script data-source="${js.path}">\n${js.content}\n</script>`);
    } else {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `<script data-source="${js.path}">\n${js.content}\n</script>\n</body>`);
      } else {
        html = html + `\n<script data-source="${js.path}">\n${js.content}\n</script>`;
      }
    }
  }

  return html;
}

// Parse multiple files from Vivi response
export function parseProjectFilesFromResponse(
  text: string
): Array<{ path: string; content: string; language: ProjectFile['language'] }> {
  const results: Array<{ path: string; content: string; language: ProjectFile['language'] }> = [];

  // Match patterns like:
  // ### File: path/to/file.ext
  // ```lang
  // code
  // ```
  // OR // File: path/to/file.ext
  const fileSectionRegex = /(?:###\s+File:\s*|(?:\/\*+|\/\/)\s*File:\s*)([^\n\r]+?)(?:\s*\*\/)?\s*\n+```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;

  while ((match = fileSectionRegex.exec(text)) !== null) {
    const rawPath = match[1].trim().replace(/^['"`]|['"`]$/g, '');
    const langRaw = match[2].toLowerCase().trim();
    const content = match[3];

    results.push({
      path: rawPath,
      content,
      language: inferLanguage(rawPath || langRaw),
    });
  }

  // Fallback: If no "### File:" headers matched, but there is a single HTML code block
  if (results.length === 0) {
    const htmlMatch = text.match(/```(?:html|xml)?\s*\n([\s\S]*?)```/i);
    if (htmlMatch) {
      const fullHtml = htmlMatch[1];
      if (/<html|<body|<head|<!DOCTYPE/i.test(fullHtml)) {
        const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const scriptMatch = fullHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

        let cleanHtml = fullHtml;
        if (styleMatch) {
          cleanHtml = cleanHtml.replace(styleMatch[0], '<link rel="stylesheet" href="css/style.css">');
          results.push({
            path: 'css/style.css',
            content: styleMatch[1].trim(),
            language: 'css',
          });
        }
        if (scriptMatch) {
          cleanHtml = cleanHtml.replace(scriptMatch[0], '<script src="js/main.js"></script>');
          results.push({
            path: 'js/main.js',
            content: scriptMatch[1].trim(),
            language: 'javascript',
          });
        }
        results.unshift({
          path: 'index.html',
          content: cleanHtml.trim(),
          language: 'html',
        });
      }
    }
  }

  return results;
}

// Migrate legacy single-html projects to multi-file structure
export function migrateProject(proj: any): ViviProject {
  if (Array.isArray(proj.files) && proj.files.length > 0) {
    const activeFileId = proj.activeFileId && proj.files.some((f: any) => f.id === proj.activeFileId)
      ? proj.activeFileId
      : proj.files[0].id;
    const openFileIds = Array.isArray(proj.openFileIds) && proj.openFileIds.length > 0
      ? proj.openFileIds.filter((id: string) => proj.files.some((f: any) => f.id === id))
      : [activeFileId];

    return {
      ...proj,
      activeFileId,
      openFileIds: openFileIds.length > 0 ? openFileIds : [activeFileId],
    };
  }

  // Convert old htmlCode into multi-file project
  const rawHtml = proj.htmlCode || DEFAULT_PROJECT_FILES[0].content;
  const styleMatch = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const scriptMatch = rawHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  const cssContent = styleMatch ? styleMatch[1].trim() : '/* Project Styles */\nbody { background: #09090b; color: #fff; }';
  const jsContent = scriptMatch ? scriptMatch[1].trim() : '// Project Scripts\nconsole.log("Ready");';

  let cleanedHtml = rawHtml;
  if (styleMatch) {
    cleanedHtml = cleanedHtml.replace(styleMatch[0], '<link rel="stylesheet" href="css/style.css">');
  }
  if (scriptMatch) {
    cleanedHtml = cleanedHtml.replace(scriptMatch[0], '<script src="js/main.js"></script>');
  }

  const files: ProjectFile[] = [
    {
      id: 'f_index_' + proj.id,
      name: 'index.html',
      path: 'index.html',
      language: 'html',
      content: cleanedHtml,
    },
    {
      id: 'f_css_' + proj.id,
      name: 'style.css',
      path: 'css/style.css',
      language: 'css',
      content: cssContent,
    },
    {
      id: 'f_js_' + proj.id,
      name: 'main.js',
      path: 'js/main.js',
      language: 'javascript',
      content: jsContent,
    },
  ];

  return {
    ...proj,
    files,
    activeFileId: files[0].id,
    openFileIds: [files[0].id, files[1].id, files[2].id],
  };
}

// Pixel Art Bunny Avatar Component (Clean, without container box)
export const ViviPixelBunny: React.FC<{
  size?: number;
  isThinking?: boolean;
  className?: string;
}> = ({ size = 32, isThinking = false, className = '' }) => {
  return (
    <div
      className={`inline-flex items-center justify-center select-none ${
        isThinking ? 'animate-bounce' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="overflow-visible"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Outer outline */}
        <rect x="5" y="2" width="3" height="9" fill="#140926" />
        <rect x="16" y="2" width="3" height="9" fill="#140926" />
        <rect x="3" y="9" width="18" height="13" rx="1" fill="#140926" />

        {/* Left Ear outer white */}
        <rect x="6" y="3" width="2" height="7" fill="#f5f3ff" />
        {/* Left Ear inner pink */}
        <rect x="6" y="4" width="1" height="5" fill="#f472b6" />

        {/* Right Ear outer white */}
        <rect x="16" y="3" width="2" height="7" fill="#f5f3ff" />
        {/* Right Ear inner pink */}
        <rect x="17" y="4" width="1" height="5" fill="#f472b6" />

        {/* Bunny Face base */}
        <rect x="4" y="10" width="16" height="11" fill="#faf5ff" />
        {/* Forehead shading */}
        <rect x="9" y="10" width="6" height="2" fill="#ede9fe" />

        {/* Cheeks - soft blush */}
        <rect x="5" y="15" width="2" height="2" fill="#fbcfe8" />
        <rect x="17" y="15" width="2" height="2" fill="#fbcfe8" />

        {/* Big Pixel Eyes */}
        <rect x="7" y="13" width="2" height="3" fill="#1e1035" />
        <rect x="7" y="13" width="1" height="1" fill="#ffffff" />

        <rect x="15" y="13" width="2" height="3" fill="#1e1035" />
        <rect x="15" y="13" width="1" height="1" fill="#ffffff" />

        {/* Cute Pink Bunny Nose */}
        <rect x="11" y="16" width="2" height="1" fill="#ec4899" />

        {/* Small Mouth */}
        <rect x="10" y="17" width="1" height="1" fill="#831843" />
        <rect x="13" y="17" width="1" height="1" fill="#831843" />
        <rect x="11" y="18" width="2" height="1" fill="#831843" />
      </svg>
    </div>
  );
};

export const ViviView: React.FC = () => {
  // Sidebar Tab: 'chats' or 'projects'
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'projects'>('chats');

  // Chats State
  const [chats, setChats] = useState<ViviChat[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_vivi_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const initialId = 'chat_' + Date.now();
    return [
      {
        id: initialId,
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      },
    ];
  });

  const [activeChatId, setActiveChatId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('yuno_vivi_active_chat');
      if (savedId) return savedId;
    } catch {}
    return chats[0]?.id || 'chat_' + Date.now();
  });

  // Projects State with automatic schema migration
  const [projects, setProjects] = useState<ViviProject[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_vivi_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => migrateProject(p));
        }
      }
    } catch {}
    return [
      {
        id: 'proj_clicker',
        title: 'Yam Clicker',
        description: 'Interactive HTML/JS Clicker game with folder structure and modular files',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        files: DEFAULT_PROJECT_FILES,
        activeFileId: 'f_index',
        openFileIds: ['f_index', 'f_css', 'f_js', 'f_readme'],
        messages: [
          {
            id: 'init_p1',
            role: 'model',
            content: `I've set up the **Yam Clicker** project for you! 🎮\n\nNotice the clean folder structure:\n- \`index.html\`: Document structure & game canvas\n- \`css/style.css\`: Bespoke dark design\n- \`js/clicker.js\`: Game economy, upgrades & click logic\n\nYou can edit any file in the tabs above, run the live preview, or tell me what features to add. When you're ready, hit **Download ZIP** to get everything in intact folders!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || '';
  });

  // Workspace Mode: 'preview' | 'code' | 'split' (side-by-side)
  const [projectWorkspaceTab, setProjectWorkspaceTab] = useState<'preview' | 'code' | 'split'>('split');
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    css: true,
    js: true,
    assets: true,
  });

  // Modals & Toast State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState<'clicker' | 'space' | 'portfolio' | 'blank'>('clicker');

  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [targetFileId, setTargetFileId] = useState<string | null>(null);
  const [renameFilePath, setRenameFilePath] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editorCursor, setEditorCursor] = useState({ line: 1, col: 1 });
  const [previewKey, setPreviewKey] = useState(0);

  const gutterRef = useRef<HTMLDivElement>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Cross-Chat Memories (persisted silently without intrusive button)
  const [memories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_vivi_memories');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      'Preferred AI style: Direct, concise, and helpful',
      'Provides step-by-step code and math when requested',
    ];
  });

  // Input & Messaging State
  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Attachments (images, text files, code files)
  const [attachments, setAttachments] = useState<
    Array<{ name: string; type: string; dataUrl?: string; textContent?: string; sizeKb?: number }>
  >([]);

  // Random one-liner for empty chat
  const [currentOneLiner, setCurrentOneLiner] = useState<string>(() => {
    const idx = Math.floor(Math.random() * RANDOM_ONE_LINERS.length);
    return RANDOM_ONE_LINERS[idx];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active chat & project objects
  const activeChat =
    chats.find((c) => c.id === activeChatId) ||
    chats[0] || {
      id: 'chat_default',
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

  const activeProject: ViviProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  // Active file in current project
  const activeFile = useMemo(() => {
    if (!activeProject || !activeProject.files || activeProject.files.length === 0) return null;
    return (
      activeProject.files.find((f) => f.id === activeProject.activeFileId) ||
      activeProject.files[0] ||
      null
    );
  }, [activeProject]);

  // Group files into folders and root files for tree view
  const { folderMap, rootFiles } = useMemo(() => {
    const fMap: Record<string, ProjectFile[]> = {};
    const roots: ProjectFile[] = [];

    if (!activeProject || !activeProject.files) return { folderMap: fMap, rootFiles: roots };

    activeProject.files.forEach((file) => {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const folderName = parts[0];
        if (!fMap[folderName]) fMap[folderName] = [];
        fMap[folderName].push(file);
      } else {
        roots.push(file);
      }
    });

    return { folderMap: fMap, rootFiles: roots };
  }, [activeProject]);

  // Show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('yuno_vivi_chats', JSON.stringify(chats));
    } catch {}
  }, [chats]);

  useEffect(() => {
    try {
      localStorage.setItem('yuno_vivi_active_chat', activeChatId);
    } catch {}
  }, [activeChatId]);

  useEffect(() => {
    try {
      localStorage.setItem('yuno_vivi_projects', JSON.stringify(projects));
    } catch {}
  }, [projects]);

  // Thinking phrase rotator
  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [isThinking]);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.messages, activeProject?.messages, isThinking]);

  // Rotate one-liner when switching to empty chat
  useEffect(() => {
    if (sidebarTab === 'chats' && activeChat.messages.length === 0) {
      const idx = Math.floor(Math.random() * RANDOM_ONE_LINERS.length);
      setCurrentOneLiner(RANDOM_ONE_LINERS[idx]);
    }
  }, [activeChatId, activeChat.messages.length, sidebarTab]);

  // Create new chat
  const handleCreateChat = () => {
    const newId = 'chat_' + Date.now();
    const newChat: ViviChat = {
      id: newId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);
    setInputPrompt('');
    setAttachments([]);
    setShowSidebar(false);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  // Delete chat
  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chats.length <= 1) {
      const resetId = 'chat_' + Date.now();
      setChats([
        {
          id: resetId,
          title: 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        },
      ]);
      setActiveChatId(resetId);
      return;
    }
    const filtered = chats.filter((c) => c.id !== chatId);
    setChats(filtered);
    if (activeChatId === chatId) {
      setActiveChatId(filtered[0]?.id || '');
    }
  };

  // Open new project modal
  const handleCreateProject = () => {
    setNewProjectName('');
    setNewProjectTemplate('clicker');
    setIsNewProjectModalOpen(true);
  };

  // Confirm project creation with selected template
  const handleConfirmCreateProject = () => {
    const title = newProjectName.trim() || 'My Web Project';
    const newId = 'proj_' + Date.now();

    let initialFiles: ProjectFile[] = [];

    if (newProjectTemplate === 'clicker') {
      initialFiles = DEFAULT_PROJECT_FILES.map((f) => ({ ...f, id: 'f_' + Date.now() + '_' + f.name }));
    } else if (newProjectTemplate === 'space') {
      initialFiles = [
        {
          id: 'f_space_idx_' + Date.now(),
          name: 'index.html',
          path: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="arcade-card">
    <div class="hud">
      <div>Shield: <span id="shield">100%</span></div>
      <div>Score: <span id="score">0</span></div>
    </div>
    <canvas id="gameCanvas" width="440" height="480"></canvas>
    <div class="tip">Arrow keys to move, Space to fire lasers</div>
  </div>
  <script src="js/space.js"></script>
</body>
</html>`,
        },
        {
          id: 'f_space_css_' + Date.now(),
          name: 'style.css',
          path: 'css/style.css',
          language: 'css',
          content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #09090b; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.arcade-card { background: #121217; border: 1px solid #27272a; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.hud { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #38bdf8; }
canvas { background: #08080c; border: 2px solid #272733; border-radius: 10px; }
.tip { font-size: 11px; color: #71717a; text-align: center; }`,
        },
        {
          id: 'f_space_js_' + Date.now(),
          name: 'space.js',
          path: 'js/space.js',
          language: 'javascript',
          content: `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
let score = 0;
let player = { x: 200, y: 430, w: 32, h: 22 };
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  requestAnimationFrame(draw);
}
draw();
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') player.x = Math.max(0, player.x - 15);
  if (e.key === 'ArrowRight') player.x = Math.min(canvas.width - player.w, player.x + 15);
});`,
        },
      ];
    } else if (newProjectTemplate === 'portfolio') {
      initialFiles = [
        {
          id: 'f_port_idx_' + Date.now(),
          name: 'index.html',
          path: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="hero">
    <h1>${title}</h1>
    <p>Modern personal showcase with dark aesthetic.</p>
    <button id="ctaBtn" class="btn">Explore Projects</button>
  </div>
  <script src="js/main.js"></script>
</body>
</html>`,
        },
        {
          id: 'f_port_css_' + Date.now(),
          name: 'style.css',
          path: 'css/style.css',
          language: 'css',
          content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #09090b; color: #fafafa; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
.hero { text-align: center; max-width: 500px; padding: 30px; background: #141418; border: 1px solid #27272a; border-radius: 18px; }
h1 { font-size: 24px; margin-bottom: 8px; }
p { color: #a1a1aa; font-size: 13px; margin-bottom: 20px; }
.btn { background: #fff; color: #000; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }`,
        },
        {
          id: 'f_port_js_' + Date.now(),
          name: 'main.js',
          path: 'js/main.js',
          language: 'javascript',
          content: `document.getElementById('ctaBtn').addEventListener('click', () => {
  alert('Welcome to ${title}!');
});`,
        },
      ];
    } else {
      // Blank Project
      initialFiles = [
        {
          id: 'f_blank_idx_' + Date.now(),
          name: 'index.html',
          path: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="box">
    <h2>${title}</h2>
    <p>Tell Vivi what features you want to build!</p>
  </div>
  <script src="js/main.js"></script>
</body>
</html>`,
        },
        {
          id: 'f_blank_css_' + Date.now(),
          name: 'style.css',
          path: 'css/style.css',
          language: 'css',
          content: `body { background: #09090b; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.box { text-align: center; padding: 24px; border: 1px solid #27272a; border-radius: 12px; background: #141418; }`,
        },
        {
          id: 'f_blank_js_' + Date.now(),
          name: 'main.js',
          path: 'js/main.js',
          language: 'javascript',
          content: `console.log('${title} initialized.');`,
        },
      ];
    }

    const newProj: ViviProject = {
      id: newId,
      title,
      description: 'Modular project created with Vivi',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: initialFiles,
      activeFileId: initialFiles[0]?.id || '',
      openFileIds: initialFiles.map((f) => f.id),
      messages: [
        {
          id: 'p_init_' + Date.now(),
          role: 'model',
          content: `Project **${title}** initialized with folder structure! What features or code would you like to build?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newId);
    setSidebarTab('projects');
    setShowSidebar(false);
    setIsNewProjectModalOpen(false);
    setNewProjectName('');
    showToast(`Created project "${title}"`);
  };

  // Delete project
  const handleDeleteProject = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      showToast('You must keep at least one project.');
      return;
    }
    const filtered = projects.filter((p) => p.id !== projId);
    setProjects(filtered);
    if (activeProjectId === projId) {
      setActiveProjectId(filtered[0]?.id || '');
    }
    showToast('Project deleted');
  };

  // Download entire project as structured ZIP
  const handleDownloadZip = async (project: ViviProject) => {
    try {
      showToast('Creating project ZIP...');
      const zip = new JSZip();

      project.files.forEach((file) => {
        const cleanPath = file.path.replace(/^\/+/, '');
        zip.file(cleanPath, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (project.title || 'project').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      a.href = url;
      a.download = `${safeTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${safeTitle}.zip with ${project.files.length} files`);
    } catch (err) {
      console.error('Failed to create ZIP:', err);
      showToast('Failed to bundle ZIP');
    }
  };

  // Create new file inside active project
  const handleCreateFile = (pathInput: string) => {
    const cleanPath = pathInput.trim().replace(/^\/+/, '');
    if (!cleanPath || !activeProject) return;

    const existing = activeProject.files.find((f) => f.path.toLowerCase() === cleanPath.toLowerCase());
    if (existing) {
      handleOpenFile(existing.id);
      setIsNewFileModalOpen(false);
      showToast(`Opened existing file "${cleanPath}"`);
      return;
    }

    const parts = cleanPath.split('/');
    const fileName = parts[parts.length - 1];
    const lang = inferLanguage(fileName);

    let defaultContent = '';
    if (lang === 'html') defaultContent = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>New Page</title>\n</head>\n<body>\n  \n</body>\n</html>\n';
    else if (lang === 'css') defaultContent = '/* New stylesheet */\n';
    else if (lang === 'javascript') defaultContent = '// Script logic\n';
    else if (lang === 'typescript') defaultContent = '// TypeScript logic\n';
    else if (lang === 'json') defaultContent = '{\n  "name": "module"\n}\n';
    else if (lang === 'markdown') defaultContent = `# ${fileName}\n\n`;

    const newFile: ProjectFile = {
      id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: fileName,
      path: cleanPath,
      language: lang,
      content: defaultContent,
    };

    if (parts.length > 1) {
      setExpandedFolders((prev) => ({ ...prev, [parts[0]]: true }));
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              files: [...p.files, newFile],
              activeFileId: newFile.id,
              openFileIds: [...p.openFileIds, newFile.id],
              updatedAt: Date.now(),
            }
          : p
      )
    );

    setIsNewFileModalOpen(false);
    setNewFilePath('');
    showToast(`Created file "${cleanPath}"`);
  };

  // Delete file from active project
  const handleDeleteFile = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeProject) return;

    if (activeProject.files.length <= 1) {
      showToast('Projects must have at least one file.');
      return;
    }

    const fileToDelete = activeProject.files.find((f) => f.id === fileId);
    const updatedFiles = activeProject.files.filter((f) => f.id !== fileId);
    const updatedOpenIds = activeProject.openFileIds.filter((id) => id !== fileId);

    let nextActiveId = activeProject.activeFileId;
    if (nextActiveId === fileId) {
      nextActiveId = updatedOpenIds[updatedOpenIds.length - 1] || updatedFiles[0]?.id || '';
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              files: updatedFiles,
              openFileIds: updatedOpenIds.length > 0 ? updatedOpenIds : [nextActiveId],
              activeFileId: nextActiveId,
              updatedAt: Date.now(),
            }
          : p
      )
    );

    showToast(`Deleted ${fileToDelete?.name || 'file'}`);
  };

  // Confirm rename of file
  const handleConfirmRename = () => {
    if (!activeProject || !targetFileId) return;
    const cleanPath = renameFilePath.trim().replace(/^\/+/, '');
    if (!cleanPath) return;

    const parts = cleanPath.split('/');
    const fileName = parts[parts.length - 1];
    const lang = inferLanguage(fileName);

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          files: p.files.map((f) =>
            f.id === targetFileId ? { ...f, path: cleanPath, name: fileName, language: lang } : f
          ),
        };
      })
    );

    setIsRenameModalOpen(false);
    setTargetFileId(null);
    showToast(`Renamed to "${cleanPath}"`);
  };

  // Open file into tabs and activate
  const handleOpenFile = (fileId: string) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        const openIds = p.openFileIds.includes(fileId) ? p.openFileIds : [...p.openFileIds, fileId];
        return {
          ...p,
          openFileIds: openIds,
          activeFileId: fileId,
        };
      })
    );
  };

  // Close tab from tab bar
  const handleCloseTab = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeProject) return;

    const remainingOpen = activeProject.openFileIds.filter((id) => id !== fileId);
    let nextActiveId = activeProject.activeFileId;

    if (activeProject.activeFileId === fileId) {
      const closedIndex = activeProject.openFileIds.indexOf(fileId);
      if (remainingOpen.length > 0) {
        const nextIdx = Math.min(closedIndex, remainingOpen.length - 1);
        nextActiveId = remainingOpen[nextIdx];
      } else {
        nextActiveId = '';
      }
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              openFileIds: remainingOpen,
              activeFileId: nextActiveId,
            }
          : p
      )
    );
  };

  // Edit file content in real time
  const handleFileContentChange = (newContent: string) => {
    if (!activeProject || !activeFile) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        return {
          ...p,
          updatedAt: Date.now(),
          files: p.files.map((f) => (f.id === activeFile.id ? { ...f, content: newContent } : f)),
        };
      })
    );
  };

  // Handle Tab key in editor (insert 2 spaces, no focus loss)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const current = textarea.value;

      const nextVal = current.substring(0, start) + '  ' + current.substring(end);
      handleFileContentChange(nextVal);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateCursorPosition(textarea);
      }, 0);
    }
  };

  const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
    const textBefore = textarea.value.substring(0, textarea.selectionStart);
    const lines = textBefore.split('\n');
    setEditorCursor({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Toggle folder expanded state
  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  // File Upload (Reads both images and raw code/text files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      if (file.size > 20 * 1024 * 1024) {
        showToast(`${file.name} exceeds 20MB limit.`);
        continue;
      }

      const isImg = file.type.startsWith('image/');
      const sizeKb = Math.round(file.size / 1024);

      if (isImg) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          if (dataUrl) {
            setAttachments((prev) => [
              ...prev,
              { name: file.name, type: file.type || 'image/png', dataUrl, sizeKb },
            ]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        try {
          const text = await file.text();
          setAttachments((prev) => [
            ...prev,
            { name: file.name, type: file.type || 'text/plain', textContent: text, sizeKb },
          ]);
        } catch (err) {
          console.warn('Failed reading text file:', err);
        }
      }
    }
    e.target.value = '';
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Download Code as File
  const handleDownloadFile = (content: string, filename: string = 'file.txt') => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  };

  // Apply code to active project
  const handleApplyToProject = (code: string, langHint: string = 'html') => {
    if (!activeProject) return;

    const parsed = parseProjectFilesFromResponse(code);
    if (parsed.length > 0) {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeProject.id) return p;
          const updated = [...p.files];
          const newOpen = [...p.openFileIds];

          parsed.forEach((pf) => {
            const idx = updated.findIndex((f) => f.path.toLowerCase() === pf.path.toLowerCase());
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], content: pf.content, language: pf.language };
              if (!newOpen.includes(updated[idx].id)) newOpen.push(updated[idx].id);
            } else {
              const nf: ProjectFile = {
                id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                name: pf.path.split('/').pop() || pf.path,
                path: pf.path,
                content: pf.content,
                language: pf.language,
              };
              updated.push(nf);
              newOpen.push(nf.id);
            }
          });

          return { ...p, files: updated, openFileIds: newOpen, updatedAt: Date.now() };
        })
      );
      showToast(`Applied ${parsed.length} file(s) to project`);
      setPreviewKey((k) => k + 1);
      return;
    }

    // Single block application
    let targetPath = 'index.html';
    if (langHint === 'css') targetPath = 'css/style.css';
    else if (langHint === 'javascript' || langHint === 'js') targetPath = 'js/main.js';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProject.id) return p;
        const updated = [...p.files];
        const existingIdx = updated.findIndex((f) => f.path === targetPath);
        if (existingIdx !== -1) {
          updated[existingIdx] = { ...updated[existingIdx], content: code };
        } else {
          updated.push({
            id: 'f_' + Date.now(),
            name: targetPath.split('/').pop() || targetPath,
            path: targetPath,
            content: code,
            language: inferLanguage(targetPath),
          });
        }
        return { ...p, files: updated, updatedAt: Date.now() };
      })
    );

    showToast(`Updated ${targetPath} in project`);
    setPreviewKey((k) => k + 1);
  };

  // Send message
  const handleSendMessage = async () => {
    const trimmedPrompt = inputPrompt.trim();
    if ((!trimmedPrompt && attachments.length === 0) || isThinking) return;

    const userMessage: ViviMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: trimmedPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const isProjectMode = sidebarTab === 'projects';
    const currentList = isProjectMode ? activeProject.messages : activeChat.messages;
    const isFirstMessage = currentList.length === 0;

    const updatedTitle =
      !isProjectMode && isFirstMessage && trimmedPrompt
        ? trimmedPrompt.length > 26
          ? trimmedPrompt.slice(0, 26) + '...'
          : trimmedPrompt
        : activeChat.title;

    const updatedMessages = [...currentList, userMessage];

    if (isProjectMode) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, updatedAt: Date.now(), messages: updatedMessages }
            : p
        )
      );
    } else {
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, title: updatedTitle, updatedAt: Date.now(), messages: updatedMessages }
            : c
        )
      );
    }

    setInputPrompt('');
    setAttachments([]);
    setIsThinking(true);
    setThinkingIndex(0);

    try {
      const historyPayload = currentList.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Extra project context instructions for Vivi (multi-file with folder hierarchy)
      let promptToSend = trimmedPrompt;
      if (isProjectMode) {
        const fileSummaries = activeProject.files
          .map((f) => `### File: ${f.path}\n\`\`\`${f.language}\n${f.content.slice(0, 4000)}\n\`\`\``)
          .join('\n\n');
        promptToSend = `[Project Context: "${activeProject.title}"]\n${fileSummaries}\n\nUser request: ${trimmedPrompt}`;
      }

      const res = await fetch('/api/vivi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history: historyPayload,
          attachments: userMessage.attachments,
          memories,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

      const modelMessage: ViviMessage = {
        id: 'vivi_' + Date.now(),
        role: 'model',
        content: data.text || 'Done!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: Array.isArray(data.citations) && data.citations.length > 0 ? data.citations : undefined,
        generatedImageUrl: data.generatedImageUrl,
      };

      // In project mode: if Vivi generated updated multi-file project code, auto-update the project files!
      if (isProjectMode) {
        const parsedFiles = parseProjectFilesFromResponse(data.text);
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id !== activeProject.id) return p;

            if (parsedFiles.length === 0) {
              return {
                ...p,
                updatedAt: Date.now(),
                messages: [...updatedMessages, modelMessage],
              };
            }

            const updatedFiles = [...p.files];
            const updatedOpenIds = [...p.openFileIds];

            parsedFiles.forEach((pf) => {
              const existingIdx = updatedFiles.findIndex(
                (f) => f.path.toLowerCase() === pf.path.toLowerCase()
              );
              if (existingIdx !== -1) {
                updatedFiles[existingIdx] = {
                  ...updatedFiles[existingIdx],
                  content: pf.content,
                  language: pf.language,
                };
                if (!updatedOpenIds.includes(updatedFiles[existingIdx].id)) {
                  updatedOpenIds.push(updatedFiles[existingIdx].id);
                }
              } else {
                const parts = pf.path.split('/');
                const newFile: ProjectFile = {
                  id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                  name: parts[parts.length - 1],
                  path: pf.path,
                  content: pf.content,
                  language: pf.language,
                };
                updatedFiles.push(newFile);
                updatedOpenIds.push(newFile.id);
              }
            });

            return {
              ...p,
              files: updatedFiles,
              openFileIds: updatedOpenIds,
              updatedAt: Date.now(),
              messages: [...updatedMessages, modelMessage],
            };
          })
        );
        setPreviewKey((k) => k + 1);
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChat.id
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: [...updatedMessages, modelMessage],
                }
              : c
          )
        );
      }
    } catch (err: any) {
      console.warn('Vivi Chat error:', err);
      const errorMsg: ViviMessage = {
        id: 'vivi_err_' + Date.now(),
        role: 'model',
        content: `Error communicating with Vivi: ${err?.message || 'Network issue'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };

      if (isProjectMode) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id
              ? { ...p, messages: [...updatedMessages, errorMsg] }
              : p
          )
        );
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChat.id
              ? { ...c, messages: [...updatedMessages, errorMsg] }
              : c
          )
        );
      }
    } finally {
      setIsThinking(false);
    }
  };

  // Render markdown & code blocks with "Download File" and "Copy" actions
  const renderMessageContent = (content: string, msgId: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const firstLine = lines[0].trim();
        const lang = firstLine.replace(/[^a-zA-Z0-9_-]/g, '') || 'code';
        const code = lines.length > 1 ? lines.slice(1).join('\n') : lines[0];
        const blockId = `${msgId}_code_${index}`;
        const inferredFilename = `solution.${lang === 'javascript' || lang === 'js' ? 'js' : lang === 'typescript' || lang === 'ts' ? 'ts' : lang === 'python' || lang === 'py' ? 'py' : lang === 'html' ? 'html' : 'txt'}`;

        return (
          <div
            key={index}
            className="my-3 rounded-lg overflow-hidden border border-zinc-800 bg-[#0c0c0e] text-xs font-mono"
          >
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#141418] border-b border-zinc-800 text-zinc-400">
              <span className="text-[11px] font-medium text-zinc-300">
                {lang}
              </span>
              <div className="flex items-center space-x-2">
                {sidebarTab === 'projects' && (
                  <button
                    onClick={() => handleApplyToProject(code, lang)}
                    className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer text-[10px]"
                    title="Apply to Project Workspace"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run in Project</span>
                  </button>
                )}
                <button
                  onClick={() => handleDownloadFile(code, inferredFilename)}
                  className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer text-[10px]"
                  title="Download File"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleCopyText(code, blockId)}
                  className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer text-[10px]"
                  title="Copy code"
                >
                  {copiedCodeId === blockId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3 overflow-x-auto text-zinc-200 leading-relaxed scrollbar-thin">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format markdown paragraphs, lists, and headers
      const formattedLines = part.split('\n').map((line, lIdx) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="text-sm font-semibold text-zinc-100 mt-2 mb-1">
              {line.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={lIdx} className="text-base font-bold text-white mt-3 mb-1">
              {line.replace(/^##\s+/, '')}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={lIdx} className="text-lg font-bold text-white mt-3 mb-1.5">
              {line.replace(/^#\s+/, '')}
            </h2>
          );
        }

        if (line.match(/^[-*]\s+/)) {
          return (
            <div key={lIdx} className="flex items-start space-x-2 my-0.5 ml-2">
              <span className="text-zinc-500 font-bold mt-1 text-xs">•</span>
              <span className="text-zinc-200">{formatInline(line.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        if (line.match(/^\d+\.\s+/)) {
          const numMatch = line.match(/^(\d+\.)\s+(.*)/);
          if (numMatch) {
            return (
              <div key={lIdx} className="flex items-start space-x-2 my-0.5 ml-2">
                <span className="text-zinc-500 font-medium text-xs min-w-[1.2rem]">
                  {numMatch[1]}
                </span>
                <span className="text-zinc-200">{formatInline(numMatch[2])}</span>
              </div>
            );
          }
        }

        if (line.trim().startsWith('>')) {
          return (
            <blockquote
              key={lIdx}
              className="border-l-2 border-zinc-600 pl-3 my-1.5 text-zinc-300 italic bg-white/5 py-1 rounded-r"
            >
              {formatInline(line.replace(/^>\s*/, ''))}
            </blockquote>
          );
        }

        if (!line.trim()) {
          return <div key={lIdx} className="h-2" />;
        }

        return (
          <p key={lIdx} className="my-0.5 text-zinc-200 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      });

      return <React.Fragment key={index}>{formattedLines}</React.Fragment>;
    });
  };

  const formatInline = (text: string) => {
    const codeSegments = text.split(/(`[^`]+`)/g);
    return codeSegments.map((segment, sIdx) => {
      if (segment.startsWith('`') && segment.endsWith('`')) {
        return (
          <code
            key={sIdx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700"
          >
            {segment.slice(1, -1)}
          </code>
        );
      }
      const boldSegments = segment.split(/(\*\*[^*]+\*\*)/g);
      return boldSegments.map((bSegment, bIdx) => {
        if (bSegment.startsWith('**') && bSegment.endsWith('**')) {
          return (
            <strong key={bIdx} className="font-semibold text-white">
              {bSegment.slice(2, -2)}
            </strong>
          );
        }
        return bSegment;
      });
    });
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex bg-[#000000] text-zinc-200 overflow-hidden font-sans select-text">
      {/* File Upload Hidden Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Sidebar: Clean Claude / ChatGPT Inspired Drawer */}
      <aside
        className={`fixed inset-y-14 left-0 z-40 w-64 bg-[#09090b] border-r border-[#18181b] flex flex-col transition-transform duration-200 md:static md:translate-x-0 ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Switcher: Chats vs Projects */}
        <div className="p-3 border-b border-[#18181b] flex items-center space-x-1.5">
          <button
            onClick={() => setSidebarTab('chats')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border ${
              sidebarTab === 'chats'
                ? 'bg-[#18181b] text-white border-zinc-700'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>

          <button
            onClick={() => setSidebarTab('projects')}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border ${
              sidebarTab === 'projects'
                ? 'bg-[#18181b] text-white border-zinc-700'
                : 'text-zinc-400 hover:text-white border-transparent'
            }`}
          >
            <CodeXml className="w-3.5 h-3.5 text-zinc-300" />
            <span>Projects</span>
          </button>
        </div>

        {/* Action Button: New Chat or New Project */}
        <div className="px-3 pt-2 pb-1">
          {sidebarTab === 'chats' ? (
            <button
              onClick={handleCreateChat}
              className="w-full py-2 px-3 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-zinc-800 text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          ) : (
            <button
              onClick={handleCreateProject}
              className="w-full py-2 px-3 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-zinc-800 text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {sidebarTab === 'chats' ? (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Recent Chats
              </div>
              {chats.map((chat) => {
                const isActive = chat.id === activeChat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setShowSidebar(false);
                    }}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#18181b] text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121215]'
                    }`}
                  >
                    <span className="truncate flex-1 mr-2">{chat.title || 'Untitled'}</span>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-zinc-500 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Workspace Projects
              </div>
              {projects.map((proj) => {
                const isActive = proj.id === activeProject.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      setShowSidebar(false);
                    }}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#18181b] text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121215]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate flex-1 mr-2">
                      <CodeXml className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="truncate">{proj.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-zinc-500 transition-opacity"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* Main Container: Chat + Project Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 bg-[#000000]">
        {/* Left / Primary Chat Section */}
        <main
          className={`flex-1 flex flex-col h-full min-w-0 border-r border-[#18181b] ${
            sidebarTab === 'projects' ? 'md:max-w-[48%]' : 'w-full'
          }`}
        >
          {/* Header */}
          <header className="h-12 border-b border-[#18181b] px-4 flex items-center justify-between bg-[#000000]">
            <div className="flex items-center space-x-2 min-w-0">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 md:hidden"
                title="Sidebar"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <ViviPixelBunny size={20} isThinking={isThinking} />
              <span className="font-semibold text-sm text-zinc-100">
                {sidebarTab === 'projects' ? activeProject?.title : 'Vivi'}
              </span>
            </div>

            {sidebarTab === 'projects' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                Project Mode
              </span>
            )}
          </header>

          {/* Messages or Clean Minimal Home Page */}
          <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <div className="max-w-2xl mx-auto space-y-5">
              {sidebarTab === 'chats' && activeChat.messages.length === 0 ? (
                /* Simple, clean ChatGPT & Claude inspired home page */
                <div className="min-h-[55vh] flex flex-col items-center justify-center text-center px-4 py-8">
                  {/* Clean Vivi logo without heavy borders or container boxes */}
                  <div className="mb-4 select-none">
                    <ViviPixelBunny size={56} isThinking={isThinking} />
                  </div>

                  {/* Clean white/zinc text (no purple) */}
                  <h2 className="text-xl font-medium text-white mb-2 tracking-tight">
                    Ready when you are.
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-md mb-8 leading-relaxed font-sans">
                    {currentOneLiner}
                  </p>

                  {/* Clean, subtle list inspired by ChatGPT screenshot */}
                  <div className="w-full max-w-sm space-y-2 text-left">
                    <button
                      onClick={() => {
                        setInputPrompt('Create an image of ');
                        textareaRef.current?.focus();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0e0e11] hover:bg-[#18181c] border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Create an image</span>
                    </button>

                    <button
                      onClick={() => {
                        setInputPrompt('Can you explain and solve this step-by-step: ');
                        textareaRef.current?.focus();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0e0e11] hover:bg-[#18181c] border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Write, solve, or edit</span>
                    </button>

                    <button
                      onClick={() => {
                        setSidebarTab('projects');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0e0e11] hover:bg-[#18181c] border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <CodeXml className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Start a coding project (e.g. Clicker Game)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                (sidebarTab === 'projects' ? activeProject.messages : activeChat.messages).map(
                  (message) => {
                    const isUser = message.role === 'user';
                    return (
                      <div
                        key={message.id}
                        className={`flex items-start space-x-2.5 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUser && (
                          <div className="mt-1 flex-shrink-0">
                            <ViviPixelBunny size={20} />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                            isUser
                              ? 'bg-[#1c1c21] text-white border border-zinc-700/60'
                              : message.isError
                              ? 'bg-rose-950/40 text-rose-200 border border-rose-800/50'
                              : 'bg-[#111114] text-zinc-200 border border-zinc-800/80'
                          }`}
                        >
                          {/* Attachments preview */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2.5">
                              {message.attachments.map((att, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="rounded-lg overflow-hidden border border-zinc-700 bg-black/60 max-w-[200px]"
                                >
                                  {att.dataUrl ? (
                                    <img
                                      src={att.dataUrl}
                                      alt={att.name}
                                      className="w-full h-24 object-cover cursor-pointer hover:opacity-90"
                                      onClick={() => window.open(att.dataUrl, '_blank')}
                                    />
                                  ) : (
                                    <div className="p-2 text-[11px] text-zinc-300 flex items-center space-x-1.5">
                                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                                      <span className="truncate">{att.name}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message Content */}
                          <div className="space-y-1">
                            {renderMessageContent(message.content, message.id)}
                          </div>

                          {/* Generated Image preview */}
                          {message.generatedImageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800 bg-black relative group">
                              <img
                                src={message.generatedImageUrl}
                                alt="Generated art"
                                className="w-full max-h-[380px] object-contain rounded-lg"
                              />
                              <div className="absolute bottom-2 right-2 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded-lg border border-white/10">
                                <a
                                  href={message.generatedImageUrl}
                                  download="vivi-art.png"
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-zinc-200 hover:text-white flex items-center space-x-1"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Search Sources */}
                          {message.citations && message.citations.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-zinc-800">
                              <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">
                                Sources:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {message.citations.map((cite, cIdx) => (
                                  <a
                                    key={cIdx}
                                    href={cite.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[10px] text-zinc-300 hover:text-white transition-colors"
                                  >
                                    <span className="truncate max-w-[140px]">{cite.title}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-zinc-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                            <span>{message.timestamp}</span>
                            {!isUser && (
                              <button
                                onClick={() => handleCopyText(message.content, message.id)}
                                className="hover:text-zinc-300 p-0.5 cursor-pointer"
                                title="Copy"
                              >
                                {copiedCodeId === message.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              )}

              {/* Thinking State - Style 3: AI Status with Vivi icon and spinning ring */}
              {isThinking && (
                <div className="flex items-start">
                  <div className="inline-flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl bg-[#141418] border border-zinc-800 text-xs text-zinc-200 shadow-sm">
                    <ViviPixelBunny size={20} isThinking={true} />
                    <span className="font-medium text-zinc-200">
                      {THINKING_PHRASES[thinkingIndex]}
                    </span>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin flex-shrink-0" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Footer: Clean Claude / ChatGPT Inspired Pill */}
          <footer className="p-3 sm:p-4 bg-[#000000] border-t border-[#18181b]">
            <div className="max-w-2xl mx-auto space-y-2">
              {/* Attachment Preview Chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1.5 bg-[#18181b] border border-zinc-700 px-2 py-1 rounded-lg text-xs text-zinc-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[11px] truncate max-w-[140px]">{att.name}</span>
                      <button
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Box */}
              <div className="relative rounded-2xl bg-[#121215] border border-zinc-800 focus-within:border-zinc-600 transition-all p-2 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    sidebarTab === 'projects'
                      ? 'Ask Vivi to add features, modify code, or style the project...'
                      : 'Message Vivi (ask anything, attach files, generate images, or code)...'
                  }
                  rows={2}
                  className="w-full bg-transparent text-xs text-white placeholder-zinc-500 resize-none outline-none leading-relaxed p-1"
                />

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 mt-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Attach file (images, code, documents)"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={
                      (!inputPrompt.trim() && attachments.length === 0) || isThinking
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                      (!inputPrompt.trim() && attachments.length === 0) || isThinking
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                    }`}
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </main>

        {/* Right Section: Multi-File & Multi-Tab Project Workspace (when in Project mode) */}
        {sidebarTab === 'projects' && activeProject && (
          <aside className="flex-1 flex flex-col h-full bg-[#09090b] min-w-0">
            {/* Project Workspace Header */}
            <div className="h-12 border-b border-[#1f1f24] px-3.5 flex items-center justify-between bg-[#0e0e12] select-none">
              {/* Left: Project title & file count */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <button
                  onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                  className={`p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer ${
                    isExplorerOpen ? 'bg-[#18181f] text-zinc-200' : 'hover:bg-white/5'
                  }`}
                  title={isExplorerOpen ? 'Collapse File Explorer' : 'Expand File Explorer'}
                >
                  {isExplorerOpen ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </button>

                <div className="flex items-center space-x-1.5 min-w-0">
                  <CodeXml className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                  <span className="text-xs font-semibold text-white truncate max-w-[150px] sm:max-w-[200px]">
                    {activeProject.title}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-[#18181d] border border-zinc-800">
                    {activeProject.files.length} files
                  </span>
                </div>
              </div>

              {/* Center: Mode switcher (Preview, Split, Code) */}
              <div className="flex items-center bg-[#141418] border border-[#272730] p-0.5 rounded-lg">
                <button
                  onClick={() => setProjectWorkspaceTab('preview')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                    projectWorkspaceTab === 'preview'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Full Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>

                <button
                  onClick={() => setProjectWorkspaceTab('split')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                    projectWorkspaceTab === 'split'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Side-by-Side Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split</span>
                </button>

                <button
                  onClick={() => setProjectWorkspaceTab('code')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center space-x-1 transition-all cursor-pointer ${
                    projectWorkspaceTab === 'code'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Code Editor Full Width"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Code</span>
                </button>
              </div>

              {/* Right: Actions (New file, Download ZIP, Refresh) */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    setNewFilePath('');
                    setIsNewFileModalOpen(true);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#18181f] hover:bg-[#272730] border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Create new file in project"
                >
                  <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden md:inline">File</span>
                </button>

                <button
                  onClick={() => handleDownloadZip(activeProject)}
                  className="px-2.5 py-1 rounded-lg bg-[#fafafa] hover:bg-zinc-200 text-black text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Download entire project as structured ZIP (preserves folders)"
                >
                  <Archive className="w-3.5 h-3.5 text-black" />
                  <span>Download ZIP</span>
                </button>

                <button
                  onClick={() => {
                    setPreviewKey((k) => k + 1);
                    showToast('Reloaded preview sandbox');
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Refresh Live Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Project Viewport */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Full Preview Mode */}
              {projectWorkspaceTab === 'preview' && (
                <div className="w-full h-full bg-white relative">
                  <iframe
                    key={previewKey}
                    title="Live Playable Preview"
                    srcDoc={composePreviewHtml(activeProject.files)}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-modals"
                  />
                </div>
              )}

              {/* Code or Split Mode */}
              {projectWorkspaceTab !== 'preview' && (
                <div className="w-full h-full flex overflow-hidden">
                  {/* Left Column: Collapsible File Explorer */}
                  {isExplorerOpen && (
                    <div className="w-52 flex-shrink-0 bg-[#0c0c0f] border-r border-[#1f1f24] flex flex-col select-none">
                      {/* Explorer Top Toolbar */}
                      <div className="h-9 px-3 border-b border-[#18181e] flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
                        <span>Explorer</span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setNewFilePath('');
                              setIsNewFileModalOpen(true);
                            }}
                            className="p-1 hover:text-white hover:bg-[#18181f] rounded transition-colors cursor-pointer"
                            title="New File..."
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* File Tree List */}
                      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 text-xs font-mono scrollbar-thin">
                        {/* Folders (e.g. css/, js/, assets/) */}
                        {(Object.entries(folderMap) as [string, ProjectFile[]][]).map(([folderName, filesInFolder]) => {
                          const isExpanded = expandedFolders[folderName] ?? true;
                          return (
                            <div key={folderName} className="space-y-0.5">
                              {/* Folder Row */}
                              <div
                                onClick={() => toggleFolder(folderName)}
                                className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-[#18181f] text-zinc-300 hover:text-white cursor-pointer transition-colors"
                              >
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                                  )}
                                  {isExpanded ? (
                                    <FolderOpen className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  ) : (
                                    <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                  )}
                                  <span className="font-sans font-medium text-xs truncate">
                                    {folderName}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">
                                  {filesInFolder.length}
                                </span>
                              </div>

                              {/* Files inside this folder */}
                              {isExpanded && (
                                <div className="pl-4 space-y-0.5">
                                  {filesInFolder.map((file) => {
                                    const isActive = file.id === activeFile?.id;
                                    const badge = getFileLanguageLabel(file.language);
                                    return (
                                      <div
                                        key={file.id}
                                        onClick={() => handleOpenFile(file.id)}
                                        className={`group flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                          isActive
                                            ? 'bg-[#18181f] text-white font-medium border-l-2 border-white'
                                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121216]'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-1.5 min-w-0 flex-1 mr-1">
                                          <FileCode
                                            className="w-3.5 h-3.5 flex-shrink-0"
                                            style={{ color: badge.color }}
                                          />
                                          <span className="truncate">{file.name}</span>
                                        </div>

                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTargetFileId(file.id);
                                              setRenameFilePath(file.path);
                                              setIsRenameModalOpen(true);
                                            }}
                                            className="p-0.5 hover:text-white text-zinc-500"
                                            title="Rename"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={(e) => handleDeleteFile(file.id, e)}
                                            className="p-0.5 hover:text-rose-400 text-zinc-500"
                                            title="Delete"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Root Files (e.g. index.html, README.md) */}
                        {rootFiles.map((file) => {
                          const isActive = file.id === activeFile?.id;
                          const badge = getFileLanguageLabel(file.language);
                          return (
                            <div
                              key={file.id}
                              onClick={() => handleOpenFile(file.id)}
                              className={`group flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-[#18181f] text-white font-medium border-l-2 border-white'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#121216]'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 min-w-0 flex-1 mr-1">
                                <FileCode
                                  className="w-3.5 h-3.5 flex-shrink-0"
                                  style={{ color: badge.color }}
                                />
                                <span className="truncate">{file.name}</span>
                              </div>

                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetFileId(file.id);
                                    setRenameFilePath(file.path);
                                    setIsRenameModalOpen(true);
                                  }}
                                  className="p-0.5 hover:text-white text-zinc-500"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteFile(file.id, e)}
                                  className="p-0.5 hover:text-rose-400 text-zinc-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tree Footer Info */}
                      <div className="p-2 border-t border-[#18181e] text-[10px] text-zinc-500 font-sans text-center">
                        Hierarchy preserved in ZIP
                      </div>
                    </div>
                  )}

                  {/* Center Column: Multi-Tab Editor Area */}
                  <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
                    {/* Top Tab Bar */}
                    <div className="h-9 bg-[#0c0c0f] border-b border-[#1f1f24] flex items-center overflow-x-auto scrollbar-none select-none">
                      {activeProject.openFileIds.map((fileId) => {
                        const file = activeProject.files.find((f) => f.id === fileId);
                        if (!file) return null;
                        const isActive = file.id === activeFile?.id;
                        const badge = getFileLanguageLabel(file.language);

                        return (
                          <div
                            key={file.id}
                            onClick={() => handleOpenFile(file.id)}
                            className={`group h-full px-3 flex items-center space-x-2 text-xs font-mono cursor-pointer transition-colors border-r border-[#18181f] flex-shrink-0 ${
                              isActive
                                ? 'bg-[#141418] text-white font-medium border-t-2 border-t-white'
                                : 'bg-[#0c0c0f] text-zinc-400 hover:bg-[#111115] hover:text-zinc-200'
                            }`}
                          >
                            <FileCode
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: badge.color }}
                            />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <button
                              onClick={(e) => handleCloseTab(file.id, e)}
                              className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                              title="Close tab"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {activeProject.openFileIds.length === 0 && (
                        <div className="px-3 text-xs text-zinc-500 italic">No files open</div>
                      )}
                    </div>

                    {/* Editor Content Area */}
                    {activeFile ? (
                      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                        {/* Editor with Line Number Gutter */}
                        <div className="flex-1 flex overflow-hidden relative bg-[#09090b]">
                          {/* Line Numbers Gutter */}
                          <div
                            ref={gutterRef}
                            className="w-11 py-3 pr-2 text-right text-zinc-600 font-mono text-xs select-none bg-[#09090b] border-r border-[#18181f] overflow-hidden leading-5 flex-shrink-0"
                          >
                            {Array.from({ length: activeFile.content.split('\n').length }).map(
                              (_, i) => (
                                <div key={i}>{i + 1}</div>
                              )
                            )}
                          </div>

                          {/* Editable Monospaced Textarea */}
                          <textarea
                            ref={codeEditorRef}
                            value={activeFile.content}
                            onChange={(e) => handleFileContentChange(e.target.value)}
                            onKeyDown={handleEditorKeyDown}
                            onScroll={(e) => {
                              if (gutterRef.current) {
                                gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                              }
                            }}
                            onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
                            onClick={(e) => updateCursorPosition(e.currentTarget)}
                            onSelect={(e) => updateCursorPosition(e.currentTarget)}
                            spellCheck={false}
                            className="flex-1 h-full p-3 font-mono text-xs leading-5 text-zinc-100 bg-[#09090b] outline-none resize-none overflow-auto whitespace-pre selection:bg-zinc-800"
                          />
                        </div>

                        {/* Editor Status Bar */}
                        <div className="h-6 bg-[#0c0c0f] border-t border-[#1f1f24] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none">
                          <div className="flex items-center space-x-3">
                            <span>
                              Ln {editorCursor.line}, Col {editorCursor.col}
                            </span>
                            <span>{activeFile.content.split('\n').length} lines</span>
                            <span>{(activeFile.content.length / 1024).toFixed(1)} KB</span>
                          </div>

                          <div className="flex items-center space-x-3 font-sans">
                            <span className="flex items-center space-x-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Live Auto-Saved</span>
                            </span>
                            <span className="uppercase font-mono text-[10px] text-zinc-300 font-semibold px-1 rounded bg-[#18181e] border border-zinc-800">
                              {getFileLanguageLabel(activeFile.language).label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                        <FileCode className="w-10 h-10 text-zinc-600 mb-2" />
                        <p className="text-sm font-medium text-zinc-300">No file selected</p>
                        <p className="text-xs text-zinc-500 mt-1 mb-4">
                          Pick a file from the explorer on the left or create a new file
                        </p>
                        <button
                          onClick={() => {
                            setNewFilePath('');
                            setIsNewFileModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 transition-colors cursor-pointer"
                        >
                          + New File
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column in Split Mode: Live Preview */}
                  {projectWorkspaceTab === 'split' && (
                    <div className="w-1/2 flex-shrink-0 border-l border-[#1f1f24] flex flex-col bg-white overflow-hidden relative">
                      <div className="h-9 px-3 bg-[#0c0c0f] border-b border-[#1f1f24] flex items-center justify-between text-xs text-zinc-400 select-none font-sans">
                        <div className="flex items-center space-x-1.5">
                          <Eye className="w-3.5 h-3.5 text-zinc-300" />
                          <span className="font-semibold text-white">Live Sandbox</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setPreviewKey((k) => k + 1);
                              showToast('Sandbox refreshed');
                            }}
                            className="p-1 hover:text-white text-zinc-400 transition-colors cursor-pointer"
                            title="Reload sandbox"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 relative bg-white">
                        <iframe
                          key={previewKey}
                          title="Split Live Preview"
                          srcDoc={composePreviewHtml(activeProject.files)}
                          className="w-full h-full border-none bg-white"
                          sandbox="allow-scripts allow-modals"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121217] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Create New Web Project</h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Rogue Crawler RPG, Weather Dashboard"
                  className="w-full bg-[#09090c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Starter Template
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNewProjectTemplate('clicker')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newProjectTemplate === 'clicker'
                        ? 'border-white bg-[#1a1a22] text-white font-medium'
                        : 'border-zinc-800 bg-[#0d0d10] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>🍠 Yam Clicker</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Game (css/ & js/)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProjectTemplate('space')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newProjectTemplate === 'space'
                        ? 'border-white bg-[#1a1a22] text-white font-medium'
                        : 'border-zinc-800 bg-[#0d0d10] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>🚀 Space Defender</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Arcade canvas game</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProjectTemplate('portfolio')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newProjectTemplate === 'portfolio'
                        ? 'border-white bg-[#1a1a22] text-white font-medium'
                        : 'border-zinc-800 bg-[#0d0d10] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>🌐 Developer Portfolio</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Showcase website</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewProjectTemplate('blank')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newProjectTemplate === 'blank'
                        ? 'border-white bg-[#1a1a22] text-white font-medium'
                        : 'border-zinc-800 bg-[#0d0d10] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div>✨ Blank Slate</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Clean multi-file project</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreateProject}
                className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#121217] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Create New File</h3>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  File Path (subfolders supported)
                </label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile(newFilePath);
                  }}
                  placeholder="e.g. css/theme.css or js/engine.js"
                  className="w-full bg-[#09090c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-zinc-500 text-[10px] w-full block">Quick folders:</span>
                <button
                  type="button"
                  onClick={() => setNewFilePath('css/theme.css')}
                  className="px-2 py-0.5 rounded bg-[#1c1c24] border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  css/theme.css
                </button>
                <button
                  type="button"
                  onClick={() => setNewFilePath('js/game.js')}
                  className="px-2 py-0.5 rounded bg-[#1c1c24] border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  js/game.js
                </button>
                <button
                  type="button"
                  onClick={() => setNewFilePath('about.html')}
                  className="px-2 py-0.5 rounded bg-[#1c1c24] border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  about.html
                </button>
                <button
                  type="button"
                  onClick={() => setNewFilePath('README.md')}
                  className="px-2 py-0.5 rounded bg-[#1c1c24] border border-zinc-800 text-zinc-300 hover:text-white"
                >
                  README.md
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateFile(newFilePath)}
                className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#121217] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-semibold text-white">Rename File</h3>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                New Path / Name
              </label>
              <input
                type="text"
                value={renameFilePath}
                onChange={(e) => setRenameFilePath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename();
                }}
                className="w-full bg-[#09090c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-500 font-mono"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                className="px-4 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#141418] border border-zinc-700/80 text-zinc-100 text-xs px-3.5 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ViviView;
