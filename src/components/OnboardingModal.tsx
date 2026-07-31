import React, { useState } from 'react';
import {
  Sparkles,
  Gamepad2,
  Music,
  Tv,
  Globe,
  MessageSquare,
  User,
  ArrowRight,
  Check,
  X,
  Upload,
  Palette,
  Compass,
  Radio,
  Flame,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
  currentProfile: UserProfile;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
];

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80',
];

const ACCENT_COLORS = [
  { name: 'Cyan Neon', value: 'from-cyan-500 to-blue-600' },
  { name: 'Purple Synth', value: 'from-purple-500 to-indigo-600' },
  { name: 'Amber Glow', value: 'from-amber-500 to-orange-600' },
  { name: 'Emerald Cyber', value: 'from-emerald-500 to-teal-600' },
  { name: 'Rose Sunset', value: 'from-rose-500 to-pink-600' },
];

const TOUR_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Yunø Portal',
    subtitle: 'Your ultimate unblocked arcade, streaming studio, and web hub.',
    icon: Sparkles,
    color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    description:
      'Yunø is engineered with ultra-high speed proxy engines, zero-restriction game vaults, live music streaming, and WebRTC voice lounges.',
    highlights: [
      '🎮 500+ Unblocked Retro & HTML5 Arcade Games',
      '🎵 Music Vault featuring Kanye West, Malcolm Todd & Personalized Feeds',
      '🌐 Yuno High-Speed Scramjet Web Proxy Engine',
      '💬 Real-Time WebRTC Voice Channels & Halo AI Companion',
    ],
  },
  {
    id: 'games_proxy',
    title: 'Arcade & Scramjet Web Proxy',
    subtitle: 'Play thousands of games or bypass restrictions instantly.',
    icon: Gamepad2,
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    description:
      'Explore Noah and Hydra network unblocked games, save favorites, launch full-screen, or enter any web URL into the Yuno Proxy to surf freely.',
    highlights: [
      '🕹️ Save favorite games & track play history',
      '🚀 Built-in Web Navigation Proxy with zero tracking',
      '🖥️ Full-screen immersive gameplay mode',
    ],
  },
  {
    id: 'music_movies',
    title: 'Music Vault & Cinema Studio',
    subtitle: 'Stream songs, build playlists & watch blockbusters or anime.',
    icon: Music,
    color: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
    description:
      'Listen to high quality audio streams, synced lyrics, and personalized recommendation feeds that adapt to your taste as you listen.',
    highlights: [
      '🎧 Smart "Based on What You Listen To" recommendations',
      '📜 Live synchronized lyrics display for currently playing track',
      '🍿 Stream TMDB Movies & AniList Trending Anime',
    ],
  },
  {
    id: 'community',
    title: 'Community & Voice Lounge',
    subtitle: 'Hang out with friends in WebRTC voice and video rooms.',
    icon: MessageSquare,
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    description:
      'Join global voice channels, share screens, chat in real-time, or talk with Halo — your personal Christian AI companion.',
    highlights: [
      '🎙️ Low-latency WebRTC Voice & Video calls',
      '🖥️ Screen sharing for watch parties',
      '✨ Chat with Halo AI for guidance & conversation',
    ],
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  currentProfile,
}) => {
  const [step, setStep] = useState<'tour' | 'profile'>('tour');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Profile Form States
  const [username, setUsername] = useState(currentProfile?.username || 'Gamer');
  const [displayName, setDisplayName] = useState(currentProfile?.displayName || 'Yunø Explorer');
  const [avatar, setAvatar] = useState(currentProfile?.avatar || PRESET_AVATARS[0]);
  const [banner, setBanner] = useState(currentProfile?.banner || PRESET_BANNERS[0]);
  const [bio, setBio] = useState(currentProfile?.bio || 'Lover of music, gaming, and unblocked web exploration 🎧⚡');
  const [status, setStatus] = useState(currentProfile?.status || 'Online');
  const [badge, setBadge] = useState(currentProfile?.badge || 'Explorer');
  const [accentColor, setAccentColor] = useState(currentProfile?.accentColor || 'from-cyan-500 to-blue-600');

  if (!isOpen) return null;

  const handleNextSlide = () => {
    if (currentSlideIndex < TOUR_SLIDES.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      setStep('profile');
    }
  };

  const handleSkipTour = () => {
    setStep('profile');
  };

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

  const handleCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: UserProfile = {
      username: username.trim() || 'Explorer',
      displayName: displayName.trim() || username.trim() || 'Yunø Explorer',
      avatar: avatar.trim(),
      banner: banner.trim(),
      bio: bio.trim(),
      status: status.trim() || 'Online',
      badge: badge.trim() || 'Explorer',
      accentColor,
    };

    onSaveProfile(finalProfile);
    try {
      localStorage.setItem('yuno_onboarding_completed', 'true');
    } catch (err) {}
    onClose();
  };

  const activeSlide = TOUR_SLIDES[currentSlideIndex];
  const IconComponent = activeSlide.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl text-white overflow-hidden my-6"
        >
          {/* Top Progress Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/60">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {step === 'tour' ? <Compass className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {step === 'tour' ? 'Welcome & Guided Tour' : 'Create Your User Identity'}
                </h2>
                <p className="text-xs text-zinc-400">
                  {step === 'tour'
                    ? `Step ${currentSlideIndex + 1} of ${TOUR_SLIDES.length}: Platform Overview`
                    : 'Personalize your display name, avatar, banner & bio'}
                </p>
              </div>
            </div>

            {step === 'tour' && (
              <button
                onClick={handleSkipTour}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono font-bold transition-colors border border-zinc-800"
              >
                Skip Tour →
              </button>
            )}
          </div>

          {/* STEP 1: GUIDED TOUR CAROUSEL */}
          {step === 'tour' && (
            <div className="p-6 space-y-6">
              {/* Active Slide Card */}
              <div className="space-y-5">
                <div className="flex items-start space-x-4">
                  <div className={`p-3.5 rounded-2xl border ${activeSlide.color} flex-shrink-0 shadow-lg`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-white">{activeSlide.title}</h3>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">{activeSlide.subtitle}</p>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">{activeSlide.description}</p>
                  </div>
                </div>

                {/* Highlights list */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                    Key Features Included:
                  </span>
                  {activeSlide.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2.5 text-xs text-zinc-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Indicators & Next Button */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                {/* Dots */}
                <div className="flex items-center space-x-1.5">
                  {TOUR_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentSlideIndex ? 'w-6 bg-cyan-400' : 'w-2 bg-zinc-700 hover:bg-zinc-500'
                      }`}
                    />
                  ))}
                </div>

                {/* Next / Proceed Button */}
                <button
                  onClick={handleNextSlide}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2"
                >
                  <span>{currentSlideIndex < TOUR_SLIDES.length - 1 ? 'Next Step' : 'Setup Profile'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE CUSTOMIZATION SCREEN */}
          {step === 'profile' && (
            <form onSubmit={handleCompleteProfile} className="p-6 space-y-6">
              {/* Profile Card Live Preview */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  Live Identity Preview
                </label>
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
                  {/* Banner */}
                  <div className="relative h-28 w-full bg-zinc-800 overflow-hidden">
                    {banner ? (
                      <img src={banner} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${accentColor}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                  </div>

                  {/* Body */}
                  <div className="px-5 pb-5 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 -mt-10">
                    <div className="flex items-end space-x-3">
                      <div className="relative">
                        <img
                          src={avatar}
                          alt="Avatar Preview"
                          className="w-16 h-16 rounded-2xl object-cover ring-4 ring-zinc-950 shadow-2xl bg-zinc-800"
                        />
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-black text-lg text-white">{displayName || username || 'Gamer'}</span>
                          {badge && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-zinc-400">@{username || 'gamer'}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-mono text-emerald-400 border border-zinc-700/60">
                      {status}
                    </span>
                  </div>

                  {bio && (
                    <div className="px-5 pb-4 border-t border-zinc-800/80 pt-3 text-xs text-zinc-300 leading-relaxed font-sans">
                      {bio}
                    </div>
                  )}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                    Username (@handle)
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                    maxLength={25}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter display name..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Profile Picture Upload & Custom Image URL */}
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

              {/* Profile Banner Upload & Custom Banner URL */}
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

              {/* Bio & Badge */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>About / Bio</span>
                  <span className="text-[10px] text-zinc-500">{bio.length}/180</span>
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  maxLength={180}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep('tour')}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-400 transition-colors"
                >
                  ← Back to Tour
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold text-xs shadow-xl shadow-cyan-500/20 transition-all flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Save Profile & Launch Yunø</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
