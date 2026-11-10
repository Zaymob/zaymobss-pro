import React from 'react';

interface YunoLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const YunoLogo: React.FC<YunoLogoProps> = ({
  className = '',
  variant = 'badge',
}) => {
  if (variant === 'badge') {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-[#0c0714] p-0.5 border border-[#2c1747] flex items-center justify-center flex-shrink-0 transition-colors ${className}`}>
        <img
          src="/yuno-logo.jpg"
          alt="Yuno Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[10px]"
        />
      </div>
    );
  }

  return (
    <img
      src="/yuno-logo.jpg"
      alt="Yuno Logo"
      referrerPolicy="no-referrer"
      className={`object-contain ${className}`}
    />
  );
};

export default YunoLogo;
