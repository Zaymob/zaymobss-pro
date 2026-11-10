import React from 'react';

interface UserAvatarProps {
  username?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineDot?: boolean;
  isOnline?: boolean;
  isTalking?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username = 'User',
  avatar,
  size = 'md',
  className = '',
  showOnlineDot = false,
  isOnline = false,
  isTalking = false,
}) => {
  const initial = (username || 'U').trim().charAt(0).toUpperCase() || 'U';

  // Check if avatar is a valid custom image (not an unsplash person photo preset)
  const isPresetUnsplash = avatar && (avatar.includes('unsplash.com/photo-') || avatar.includes('images.unsplash'));
  const hasCustomImage = avatar && avatar.trim().length > 0 && !isPresetUnsplash;

  const talkingBorder = isTalking ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-zinc-950 border-emerald-500' : 'border-zinc-800';

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0 select-none">
      {hasCustomImage ? (
        <img
          src={avatar}
          alt={username}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-lg object-cover bg-zinc-900 border ${talkingBorder} transition-all ${className}`}
          onError={(e) => {
            // Fallback to initials if custom image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg bg-zinc-900 border ${talkingBorder} flex items-center justify-center font-bold text-zinc-200 tracking-wider shadow-sm transition-all ${className}`}
        >
          <span>{initial}</span>
        </div>
      )}

      {/* Talking Indicator Sound Bars */}
      {isTalking && (
        <span className="absolute -top-1 -right-1 flex items-center space-x-0.5 bg-purple-600 px-1 py-0.5 rounded text-[8px] font-mono text-white font-bold leading-none shadow-sm z-10">
          <span className="w-0.5 h-2 bg-white rounded-full animate-bounce inline-block" />
          <span className="w-0.5 h-3 bg-white rounded-full animate-bounce [animation-delay:0.15s] inline-block" />
          <span className="w-0.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.3s] inline-block" />
        </span>
      )}

      {showOnlineDot && !isTalking && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-zinc-950 ${dotSizes[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
          }`}
        />
      )}
    </div>
  );
};
