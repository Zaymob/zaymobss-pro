import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface IncomingCallData {
  callerName: string;
  callerAvatar: string;
  channelId: string;
  channelName: string;
  callType: 'voice' | 'video' | 'screen';
}

interface IncomingCallNotificationProps {
  incomingCall: IncomingCallData | null;
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  incomingCall,
  onAnswer,
  onDecline,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let synthTimer: any = null;

    if (incomingCall) {
      // Play ringtone from Jumpshare
      const ringtoneUrl = 'https://jumpshare.com/s/r1rXFr9Y5IIWVFlL59qE';
      if (!audioRef.current) {
        audioRef.current = new Audio(ringtoneUrl);
        audioRef.current.loop = true;
      } else {
        audioRef.current.src = ringtoneUrl;
      }

      audioRef.current.play().catch((err) => {
        console.warn('Ringtone auto-play fallback:', err);
      });

      // Backup ringtone audio synthesizer loop
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const playRingtoneChime = () => {
            if (ctx.state === 'suspended') ctx.resume();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 1.0);
            osc2.stop(ctx.currentTime + 1.0);
          };

          playRingtoneChime();
          synthTimer = setInterval(playRingtoneChime, 2200);
        }
      } catch (e) {}
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (synthTimer) clearInterval(synthTimer);
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.9 }}
        className="fixed top-5 right-5 z-50 w-80 sm:w-96 select-none"
      >
        <div className="bg-[#111115] border-2 border-emerald-500/60 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] p-4 text-white backdrop-blur-xl">
          <div className="flex items-center space-x-3.5">
            {/* Caller Profile Picture */}
            <div className="relative flex-shrink-0">
              <img
                src={
                  incomingCall.callerAvatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                }
                alt={incomingCall.callerName}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111115] rounded-full animate-ping" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111115] rounded-full" />
            </div>

            {/* Caller Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Incoming Call
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-white truncate mt-0.5">
                {incomingCall.callerName}
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {incomingCall.channelName || 'Voice & Video Room'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Decline / Answer */}
          <div className="flex items-center space-x-2.5 mt-3.5 pt-3 border-t border-zinc-800/80">
            <button
              onClick={onDecline}
              className="flex-1 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>

            <button
              onClick={onAnswer}
              className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Answer</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
