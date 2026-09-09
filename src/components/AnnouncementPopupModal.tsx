import React from 'react';
import { Megaphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AnnouncementData {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  badge?: string;
  createdAt?: string;
  author?: string;
}

interface AnnouncementPopupModalProps {
  announcement: AnnouncementData | null;
  isOpen: boolean;
  onDismiss: () => void;
}

export const AnnouncementPopupModal: React.FC<AnnouncementPopupModalProps> = ({
  announcement,
  isOpen,
  onDismiss,
}) => {
  if (!isOpen || !announcement) return null;

  const contentText = announcement.content || announcement.description || announcement.title || '';
  const titleText = announcement.title && announcement.title !== contentText ? announcement.title : 'Announcement';
  const authorText = announcement.author || 'System Admin';
  const timeText = announcement.createdAt || 'Recent';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
        >
          {/* Header */}
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 flex-shrink-0">
              <Megaphone className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {announcement.badge || 'BROADCAST'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">{timeText}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug">
                {titleText}
              </h3>
            </div>
          </div>

          {/* Announcement Body Content */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-sm text-zinc-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
            {contentText}
          </div>

          {/* Footer Metadata & OK Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] font-mono text-zinc-400 truncate">
              Posted by <span className="text-zinc-300 font-semibold">{authorText}</span>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="px-6 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <span>OK</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
