import React, { useState, useEffect } from 'react';
import {
  User,
  Image as ImageIcon,
  Check,
  X,
  Upload,
  Sparkles,
  Palette,
  MessageSquare,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
  currentProfile: UserProfile;
}

const ACCENT_COLORS = [
  { name: 'Cyan', value: 'from-cyan-500 to-blue-600', ring: 'ring-cyan-400', badge: 'bg-cyan-500 text-black' },
  { name: 'Purple', value: 'from-purple-500 to-indigo-600', ring: 'ring-purple-400', badge: 'bg-purple-500 text-white' },
  { name: 'Amber', value: 'from-amber-500 to-orange-600', ring: 'ring-amber-400', badge: 'bg-amber-500 text-black' },
  { name: 'Emerald', value: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400', badge: 'bg-emerald-500 text-black' },
  { name: 'Rose', value: 'from-rose-500 to-pink-600', ring: 'ring-rose-400', badge: 'bg-rose-500 text-white' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  currentProfile,
}) => {
  const [username, setUsername] = useState(currentProfile?.username || '');
  const [displayName, setDisplayName] = useState(currentProfile?.displayName || '');
  const [avatar, setAvatar] = useState(currentProfile?.avatar || '');
  const [banner, setBanner] = useState(currentProfile?.banner || '');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [status, setStatus] = useState(currentProfile?.status || 'Online');
  const [badge, setBadge] = useState(currentProfile?.badge || '');
  const [accentColor, setAccentColor] = useState(currentProfile?.accentColor || 'from-cyan-500 to-blue-600');

  useEffect(() => {
    if (isOpen) {
      setUsername(currentProfile?.username || 'Guest');
      setDisplayName(currentProfile?.displayName || currentProfile?.username || 'Guest');
      setAvatar(currentProfile?.avatar || '');
      setBanner(currentProfile?.banner || '');
      setBio(currentProfile?.bio || '');
      setStatus(currentProfile?.status || 'Online');
      setBadge(currentProfile?.badge || '');
      setAccentColor(currentProfile?.accentColor || 'from-cyan-500 to-blue-600');
    }
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBanner(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: UserProfile = {
      username: username.trim() || 'Guest',
      displayName: displayName.trim() || username.trim() || 'Guest',
      avatar: avatar.trim(),
      banner: banner.trim(),
      bio: bio.trim(),
      status: status.trim(),
      badge: badge.trim(),
      accentColor: accentColor,
    };

    onSaveProfile(finalProfile);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Full Profile Customization</h2>
                <p className="text-xs text-zinc-400">Customize banner, avatar, bio, badges & details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Live Profile Banner & Card Preview */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                Live Profile Card Preview
              </label>
              <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
                {/* Banner Image Preview */}
                <div className="relative h-28 w-full bg-zinc-800 overflow-hidden">
                  {banner ? (
                    <img src={banner} alt="Profile Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${accentColor}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                </div>

                {/* Profile Card Body */}
                <div className="px-5 pb-5 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 -mt-10">
                  <div className="flex items-end space-x-3">
                    <div className="relative">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar Preview"
                          className="w-16 h-16 rounded-2xl object-cover ring-4 ring-zinc-950 shadow-2xl bg-zinc-800"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl ring-4 ring-zinc-950 shadow-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-black text-lg text-white">
                          {displayName || username || 'Guest'}
                        </span>
                        {badge && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-zinc-400">@{username || 'guest'}</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-mono text-emerald-400 border border-zinc-700/60">
                    {status || 'Online'}
                  </span>
                </div>

                {bio && (
                  <div className="px-5 pb-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 leading-relaxed font-sans">
                    {bio}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Customization Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  maxLength={25}
                />
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  maxLength={30}
                />
              </div>
            </div>

            {/* Profile Picture Upload & Custom URL */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Profile Picture</span>
                <span className="text-[10px] text-zinc-500">File upload or image URL</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-cyan-500/60 cursor-pointer transition-colors text-xs text-zinc-300">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Picture...</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileUpload} />
                </label>

                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://image-url.jpg..."
                  className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Profile Banner Upload & Custom URL */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Profile Banner</span>
                <span className="text-[10px] text-zinc-500">File upload or banner URL</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-purple-500/60 cursor-pointer transition-colors text-xs text-zinc-300">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Upload Banner...</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerFileUpload} />
                </label>

                <input
                  type="url"
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  placeholder="https://banner-image-url.jpg..."
                  className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Bio Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>About / Bio</span>
                <span className="text-[10px] text-zinc-500">{bio.length}/180</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a custom bio about yourself..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                maxLength={180}
              />
            </div>

            {/* Status Message & Custom Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                  Status Message
                </label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="Online, Coding, Idle..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                  Custom Badge / Role Tag
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. VIP, Creator, Dev, Pro..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Accent Theme Color Gradient */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                Profile Accent Gradient
              </label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setAccentColor(col.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r ${col.value} ${
                      accentColor === col.value ? 'ring-2 ring-white scale-105 shadow-lg' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="pt-4 flex items-center justify-end space-x-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
