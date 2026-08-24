import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 text-white select-none"
    >
      <div className="relative flex items-center justify-center">
        {/* Base Grey Text */}
        <span className="text-6xl sm:text-7xl md:text-8xl font-black font-sans tracking-tight text-zinc-700">
          yunø
        </span>

        {/* Animated Fill White Text Layer */}
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.3, ease: [0.25, 1, 0.5, 1] }}
          className="absolute left-0 top-0 bottom-0 overflow-hidden whitespace-nowrap"
        >
          <span className="text-6xl sm:text-7xl md:text-8xl font-black font-sans tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            yunø
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

