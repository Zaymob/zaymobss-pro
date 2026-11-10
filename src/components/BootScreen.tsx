import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Smooth progress bar fill
    const startTime = Date.now();
    const duration = 1800; // ms

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 250);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white select-none overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Ambient subtle aura behind DIOR */}
      <div
        className="absolute w-[500px] h-[300px] rounded-full pointer-events-none opacity-20 blur-[100px] bg-zinc-800"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center justify-center px-4"
      >
        {/* YUNO Wordmark & Icon */}
        <div className="relative flex flex-col items-center justify-center mb-6 sm:mb-8 space-y-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-[#2b1746] bg-[#0c0714] shadow-2xl">
            <img src="/yuno-logo.jpg" alt="Yuno Logo" className="w-full h-full object-cover" />
          </div>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.2em] leading-none uppercase select-none text-center text-white"
            style={{
              textShadow: '0 0 25px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2)',
            }}
          >
            YUNO
          </h1>
        </div>

        {/* Sleek Horizontal Loading Progress Bar */}
        <div className="w-64 sm:w-80 md:w-96 max-w-[85vw] relative">
          {/* Track Bar */}
          <div className="w-full h-[2px] sm:h-[2.5px] bg-zinc-800/80 rounded-full overflow-hidden relative">
            {/* Active Luminous Beam */}
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-white relative rounded-full"
              style={{
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.95), 0 0 24px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3)',
              }}
            />
          </div>

          {/* Leading Glow Particle Point */}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white blur-[1px] pointer-events-none"
            style={{
              boxShadow: '0 0 10px rgba(255, 255, 255, 1), 0 0 20px rgba(255, 255, 255, 0.8)',
            }}
          />
        </div>

        {/* Minimalist Spaced "L O A D I N G" Caption */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 sm:mt-5 text-center"
        >
          <span
            className="text-[10px] sm:text-[11px] font-medium text-zinc-400 tracking-[0.55em] sm:tracking-[0.65em] uppercase select-none inline-block pl-2"
            style={{
              fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            }}
          >
            L O A D I N G
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
