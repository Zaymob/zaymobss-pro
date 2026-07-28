import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Terminal, Cpu, ShieldCheck, Activity, Radio, Volume2 } from 'lucide-react';
import { audioEngine } from '../utils/audioSynth';

interface BootScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  'BIOS v4.20 - Initializing Yunø Core Kernel...',
  '[OK] Mounting encrypted local state storage...',
  '[OK] P2P WebRTC mesh sockets online (Port 3000)...',
  '[OK] Web Audio DSP synth drivers loaded...',
  '[OK] Priming 4K H.265 multi-server stream decoders...',
  '[OK] Synchronizing VIP Watch Party & Gartic Game Nodes...',
  '[OK] Security rules & OAuth credentials verified...',
  'System READY. Launching Yunø Portal OS...',
];

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentLogIndex, setCurrentLogIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    try {
      audioEngine.playPowerupSound();
    } catch (e) {}

    // Smooth progress timer (0 to 100% over ~2.8 seconds)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 12) + 6;
        return next > 100 ? 100 : next;
      });
    }, 150);

    // Terminal logs ticker
    const logInterval = setInterval(() => {
      setCurrentLogIndex((prev) => {
        if (prev >= BOOT_LOGS.length - 1) {
          clearInterval(logInterval);
          return BOOT_LOGS.length - 1;
        }
        return prev + 1;
      });
    }, 320);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsFinished(true);
        try {
          audioEngine.playPowerupSound();
        } catch (e) {}
        setTimeout(onComplete, 400);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <AnimatePresence>
      {!isFinished && (
        <motion.div
          key="boot-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-12 bg-zinc-950 text-white overflow-hidden select-none font-sans"
        >
          {/* Subtle animated background grid & radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.18),transparent_65%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

          {/* Top Bar - High-tech OS telemetry */}
          <div className="w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-zinc-400 border-b border-zinc-800/80 pb-3 z-10">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1 text-cyan-400 font-bold">
                <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                <span>YUNØ-OS v4.2</span>
              </span>
              <span className="hidden sm:inline text-zinc-600">|</span>
              <span className="hidden sm:flex items-center space-x-1 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted Kernel</span>
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>BOOTING SYSTEM</span>
              </span>
              <span className="font-mono text-cyan-400 font-black">{progress}%</span>
            </div>
          </div>

          {/* Center Brand & Glowing Radar Logo */}
          <div className="relative flex flex-col items-center justify-center my-auto z-10 space-y-6">
            <div className="relative flex items-center justify-center h-48 w-full max-w-xl">
              {/* Outer Pulse Rings */}
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  rotate: { duration: 12, repeat: Infinity, ease: 'linear' },
                  scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="absolute w-52 h-52 rounded-full border border-dashed border-cyan-500/40 pointer-events-none"
              />

              <motion.div
                animate={{
                  scale: [0.9, 1.15, 0.9],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-40 h-40 rounded-full bg-cyan-500/10 border border-cyan-400/60 shadow-[0_0_60px_rgba(6,182,212,0.35)] pointer-events-none"
              />

              {/* Typography */}
              <div className="flex items-center text-7xl sm:text-8xl md:text-9xl font-black tracking-tight font-serif drop-shadow-2xl z-10">
                <span className="bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent mr-1">
                  Yun
                </span>
                <motion.span
                  animate={{
                    textShadow: [
                      '0 0 20px rgba(6,182,212,0.6)',
                      '0 0 60px rgba(6,182,212,0.95), 0 0 90px rgba(59,130,246,0.8)',
                      '0 0 20px rgba(6,182,212,0.6)',
                    ],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="bg-gradient-to-br from-cyan-300 via-cyan-400 to-indigo-500 bg-clip-text text-transparent font-sans"
                >
                  Ø
                </motion.span>
              </div>
            </div>

            {/* Boot Progress Bar */}
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-bold">
                <span className="flex items-center space-x-1">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Kernel Loading...</span>
                </span>
                <span className="text-amber-400 font-bold">{progress}%</span>
              </div>

              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800 shadow-inner">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                />
              </div>
            </div>

            {/* Terminal Log Screen */}
            <div className="w-full max-w-md p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 font-mono text-[11px] space-y-1.5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between text-zinc-500 pb-1.5 border-b border-zinc-800/80">
                <span className="flex items-center space-x-1.5 text-[10px] uppercase font-bold text-zinc-400">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>Boot Terminal Output</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="h-16 overflow-hidden flex flex-col justify-end text-zinc-300 space-y-1">
                {BOOT_LOGS.slice(0, currentLogIndex + 1).map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`truncate ${
                      log.includes('READY') || log.includes('SUCCESS')
                        ? 'text-emerald-400 font-bold'
                        : log.includes('OK')
                        ? 'text-cyan-300'
                        : 'text-zinc-400'
                    }`}
                  >
                    {log}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar Controls & Fast Skip */}
          <div className="w-full max-w-4xl flex items-center justify-between text-xs text-zinc-400 z-10 pt-4 border-t border-zinc-800/60">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Yunø OS Environment • All Systems Nominal</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setProgress(100);
                setIsFinished(true);
                try {
                  audioEngine.playPowerupSound();
                } catch (e) {}
                setTimeout(onComplete, 150);
              }}
              className="flex items-center space-x-2 text-xs font-bold text-zinc-300 hover:text-white transition-all px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur hover:border-cyan-500/50 shadow-lg"
            >
              <span>Skip Boot</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

