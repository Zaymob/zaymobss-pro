import React, { useState } from 'react';
import { YouTubeVideo } from '../types';
import {
  X,
  Maximize2,
  Minimize2,
  Tv,
  GripHorizontal,
  ExternalLink,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PipVideoOverlayProps {
  pipVideo: YouTubeVideo | null;
  onClose: () => void;
  onExpand: (video: YouTubeVideo) => void;
}

export const PipVideoOverlay: React.FC<PipVideoOverlayProps> = ({
  pipVideo,
  onClose,
  onExpand,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  if (!pipVideo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag
        dragMomentum={false}
        className="fixed bottom-20 right-6 z-50 select-none shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden border border-red-500/40 bg-zinc-950/95 backdrop-blur-md"
        style={{ width: isMinimized ? '280px' : '360px' }}
      >
        {/* Window Control Header Bar (Drag handle) */}
        <div className="bg-zinc-900/90 px-3 py-2 border-b border-zinc-800 flex items-center justify-between cursor-move group">
          <div className="flex items-center space-x-2 min-w-0">
            <GripHorizontal className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors flex-shrink-0" />
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono font-extrabold text-red-400 uppercase tracking-wider">
                YUNØ TUBE PiP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Video' : 'Mute Video'}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand PiP' : 'Minimize PiP'}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => onExpand(pipVideo)}
              title="Open full video in Yunø Tube"
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close PiP Player"
              className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Player Frame */}
        {!isMinimized ? (
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${pipVideo.videoId}?autoplay=1&enablejsapi=1${isMuted ? '&mute=1' : ''}`}
              title={pipVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full border-0 pointer-events-auto"
            />
          </div>
        ) : (
          <div className="p-3 flex items-center space-x-3 bg-zinc-900/60">
            <div className="relative w-16 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0 border border-zinc-700">
              <img
                src={pipVideo.thumbnail}
                alt={pipVideo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white truncate">{pipVideo.title}</h5>
              <span className="text-[10px] text-zinc-400 block truncate">{pipVideo.channelTitle}</span>
            </div>
          </div>
        )}

        {/* Bottom Title Info Bar */}
        <div className="p-2.5 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="text-[11px] font-bold text-white truncate leading-tight">
              {pipVideo.title}
            </h4>
            <span className="text-[10px] text-zinc-400 block truncate font-medium">
              {pipVideo.channelTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onExpand(pipVideo)}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] transition-colors flex-shrink-0 flex items-center space-x-1"
          >
            <Tv className="w-3 h-3" />
            <span>FULL TUBE</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
