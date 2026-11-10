import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavTab, MusicTrack, PlaybackContext, UserProfile, YouTubeVideo, BanAppealItem } from './types';
import { WALLPAPERS, MUSIC_TRACKS } from './data/portalData';
import { audioEngine } from './utils/audioSynth';

import { BootScreen } from './components/BootScreen';
import { HomeView } from './components/HomeView';
import { MoviesView } from './components/MoviesView';
import { GamesView } from './components/GamesView';
import { YoutubeView } from './components/YoutubeView';
import { MusicView } from './components/MusicView';
import { SettingsView } from './components/SettingsView';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { ViviView } from './components/ViviView';
import { LinkFinderView } from './components/LinkFinderView';
import { PipVideoOverlay } from './components/PipVideoOverlay';
import { TopNavbar } from './components/TopNavbar';

import { motion, AnimatePresence } from 'motion/react';
import { BanAppealModal } from './components/BanAppealModal';
import { TabMaskModal } from './components/TabMaskModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AnnouncementPopupModal, AnnouncementData } from './components/AnnouncementPopupModal';
import { ReportModal } from './components/ReportModal';
import { HistoryModal, addHistoryItem, HistoryItem } from './components/HistoryModal';
import { PartnersModal } from './components/PartnersModal';
import { addMusicHistory } from './utils/historyManager';
import { BannedScreen } from './components/BannedScreen';
import { getSavedCloakSettings, saveCloakSettings } from './utils/tabCloak';
import { ConstellationCanvas } from './components/ConstellationCanvas';
import {
  WallpaperCanvasEffects,
  WallpaperEffectSettings,
  getSavedEffectSettings,
  saveEffectSettings,
} from './components/WallpaperCanvasEffects';

