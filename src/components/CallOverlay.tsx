import React, { useState, useEffect, useRef } from 'react';
import { CallState } from '../types';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Volume2,
  Maximize2,
  Minimize2,
  Users,
  Sparkles,
  Shield,
  Disc3,
  Tv,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallOverlayProps {
  callState: CallState;
  onLeaveCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  onLeaveCall,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  localStream,
  screenStream,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (callState.isActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [callState.isActive]);

  // Bind local camera stream
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState.isCameraOn]);

  // Bind screen share stream
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, callState.isScreenSharing]);

  if (!callState.isActive) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={`fixed z-50 transition-all duration-300 ${
          isMinimized
            ? 'bottom-6 right-6 w-72'
            : 'bottom-6 right-6 w-80 sm:w-96 md:w-[420px]'
        }`}
      >
        <div className="bg-zinc-900/95 backdrop-blur-2xl border border-cyan-500/40 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col text-white">
          {/* Top Bar Header */}
          <div className="p-3 px-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {callState.channelName || 'Global Voice & Watch Party'}
                </span>
                <span className="text-[10px] font-mono text-cyan-400">
                  {formatTime(timer)} • {callState.participants.length} Active
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                title={isMinimized ? 'Expand Call Window' : 'Minimize Call Window'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Main Video / Screen Share Grid (When not minimized) */}
          {!isMinimized && (
            <div className="p-3 bg-zinc-950/60 space-y-3">
              {/* Screen Share Stage */}
              {callState.isScreenSharing && screenStream && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-cyan-500/50 shadow-inner group">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-bold flex items-center space-x-1">
                    <Monitor className="w-3 h-3" />
                    <span>Live Screen Share</span>
                  </div>
                </div>
              )}

              {/* Participants Grid */}
              <div
                className={`grid gap-2 ${
                  callState.participants.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                }`}
              >
                {callState.participants.map((p) => (
                  <div
                    key={p.id}
                    className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-2 group"
                  >
                    {p.isCameraOn && localStream && p.id === 'local-user' ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center space-y-1">
                        <div className="relative">
                          <img
                            src={p.avatar}
                            alt={p.username}
                            className={`w-12 h-12 rounded-full object-cover border-2 ${
                              !p.isMuted
                                ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                : 'border-zinc-700'
                            }`}
                          />
                          {p.isMuted && (
                            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-red-500/90 text-white">
                              <MicOff className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-zinc-200 truncate max-w-[100px]">
                          {p.username}
                        </span>
                      </div>
                    )}

                    {/* Participant Controls Overlay */}
                    <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-400 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur">
                      <span className="truncate">{p.username}</span>
                      {p.isMuted ? (
                        <MicOff className="w-3 h-3 text-red-400" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call Controls Footer */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center space-x-3">
            <button
              onClick={onToggleMic}
              className={`p-3 rounded-2xl transition-all shadow-md ${
                callState.isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700 border border-emerald-500/30'
              }`}
              title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={onToggleCamera}
              className={`p-3 rounded-2xl transition-all shadow-md ${
                !callState.isCameraOn
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
              }`}
              title={callState.isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {!callState.isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={onToggleScreenShare}
              className={`p-3 rounded-2xl transition-all shadow-md ${
                !callState.isScreenSharing
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-500/40'
              }`}
              title={callState.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor className="w-5 h-5" />
            </button>

            <button
              onClick={onLeaveCall}
              className="p-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/20 transition-all scale-105"
              title="Disconnect & Leave Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
