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
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg border border-amber-300/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${className}`}>
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
