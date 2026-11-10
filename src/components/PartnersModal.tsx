import React, { useState } from 'react';
import { Handshake, X, Copy, Check, MessageSquare, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PartnersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnersModal: React.FC<PartnersModalProps> = ({ isOpen, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-[#0e0717] border border-[#2d154d] rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon & Title */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1c0e30] border border-[#3b1968] flex items-center justify-center text-purple-400 shadow-md">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Yunø Partners</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Official Collaborations</p>
            </div>
          </div>

          {/* Exact Partner Notice Prompt */}
          <div className="p-4 rounded-xl bg-[#130920] border border-[#26123f] text-xs text-zinc-200 leading-relaxed font-medium mb-5 shadow-inner">
            Hey if you're a partner then don't worry I will add you soon, if you are looking to partner hit me up on dc or tt.
          </div>

          {/* Social Contact Buttons (dc / tt) */}
          <div className="space-y-2.5">
            {/* Discord */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0512] border border-[#1e0e33] hover:border-[#4b227e] transition-colors">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#5865F2]/20 text-[#5865F2] flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Discord (dc)</div>
                  <div className="text-[11px] text-zinc-400 font-mono">@yunoweb / discord.gg/yuno</div>
                </div>
              </div>
              <button
                onClick={() => handleCopy('@yunoweb', 'dc')}
                className="px-2.5 py-1 rounded-lg bg-[#1c0e30] hover:bg-[#2c164d] text-purple-300 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                {copiedType === 'dc' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* TikTok */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0512] border border-[#1e0e33] hover:border-[#4b227e] transition-colors">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">TikTok (tt)</div>
                  <div className="text-[11px] text-zinc-400 font-mono">@yunomedia</div>
                </div>
              </div>
              <button
                onClick={() => handleCopy('@yunomedia', 'tt')}
                className="px-2.5 py-1 rounded-lg bg-[#1c0e30] hover:bg-[#2c164d] text-purple-300 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                {copiedType === 'tt' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
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

          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-[#23113d] hover:bg-[#34185c] text-white text-xs font-bold transition-colors cursor-pointer border border-[#482080]"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PartnersModal;
