import React from 'react';

interface DiorLogoProps {
  className?: string;
  variant?: 'wordmark' | 'monogram' | 'badge' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const DiorLogo: React.FC<DiorLogoProps> = ({
  className = '',
  variant = 'wordmark',
  size = 'md',
}) => {
  if (variant === 'monogram') {
    const sizeClasses = {
      sm: 'text-xs tracking-wider font-bold',
      md: 'text-sm tracking-wider font-bold',
      lg: 'text-lg tracking-wider font-bold',
      xl: 'text-2xl tracking-wider font-extrabold',
    }[size];

    return (
      <span
        className={`font-mono uppercase select-none text-purple-400 ${sizeClasses} ${className}`}
      >
        YN
      </span>
    );
  }

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center justify-center bg-[#170c29] border border-[#3b1968] text-purple-200 px-2 py-0.5 font-sans font-bold tracking-[0.2em] text-[10px] uppercase select-none rounded ${className}`}
      >
        YUNO
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`}>
        <div className="w-5 h-5 rounded overflow-hidden border border-[#2b1746] bg-[#0c0714] flex-shrink-0">
          <img src="/yuno-logo.jpg" alt="Yuno" className="w-full h-full object-cover" />
        </div>
        <span className="w-px h-3 bg-[#383c41]" />
        <span className="font-black text-sm tracking-[0.25em] uppercase text-zinc-100">
          YUNO
        </span>
      </div>
    );
  }

  // Default: Authentic bold modern Yuno wordmark
  const textSizes = {
    sm: 'text-xs tracking-[0.2em]',
    md: 'text-sm tracking-[0.25em]',
    lg: 'text-xl tracking-[0.25em]',
    xl: 'text-3xl tracking-[0.3em]',
  }[size];

  return (
    <span
      className={`font-black uppercase text-zinc-100 select-none ${textSizes} ${className}`}
    >
      YUNO
    </span>
  );
};

export const YunoLogo = DiorLogo;
export default DiorLogo;
