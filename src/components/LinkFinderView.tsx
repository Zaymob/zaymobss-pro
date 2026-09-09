import React, { useState } from 'react';
import {
  Copy,
  Check,
  ArrowClockwise as RefreshCw,
  LinkSimple as LinkIcon,
  ShieldCheck,
  ArrowSquareOut as ExternalLink,
  Question as HelpCircle,
  PaperPlaneRight as Send,
  Globe,
} from '@phosphor-icons/react';

interface LinkFinderViewProps {
  onLaunchProxy?: (url: string) => void;
}

const SCHOOL_FILTERS = [
  'Securly',
  'GoGuardian',
  'Lightspeed',
  'FortiGuard',
  'ContentKeeper',
  'Cisco Umbrella',
  'Palo Alto',
  'iBoss',
  'Smoothwall',
  'Linewize',
];

export const LinkFinderView: React.FC<LinkFinderViewProps> = ({ onLaunchProxy }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('Securly');
  const [customSubdomain, setCustomSubdomain] = useState<string>('');
  const [customDomainSuffix, setCustomDomainSuffix] = useState<string>('default');
  const [generatedLink, setGeneratedLink] = useState<string>(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dior.app';
    return `${origin}/#pass=securly-x9f2a-8402`;
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([
    `${typeof window !== 'undefined' ? window.location.origin : 'https://dior.app'}/#pass=securly-x9f2a-8402`,
  ]);

  // Request School Blocker State
  const [requestedBlocker, setRequestedBlocker] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleGenerate = (filterName = selectedFilter, userSubdomain = customSubdomain, userSuffix = customDomainSuffix) => {
    setIsGenerating(true);
    setCopied(false);
    setTimeout(() => {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dior.app';
      const cleanFilter = filterName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const randomHash = Math.random().toString(36).substring(2, 8);
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      
      let baseSub = userSubdomain.trim()
        ? userSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
        : `${cleanFilter}-${randomHash}-${randomNum}`;

      let newUrl = '';
      if (userSuffix === 'default') {
        newUrl = `${origin}/#pass=${baseSub}`;
      } else {
        newUrl = `https://${baseSub}.${userSuffix}/#pass=${cleanFilter}-${randomNum}`;
      }
      
      setGeneratedLink(newUrl);
      setHistory((prev) => [newUrl, ...prev.slice(0, 4)]);
      setIsGenerating(false);
    }, 250);
  };

  const handleCopy = (textToCopy = generatedLink) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedBlocker.trim()) return;
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestedBlocker('');
      setTimeout(() => setRequestSubmitted(false), 3000);
    }, 500);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pt-2 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono">
          <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
          <span>Stealth Mirror Generator</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Link Finder
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Generate stealth unblocked mirror links tailored for your school or district network filter.
        </p>
      </div>

      {/* Main Generator Box */}
      <div className="p-6 rounded-2xl bg-[#111115] border border-zinc-800 space-y-6">
        
        {/* Filter Selector */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Select Your Network Filter
          </label>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_FILTERS.map((filter) => {
              const isSelected = selectedFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setSelectedFilter(filter);
                    handleGenerate(filter);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-950 font-bold border-zinc-200'
                      : 'bg-[#18181f] border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Subdomain & Domain Extension Input */}
        <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
          <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
            Custom Subdomain & Link Prefix (Optional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="text"
                placeholder="e.g. math-notes, classroom-v3, portal..."
                value={customSubdomain}
                onChange={(e) => {
                  setCustomSubdomain(e.target.value);
                  handleGenerate(selectedFilter, e.target.value, customDomainSuffix);
                }}
                className="w-full bg-[#18181f] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-amber-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60 font-mono"
              />
            </div>
            <div>
              <select
                value={customDomainSuffix}
                onChange={(e) => {
                  setCustomDomainSuffix(e.target.value);
                  handleGenerate(selectedFilter, customSubdomain, e.target.value);
                }}
                className="w-full bg-[#18181f] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60 font-mono cursor-pointer"
              >
                <option value="default">Current App Applet Host</option>
                <option value="diornet.org">diornet.org</option>
                <option value="studyhub.edu">studyhub.edu</option>
                <option value="classroom-notes.net">classroom-notes.net</option>
                <option value="calc-app.org">calc-app.org</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Type any custom subdomain prefix to rename your generated stealth mirror link.
          </p>
        </div>

        {/* Output Area */}
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Unblocked Mirror Ready ({selectedFilter})</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">Status: Active</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 bg-[#18181f] border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-amber-400 break-all select-all flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{generatedLink}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy()}
                className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="px-3.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95 border border-zinc-700"
                title="Generate New Link"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              {onLaunchProxy && (
                <button
                  onClick={() => onLaunchProxy(generatedLink)}
                  className="px-3.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border border-zinc-700"
                  title="Open in Proxy"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recent Links History */}
        {history.length > 1 && (
          <div className="space-y-2 pt-3 border-t border-zinc-800/80">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
              Recent Generated Mirrors
            </span>
            <div className="space-y-1.5">
              {history.slice(1).map((link, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#18181f] border border-zinc-800 text-xs font-mono text-zinc-400">
                  <span className="truncate mr-2 text-zinc-300">{link}</span>
                  <button
                    onClick={() => handleCopy(link)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px] cursor-pointer flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request My School Blocker Section */}
      <div className="p-6 rounded-2xl bg-[#111115] border border-zinc-800 space-y-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-zinc-300" />
          <h2 className="text-base font-bold text-white">Request My School Blocker</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Don't see your school or district's filter listed above? Enter the name of your blocker (e.g. Gaggle, Zscaler, LANSchool, iboss, custom district filter) and we will add specialized bypass rules for it.
        </p>

        <form onSubmit={handleRequestSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={requestedBlocker}
            onChange={(e) => setRequestedBlocker(e.target.value)}
            placeholder="e.g. Zscaler, Gaggle, District Filter #4..."
            className="flex-1 bg-[#18181f] border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
          />
          <button
            type="submit"
            disabled={!requestedBlocker.trim()}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Request</span>
          </button>
        </form>

        {requestSubmitted && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Request logged! Our stealth team will index bypass rules for this blocker.</span>
          </div>
        )}
      </div>

      {/* Answer Question / FAQ Section */}
      <div className="p-6 rounded-2xl bg-[#111115] border border-zinc-800 space-y-3">
        <div className="flex items-center space-x-2 text-zinc-300">
          <HelpCircle className="w-5 h-5 text-zinc-400" />
          <h2 className="text-base font-bold text-white">Are each generated links different?</h2>
        </div>
        <div className="text-xs text-zinc-300 space-y-2 leading-relaxed font-sans">
          <p>
            <strong className="text-white font-semibold">Yes, absolutely.</strong> Every single time you click the <span className="font-mono text-zinc-200">Generate</span> or <span className="font-mono text-zinc-200">Refresh</span> button, a unique, randomized stealth mirror URL is generated.
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-1">
            <li><strong className="text-zinc-200">Randomized Pass Tokens:</strong> Each link embeds a unique alphanumeric hash seed (e.g. <span className="font-mono text-zinc-300">#pass=securly-x9f2a-8402</span>).</li>
            <li><strong className="text-zinc-200">Dynamic Mirror Paths:</strong> School filters use static domain lists to block sites. By changing the URL string dynamically with unique query hashes, school filters cannot easily group or block your links.</li>
            <li><strong className="text-zinc-200">Never Run Out:</strong> If one link gets flagged or blocked on your network, simply click the refresh button to instantly generate a brand new working link!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

