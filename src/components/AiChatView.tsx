import React, { useState, useEffect, useRef } from 'react';
import {
  Send as PaperPlaneRight,
  Plus,
  Trash2 as Trash,
  Download as DownloadSimple,
  Copy,
  Check,
  Cpu,
  Sparkles as Sparkle,
  Zap as Lightning,
  RefreshCw as ArrowsClockwise,
} from 'lucide-react';
import { DiorLogo } from './DiorLogo';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
}

const AI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google AI', desc: 'Ultra-fast & intelligent' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', desc: 'Versatile multimodal' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', desc: 'Superior coding & reasoning' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', desc: 'Deep mathematical logic' },
];

const SUGGESTIONS = [
  { title: 'Write code', prompt: 'Write a TypeScript function to debounce search inputs with React hooks' },
  { title: 'Explain concept', prompt: 'Explain the difference between client-side rendering and SSR in simple terms' },
  { title: 'Draft email', prompt: 'Draft a polite and concise follow-up email after a technical project review' },
  { title: 'Math & logic', prompt: 'How does binary search achieve O(log n) time complexity? Provide an example' },
];

export const AiChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('dior_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('dior_ai_chat_history', JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          messages: newHistory.map(m => ({ role: m.role, content: m.content })),
          model: selectedModel,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response generated.',
        timestamp: Date.now(),
        model: data.model || selectedModel,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'assistant',
        content: 'Apologies, I encountered a temporary connection issue. Please verify your connection or try again.',
        timestamp: Date.now(),
        model: selectedModel,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear current AI conversation?')) {
      setMessages([]);
      try {
        localStorage.removeItem('dior_ai_chat_history');
      } catch {}
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const exportText = messages
      .map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleTimeString()}]:\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dior-ai-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeModelObj = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#1e2022] text-[#e4e6eb] select-text">
      {/* Top Bar */}
      <div className="h-11 px-4 flex items-center justify-between bg-[#25282a] border-b border-[#383c41] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <DiorLogo variant="monogram" size="sm" className="text-zinc-300" />
            <span className="font-sans font-black text-xs tracking-widest uppercase text-zinc-200">
              YUNO // AI
            </span>
          </div>

          <div className="h-4 w-px bg-[#383c41]" />

          {/* Model Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-[#2b2e31] hover:bg-[#34383d] border border-[#3a3e43] rounded transition-colors"
            >
              <Cpu size={14} className="text-zinc-400" />
              <span>{activeModelObj.name}</span>
            </button>

            {showModelDropdown && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#25282a] border border-[#383c41] rounded shadow-lg z-50 py-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-[#383c41]">
                  Neural Engines
                </div>
                {AI_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col hover:bg-[#2f3337] transition-colors ${
                      selectedModel === m.id ? 'bg-[#2b2e31]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200">{m.name}</span>
                      <span className="text-[10px] text-zinc-400">{m.provider}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMessages([])}
            title="New Chat"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-300 bg-[#2b2e31] hover:bg-[#34383d] border border-[#3a3e43] rounded transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">New</span>
          </button>
          <button
            onClick={handleExportChat}
            disabled={messages.length === 0}
            title="Export Conversation"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2e31] rounded transition-colors disabled:opacity-40"
          >
            <DownloadSimple size={15} />
          </button>
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            title="Clear Chat"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#2b2e31] rounded transition-colors disabled:opacity-40"
          >
            <Trash size={15} />
          </button>
        </div>
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#25282a] border border-[#383c41] flex items-center justify-center mb-4">
                <DiorLogo variant="monogram" size="lg" className="text-zinc-200" />
              </div>
              <h2 className="font-sans text-2xl font-bold tracking-wider text-zinc-100 uppercase mb-2">
                YUNO INTELLIGENCE
              </h2>
              <p className="text-sm text-zinc-400 max-w-md mb-8">
                Autonomous web intelligence and assistant. Accelerated reasoning, code generation, and multi-model synthesis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl text-left">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="p-3 bg-[#25282a] hover:bg-[#2d3135] border border-[#383c41] hover:border-[#4d5258] rounded transition-colors group flex flex-col gap-1 text-left"
                  >
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sparkle size={12} className="text-zinc-400" />
                      {s.title}
                    </span>
                    <span className="text-xs text-zinc-400 line-clamp-2">{s.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded px-4 py-3 text-sm border leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#2b2e31] text-zinc-100 border-[#3d4247]'
                      : 'bg-[#25282a] text-zinc-200 border-[#383c41]'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center justify-between gap-4 pb-2 mb-2 border-b border-[#33373b]">
                      <div className="flex items-center gap-1.5">
                        <DiorLogo variant="monogram" size="sm" className="text-zinc-400" />
                        <span className="font-sans text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
                          YUNO AI
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-sm">{msg.content}</div>

                  <div className="mt-2 text-[10px] text-zinc-500 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="bg-[#25282a] border border-[#383c41] rounded px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
                <ArrowsClockwise size={16} className="animate-spin text-zinc-400" />
                <span>Yuno AI is processing response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Prompt Bar */}
      <div className="p-3 bg-[#25282a] border-t border-[#383c41] shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="flex-1 relative flex items-center bg-[#1e2022] border border-[#383c41] focus-within:border-[#525861] rounded">
            <span className="pl-3 text-zinc-500">
              <Sparkle size={15} />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={`Ask Yuno AI anything (${activeModelObj.name})...`}
              className="w-full bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim() || isLoading}
              className="mr-2 p-1.5 rounded bg-[#2b2e31] hover:bg-[#34383d] text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Send Message"
            >
              <PaperPlaneRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiChatView;
