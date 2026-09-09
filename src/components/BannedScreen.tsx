import React, { useState } from 'react';
import { AlertOctagon, ShieldAlert, Send, CheckCircle2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface BannedScreenProps {
  username: string;
  banReason?: string;
  banImageUrl?: string;
  bannedAt?: string;
  onAppealSubmitted?: () => void;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({
  username,
  banReason = 'Violating community guidelines and portal usage terms',
  banImageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  bannedAt = 'Recently',
  onAppealSubmitted,
}) => {
  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/appeals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          reason: appealText.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsSubmitted(true);
        if (onAppealSubmitted) onAppealSubmitted();
      } else {
        setError(data.error || 'Failed to submit appeal petition.');
      }
    } catch (err) {
      setError('Connection error submitting appeal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-center p-4 overflow-y-auto selection:bg-rose-500 selection:text-white">
      {/* Background Lockout Imagery */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <img
          src={banImageUrl}
          alt="Lockout Artwork"
          className="w-full h-full object-cover filter blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-xl rounded-3xl bg-zinc-950/90 border border-rose-900/60 shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6 text-center my-auto"
      >
        {/* Ban Badge & Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
          <AlertOctagon className="w-9 h-9 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
            ACCOUNT SUSPENDED
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            You Are Banned from Yunø
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-mono">
            User Account: <span className="text-white font-bold">@{username}</span>
          </p>
        </div>

        {/* Custom Ban Image Showcase */}
        {banImageUrl && (
          <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner bg-zinc-900">
            <img
              src={banImageUrl}
              alt="Ban Screen Art"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Reason Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 text-left space-y-1.5 shadow-md">
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold font-mono uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Reason for Ban:</span>
          </div>
          <p className="text-sm font-medium text-zinc-200 leading-relaxed">
            {banReason}
          </p>
          <div className="pt-2 text-[10px] font-mono text-zinc-500">
            Banned At: {bannedAt}
          </div>
        </div>

        {/* Appeal Form Section */}
        <div className="border-t border-zinc-800/80 pt-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-200">Submit a Ban Appeal Petition</h3>
            <p className="text-xs text-zinc-400">
              Explain why your ban should be reviewed by an administrator.
            </p>
          </div>

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center space-y-1"
            >
              <div className="flex items-center justify-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Appeal Petition Submitted!</span>
              </div>
              <p className="text-zinc-400 text-[11px]">
                Your petition has been delivered to the Admin moderation queue for review.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleAppealSubmit} className="space-y-3 text-left">
              <textarea
                rows={3}
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                placeholder="State your reason for appeal respectfully..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                required
              />

              {error && (
                <p className="text-xs text-rose-400">{error}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !appealText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmitting...' : 'Submit Appeal'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
