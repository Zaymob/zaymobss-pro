import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const fullText = 'yunø';

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index++;
      setDisplayText(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 700);
      }
    }, 180);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(6px)' }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 text-white select-none font-sans"
    >
      <div className="flex items-center text-6xl sm:text-7xl md:text-8xl font-black tracking-tight font-serif">
        <span className="text-white">{displayText}</span>
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="inline-block ml-1.5 w-1.5 sm:w-2 h-12 sm:h-16 bg-amber-400 rounded-sm"
        />
      </div>
    </motion.div>
  );
};
