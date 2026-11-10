import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw as ArrowClockwise,
  Home as House,
  Search as MagnifyingGlass,
  Lock as LockKey,
  Star,
  Copy,
  Check,
  Settings as GearSix,
  AlertCircle as WarningCircle,
  ShieldCheck,
} from 'lucide-react';
import { DiorLogo } from './DiorLogo';

interface BrowserAddressBarProps {
  currentUrl: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onNavigate: (url: string) => void;
  onOpenSettings: () => void;
  onPanic: () => void;
}

export const BrowserAddressBar: React.FC<BrowserAddressBarProps> = ({
  currentUrl,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  onNavigate,
  onOpenSettings,
  onPanic,
}) => {
  const [inputValue, setInputValue] = useState(currentUrl);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setInputValue(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputValue.trim();
    if (!clean) return;
    onNavigate(clean);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDiorInternal = currentUrl.startsWith('dior://');

  return (
    <div className="h-11 bg-[#25282a] border-b border-[#383c41] px-3 flex items-center gap-2 shrink-0">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#2e3236] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Forward"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#2e3236] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <ArrowRight size={15} />
        </button>
        <button
          onClick={onReload}
          title="Reload"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#2e3236] rounded transition-colors"
        >
          <ArrowClockwise size={15} />
        </button>
        <button
          onClick={onGoHome}
          title="Home (dior://home)"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#2e3236] rounded transition-colors"
        >
          <House size={15} />
        </button>
      </div>

      {/* Omnibox URL Input Container */}
      <form onSubmit={handleSubmit} className="flex-1 flex items-center min-w-0">
        <div className="w-full flex items-center bg-[#1e2022] border border-[#383c41] focus-within:border-[#5a6068] rounded px-3 py-1.5 gap-2 transition-colors">
          {/* Protocol Indicator */}
          <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
            {isDiorInternal ? (
              <DiorLogo variant="monogram" size="sm" className="w-3.5 h-3.5 text-zinc-300" />
            ) : (
              <LockKey size={13} className="text-emerald-500" />
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onFocus={e => e.target.select()}
            placeholder="Search web or enter address (e.g. yuno://g, yuno://a)..."
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none font-mono"
          />

          {/* Action Icons in Omnibox */}
          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 hover:text-zinc-100 rounded"
              title="Copy URL"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => setBookmarked(!bookmarked)}
              className="p-1 hover:text-zinc-100 rounded"
              title="Bookmark tab"
            >
              <Star size={13} className={bookmarked ? 'text-amber-400 fill-current' : ''} />
            </button>
          </div>
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onPanic}
          title="Panic Key: Disguise Tab Instantly"
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-[#2e3236] rounded transition-colors"
        >
          <WarningCircle size={15} />
        </button>
        <button
          onClick={onOpenSettings}
          title="Browser Settings (dior://settings)"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#2e3236] rounded transition-colors"
        >
          <GearSix size={15} />
        </button>
      </div>
    </div>
  );
};

export default BrowserAddressBar;
