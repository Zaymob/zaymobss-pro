import React, { useState } from 'react';
import { Flag, Bug, MessageSquare, User, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporterUsername: string;
  initialType?: 'user' | 'message' | 'bug';
  targetUser?: string;
  messageContent?: string;
  messageId?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reporterUsername,
  initialType = 'user',
  targetUser = '',
  messageContent = '',
  messageId = '',
}) => {
  const [reportType, setReportType] = useState<'user' | 'message' | 'bug'>(initialType);
  const [target, setTarget] = useState(targetUser);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [bugCategory, setBugCategory] = useState('Playback / Video');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (reportType === 'bug') {
        const res = await fetch('/api/bug-reports/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reporter: reporterUsername || 'Anonymous',
            title: reason.trim(),
            description: details.trim() || reason.trim(),
            category: bugCategory,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg('Bug report submitted to the admin queue. Thank you!');
          setTimeout(() => {
            onClose();
            setSuccessMsg(null);
          }, 1500);
        } else {
          setErrorMsg(data.error || 'Failed to submit bug report.');
        }
      } else {
        const res = await fetch('/api/reports/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: reportType,
            reporter: reporterUsername || 'Anonymous',
            targetUser: target.trim(),
            messageContent,
            messageId,
            reason: reason.trim(),
            details: details.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg('Report submitted to the Admin Moderation Queue for review.');
          setTimeout(() => {
            onClose();
            setSuccessMsg(null);
          }, 1500);
        } else {
          setErrorMsg(data.error || 'Failed to submit report.');
        }
      }
    } catch (err) {
      setErrorMsg('Connection error submitting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden p-6 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {reportType === 'bug' ? <Bug className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {reportType === 'bug' ? 'Report a System Bug' : 'Submit Moderation Report'}
                </h3>
                <p className="text-[11px] text-zinc-400">Direct transmission to Administrator</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setReportType('user')}
              className={`py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 ${
                reportType === 'user' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>User</span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('message')}
              className={`py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 ${
                reportType === 'message' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('bug')}
              className={`py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 ${
                reportType === 'bug' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Bug</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {reportType === 'user' && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Target Username</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Username to report..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            )}

            {reportType === 'message' && messageContent && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Reported Message</label>
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
                  "{messageContent}"
                </div>
              </div>
            )}

            {reportType === 'bug' && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase">Bug Category</label>
                <select
                  value={bugCategory}
                  onChange={(e) => setBugCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Voice & Video Calls">Voice & Video Calls</option>
                  <option value="Screen Sharing">Screen Sharing</option>
                  <option value="Cinema Player">Cinema Player</option>
                  <option value="Music & Audio">Music & Audio</option>
                  <option value="Chat & DMs">Chat & DMs</option>
                  <option value="Games">Games</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">
                {reportType === 'bug' ? 'Bug Summary / Title' : 'Reason for Report'}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  reportType === 'bug'
                    ? 'E.g., Screen share audio not syncing...'
                    : 'E.g., Harassment, inappropriate content, spam...'
                }
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-400 uppercase">Additional Context / Details</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide additional details or steps to reproduce..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
