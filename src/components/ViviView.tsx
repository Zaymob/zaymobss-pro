import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

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

export interface ViviProject {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  htmlCode: string;
  messages: ViviMessage[];
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

const DEFAULT_CLICKER_GAME = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yam Clicker</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
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
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 { font-size: 26px; margin-bottom: 8px; font-weight: 700; color: #fff; }
    .score-display {
      font-size: 38px;
      font-weight: 800;
      color: #e4e4e7;
      margin: 15px 0 5px;
    }
    .cps-display { font-size: 13px; color: #a1a1aa; margin-bottom: 25px; }
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
    .click-target:active { transform: scale(0.92); }
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
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    .upgrade-btn:hover:not(:disabled) { background: #272730; }
    .upgrade-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-cost { font-weight: 700; color: #cbd5e1; }
  </style>
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

  <script>
    let yams = 0;
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

    updateUI();
  </script>
</body>
</html>`;

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

  // Projects State
  const [projects, setProjects] = useState<ViviProject[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_vivi_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'proj_clicker',
        title: 'HTML Clicker Game',
        description: 'Interactive HTML/JS Clicker game created with Vivi',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        htmlCode: DEFAULT_CLICKER_GAME,
        messages: [
          {
            id: 'init_p1',
            role: 'model',
            content: `I've started the **HTML Clicker Game** project for you! 🎮\n\nYou can play it live in the preview pane on the right, inspect the code, or tell me what features you'd like to add (e.g. "Add a prestige reset system", "Make golden cookies fall from the sky", "Add sound effects").`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      },
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return projects[0]?.id || '';
  });

  const [projectWorkspaceTab, setProjectWorkspaceTab] = useState<'preview' | 'code'>('preview');

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

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

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

  // Auto scroll
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

  // Create new Project
  const handleCreateProject = () => {
    const title = prompt('Project Name:', 'My Web App') || 'New Project';
    const newId = 'proj_' + Date.now();
    const newProj: ViviProject = {
      id: newId,
      title,
      description: 'Project started with Vivi',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      htmlCode: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { background: #0a0a0c; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { text-align: center; padding: 20px; border: 1px solid #333; border-radius: 12px; }
    button { background: #6366f1; border: none; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>${title}</h2>
    <p>Tell Vivi what features or code you want to build!</p>
    <button onclick="alert('Ready!')">Click Me</button>
  </div>
</body>
</html>`,
      messages: [
        {
          id: 'p_init_' + Date.now(),
          role: 'model',
          content: `Project **${title}** initialized! What would you like to build or add first? Describe the functionality or design, and I'll generate the code.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newId);
    setSidebarTab('projects');
    setShowSidebar(false);
  };

  // Delete project
  const handleDeleteProject = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) {
      alert('You must have at least one project.');
      return;
    }
    const filtered = projects.filter((p) => p.id !== projId);
    setProjects(filtered);
    if (activeProjectId === projId) {
      setActiveProjectId(filtered[0]?.id || '');
    }
  };

  // File Upload (Reads both images and raw code/text files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`${file.name} exceeds 20MB limit.`);
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
        // Read text/code files
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
  };

  // Apply code to active project
  const handleApplyToProject = (code: string) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, htmlCode: code, updatedAt: Date.now() }
          : p
      )
    );
    setProjectWorkspaceTab('preview');
  };

  // Extract HTML code block from message if present
  const extractHtmlCode = (text: string): string | null => {
    const match = text.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
    return match ? match[1].trim() : null;
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

    // Auto title chat
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

      // Extra project context instructions for Vivi
      let promptToSend = trimmedPrompt;
      if (isProjectMode) {
        promptToSend = `[Project Context: "${activeProject.title}". Current Code:\n\`\`\`html\n${activeProject.htmlCode.slice(0, 15000)}\n\`\`\`]\n\nUser request: ${trimmedPrompt}`;
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

      // In project mode: if Vivi generated updated HTML code, auto-update the project code!
      if (isProjectMode) {
        const extractedCode = extractHtmlCode(data.text);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === activeProject.id
              ? {
                  ...p,
                  htmlCode: extractedCode || p.htmlCode,
                  updatedAt: Date.now(),
                  messages: [...updatedMessages, modelMessage],
                }
              : p
          )
        );
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
                {sidebarTab === 'projects' && (lang === 'html' || lang === 'xml') && (
                  <button
                    onClick={() => handleApplyToProject(code)}
                    className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer text-[10px]"
                    title="Apply to Project Preview"
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

        {/* Right Section: Interactive Project Workspace (when in Project mode) */}
        {sidebarTab === 'projects' && activeProject && (
          <aside className="flex-1 flex flex-col h-full bg-[#09090b] min-w-0">
            {/* Project Workspace Header */}
            <div className="h-12 border-b border-[#18181b] px-4 flex items-center justify-between bg-[#0e0e11]">
              <div className="flex items-center space-x-2 min-w-0">
                <CodeXml className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-semibold text-white truncate">
                  {activeProject.title}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setProjectWorkspaceTab('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
                    projectWorkspaceTab === 'preview'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  onClick={() => setProjectWorkspaceTab('code')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer ${
                    projectWorkspaceTab === 'code'
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>Code</span>
                </button>

                <button
                  onClick={() =>
                    handleDownloadFile(activeProject.htmlCode, `${activeProject.title.toLowerCase().replace(/\s+/g, '-')}.html`)
                  }
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Download HTML Project"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Project Content: Live Playable Preview or Code View */}
            <div className="flex-1 overflow-hidden relative">
              {projectWorkspaceTab === 'preview' ? (
                <iframe
                  title="Project Live Preview"
                  srcDoc={activeProject.htmlCode}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-modals"
                />
              ) : (
                <div className="w-full h-full p-4 overflow-auto font-mono text-xs text-zinc-200 bg-[#09090b] scrollbar-thin">
                  <pre>{activeProject.htmlCode}</pre>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ViviView;
