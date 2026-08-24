import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS } from '../data/portalData';
import {
  AiModelOption,
  AiPersonalitySettings,
  AiSpeakingStyle,
  AiResponseSpeed,
  AiEmojiMode,
} from '../types';
import {
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Code,
  BookOpen,
  Send,
  User,
  Zap,
  Search,
  X,
  Cpu,
  Layers,
  ArrowRight,
  Download,
  FileCode,
  Eye,
  Maximize2,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Terminal,
  Code2,
  Paperclip,
  Image as ImageIcon,
  Camera,
  FileText,
  Trash2,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ArrowUp,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Compass,
  Lightbulb,
  Sliders,
  Brain,
  Smile,
  Hash,
  Settings,
  Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getSavedAiSettings,
  saveAiSettings,
  generateSystemInstruction,
  JACKS_COUGH_CATCHPHRASES,
  getRandomCatchphrase,
} from '../utils/aiSettings';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  previewUrl?: string;
  isImage: boolean;
  textContent?: string;
}

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  timestamp: string;
  attachments?: AttachedFile[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  modelId: string;
  messages: ChatTurn[];
}

const CATEGORIES = [
  'All Models',
  'Google Models',
  'Anthropic Models',
  'DeepSeek Models',
  'OpenAI Models',
  'Meta Models',
  'xAI Models',
  'Other Models',
];

const getFileExtension = (lang: string) => {
  const l = lang.toLowerCase().trim();
  if (l === 'js' || l === 'javascript') return 'js';
  if (l === 'ts' || l === 'typescript') return 'ts';
  if (l === 'jsx') return 'jsx';
  if (l === 'tsx') return 'tsx';
  if (l === 'py' || l === 'python') return 'py';
  if (l === 'html') return 'html';
  if (l === 'css') return 'css';
  if (l === 'json') return 'json';
  if (l === 'cpp' || l === 'c++') return 'cpp';
  if (l === 'c') return 'c';
  if (l === 'java') return 'java';
  if (l === 'rs' || l === 'rust') return 'rs';
  if (l === 'go') return 'go';
  if (l === 'php') return 'php';
  if (l === 'sh' || l === 'bash') return 'sh';
  if (l === 'sql') return 'sql';
  return 'txt';
};