export default function App() {
  const [showBootScreen, setShowBootScreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const handleNavigateTab = (tab: NavTab) => {
    if ((tab as any) === 'partners') {
      setIsPartnersModalOpen(true);
      return;
    }
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const [currentWallpaper, setCurrentWallpaper] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('yuno_current_wallpaper');
      if (saved) {
        return saved;
      }
    } catch (e) {}
    return '#07040a';
  });

  const [effectSettings, setEffectSettings] = useState<WallpaperEffectSettings>(getSavedEffectSettings);

  const handleSelectWallpaper = (url: string) => {
    setCurrentWallpaper(url);
    try {
      localStorage.setItem('yuno_current_wallpaper', url);
    } catch (e) {}
  };

  const handleChangeEffectSettings = (settings: WallpaperEffectSettings) => {
    setEffectSettings(settings);
    saveEffectSettings(settings);
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
      accentColor: '#18181b',
    };
  });

  // Yunø Lite Mode (Minimalist Performance Engine: takes away icons, bg pictures, bg fx, game titles/desc)
  const [isYunoLiteActive, setIsYunoLiteActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_lite_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleYunoLite = (enabled: boolean) => {
    setIsYunoLiteActive(enabled);
    try {
      if (enabled) {
        localStorage.setItem('yuno_lite_mode', 'true');
        document.documentElement.classList.add('yuno-lite-active');
      } else {
        localStorage.removeItem('yuno_lite_mode');
        document.documentElement.classList.remove('yuno-lite-active');
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isYunoLiteActive) {
      document.documentElement.classList.add('yuno-lite-active');
    } else {
      document.documentElement.classList.remove('yuno-lite-active');
    }
  }, [isYunoLiteActive]);

  // Selected item deep links
  const [selectedMovieId, setSelectedMovieId] = useState<string | undefined>(undefined);
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(undefined);
  const [proxyTargetUrl, setProxyTargetUrl] = useState<string>('');

  const handleLaunchProxy = (urlOrQuery: string) => {
    setProxyTargetUrl(urlOrQuery);
    handleNavigateTab('proxy');
  };

  // Modals state
  const [isBanAppealOpen, setIsBanAppealOpen] = useState<boolean>(false);
  const [isTabMaskModalOpen, setIsTabMaskModalOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isPartnersModalOpen, setIsPartnersModalOpen] = useState<boolean>(false);
  const [reportModalState, setReportModalState] = useState<{
    isOpen: boolean;
    type: 'user' | 'message' | 'bug';
    targetUser?: string;
    messageContent?: string;
    messageId?: string;
  }>({
    isOpen: false,
    type: 'bug',
  });

  // Announcements Pop-up on Startup State
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementData | null>(null);
  const [isAnnouncementPopupOpen, setIsAnnouncementPopupOpen] = useState<boolean>(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuno_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  const [banDetails, setBanDetails] = useState<{ reason?: string; banImage?: string } | null>(null);

  // Announcements popup disabled per user request
  useEffect(() => {
    setIsAnnouncementPopupOpen(false);
    setActiveAnnouncement(null);
  }, []);

  // Handle Dismiss Announcement
  const handleDismissAnnouncement = () => {
    if (activeAnnouncement) {
      const seenKey = `yuno_seen_ann_${activeAnnouncement.id}`;
      try {
        sessionStorage.setItem(seenKey, 'true');
        localStorage.setItem(seenKey, 'true');
      } catch (e) {}
    }
    setIsAnnouncementPopupOpen(false);
  };

  // Calculator Equation Secret Unlock Event Listener
  useEffect(() => {
    const handleAdminUnlockedEvent = () => {
      setIsAdminAuthenticated(true);
      setIsAdminDashboardOpen(true);
      setUserProfile((prev) => {
        const updated = { ...prev, badge: 'ADMIN' };
        try {
          localStorage.setItem('yuno_user_profile', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    window.addEventListener('yuno_admin_unlocked', handleAdminUnlockedEvent);
    return () => window.removeEventListener('yuno_admin_unlocked', handleAdminUnlockedEvent);
  }, []);

  // Tab Cloaking Startup Application & Global Panic Hotkey Listener
  useEffect(() => {
    try {
      const savedCloak = getSavedCloakSettings();
      saveCloakSettings(savedCloak);
    } catch (e) {}

    const handleGlobalPanicKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Keyboard Shortcut: Alt + C to toggle Tab Masking & Cloaker Modal
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsTabMaskModalOpen((prev) => !prev);
        return;
      }

      // Keyboard Shortcut: Ctrl + Shift + A or Alt + A for Admin Portal (Only opens if already admin)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) ||
        (e.altKey && (e.key === 'a' || e.key === 'A'))
      ) {
        if (localStorage.getItem('yuno_is_admin') === 'true') {
          e.preventDefault();
          setIsAdminDashboardOpen((prev) => !prev);
          return;
        }
      }

      // Panic Key Trigger (Emergency Decoy Redirection)
      try {
        const cloak = getSavedCloakSettings();
        if (cloak.panicKey && e.key === cloak.panicKey) {
          // If the key is a special character (like `]` or `Escape`) or user is not in an active input field, trigger panic redirect
          if (
            !isInput ||
            cloak.panicKey === ']' ||
            cloak.panicKey === 'Escape' ||
            cloak.panicKey.startsWith('F')
          ) {
            e.preventDefault();
            const destination = cloak.panicUrl || 'https://classroom.google.com';
            window.location.replace(destination);
          }
        }
      } catch (e) {}
    };

    window.addEventListener('keydown', handleGlobalPanicKey);
    return () => window.removeEventListener('keydown', handleGlobalPanicKey);
  }, []);

  // Admin / Death Note / Appeals state
  const [bannedUsersList, setBannedUsersList] = useState<string[]>([]);
  const [timedOutUsersList, setTimedOutUsersList] = useState<Array<{ name: string; until: string }>>([]);
  const [appealsList, setAppealsList] = useState<BanAppealItem[]>([]);

  const fetchAdminStatusData = async () => {
    try {
      const res = await fetch('/api/admin/status');
      const data = await res.json();
      if (data.bannedUsers) setBannedUsersList(data.bannedUsers);
      if (data.bannedUsersDetails && userProfile.username) {
        const detail =
          data.bannedUsersDetails[userProfile.username] ||
          data.bannedUsersDetails[userProfile.username.toLowerCase()];
        if (detail) setBanDetails(detail);
      }
      if (data.timeouts) {
        const list = Object.entries(data.timeouts).map(([name, expiry]: [string, any]) => {
          const remainingMs = Math.max(0, expiry - Date.now());
          const mins = Math.ceil(remainingMs / 60000);
          return { name, until: `${mins}m remaining` };
        });
        setTimedOutUsersList(list);
      }
      if (data.appeals) setAppealsList(data.appeals);
    } catch (e) {}
  };

  useEffect(() => {
    fetchAdminStatusData();
    const interval = setInterval(fetchAdminStatusData, 4000);

    // Auto-validate stored session token if available
    try {
      const savedToken = localStorage.getItem('yuno_admin_token');
      if (savedToken) {
        fetch('/api/admin/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: savedToken, username: userProfile.username }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.isAdmin) {
              setIsAdminAuthenticated(true);
            }
          })
          .catch(() => {});
      }
    } catch {}

    return () => clearInterval(interval);
  }, []);

  const handleAdminLogout = () => {
    try {
      localStorage.removeItem('yuno_is_admin');
      localStorage.removeItem('yuno_admin_token');
    } catch {}
    setIsAdminAuthenticated(false);
    setIsAdminDashboardOpen(false);
    setUserProfile((prev) => ({
      ...prev,
      badge: prev.badge?.includes('Admin') ? 'Member' : prev.badge,
    }));
  };

  const normalizedCurrentUsername = (userProfile.username || '').trim().toLowerCase();
  const isCurrentUserBanned = Boolean(
    normalizedCurrentUsername &&
    (
      bannedUsersList.some(u => u.trim().toLowerCase() === normalizedCurrentUsername) ||
      timedOutUsersList.some(t => t.name.trim().toLowerCase() === normalizedCurrentUsername)
    )
  );

  // PiP YouTube Video State
  const [pipVideo, setPipVideo] = useState<YouTubeVideo | null>(null);
  const [pipInitialVideo, setPipInitialVideo] = useState<YouTubeVideo | null>(null);

  // Music state & HTML5 Audio element
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);
  const [playQueue, setPlayQueue] = useState<MusicTrack[]>([]);
  const [selectedArtistForMusic, setSelectedArtistForMusic] = useState<{ id: string; name: string; picture?: string } | null>(null);

  const handleAddToQueue = (track: MusicTrack, playNext: boolean = false) => {
    setPlayQueue((prev) => {
      if (playNext) {
        return [track, ...prev];
      }
      return [...prev, track];
    });
  };

  const handleRemoveFromQueue = (index: number) => {
    setPlayQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearQueue = () => {
    setPlayQueue([]);
  };

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

    // Save track to independent music history & global modal
    addMusicHistory({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.coverUrl || (track as any).cover || '',
      streamUrl: track.streamUrl,
      duration: track.duration,
      data: track,
    });

    addHistoryItem({
      type: 'music',
      title: track.title,
      subtitle: track.artist,
      thumbnail: track.coverUrl,
      data: track,
    });

    try {
      const historyRaw = localStorage.getItem('yuno_recently_played');
      const history: MusicTrack[] = historyRaw ? JSON.parse(historyRaw) : [];
      const filtered = history.filter((t) => t.id !== track.id && t.title !== track.title);
      const updated = [track, ...filtered].slice(0, 20);
      localStorage.setItem('yuno_recently_played', JSON.stringify(updated));
    } catch (e) {}

    // Broadcast Now Playing live activity to backend
    if (userProfile.showNowPlaying !== false) {
      fetch('/api/profile/now-playing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userProfile.username,
          trackTitle: track.title,
          artist: track.artist,
          coverUrl: track.coverUrl,
          isPlaying: true,
        }),
      }).catch(() => {});
    }

    if (currentTrack?.id === track.id && isPlayingMusic) {
      if (audioRef.current) audioRef.current.pause();
      audioEngine.stop();
      setIsPlayingMusic(false);
    } else {
      setCurrentTrack(track);
      audioEngine.stop();

      if (track.audioUrl && audioRef.current) {
        setIsPlayingMusic(true);
        audioRef.current.src = track.audioUrl;
        audioRef.current.play().catch((err) => {
          console.warn('Live audio stream failed:', err);
          setIsPlayingMusic(false);
        });
      } else {
        if (audioRef.current) audioRef.current.pause();
        setIsPlayingMusic(false);
      }
    }
  };

  const handlePlayNext = async () => {
    if (!currentTrack) return;

    // 0. Dequeue and play next item if playQueue is not empty
    if (playQueue.length > 0) {
      const nextTrack = playQueue[0];
      setPlayQueue((prev) => prev.slice(1));
      handlePlayTrack(nextTrack, playbackContext || undefined);
      return;
    }

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
    if (fallbackTrack) {
      handlePlayTrack(fallbackTrack, { type: 'general' });
    }
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
      if (MUSIC_TRACKS.length > 0) {
        handlePlayTrack(MUSIC_TRACKS[0]);
      }
      return;
    }

    if (isPlayingMusic) {
      if (audioRef.current) audioRef.current.pause();
      audioEngine.stop();
      setIsPlayingMusic(false);
    } else {
      audioEngine.stop();
      if (currentTrack.audioUrl && audioRef.current) {
        setIsPlayingMusic(true);
        audioRef.current.play().catch((err) => {
          console.warn('Play failed:', err);
          setIsPlayingMusic(false);
        });
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    audioEngine.setVolume(vol);
  };

  if (isCurrentUserBanned) {
    return (
      <BannedScreen
        bannedReason={banDetails?.reason}
        banImage={banDetails?.banImage}
        onOpenAppeal={() => setIsBanAppealOpen(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-x-hidden select-none">
      {/* Boot Screen Sequence */}
      {showBootScreen && (
        <BootScreen onComplete={() => setShowBootScreen(false)} />
      )}

      {/* Dynamic Background Wallpaper & Screen Effects across EVERY Tab (except vivi & music) */}
      {!isYunoLiteActive && activeTab !== 'vivi' && activeTab !== 'proxy' && activeTab !== 'music' ? (
        <>
          {currentWallpaper === 'constellation' || currentWallpaper.startsWith('#') || currentWallpaper.startsWith('rgb') ? (
            <div
              className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
              style={{ backgroundColor: currentWallpaper === 'constellation' ? '#07040a' : currentWallpaper }}
            />
          ) : (
            <div
              className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
              style={{
                filter: `blur(${effectSettings.blur}px) brightness(${effectSettings.brightness}%)`,
                transform: effectSettings.blur > 0 ? 'scale(1.08)' : 'scale(1.02)',
                transition: 'filter 0.3s ease, transform 0.3s ease',
              }}
            >
              {currentWallpaper.startsWith('data:video') || currentWallpaper.includes('.mp4') || currentWallpaper.includes('.mov') || currentWallpaper.includes('.webm') ? (
                <video
                  src={currentWallpaper}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <img
                  src={currentWallpaper}
                  alt="Workspace Wallpaper"
                  className="w-full h-full object-cover opacity-90"
                />
              )}
              {/* Subtle Dark Backdrop Tint for Readability */}
              <div className="absolute inset-0 bg-black/35" />
            </div>
          )}

          {/* Screen Effects Layer (Rain, Snow, Stars, Fireflies, Fog, Vignette) */}
          <WallpaperCanvasEffects settings={effectSettings} />
        </>
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0 bg-[#07040a]" />
      )}

      {/* Main Workspace Layout with Top Navbar */}
      <div className="relative z-10 flex flex-col min-h-screen bg-transparent text-white">
        {/* Top Navbar */}
        <TopNavbar
          activeTab={activeTab}
          onNavigate={(tab) => {
            if (tab === ('partners' as any)) {
              setIsPartnersModalOpen(true);
            } else {
              handleNavigateTab(tab);
            }
          }}
          onOpenTabMask={() => setIsTabMaskModalOpen(true)}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          isAdmin={isAdminAuthenticated}
          onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        />

        {/* Content Area (offset by top bar) */}
        {(() => {
          const isFullBleedTab = activeTab === 'vivi' || activeTab === 'proxy';
          return (
            <main
              className={`flex-1 w-full transition-all duration-300 ${
                isFullBleedTab
                  ? `pt-14 p-0 m-0 max-w-none ${currentTrack ? 'pb-24' : 'pb-0'}`
                  : `pt-18 sm:pt-20 px-3 sm:px-5 lg:px-6 max-w-7xl mx-auto ${currentTrack ? 'pb-28' : 'pb-16'}`
              }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={isFullBleedTab ? 'w-full h-full' : ''}
                >
                  {activeTab === 'home' && (
                    <HomeView
                      currentWallpaper={currentWallpaper}
                      onNavigate={handleNavigateTab}
                      onLaunchProxy={handleLaunchProxy}
                      onSelectMovie={(id) => {
                        setSelectedMovieId(id);
                        handleNavigateTab('movies');
                      }}
                      onSelectGame={(id) => {
                        setSelectedGameId(id);
                        handleNavigateTab('games');
                      }}
                      onPlayTrack={handlePlayTrack}
                      currentTrack={currentTrack}
                      isPlaying={isPlayingMusic}
                    />
                  )}

                  {(activeTab === 'vivi' || activeTab === 'proxy') && (
                    <ViviView />
                  )}

                  {activeTab === 'links' && (
                    <LinkFinderView
                      onLaunchProxy={(url) => handleLaunchProxy(url)}
                    />
                  )}

                  {activeTab === 'movies' && (
                    <MoviesView selectedMovieId={selectedMovieId} />
                  )}

                  {activeTab === 'games' && (
                    <GamesView selectedGameId={selectedGameId} />
                  )}

                  {activeTab === 'youtube' && (
                    <YoutubeView
                      onSetPipVideo={(video) => setPipVideo(video)}
                      activePipVideoId={pipVideo?.videoId}
                      initialSelectedVideo={pipInitialVideo}
                    />
                  )}

                  {activeTab === 'music' && (
                    <MusicView
                      currentTrack={currentTrack}
                      isPlaying={isPlayingMusic}
                      onPlayTrack={handlePlayTrack}
                      onTogglePlay={handleTogglePlay}
                      currentTime={audioCurrentTime}
                      onSeek={handleSeek}
                      playQueue={playQueue}
                      onAddToQueue={handleAddToQueue}
                      onRemoveFromQueue={handleRemoveFromQueue}
                      onClearQueue={handleClearQueue}
                      onNavigateHome={() => handleNavigateTab('home')}
                      initialArtist={selectedArtistForMusic}
                    />
                  )}


                  {activeTab === 'settings' && (
                    <SettingsView
                      currentWallpaper={currentWallpaper}
                      onSelectWallpaper={handleSelectWallpaper}
                      effectSettings={effectSettings}
                      onChangeEffectSettings={handleChangeEffectSettings}
                      onReplayBoot={() => setShowBootScreen(true)}
                      onOpenAppealModal={() => setIsBanAppealOpen(true)}
                      isYunoLiteEnabled={isYunoLiteActive}
                      onToggleYunoLite={handleToggleYunoLite}
                      isAdmin={isAdminAuthenticated}
                      onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
                      onAdminLogout={handleAdminLogout}
                      userProfile={userProfile}
                      onUpdateProfile={(p) => setUserProfile(p)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          );
        })()}
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
        playQueue={playQueue}
        onAddToQueue={handleAddToQueue}
        onRemoveFromQueue={handleRemoveFromQueue}
        onClearQueue={handleClearQueue}
        onPlayTrack={handlePlayTrack}
        onOpenArtist={(artistName) => {
          setSelectedArtistForMusic({ id: artistName, name: artistName });
          handleNavigateTab('music');
        }}
      />

      {/* Ban & Timeout Appeal Petition Modal */}
      <BanAppealModal
        isOpen={isBanAppealOpen}
        onClose={() => setIsBanAppealOpen(false)}
        defaultUsername={userProfile.username}
        onSubmitted={fetchAdminStatusData}
      />

      {/* Tab Masking & Cloaker Modal */}
      <TabMaskModal
        isOpen={isTabMaskModalOpen}
        onClose={() => setIsTabMaskModalOpen(false)}
      />

      {/* Global Broadcast / Announcement Modal */}
      <AnnouncementPopupModal
        isOpen={isAnnouncementPopupOpen}
        announcement={activeAnnouncement}
        onDismiss={handleDismissAnnouncement}
      />

      {/* Admin Moderation Terminal */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => {
          setIsAdminDashboardOpen(false);
          fetchAdminStatusData();
        }}
        adminUsername={userProfile.username}
        onRefreshStatus={fetchAdminStatusData}
        onLogout={handleAdminLogout}
      />

      {/* Bug and Report Modal */}
      <ReportModal
        isOpen={reportModalState.isOpen}
        onClose={() => setReportModalState((prev) => ({ ...prev, isOpen: false }))}
        reportType={reportModalState.type}
        targetUser={reportModalState.targetUser}
        messageContent={reportModalState.messageContent}
        messageId={reportModalState.messageId}
      />

      {/* Partners Notice Modal */}
      <PartnersModal
        isOpen={isPartnersModalOpen}
        onClose={() => setIsPartnersModalOpen(false)}
      />

      {/* Activity History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectHistoryItem={(item: HistoryItem) => {
          if (item.type === 'music' && item.data) {
            handlePlayTrack(item.data);
          } else if (item.type === 'watch' && item.data?.id) {
            setSelectedMovieId(item.data.id);
            handleNavigateTab('movies');
          } else if (item.type === 'game' && item.data?.id) {
            setSelectedGameId(item.data.id);
            handleNavigateTab('games');
          } else if (item.type === 'search') {
            handleLaunchProxy(item.title);
          }
        }}
      />

      {/* Global Picture-in-Picture (PiP) Floating Video Player Overlay */}
      <PipVideoOverlay
        pipVideo={pipVideo}
        onClose={() => setPipVideo(null)}
        onExpand={(video) => {
          setPipInitialVideo(video);
          handleNavigateTab('youtube');
          setPipVideo(null);
        }}
      />
    </div>
  );
}
