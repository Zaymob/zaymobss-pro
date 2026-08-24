import React from 'react';

interface UserAvatarProps {
  username?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineDot?: boolean;
  isOnline?: boolean;
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
}) => {
  const initial = (username || 'U').trim().charAt(0).toUpperCase() || 'U';

  // Check if avatar is a valid custom image (not an unsplash person photo preset)
  const isPresetUnsplash = avatar && (avatar.includes('unsplash.com/photo-') || avatar.includes('images.unsplash'));
  const hasCustomImage = avatar && avatar.trim().length > 0 && !isPresetUnsplash;

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0 select-none">
      {hasCustomImage ? (
        <img
          src={avatar}
          alt={username}
          referrerPolicy="no-referrer"
          className={`${sizeClasses[size]} rounded-lg object-cover bg-zinc-900 border border-zinc-800 ${className}`}
          onError={(e) => {
            // Fallback to initials if custom image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-200 tracking-wider shadow-sm ${className}`}
        >
          <span>{initial}</span>
        </div>
      )}

      {showOnlineDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-zinc-950 ${dotSizes[size]} ${
            isOnline ? 'bg-emerald-500' : 'bg-zinc-600'
          }`}
        />
      )}
    </div>
  );
};
