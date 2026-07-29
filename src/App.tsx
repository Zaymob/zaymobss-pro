import React, { useState, useEffect, useRef } from 'react';
import { NavTab, MusicTrack, CallState, CallParticipant, PlaybackContext, UserProfile } from './types';
import { WALLPAPERS, MUSIC_TRACKS } from './data/portalData';
import { audioEngine } from './utils/audioSynth';

import { BootScreen } from './components/BootScreen';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { MoviesView } from './components/MoviesView';
import { GamesView } from './components/GamesView';
import { AiView } from './components/AiView';
import { CommunityView } from './components/CommunityView';
import { YoutubeView } from './components/YoutubeView';
import { MusicView } from './components/MusicView';
import { SettingsView } from './components/SettingsView';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { CallOverlay } from './components/CallOverlay';
import { AdminPanelModal } from './components/AdminPanelModal';
import { ProfileModal } from './components/ProfileModal';
import { ProxyTab } from './components/ProxyTab';
import { PrivateChatView } from './components/PrivateChatView';
import { HaloView } from './components/HaloView';

import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [showBootScreen, setShowBootScreen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [collapsedSidebar, setCollapsedSidebar] = useState<boolean>(false);
  const [closedSidebar, setClosedSidebar] = useState<boolean>(false);
  const [currentWallpaper, setCurrentWallpaper] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('yuno_current_wallpaper');
      if (saved) return saved;
    } catch (e) {}
    return WALLPAPERS[0].url;
  });

  const handleSelectWallpaper = (url: string) => {
    setCurrentWallpaper(url);
    try {
      localStorage.setItem('yuno_current_wallpaper', url);
    } catch (e) {}
  };

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('yuno_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username) return parsed;
      }
    } catch (e) {}
    return {
      username: 'Guest',
      displayName: 'Guest',
      avatar: '',
      banner: '',
      bio: '',
      status: 'Online',
      badge: '',
      accentColor: 'from-cyan-500 to-blue-600',
    };
  });

  // Private Chatroom & Watch Party Unlock State (/e douche command) - Session only
  const [isPrivateChatUnlocked, setIsPrivateChatUnlocked] = useState<boolean>(false);

  const handleUnlockPrivateChat = () => {
    setIsPrivateChatUnlocked(true);
    setActiveTab('private_chat');
  };

  // Halo Christian AI Companion Unlock State (/e jesus command)
  const [isHaloUnlocked, setIsHaloUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_halo_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleUnlockHalo = () => {
    setIsHaloUnlocked(true);
    try {
      localStorage.setItem('yuno_halo_unlocked', 'true');
    } catch (e) {}
    setActiveTab('halo');
  };

  // Admin Privilege State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_is_admin') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleGrantAdmin = () => {
    setIsAdmin(true);
    try {
      localStorage.setItem('yuno_is_admin', 'true');
    } catch (e) {}
    setIsAdminPanelOpen(true);
  };

  const handleRevokeAdmin = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem('yuno_is_admin');
    } catch (e) {}
  };

  // Selected item deep links
  const [selectedMovieId, setSelectedMovieId] = useState<string | undefined>(undefined);
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);
  const [proxyTargetUrl, setProxyTargetUrl] = useState<string>('');

  const handleLaunchProxy = (urlOrQuery: string) => {
    setProxyTargetUrl(urlOrQuery);
    setActiveTab('proxy');
  };

  // Modals state
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // WebRTC Call State
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    channelId: 'global-voice',
    channelName: 'Global Voice Lounge',
    callType: 'voice',
    isMuted: false,
    isCameraOn: false,
    isScreenSharing: false,
    durationSeconds: 0,
    participants: [],
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Get current username from local profile
  const getCurrentUsername = () => {
    try {
      const saved = localStorage.getItem('yuno_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username) return parsed.username;
      }
    } catch (e) {}
    return 'Guest';
  };

  const getCurrentAvatar = () => {
    try {
      const saved = localStorage.getItem('yuno_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.avatar) return parsed.avatar;
      }
    } catch (e) {}
    return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
  };

  // Start Call Handler
  const handleStartCall = async (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => {
    const uname = getCurrentUsername();
    const avatar = getCurrentAvatar();

    let audioVideoStream: MediaStream | null = null;
    let scStream: MediaStream | null = null;

    try {
      if (callType === 'video' || callType === 'voice') {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          audioVideoStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: callType === 'video',
          }).catch((err) => {
            console.warn('Microphone/Camera access notice:', err);
            return null;
          });
        }
      }

      if (callType === 'screen') {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          scStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          }).catch((err) => {
            console.warn('Screen share notice:', err);
            return null;
          });
        }
      }
    } catch (e) {
      console.warn('Media devices capture error:', e);
    }

    setLocalStream(audioVideoStream);
    setScreenStream(scStream);

    const initialParticipants: CallParticipant[] = [
      {
        id: 'local-user',
        username: uname,
        avatar,
        isMuted: false,
        isCameraOn: callType === 'video',
        isScreenSharing: callType === 'screen',
      },
      {
        id: 'peer-kairo',
        username: 'Kairo_Dev',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
      }
    ];

    setCallState({
      isActive: true,
      channelId,
      channelName,
      callType,
      isMuted: false,
      isCameraOn: callType === 'video',
      isScreenSharing: callType === 'screen',
      durationSeconds: 0,
      participants: initialParticipants,
    });

    // Notify backend signaling room
    fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId,
        username: uname,
        avatar,
        action: 'join',
        isMuted: false,
        isCameraOn: callType === 'video',
        isScreenSharing: callType === 'screen',
      }),
    }).catch((e) => console.warn('Signaling error:', e));
  };

  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    const uname = getCurrentUsername();
    fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: callState.channelId,
        username: uname,
        action: 'leave',
      }),
    }).catch((e) => console.warn('Signaling error:', e));

    setCallState((prev) => ({ ...prev, isActive: false }));
  };

  const handleToggleMic = () => {
    const newMuted = !callState.isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
    }
    setCallState((prev) => ({
      ...prev,
      isMuted: newMuted,
      participants: prev.participants.map((p) =>
        p.id === 'local-user' ? { ...p, isMuted: newMuted } : p
      ),
    }));
  };

  const handleToggleCamera = async () => {
    const newCameraOn = !callState.isCameraOn;
    if (newCameraOn && !localStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
      } catch (e) {
        console.warn('Could not enable camera stream');
      }
    } else if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newCameraOn;
      });
    }

    setCallState((prev) => ({
      ...prev,
      isCameraOn: newCameraOn,
      participants: prev.participants.map((p) =>
        p.id === 'local-user' ? { ...p, isCameraOn: newCameraOn } : p
      ),
    }));
  };

  const handleToggleScreenShare = async () => {
    const newScreenSharing = !callState.isScreenSharing;
    if (newScreenSharing && !screenStream) {
      try {
        const sc = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(sc);
      } catch (e) {
        console.warn('Screen share cancelled');
        return;
      }
    } else if (screenStream && !newScreenSharing) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    setCallState((prev) => ({
      ...prev,
      isScreenSharing: newScreenSharing,
      participants: prev.participants.map((p) =>
        p.id === 'local-user' ? { ...p, isScreenSharing: newScreenSharing } : p
      ),
    }));
  };

  // Music state & HTML5 Audio element
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playNextRef = useRef<() => void>(() => {});

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  };

  const handlePlayTrack = (track: MusicTrack, context?: PlaybackContext) => {
    if (context) {
      setPlaybackContext(context);
    }

    // Save track to recently played history in localStorage
    try {
      const historyRaw = localStorage.getItem('yuno_recently_played');
      const history: MusicTrack[] = historyRaw ? JSON.parse(historyRaw) : [];
      const filtered = history.filter((t) => t.id !== track.id && t.title !== track.title);
      const updated = [track, ...filtered].slice(0, 20);
      localStorage.setItem('yuno_recently_played', JSON.stringify(updated));
    } catch (e) {}

    if (currentTrack?.id === track.id && isPlayingMusic) {
      if (audioRef.current) audioRef.current.pause();
      audioEngine.stop();
      setIsPlayingMusic(false);
    } else {
      setCurrentTrack(track);
      setIsPlayingMusic(true);

      if (track.audioUrl && audioRef.current) {
        audioEngine.stop();
        audioRef.current.src = track.audioUrl;
        audioRef.current.play().catch((err) => {
          console.warn('Live audio stream failed, falling back to synth:', err);
          audioEngine.start(track.synthType || 'lofi');
        });
      } else {
        if (audioRef.current) audioRef.current.pause();
        audioEngine.start(track.synthType || 'lofi');
      }
    }
  };

  const handlePlayNext = async () => {
    if (!currentTrack) return;

    // 1. If playing from a playlist -> play next song listed in that playlist
    if (playbackContext?.type === 'playlist' && playbackContext.playlistTracks && playbackContext.playlistTracks.length > 0) {
      const list = playbackContext.playlistTracks;
      const currentIndex = list.findIndex(t => t.id === currentTrack.id || t.title === currentTrack.title);
      const nextIndex = (currentIndex + 1) % list.length;
      const nextTrack = list[nextIndex];
      handlePlayTrack(nextTrack, playbackContext);
      return;
    }

    // 2. If general play -> play a random song based off the song/artist
    try {
      const artist = currentTrack.artist || 'Top Hits';
      const res = await fetch(`/api/music/search?query=${encodeURIComponent(artist)}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks) && data.tracks.length > 0) {
          const candidates = data.tracks.filter((t: MusicTrack) => t.title !== currentTrack.title);
          const pool = candidates.length > 0 ? candidates : data.tracks;
          const randomTrack = pool[Math.floor(Math.random() * pool.length)];
          handlePlayTrack(randomTrack, { type: 'general' });
          return;
        }
      }
    } catch (e) {
      console.warn('Auto play-next fetch failed, choosing fallback:', e);
    }

    // Fallback: Pick a random track from local MUSIC_TRACKS
    const pool = MUSIC_TRACKS.filter(t => t.title !== currentTrack.title);
    const fallbackTrack = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : MUSIC_TRACKS[0];
    handlePlayTrack(fallbackTrack, { type: 'general' });
  };

  const handlePlayPrev = () => {
    if (!currentTrack) return;
    if (playbackContext?.type === 'playlist' && playbackContext.playlistTracks && playbackContext.playlistTracks.length > 0) {
      const list = playbackContext.playlistTracks;
      const currentIndex = list.findIndex(t => t.id === currentTrack.id || t.title === currentTrack.title);
      const prevIndex = (currentIndex - 1 + list.length) % list.length;
      const prevTrack = list[prevIndex];
      handlePlayTrack(prevTrack, playbackContext);
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setAudioCurrentTime(0);
      }
    }
  };

  useEffect(() => {
    playNextRef.current = handlePlayNext;
  });

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime || 0);
    };

    const onLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlayingMusic(false);
      setAudioCurrentTime(0);
      if (playNextRef.current) {
        playNextRef.current();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
    };
  }, []);

  const handleTogglePlay = () => {
    if (!currentTrack) {
      handlePlayTrack(MUSIC_TRACKS[0]);
      return;
    }

    if (isPlayingMusic) {
      if (audioRef.current) audioRef.current.pause();
      audioEngine.stop();
      setIsPlayingMusic(false);
    } else {
      setIsPlayingMusic(true);
      if (currentTrack.audioUrl && audioRef.current) {
        audioRef.current.play().catch(() => audioEngine.start(currentTrack.synthType || 'lofi'));
      } else {
        audioEngine.start(currentTrack.synthType || 'lofi');
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    audioEngine.setVolume(vol);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-x-hidden select-none">
      {/* Yunø Boot Screen Sequence */}
      {showBootScreen && (
        <BootScreen onComplete={() => setShowBootScreen(false)} />
      )}

      {/* Dynamic Background Wallpaper */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {currentWallpaper.startsWith('data:video') || currentWallpaper.includes('.mp4') || currentWallpaper.includes('.mov') ? (
          <video
            src={currentWallpaper}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-35 filter blur-[1px] transition-all duration-700 scale-105"
          />
        ) : (
          <img
            src={currentWallpaper}
            alt="Workspace Wallpaper"
            className="w-full h-full object-cover opacity-30 filter blur-[2px] transition-all duration-700 scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/90 to-zinc-950" />
      </div>

      {/* Main Workspace Layout with Left Sidebar */}
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          collapsed={collapsedSidebar}
          setCollapsed={setCollapsedSidebar}
          closed={closedSidebar}
          setClosed={setClosedSidebar}
          onReplayBoot={() => setShowBootScreen(true)}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          currentUser={userProfile.username}
          currentAvatar={userProfile.avatar}
          isPrivateChatUnlocked={isPrivateChatUnlocked}
          isHaloUnlocked={isHaloUnlocked}
        />

        {/* Content Area offset by Sidebar width */}
        <main
          className={`flex-1 transition-all duration-300 p-4 sm:p-8 ${
            closedSidebar ? 'ml-0' : collapsedSidebar ? 'ml-20' : 'ml-64'
          } ${currentTrack ? 'pb-24' : 'pb-12'}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {activeTab === 'home' && (
                <HomeView
                  currentWallpaper={currentWallpaper}
                  onNavigate={setActiveTab}
                  onLaunchProxy={handleLaunchProxy}
                  onSelectMovie={(id) => {
                    setSelectedMovieId(id);
                    setActiveTab('movies');
                  }}
                  onSelectGame={(id) => {
                    setSelectedGameId(id);
                    setActiveTab('games');
                  }}
                  onPlayTrack={handlePlayTrack}
                  currentTrack={currentTrack}
                  isPlaying={isPlayingMusic}
                />
              )}

              {activeTab === 'proxy' && (
                <ProxyTab
                  initialUrl={proxyTargetUrl}
                  onNavigateHome={() => setActiveTab('home')}
                />
              )}

              {activeTab === 'movies' && (
                <MoviesView selectedMovieId={selectedMovieId} />
              )}

              {activeTab === 'games' && (
                <GamesView selectedGameId={selectedGameId} />
              )}

              {activeTab === 'youtube' && <YoutubeView />}

              {activeTab === 'ai' && (
                <AiView
                  onGrantAdmin={handleGrantAdmin}
                  onUnlockPrivateChat={handleUnlockPrivateChat}
                  onUnlockHalo={handleUnlockHalo}
                />
              )}

              {activeTab === 'halo' && (
                <HaloView
                  userDisplayName={userProfile.displayName || userProfile.username}
                  onNavigateHome={() => setActiveTab('home')}
                />
              )}

              {activeTab === 'private_chat' && (
                <PrivateChatView
                  userProfile={userProfile}
                  onStartCall={handleStartCall}
                  callState={callState}
                  screenStream={screenStream}
                  onToggleScreenShare={handleToggleScreenShare}
                />
              )}

              {activeTab === 'community' && (
                <CommunityView
                  callState={callState}
                  onStartCall={handleStartCall}
                  onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
                  onUnlockHalo={handleUnlockHalo}
                />
              )}

              {activeTab === 'music' && (
                <MusicView
                  currentTrack={currentTrack}
                  isPlaying={isPlayingMusic}
                  onPlayTrack={handlePlayTrack}
                  onTogglePlay={handleTogglePlay}
                  currentTime={audioCurrentTime}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  currentWallpaper={currentWallpaper}
                  onSelectWallpaper={handleSelectWallpaper}
                  onReplayBoot={() => setShowBootScreen(true)}
                  onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
                  isAdmin={isAdmin}
                  onRevokeAdmin={handleRevokeAdmin}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Persistent Bottom Music Player */}
      <MusicPlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlayingMusic}
        onTogglePlay={handleTogglePlay}
        onVolumeChange={handleVolumeChange}
        currentTime={audioCurrentTime}
        duration={audioDuration}
        onSeek={handleSeek}
        onNext={handlePlayNext}
        onPrev={handlePlayPrev}
      />

      {/* Persistent Global WebRTC Call Overlay (Stays connected across tabs!) */}
      <CallOverlay
        callState={callState}
        onLeaveCall={handleLeaveCall}
        onToggleMic={handleToggleMic}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        localStream={localStream}
        screenStream={screenStream}
      />

      {/* Developer Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        isAdmin={isAdmin}
        onRevokeAdmin={handleRevokeAdmin}
      />

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentProfile={userProfile}
        onSaveProfile={(updated) => {
          setUserProfile(updated);
          localStorage.setItem('yuno_user_profile', JSON.stringify(updated));
        }}
      />
    </div>
  );
}