const downloadCodeFile = (code: string, lang: string) => {
  const ext = getFileExtension(lang);
  const filename = `script.${ext}`;
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const CodeBlockPreviewItem: React.FC<{ codeText: string; lang: string }> = ({ codeText, lang }) => {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [viewport, setViewport] = useState<'responsive' | 'tablet' | 'mobile'>('responsive');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const normalizedLang = lang.toLowerCase().trim();
  const isHtmlSvg = ['html', 'htm', 'svg', 'xml'].includes(normalizedLang);
  const isJsReact = ['jsx', 'tsx', 'js', 'javascript', 'typescript', 'react'].includes(normalizedLang);
  const isTerminalLang = ['py', 'python', 'sh', 'bash', 'c', 'cpp', 'c++', 'java', 'rs', 'rust', 'go', 'sql'].includes(normalizedLang);

  const canPreview = isHtmlSvg || isJsReact || isTerminalLang || normalizedLang === 'json' || normalizedLang === 'css';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSrcDoc = () => {
    if (normalizedLang === 'svg') {
      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { margin: 0; background-color: #09090b; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }</style>
  </head>
  <body>
    <div style="max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center;">
      ${codeText}
    </div>
  </body>
</html>`;
    }

    if (isJsReact || normalizedLang === 'css') {
      const isReactComponent = codeText.includes('import') || codeText.includes('export') || codeText.includes('React') || codeText.includes('<') || isJsReact;
      if (isReactComponent) {
        const cleanedCode = codeText
          .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
          .replace(/export\s+default\s+/g, '')
          .replace(/export\s+const\s+/g, 'const ');

        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>body { margin: 0; padding: 1.25rem; background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      try {
        ${cleanedCode}
        if (typeof App !== 'undefined') {
          ReactDOM.createRoot(document.getElementById('root')).render(<App />);
        } else {
          const rootEl = document.getElementById('root');
          rootEl.innerHTML = '<div class="p-4 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-xl font-mono text-xs">✓ Script executed successfully.</div>';
        }
      } catch (err) {
        document.getElementById('root').innerHTML = '<div class="p-4 bg-red-950/80 border border-red-800 text-red-200 font-mono text-xs rounded-xl"><strong>Preview Error:</strong> ' + err.message + '</div>';
      }
    </script>
  </body>
</html>`;
      }
    }

    if (codeText.includes('<html') || codeText.includes('<body') || codeText.includes('<div') || isHtmlSvg) {
      return codeText;
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; padding: 1.25rem; }</style>
  </head>
  <body>
    <div class="prose prose-invert max-w-none">
      ${codeText}
    </div>
  </body>
</html>`;
  };

  const viewportWidthClass =
    viewport === 'mobile' ? 'max-w-[375px]' : viewport === 'tablet' ? 'max-w-[768px]' : 'w-full';

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
      {/* Code Header in ChatGPT style */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono">
        <div className="flex items-center space-x-3">
          <span className="text-zinc-400 uppercase font-semibold text-[11px]">{lang}</span>
          {canPreview && (
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-2 py-0.5 rounded-md font-sans text-xs transition-colors ${
                  activeTab === 'code' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2 py-0.5 rounded-md font-sans text-xs transition-colors ${
                  activeTab === 'preview' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isTerminalLang ? 'Output' : 'Preview'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {activeTab === 'preview' && !isTerminalLang && (
            <div className="hidden sm:flex items-center space-x-1 mr-2 px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewport('responsive')}
                className={`p-1 rounded ${viewport === 'responsive' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Responsive"
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`p-1 rounded ${viewport === 'tablet' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Tablet"
              >
                <Tablet className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded ${viewport === 'mobile' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="Mobile"
              >
                <Smartphone className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {activeTab === 'preview' && !isTerminalLang && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
              title="Fullscreen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy code</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => downloadCodeFile(codeText, lang)}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px]"
            title="Download file"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {activeTab === 'code' ? (
        <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre bg-zinc-950 max-h-[450px]">
          <code>{codeText}</code>
        </pre>
      ) : isTerminalLang ? (
        <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 space-y-2">
          <div className="text-zinc-500 text-[11px]">Output:</div>
          <pre className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {codeText.length > 500 ? codeText.slice(0, 500) + '\n... [Done]' : codeText}
          </pre>
        </div>
      ) : (
        <div className="p-3 bg-zinc-950 flex flex-col items-center justify-center min-h-[300px]">
          <div className={`transition-all duration-300 mx-auto bg-black rounded-lg border border-zinc-800 overflow-hidden ${viewportWidthClass}`}>
            <iframe
              key={refreshKey}
              srcDoc={generateSrcDoc()}
              title="Code Preview"
              className="w-full h-[320px] border-none bg-zinc-950"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
              <span className="text-sm font-semibold text-white">Live Code Preview ({lang})</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white text-xs border border-zinc-800"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto bg-zinc-900/50">
              <div className="w-full h-full max-w-6xl max-h-[85vh] bg-black rounded-xl border border-zinc-800 overflow-hidden">
                <iframe
                  key={refreshKey}
                  srcDoc={generateSrcDoc()}
                  title="Fullscreen Preview"
                  className="w-full h-full border-none bg-zinc-950"
                  sandbox="allow-scripts allow-modals"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-sans text-sm text-zinc-200 leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3);
          const firstLineEnd = inner.indexOf('\n');
          let lang = 'code';
          let codeText = inner;
          if (firstLineEnd !== -1) {
            lang = inner.slice(0, firstLineEnd).trim() || 'code';
            codeText = inner.slice(firstLineEnd + 1);
          }

          return <CodeBlockPreviewItem key={idx} codeText={codeText} lang={lang} />;
        }

        // Render basic markdown like bold text, bullet points, headers
        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              if (line.startsWith('### ')) {
                return (
                  <h3 key={lineIdx} className="text-base font-semibold text-white mt-3 mb-1">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={lineIdx} className="text-lg font-bold text-white mt-4 mb-1">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={lineIdx} className="text-xl font-bold text-white mt-4 mb-2">
                    {line.replace('# ', '')}
                  </h1>
                );
              }
              if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                return (
                  <div key={lineIdx} className="flex items-start space-x-2 pl-2">
                    <span className="text-zinc-400 mt-1.5 text-[8px]">•</span>
                    <span>{line.replace(/^(\* |- )/, '')}</span>
                  </div>
                );
              }
              return (
                <p key={lineIdx} className="min-h-[1rem]">
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const ClaudeSunburstIcon: React.FC<{ className?: string }> = ({ className = 'w-11 h-11 text-[#e07a5f]' }) => {
  const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
  return (
    <svg
      viewBox="-20 -20 40 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
    >
      {angles.map((angle) => (
        <line
          key={`ray-a-${angle}`}
          x1="0"
          y1="-5.5"
          x2="0"
          y2="-15.5"
          transform={`rotate(${angle})`}
        />
      ))}
      {angles.map((angle) => (
        <line
          key={`ray-b-${angle}`}
          x1="0"
          y1="5.5"
          x2="0"
          y2="15.5"
          transform={`rotate(${angle})`}
        />
      ))}
    </svg>
  );
};

interface AiViewProps {
}

export const AiView: React.FC<AiViewProps> = () => {
  const [selectedModel, setSelectedModel] = useState<AiModelOption>(AI_MODELS[0]);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isAiSettingsModalOpen, setIsAiSettingsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Models');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchChatHistory, setSearchChatHistory] = useState('');
  const [aiSettings, setAiSettings] = useState<AiPersonalitySettings>(getSavedAiSettings);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Catchphrase state for greetings - single catchphrase randomized
  const [activeCatchphrase, setActiveCatchphrase] = useState<string>(() =>
    getRandomCatchphrase(getSavedAiSettings().userCallSign || 'user')
  );

  const shuffleCatchphrase = () => {
    setActiveCatchphrase(getRandomCatchphrase(aiSettings.userCallSign || 'user'));
  };

  const handleUpdateAiSettings = (partial: Partial<AiPersonalitySettings>) => {
    const updated = { ...aiSettings, ...partial };
    setAiSettings(updated);
    saveAiSettings(updated);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2000);
  };

  const handleAddMemory = () => {
    if (!newMemoryInput.trim()) return;
    const current = aiSettings.memories || [];
    if (!current.includes(newMemoryInput.trim())) {
      handleUpdateAiSettings({ memories: [...current, newMemoryInput.trim()] });
      setNewMemoryInput('');
    }
  };

  const handleRemoveMemory = (index: number) => {
    const current = [...(aiSettings.memories || [])];
    current.splice(index, 1);
    handleUpdateAiSettings({ memories: current });
  };

  // Chat Sessions Persistence State - with thorough /e douche sanitization
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_ai_chat_sessions_chatgpt');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed = parsed
            .map((session) => ({
              ...session,
              messages: (session.messages || []).filter((msg: any) => {
                const text = String(msg?.content || '').toLowerCase();
                return !text.includes('/e douche') && !text.includes('douche');
              }),
            }))
            .filter((session) => {
              const title = String(session?.title || '').toLowerCase();
              return !title.includes('/e douche') && !title.includes('douche');
            });

          if (parsed.length > 0) return parsed;
        }
      }
    } catch (e) {}
    return [
      {
        id: 'session-' + Date.now(),
        title: 'New chat',
        updatedAt: Date.now(),
        modelId: AI_MODELS[0].id,
        messages: [],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || 'session-1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active Session and Messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Clear any residual prompt or corrupted /e douche storage on mount
  useEffect(() => {
    setPromptInput('');
    try {
      const raw = localStorage.getItem('yuno_ai_chat_sessions_chatgpt');
      if (raw && (raw.toLowerCase().includes('/e douche') || raw.toLowerCase().includes('douche'))) {
        const cleaned = sessions.map((session) => ({
          ...session,
          messages: (session.messages || []).filter((msg) => {
            const text = String(msg.content || '').toLowerCase();
            return !text.includes('/e douche') && !text.includes('douche');
          }),
        }));
        localStorage.setItem('yuno_ai_chat_sessions_chatgpt', JSON.stringify(cleaned));
      }
    } catch (e) {}
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('yuno_ai_chat_sessions_chatgpt', JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  // Shuffle catchphrase when active session changes to an empty session
  useEffect(() => {
    if (messages.length === 0) {
      shuffleCatchphrase();
    }
  }, [activeSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Support pasting images or files directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        processFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const updateActiveSessionMessages = (newMsgs: ChatTurn[] | ((prev: ChatTurn[]) => ChatTurn[])) => {
    setSessions((prevSessions) => {
      return prevSessions.map((s) => {
        if (s.id === activeSessionId) {
          const updatedMsgs = typeof newMsgs === 'function' ? newMsgs(s.messages) : newMsgs;
          let title = s.title;
          if (title === 'New chat' || title === 'New Chat') {
            const firstUserTurn = updatedMsgs.find((m) => m.role === 'user');
            if (firstUserTurn && firstUserTurn.content) {
              title = firstUserTurn.content.slice(0, 30) + (firstUserTurn.content.length > 30 ? '...' : '');
            }
          }
          return {
            ...s,
            title,
            messages: updatedMsgs,
            updatedAt: Date.now(),
          };
        }
        return s;
      });
    });
  };

  const handleCreateNewChat = () => {
    const newSession: ChatSession = {
      id: 'session-' + Date.now(),
      title: 'New chat',
      updatedAt: Date.now(),
      modelId: selectedModel.id,
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveCatchphrase(getRandomCatchphrase(aiSettings.userCallSign || 'user'));
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh: ChatSession = {
          id: 'session-' + Date.now(),
          title: 'New chat',
          updatedAt: Date.now(),
          modelId: selectedModel.id,
          messages: [],
        };
        setActiveSessionId(fresh.id);
        setActiveCatchphrase(getRandomCatchphrase(aiSettings.userCallSign || 'user'));
        return [fresh];
      }
      if (sessionId === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 20MB limit.`);
        return;
      }
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();

      if (isImage) {
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              type: file.type || 'image/png',
              size: file.size,
              dataUrl,
              previewUrl: dataUrl,
              isImage: true,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (e) => {
          const textContent = e.target?.result as string;
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              type: file.type || 'text/plain',
              size: file.size,
              dataUrl: textContent,
              textContent,
              isImage: false,
            },
          ]);
        };
        reader.readAsText(file);
      }
    });
  };

  const handleCaptureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await new Promise((res) => setTimeout(res, 300));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      stream.getTracks().forEach((track) => track.stop());

      setAttachedFiles((prev) => [
        ...prev,
        {
          id: `screen-${Date.now()}`,
          name: `Screenshot-${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
          type: 'image/png',
          size: Math.round(dataUrl.length * 0.75),
          dataUrl,
          previewUrl: dataUrl,
          isImage: true,
        },
      ]);
    } catch (err) {
      console.warn('Screen capture cancelled or unavailable:', err);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if ((!textToSend && attachedFiles.length === 0) || isGenerating) return;

    const currentAtts = [...attachedFiles];
    setAttachedFiles([]);

    const userTurn: ChatTurn = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend || (currentAtts.length > 0 ? 'Analyze attached file' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: currentAtts,
    };

    updateActiveSessionMessages((prev) => [...prev, userTurn]);
    if (!customPrompt) setPromptInput('');

    setIsGenerating(true);

    try {
      const aiPrefs = getSavedAiSettings();
      const userMoniker = aiPrefs.userCallSign?.trim() || 'user';
      const sysInstruction = generateSystemInstruction(aiPrefs, userMoniker);

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend || 'Please analyze the attached image or file.',
          model: selectedModel.id,
          systemInstruction: sysInstruction,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          attachments: currentAtts.map((f) => ({
            name: f.name,
            type: f.type,
            isImage: f.isImage,
            data: f.dataUrl,
            textContent: f.textContent,
          })),
        }),
      });

      const data = await response.json();

      const aiTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: data.text || data.error || 'No response generated.',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateActiveSessionMessages((prev) => [...prev, aiTurn]);
    } catch (err: any) {
      console.error('Failed to query AI:', err);
      const errorTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: 'I encountered an issue connecting to the AI service. Please check your network connection.',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      updateActiveSessionMessages((prev) => [...prev, errorTurn]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredModels = AI_MODELS.filter((model) => {
    const matchesCategory =
      activeCategory === 'All Models' || model.category === activeCategory;
    const matchesSearch =
      model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(modelSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchChatHistory.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5.5rem)] w-full max-w-7xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      
      {/* Jack's cough Left Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-full bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0 z-20 overflow-hidden"
          >
            {/* Sidebar Top / New Chat */}
            <div className="p-3 border-b border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleCreateNewChat}
                  className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium border border-zinc-800 transition-colors mr-2 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>New chat</span>
                  </span>
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* History Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchChatHistory}
                  onChange={(e) => setSearchChatHistory(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            {/* Sidebar Chat List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Recent Chats
              </div>
              {filteredSessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">
                  No chats found
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-zinc-800 text-white font-medium'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                        <span className="truncate">{session.title || 'New chat'}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-all flex-shrink-0"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Jack's cough</span>
              </span>
              <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
                {sessions.length} chats
              </span>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-zinc-950">
        
        {/* Top Minimal Navigation Bar */}
        <header className="h-12 border-b border-zinc-800/80 px-4 flex items-center justify-between flex-shrink-0 bg-zinc-950">
          <div className="flex items-center space-x-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Open sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}

            {/* Model Selector Dropdown Pill */}
            <button
              onClick={() => setIsModelModalOpen(true)}
              className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>{selectedModel.name}</span>
              {selectedModel.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                  {selectedModel.badge}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {/* Quick AI Settings & Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAiSettingsModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              title="Configure Jack's cough personality, emojis, memory & instructions"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI Settings</span>
            </button>

            <button
              onClick={handleCreateNewChat}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center space-x-1 border border-transparent hover:border-zinc-700"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </header>

        {/* Chat Feed Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Empty State / Welcome Screen - Clean Centered Sunburst Icon + Single Catchphrase (Claude style) */}
            {messages.length === 0 ? (
              <div className="min-h-[55vh] flex flex-col items-center justify-center text-center select-none px-4 space-y-5 animate-in fade-in duration-300">
                {/* Sunburst Icon */}
                <button
                  type="button"
                  onClick={shuffleCatchphrase}
                  className="p-1 rounded-2xl hover:bg-zinc-900/60 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none"
                  title="Click to shuffle catchphrase"
                >
                  <ClaudeSunburstIcon className="w-12 h-12 text-[#e07a5f] hover:text-[#f48a6f] transition-colors" />
                </button>

                {/* Single Catchphrase directly under AI Icon */}
                <div
                  onClick={shuffleCatchphrase}
                  className="cursor-pointer group flex items-center justify-center max-w-xl"
                  title="Click to shuffle catchphrase"
                >
                  <h1 className="text-2xl sm:text-3xl font-serif font-normal tracking-normal text-zinc-100 group-hover:text-amber-200 transition-colors leading-snug">
                    {activeCatchphrase}
                  </h1>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-zinc-850 border border-zinc-750 text-white px-4 py-3 shadow-sm space-y-2">
                      {/* Attached images / files in user bubble */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-1">
                          {msg.attachments.map((att) => (
                            <div key={att.id} className="relative">
                              {att.isImage ? (
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  onClick={() => setPreviewModalImg(att.dataUrl)}
                                  className="h-24 w-36 object-cover rounded-xl border border-zinc-700 cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              ) : (
                                <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs">
                                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                                  <span className="truncate max-w-[120px]">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="w-full flex items-start space-x-3.5">
                      {/* Jack's cough Model Avatar Icon */}
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4" />
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300 mb-1">
                          <span className="text-white">Jack's cough</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({msg.modelUsed || selectedModel.name})</span>
                          <span className="text-[10px] text-zinc-600 font-mono">{msg.timestamp}</span>
                        </div>

                        <FormattedMessage content={msg.content} />

                        {/* Message action buttons */}
                        <div className="flex items-center space-x-2 pt-2 text-zinc-500">
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.content)}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSendMessage(messages[messages.length - 2]?.content || 'Explain again')}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                            title="Regenerate"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Generating response indicator */}
            {isGenerating && (
              <div className="w-full flex items-start space-x-3.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 pt-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    {aiSettings.speed === 'smooth'
                      ? "Jack's cough is thinking smoothly..."
                      : "Jack's cough is cooking..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*,.txt,.js,.ts,.tsx,.jsx,.json,.py,.html,.css,.md,.csv,.pdf,.doc,.docx"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Bottom Input Box */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900">
          <div className="max-w-3xl mx-auto">
            
            {/* Attachment preview tags */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                {attachedFiles.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-xs text-zinc-300"
                  >
                    {att.isImage ? (
                      <img src={att.dataUrl} alt={att.name} className="w-6 h-6 object-cover rounded border border-zinc-700" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span className="max-w-[120px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-0.5 text-zinc-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
              }}
              className={`relative flex items-center bg-zinc-900 border ${
                isDraggingOver ? 'border-amber-400' : 'border-zinc-800'
              } rounded-2xl px-3 py-2 shadow-lg focus-within:border-zinc-700 transition-colors`}
            >
              {/* Attach File / Screenshot Buttons */}
              <div className="flex items-center space-x-1 pr-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Attach images or files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Capture screenshot"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Textarea Input */}
              <textarea
                ref={textareaRef}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Message Jack's cough..."
                className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none max-h-32 leading-relaxed"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!promptInput.trim() && attachedFiles.length === 0) || isGenerating}
                className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                  promptInput.trim() || attachedFiles.length > 0
                    ? 'bg-amber-400 text-black hover:bg-amber-300 font-semibold'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            <p className="text-center text-[11px] text-zinc-500 mt-2">
              Jack's cough can make mistakes. Keep it 100.
            </p>
          </div>
        </div>

      </div>

      {/* Quick AI Settings Modal */}
      <AnimatePresence>
        {isAiSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Jack's cough AI Settings</h2>
                    <p className="text-[11px] text-zinc-400">Customize personality, emojis, memory, and custom instructions</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAiSettingsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* 1. Speaking Style / Persona */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Persona & Tone</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'jacks_cough', label: "Jack's Cough", desc: "Original witty & roasty" },
                      { id: 'sarcastic', label: 'Sarcastic', desc: 'Clever dry humor' },
                      { id: 'chill', label: 'Chill & Casual', desc: "Duuuude, no stress" },
                      { id: 'concise', label: 'Ultra-Concise', desc: 'Direct, zero fluff' },
                      { id: 'academic', label: 'Academic', desc: 'Formal breakdown' },
                      { id: 'tutor', label: 'Socratic Tutor', desc: 'Step-by-step guide' },
                    ].map((st) => {
                      const isSel = aiSettings.style === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleUpdateAiSettings({ style: st.id as AiSpeakingStyle })}
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-zinc-800 border-amber-400 text-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{st.label}</div>
                          <div className="text-[10px] text-zinc-500">{st.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. User CallSign & Emoji Mode & Thinking Speed */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-850">
                  {/* Callsign */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      What AI Calls You
                    </label>
                    <input
                      type="text"
                      value={aiSettings.userCallSign}
                      onChange={(e) => handleUpdateAiSettings({ userCallSign: e.target.value })}
                      placeholder="e.g. user, Chief, Boss"
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Emoji Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5 text-amber-400" />
                      <span>Emoji Level</span>
                    </label>
                    <select
                      value={aiSettings.emojiMode || 'standard'}
                      onChange={(e) => handleUpdateAiSettings({ emojiMode: e.target.value as AiEmojiMode })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="heavily">Heavy (😭🙏🙌)</option>
                      <option value="standard">Standard / Balanced</option>
                      <option value="minimal">Minimal (Max 1)</option>
                      <option value="none">No Emojis</option>
                    </select>
                  </div>

                  {/* Thinking Speed */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thinking Mode</span>
                    </label>
                    <select
                      value={aiSettings.speed === 'smooth' ? 'smooth' : 'fast'}
                      onChange={(e) => handleUpdateAiSettings({ speed: e.target.value as AiResponseSpeed })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="fast">Fast Answers</option>
                      <option value="smooth">Smooth Thinking</option>
                    </select>
                  </div>
                </div>

                {/* 3. Cross-Chat Memory */}
                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      <span>Memory From Other Chats</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateAiSettings({ memoryEnabled: !aiSettings.memoryEnabled })}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${
                        aiSettings.memoryEnabled !== false
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      {aiSettings.memoryEnabled !== false ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {aiSettings.memoryEnabled !== false && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newMemoryInput}
                          onChange={(e) => setNewMemoryInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMemory();
                            }
                          }}
                          placeholder="Add fact for AI to remember..."
                          className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddMemory}
                          disabled={!newMemoryInput.trim()}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>

                      {aiSettings.memories && aiSettings.memories.length > 0 && (
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {aiSettings.memories.map((mem, i) => (
                            <div key={i} className="flex items-center justify-between p-1.5 px-2 bg-zinc-900 rounded-lg text-xs text-zinc-300">
                              <span className="truncate">{mem}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMemory(i)}
                                className="p-0.5 text-zinc-500 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Symbol Rules & Custom Instructions */}
                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  <label className="text-xs font-semibold text-zinc-300 block flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Custom Instructions & Symbol Rules</span>
                  </label>
                  <textarea
                    value={aiSettings.customSymbolRules || ''}
                    onChange={(e) => handleUpdateAiSettings({ customSymbolRules: e.target.value })}
                    placeholder="Symbol rules (e.g. Always use ➔ for steps, ★ for key takeaways)..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                  <textarea
                    value={aiSettings.customPrompt}
                    onChange={(e) => handleUpdateAiSettings({ customPrompt: e.target.value })}
                    placeholder="General custom instructions for Jack's cough..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                {settingsSavedToast && (
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Settings saved!</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsAiSettingsModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewModalImg && (
          <div
            onClick={() => setPreviewModalImg(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          >
            <div
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewModalImg} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
              <button
                onClick={() => setPreviewModalImg(null)}
                className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-colors border border-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Model Selection Modal */}
      <AnimatePresence>
        {isModelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Select Model</h2>
                    <p className="text-xs text-zinc-400">Choose an AI model for your conversations</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModelModalOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Categories */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-950 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Search models..."
                    className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        activeCategory === cat
                          ? 'bg-zinc-800 text-white'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Grid */}
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950">
                {filteredModels.map((model) => {
                  const isSelected = selectedModel.id === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model);
                        setIsModelModalOpen(false);
                      }}
                      className={`p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-zinc-900 border-zinc-600 text-white'
                          : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                            {model.provider}
                          </span>
                          {model.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {model.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white flex items-center justify-between">
                          <span>{model.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </h3>

                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {model.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{model.speed || 'Standard'}</span>
                        <span className={isSelected ? 'text-white font-medium' : 'text-zinc-400'}>
                          {isSelected ? 'Active' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
