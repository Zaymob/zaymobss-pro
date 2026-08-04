import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS } from '../data/portalData';
import { AiModelOption } from '../types';
import {
  Bot,
  Send,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  Code,
  BookOpen,
  Calculator,
  PenTool,
  RotateCcw,
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
  Play,
  Maximize2,
  Minimize2,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Terminal,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  timestamp: string;
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
          // Render any available component or function
          const rootEl = document.getElementById('root');
          rootEl.innerHTML = '<div class="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl font-mono text-xs">✓ Script Loaded & Executed. Defined components ready.</div>';
        }
      } catch (err) {
        document.getElementById('root').innerHTML = '<div class="p-4 bg-red-950/80 border border-red-800 text-red-200 font-mono text-xs rounded-xl"><strong>Preview Error:</strong> ' + err.message + '</div>';
      }
    </script>
  </body>
</html>`;
      }
    }

    // HTML / standard code
    if (codeText.includes('<html') || codeText.includes('<body') || codeText.includes('<div') || isHtmlSvg) {
      if (!codeText.includes('tailwindcss.com')) {
        return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { background-color: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; padding: 1.25rem; }</style>
  </head>
  <body>
    ${codeText}
  </body>
</html>`;
      }
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
    <div className="my-3 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl transition-all">
      {/* Code Header with Mode Tabs & Action Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono">
        <div className="flex items-center space-x-3">
          {/* Lang badge */}
          <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
            <FileCode className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[11px]">{lang}</span>
          </div>

          {/* Toggle Code / Live Preview */}
          {canPreview && (
            <div className="flex items-center p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all font-sans font-semibold ${
                  activeTab === 'code'
                    ? 'bg-zinc-800 text-amber-300 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Code</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-all font-sans font-semibold ${
                  activeTab === 'preview'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isTerminalLang ? <Terminal className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3 text-amber-400" />}
                <span>{isTerminalLang ? 'Run Output' : 'Live Preview'}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center space-x-1.5">
          {activeTab === 'preview' && !isTerminalLang && (
            <div className="hidden sm:flex items-center space-x-1 mr-2 px-1 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewport('responsive')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'responsive' ? 'text-amber-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Full Responsive"
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'tablet' ? 'text-amber-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Tablet View (768px)"
              >
                <Tablet className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`p-1 rounded transition-colors ${
                  viewport === 'mobile' ? 'text-amber-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Mobile View (375px)"
              >
                <Smartphone className="w-3 h-3" />
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-[11px]"
              title="Refresh Preview"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}

          {activeTab === 'preview' && !isTerminalLang && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 transition-all text-[11px]"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all text-[11px]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => downloadCodeFile(codeText, lang)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all text-[11px] font-medium"
            title="Download Code File"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === 'code' ? (
        <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre bg-black/80 selection:bg-amber-500/30 max-h-[450px]">
          <code>{codeText}</code>
        </pre>
      ) : isTerminalLang ? (
        /* Terminal Execution Runner Preview */
        <div className="p-4 bg-black/90 font-mono text-xs text-zinc-300 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-zinc-800">
            <span className="text-emerald-400 font-bold flex items-center space-x-1">
              <Terminal className="w-3 h-3" />
              <span>yunø-sandbox@ai-runner:~$ {normalizedLang} script.{getFileExtension(lang)}</span>
            </span>
            <span className="text-zinc-500">Exit: 0 (12ms)</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-zinc-200 overflow-x-auto space-y-1">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
              --- Terminal Output ---
            </div>
            <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">
              {codeText.length > 500 ? codeText.slice(0, 500) + '\n... [Process completed successfully]' : codeText}
            </pre>
          </div>
        </div>
      ) : (
        /* Web Live Preview Canvas */
        <div className="p-3 bg-zinc-950 flex flex-col items-center justify-center min-h-[320px] transition-all">
          <div className={`transition-all duration-300 mx-auto bg-black rounded-xl border border-zinc-800 overflow-hidden shadow-2xl ${viewportWidthClass}`}>
            <iframe
              key={refreshKey}
              srcDoc={generateSrcDoc()}
              title="Live Code Preview"
              className="w-full h-[360px] border-none bg-zinc-950"
              sandbox="allow-scripts allow-modals"
            />
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center space-x-3">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Eye className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>Live Code Preview</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30 uppercase">
                      {lang}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">Interactive live output sandbox preview</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 flex items-center justify-center overflow-auto bg-zinc-900/50">
              <div className={`w-full h-full max-w-6xl max-h-[85vh] bg-black rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl transition-all ${viewportWidthClass}`}>
                <iframe
                  key={refreshKey}
                  srcDoc={generateSrcDoc()}
                  title="Fullscreen Live Code Preview"
                  className="w-full h-full border-none bg-zinc-950"
                  sandbox="allow-scripts allow-modals"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 font-sans text-xs sm:text-sm">
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

        return (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </div>
        );
      })}
    </div>
  );
};

interface AiViewProps {
  onGrantAdmin?: () => void;
  onUnlockPrivateChat?: () => void;
  onUnlockHalo?: () => void;
}

export const AiView: React.FC<AiViewProps> = ({ onGrantAdmin, onUnlockPrivateChat, onUnlockHalo }) => {
  const [selectedModel, setSelectedModel] = useState<AiModelOption>(AI_MODELS[0]);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Models');
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      content:
        'Hello! I am **Yunø AI**. I can assist with schoolwork, write code, analyze math problems, summarize documents, or help generate creative ideas. Choose an AI model above and ask anything!',
      modelUsed: AI_MODELS[0].name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || isGenerating) return;

    const userTurn: ChatTurn = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    if (!customPrompt) setPromptInput('');

    // Check for secret admin override phrase
    if (textToSend.trim().toLowerCase() === '/e give admin code 2012') {
      let isAuth = false;
      try {
        const saved = localStorage.getItem('yuno_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          const uname = (parsed.username || parsed.displayName || '').trim().toLowerCase();
          if (uname === 'yuno' || uname === 'yuno dev isa' || uname === 'isaman' || uname.startsWith('yuno') || uname.startsWith('isaman')) {
            isAuth = true;
          }
        }
      } catch (e) {}

      if (isAuth) {
        try {
          localStorage.setItem('yuno_is_admin', 'true');
        } catch (e) {}
        if (onGrantAdmin) onGrantAdmin();
        const secretTurn: ChatTurn = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: '🔓 **SECRET OVERRIDE DETECTED.** Clearance verified for admin user. Developer & Admin Control Panel privileges granted.',
          modelUsed: selectedModel.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, secretTurn]);
      } else {
        const deniedTurn: ChatTurn = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: '⛔ **ACCESS DENIED.** Developer & Admin Control Panel privileges are strictly restricted to verified administrators (`yuno` or `isaman`). Please update your username in Edit Profile first.',
          modelUsed: selectedModel.name,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, deniedTurn]);
      }
      return;
    }

    // Check for secret private chatroom & watch party unlock command
    if (textToSend.trim().toLowerCase() === '/e douche') {
      if (onUnlockPrivateChat) onUnlockPrivateChat();
      const secretTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: '🔓 **VIP ACCESS GRANTED.** Secret Private Chatroom & Movie Watch Party tab has been unlocked! Check your navigation bar for "VIP Watch Party".',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, secretTurn]);
      return;
    }

    // Check for secret Christian AI companion "Halo" unlock command
    if (textToSend.trim().toLowerCase() === '/e jesus') {
      if (onUnlockHalo) onUnlockHalo();
      const secretTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: '✨ **HALO MODE UNLOCKED.** Welcome to **Halo** — your confidential, judgment-free Christian AI companion & Bible study mentor. Check your navigation bar for "Halo Faith AI" or speak by saying "Halo [your message]".',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, secretTurn]);
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          model: selectedModel.id,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
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

      setMessages((prev) => [...prev, aiTurn]);
    } catch (err: any) {
      console.error('Failed to query AI:', err);
      const errorTurn: ChatTurn = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: '⚠️ Failed to connect to Yunø AI server. Please verify your network connection or API settings.',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorTurn]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'model',
        content: 'Chat session reset. What would you like to build or explore next?',
        modelUsed: selectedModel.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const filteredModels = AI_MODELS.filter((model) => {
    const matchesCategory =
      activeCategory === 'All Models' || model.category === activeCategory;
    const matchesSearch =
      model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      model.provider.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      (model.badge && model.badge.toLowerCase().includes(modelSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto pb-4 relative">
      {/* Top AI Controls Bar */}
      <div className="flex items-center justify-between p-3.5 bg-zinc-900/95 border border-zinc-800 rounded-2xl backdrop-blur-xl mb-4 shadow-xl">
        {/* Model Selector Modal Trigger Button */}
        <button
          onClick={() => setIsModelModalOpen(true)}
          className="flex items-center space-x-3 px-4 py-2 bg-zinc-950 hover:bg-zinc-900 border border-amber-500/30 hover:border-amber-500/80 rounded-xl text-xs font-semibold text-white transition-all shadow-md group"
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-black flex items-center justify-center font-bold text-xs shadow-sm">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                {selectedModel.name}
              </span>
              {selectedModel.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {selectedModel.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400">{selectedModel.provider} • Click to change model</span>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-colors ml-2" />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModelModalOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-medium transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>25+ Models</span>
          </button>
          <button
            onClick={clearChat}
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs transition-colors"
            title="Clear session history"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>



      {/* Chat Messages Feed */}
      <div className="flex-1 bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-inner backdrop-blur-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold flex-shrink-0 shadow-md mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 space-y-2 text-sm leading-relaxed shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-none font-medium'
                  : 'bg-zinc-900/90 text-zinc-100 border border-zinc-800 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono opacity-70 border-b border-white/10 pb-1.5 mb-1">
                <span className="font-bold">{msg.role === 'user' ? 'You' : msg.modelUsed || 'Yunø AI'}</span>
                <span>{msg.timestamp}</span>
              </div>

              <FormattedMessage content={msg.content} />

              {msg.role === 'model' && (
                <div className="flex items-center justify-end pt-2">
                  <button
                    onClick={() => copyToClipboard(msg.id, msg.content)}
                    className="flex items-center space-x-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedId === msg.id ? (
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
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 flex-shrink-0 border border-zinc-700 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-mono text-amber-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{selectedModel.name} is processing and generating response...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Prompt Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="mt-4 relative"
      >
        <div className="relative flex items-center bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder={`Ask ${selectedModel.name} anything...`}
            className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!promptInput.trim() || isGenerating}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 text-black font-extrabold rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* MODEL SELECTION OVERLAY MODAL (Matching video design) */}
      <AnimatePresence>
        {isModelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-black flex items-center justify-center font-black text-lg shadow-md">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      <span>Choose AI Model</span>
                      <span className="text-amber-400 text-sm font-medium bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        25+ Available
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Select high-speed multimodal or deep reasoning models for coding, math, and writing
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModelModalOpen(false)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-amber-500 hover:text-black text-zinc-300 border border-zinc-700 rounded-xl text-xs font-bold transition-all"
                >
                  <span>Done / Close</span>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Filter Tabs & Search Bar */}
              <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/80 space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-500" />
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Search by model name, provider (Google, Anthropic, OpenAI, DeepSeek, Meta), or capabilities..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {modelSearchQuery && (
                    <button
                      onClick={() => setModelSearchQuery('')}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                        activeCategory === cat
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Grid */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950">
                {filteredModels.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                    No models found matching "{modelSearchQuery}"
                  </div>
                ) : (
                  filteredModels.map((model) => {
                    const isSelected = selectedModel.id === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model);
                          setIsModelModalOpen(false);
                        }}
                        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500'
                            : 'bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-amber-500/50'
                        }`}
                      >
                        {/* Top Line badges */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 tracking-wider">
                              {model.provider}
                            </span>
                            {model.badge && (
                              <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                                {model.badge}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                            <span>{model.name}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            )}
                          </h3>

                          {/* Description */}
                          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                            {model.description}
                          </p>
                        </div>

                        {/* Bottom Row */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-zinc-500 font-medium font-mono">
                            {model.speed || 'Speed: Ultra Fast'}
                          </span>
                          <button
                            className={`flex items-center space-x-1 font-bold text-xs transition-colors ${
                              isSelected
                                ? 'text-amber-400 font-extrabold'
                                : 'text-zinc-400 group-hover:text-amber-400'
                            }`}
                          >
                            <span>{isSelected ? 'Active Model' : 'Select Model'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
