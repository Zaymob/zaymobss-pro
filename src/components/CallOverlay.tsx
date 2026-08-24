import React, { useState, useEffect, useRef } from 'react';
import { CallState } from '../types';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from './UserAvatar';

interface CallOverlayProps {
  callState: CallState;
  onLeaveCall: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams?: Record<string, MediaStream>;
}

const StreamVideo: React.FC<{ stream: MediaStream; isScreen?: boolean; muted?: boolean }> = ({
  stream,
  isScreen,
  muted,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`w-full h-full ${isScreen ? 'object-contain bg-black' : 'object-cover rounded-lg'}`}
    />
  );
};

const RemoteAudioPlayer: React.FC<{ stream: MediaStream; isMuted?: boolean }> = ({ stream, isMuted }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (isMuted) return null;

  return <audio ref={audioRef} autoPlay playsInline />;
};

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  onLeaveCall,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  localStream,
  screenStream,
  remoteStreams = {},
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [timer, setTimer] = useState<number>(0);

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

  if (!callState.isActive) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Determine active screen share stream (either local or from remote participant)
  const activeScreenShare = screenStream || Object.entries(remoteStreams).find(([uname, stream]) => {
    const p = callState.participants.find((part) => part.username === uname);
    return p?.isScreenSharing && stream;
  })?.[1] || null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className={`fixed z-50 transition-all duration-200 ${
          isMinimized
            ? 'bottom-6 right-6 w-72'
            : 'bottom-6 right-6 w-80 sm:w-96 md:w-[460px]'
        }`}
      >
        {/* Hidden Remote Audio Elements for Real Voice Sync */}
        {Object.entries(remoteStreams).map(([uname, stream]) => {
          const p = callState.participants.find((part) => part.username === uname);
          return (
            <RemoteAudioPlayer
              key={`remote-audio-${uname}`}
              stream={stream}
              isMuted={p?.isMuted}
            />
          );
        })}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
          {/* Top Bar Header */}
          <div className="p-3 px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {callState.channelName || 'Voice / Video Call'}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 flex items-center space-x-1">
                  <span>{formatTime(timer)}</span>
                  <span>•</span>
                  <span>{callState.participants.length} Live Sync</span>
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
            <div className="p-3 bg-zinc-950/90 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Screen Share Stage */}
              {activeScreenShare && (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner group">
                  <StreamVideo stream={activeScreenShare} isScreen muted={!!screenStream} />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-zinc-800/90 text-white text-[10px] font-medium flex items-center space-x-1.5 border border-zinc-700 backdrop-blur-sm">
                    <Monitor className="w-3 h-3 text-amber-400" />
                    <span>Live Screen Share</span>
                  </div>
                </div>
              )}

              {/* Participants Grid */}
              <div
                className={`grid gap-2 ${
                  callState.participants.length <= 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                }`}
              >
                {callState.participants.map((p) => {
                  const isLocal = p.id === 'local-user';
                  const remoteStream = !isLocal ? remoteStreams[p.username] : null;
                  const streamToDisplay = isLocal ? localStream : remoteStream;
                  const hasActiveCamera = p.isCameraOn && streamToDisplay;

                  return (
                    <div
                      key={p.id}
                      className="relative aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-2 group"
                    >
                      {hasActiveCamera ? (
                        <StreamVideo stream={streamToDisplay!} muted={isLocal} />
                      ) : (
                        <div className="flex flex-col items-center space-y-1.5">
                          <div className="relative">
                            <UserAvatar username={p.username} avatar={p.avatar} size="lg" />
                            {p.isMuted ? (
                              <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-red-600 text-white">
                                <MicOff className="w-2.5 h-2.5" />
                              </div>
                            ) : (
                              <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-emerald-600 text-white">
                                <Volume2 className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[120px]">
                            {p.username} {isLocal && '(You)'}
                          </span>
                        </div>
                      )}

                      {/* Participant Controls Overlay */}
                      <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-400 bg-zinc-950/85 px-2 py-0.5 rounded border border-zinc-800 backdrop-blur-sm">
                        <span className="truncate max-w-[90px]">{p.username}</span>
                        <div className="flex items-center space-x-1.5">
                          {p.isCameraOn && <Video className="w-3 h-3 text-emerald-400" />}
                          {p.isScreenSharing && <Monitor className="w-3 h-3 text-amber-400" />}
                          {p.isMuted ? (
                            <MicOff className="w-3 h-3 text-red-400" />
                          ) : (
                            <Mic className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Call Controls Footer */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center space-x-3">
            <button
              onClick={onToggleMic}
              className={`p-2.5 rounded-xl transition-colors ${
                callState.isMuted
                  ? 'bg-red-900/40 text-red-400 border border-red-800 hover:bg-red-900/60'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
              }`}
              title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {callState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleCamera}
              className={`p-2.5 rounded-xl transition-colors ${
                !callState.isCameraOn
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-zinc-800 text-emerald-400 border border-zinc-600 hover:bg-zinc-700'
              }`}
              title={callState.isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {!callState.isCameraOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleScreenShare}
              className={`p-2.5 rounded-xl transition-colors ${
                !callState.isScreenSharing
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-zinc-800 text-amber-400 border border-zinc-600 hover:bg-zinc-700'
              }`}
              title={callState.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor className="w-4 h-4" />
            </button>

            <button
              onClick={onLeaveCall}
              className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg"
              title="Disconnect & Leave Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
