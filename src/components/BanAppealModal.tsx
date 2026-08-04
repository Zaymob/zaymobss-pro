import React, { useState } from 'react';
import { Skull, Send, X, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BanAppealModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUsername?: string;
  onSubmitted?: () => void;
}

export const BanAppealModal: React.FC<BanAppealModalProps> = ({
  isOpen,
  onClose,
  defaultUsername = '',
  onSubmitted,
}) => {
  const [username, setUsername] = useState<string>(defaultUsername);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !reason.trim()) {
      setStatusMessage({ text: 'Please fill in both your username and appeal reason.', error: true });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/appeals/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: 'Your appeal has been inscribed into the Death Note record for Admin review!' });
        setReason('');
        if (onSubmitted) onSubmitted();
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 2000);
      } else {
        setStatusMessage({ text: data.error || 'Failed to submit appeal.', error: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'Error connecting to the appeal server.', error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-serif">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative w-full max-w-lg bg-stone-950 border-2 border-stone-800 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden text-stone-100 p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-100 font-serif">
                  Death Note Appeal Petition
                </h3>
                <p className="text-xs text-stone-400 font-mono">
                  Submit a petition to erase your name from the Death Note
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your exact username..."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
                Reason for Appeal
              </label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why your ban or timeout should be lifted..."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-sm font-serif focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 ${
                  statusMessage.error
                    ? 'bg-red-950/80 text-red-300 border border-red-800/50'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                }`}
              >
                {statusMessage.error ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-mono text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !username.trim() || !reason.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Petition</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
