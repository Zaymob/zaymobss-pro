import React from 'react';
import yunoLogoImg from '../assets/images/yuno_orbit_logo_1785802876898.jpg';

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
      <div className={`relative overflow-hidden rounded-xl bg-zinc-900 p-0.5 border border-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:border-zinc-500 transition-colors ${className}`}>
        <img
          src={yunoLogoImg}
          alt="YUNØ Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[10px]"
        />
      </div>
    );
  }

  return (
    <img
      src={yunoLogoImg}
      alt="YUNØ Logo"
      referrerPolicy="no-referrer"
      className={`object-contain ${className}`}
    />
  );
};

export default YunoLogo;
