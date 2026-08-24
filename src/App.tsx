import React, { useState, useEffect, useRef } from 'react';
import { NavTab, MusicTrack, CallState, CallParticipant, PlaybackContext, UserProfile, YouTubeVideo, BanAppealItem } from './types';
import { WALLPAPERS, MUSIC_TRACKS } from './data/portalData';
import { audioEngine } from './utils/audioSynth';

import { BootScreen } from './components/BootScreen';
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
import { ProfileModal } from './components/ProfileModal';
import { ProxyTab } from './components/ProxyTab';
import { LinkFinderView } from './components/LinkFinderView';
import { PrivateChatView } from './components/PrivateChatView';
import { PipVideoOverlay } from './components/PipVideoOverlay';
import { FloatingNavbar } from './components/FloatingNavbar';

import { motion, AnimatePresence } from 'motion/react';
import { BanAppealModal } from './components/BanAppealModal';
import { TabMaskModal } from './components/TabMaskModal';
import { getSavedCloakSettings, saveCloakSettings } from './utils/tabCloak';
import {
  WallpaperCanvasEffects,
  WallpaperEffectSettings,
  getSavedEffectSettings,
  saveEffectSettings,
} from './components/WallpaperCanvasEffects';

export default function App() {
  const [showBootScreen, setShowBootScreen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentWallpaper, setCurrentWallpaper] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('yuno_current_wallpaper');
      if (saved) return saved;
    } catch (e) {}
    return WALLPAPERS[0].url;
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
      accentColor: 'from-cyan-500 to-blue-600',
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
    setActiveTab('proxy');
  };

  // Modals state
  const [isBanAppealOpen, setIsBanAppealOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isTabMaskModalOpen, setIsTabMaskModalOpen] = useState<boolean>(false);

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
    return () => clearInterval(interval);
  }, []);

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

  // WebRTC Call State & Live Media Streams
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
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const lastSignalTimeRef = useRef<number>(0);

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
    return '';
  };

  // Helper to create & configure RTCPeerConnection for a remote participant
  const getOrCreatePeerConnection = (remoteUser: string, channelId: string) => {
    if (peerConnectionsRef.current.has(remoteUser)) {
      return peerConnectionsRef.current.get(remoteUser)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });

    // Add local tracks (microphone & camera)
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Add screen tracks
    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        pc.addTrack(track, screenStream);
      });
    }

    // Handle remote media tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      remoteStreamsRef.current.set(remoteUser, stream);
      setRemoteStreams({ ...Object.fromEntries(remoteStreamsRef.current) });
    };

    // Send ICE candidates to remote peer via backend signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch('/api/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            username: getCurrentUsername(),
            signal: {
              type: 'candidate',
              to: remoteUser,
              data: event.candidate,
            },
          }),
        }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        remoteStreamsRef.current.delete(remoteUser);
        setRemoteStreams({ ...Object.fromEntries(remoteStreamsRef.current) });
      }
    };

    peerConnectionsRef.current.set(remoteUser, pc);
    return pc;
  };

  // Synchronize real call participants and WebRTC peer connections while call is active
  useEffect(() => {
    if (!callState.isActive || !callState.channelId) return;

    const uname = getCurrentUsername();
    const avatar = getCurrentAvatar();

    const syncRoom = async () => {
      try {
        const res = await fetch('/api/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: callState.channelId,
            username: uname,
            avatar,
            action: 'update',
            isMuted: callState.isMuted,
            isCameraOn: callState.isCameraOn,
            isScreenSharing: callState.isScreenSharing,
            since: lastSignalTimeRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.timestamp) {
            lastSignalTimeRef.current = data.timestamp;
          }

          if (Array.isArray(data.participants)) {
            const remoteParticipants: CallParticipant[] = data.participants
              .filter((p: any) => p.username !== uname)
              .map((p: any) => ({
                id: p.id || `peer-${p.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                username: p.username,
                avatar: p.avatar || '',
                isMuted: !!p.isMuted,
                isCameraOn: !!p.isCameraOn,
                isScreenSharing: !!p.isScreenSharing,
              }));

            const localP: CallParticipant = {
              id: 'local-user',
              username: uname,
              avatar,
              isMuted: callState.isMuted,
              isCameraOn: callState.isCameraOn,
              isScreenSharing: callState.isScreenSharing,
            };

            setCallState((prev) => ({
              ...prev,
              participants: [localP, ...remoteParticipants],
            }));

            // Initiate WebRTC peer connection with each remote participant
            for (const rUser of remoteParticipants) {
              const pc = getOrCreatePeerConnection(rUser.username, callState.channelId);
              // Deterministic initiator (e.g. if our username comes first alphabetically)
              if (uname < rUser.username && pc.signalingState === 'stable' && !pc.currentRemoteDescription) {
                try {
                  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                  await pc.setLocalDescription(offer);
                  fetch('/api/webrtc/signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      channelId: callState.channelId,
                      username: uname,
                      signal: {
                        type: 'offer',
                        to: rUser.username,
                        data: offer,
                      },
                    }),
                  }).catch(() => {});
                } catch (err) {}
              }
            }
          }

          // Handle incoming WebRTC signals
          if (Array.isArray(data.recentSignals)) {
            for (const sig of data.recentSignals) {
              if (sig.from === uname) continue;
              const sender = sig.from;
              const pc = getOrCreatePeerConnection(sender, callState.channelId);

              if (sig.type === 'offer' && sig.data) {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  fetch('/api/webrtc/signal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      channelId: callState.channelId,
                      username: uname,
                      signal: {
                        type: 'answer',
                        to: sender,
                        data: answer,
                      },
                    }),
                  }).catch(() => {});
                } catch (e) {}
              } else if (sig.type === 'answer' && sig.data) {
                try {
                  if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                  }
                } catch (e) {}
              } else if (sig.type === 'candidate' && sig.data) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.data));
                } catch (e) {}
              } else if (sig.type === 'leave') {
                pc.close();
                peerConnectionsRef.current.delete(sender);
                remoteStreamsRef.current.delete(sender);
                setRemoteStreams({ ...Object.fromEntries(remoteStreamsRef.current) });
              }
            }
          }
        }
      } catch (e) {}
    };

    syncRoom();
    const interval = setInterval(syncRoom, 1500);
    return () => clearInterval(interval);
  }, [callState.isActive, callState.channelId, callState.isMuted, callState.isCameraOn, callState.isScreenSharing, localStream, screenStream]);

  // Start Real Call Handler (Public, Groups, Private Rooms)
  const handleStartCall = async (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => {
    const uname = getCurrentUsername();
    const avatar = getCurrentAvatar();

    let audioVideoStream: MediaStream | null = null;
    let scStream: MediaStream | null = null;

    try {
      if (callType === 'video' || callType === 'voice') {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          audioVideoStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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

    // Close all WebRTC peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    setRemoteStreams({});

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

    // Broadcast state update immediately
    fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: callState.channelId,
        username: getCurrentUsername(),
        avatar: getCurrentAvatar(),
        action: 'update',
        isMuted: newMuted,
        isCameraOn: callState.isCameraOn,
        isScreenSharing: callState.isScreenSharing,
      }),
    }).catch(() => {});
  };

  const handleToggleCamera = async () => {
    const newCameraOn = !callState.isCameraOn;
    if (newCameraOn && !localStream) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        setLocalStream(stream);

        // Add tracks to existing peer connections
        peerConnectionsRef.current.forEach((pc) => {
          stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        });
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

    // Broadcast state update immediately
    fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: callState.channelId,
        username: getCurrentUsername(),
        avatar: getCurrentAvatar(),
        action: 'update',
        isMuted: callState.isMuted,
        isCameraOn: newCameraOn,
        isScreenSharing: callState.isScreenSharing,
      }),
    }).catch(() => {});
  };

  const handleToggleScreenShare = async () => {
    const newScreenSharing = !callState.isScreenSharing;
    if (newScreenSharing && !screenStream) {
      try {
        const sc = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(sc);

        // Add screen tracks to peer connections
        peerConnectionsRef.current.forEach((pc) => {
          sc.getTracks().forEach((track) => pc.addTrack(track, sc));
        });

        sc.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setCallState((prev) => ({ ...prev, isScreenSharing: false }));
        };
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

    // Broadcast state update immediately
    fetch('/api/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channelId: callState.channelId,
        username: getCurrentUsername(),
        avatar: getCurrentAvatar(),
        action: 'update',
        isMuted: callState.isMuted,
        isCameraOn: callState.isCameraOn,
        isScreenSharing: newScreenSharing,
      }),
    }).catch(() => {});
  };

  // Music state & HTML5 Audio element
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playbackContext, setPlaybackContext] = useState<PlaybackContext | null>(null);
  const [playQueue, setPlayQueue] = useState<MusicTrack[]>([]);

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-x-hidden select-none">
      {/* Yunø Boot Screen Sequence */}
      {showBootScreen && (
        <BootScreen onComplete={() => setShowBootScreen(false)} />
      )}

      {/* Dynamic Background Wallpaper & Screen Effects across EVERY Tab (Disabled in Yunø Lite Mode) */}
      {!isYunoLiteActive ? (
        <>
          <div
            className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
            style={{
              filter: `blur(${effectSettings.blur}px) brightness(${effectSettings.brightness}%)`,
              transform: effectSettings.blur > 0 ? 'scale(1.08)' : 'scale(1.02)',
              transition: 'filter 0.3s ease, transform 0.3s ease',
            }}
          >
            {currentWallpaper.startsWith('data:video') || currentWallpaper.includes('.mp4') || currentWallpaper.includes('.mov') ? (
              <video
                src={currentWallpaper}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-85"
              />
            ) : (
              <img
                src={currentWallpaper}
                alt="Workspace Wallpaper"
                className="w-full h-full object-cover opacity-80"
              />
            )}
            {/* Subtle Dark Backdrop Tint for Readability */}
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Screen Effects Layer (Rain, Snow, Stars, Fireflies, Fog, Vignette) */}
          <WallpaperCanvasEffects settings={effectSettings} />
        </>
      ) : (
        <div className="fixed inset-0 pointer-events-none z-0 bg-[#09090b]" />
      )}

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Bar */}
        <FloatingNavbar
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        {/* Content Area */}
        {(() => {
          const isFullBleedTab = activeTab === 'community' || activeTab === 'private_chat' || activeTab === 'proxy';
          return (
            <main
              className={`flex-1 w-full transition-all duration-300 ${
                isFullBleedTab
                  ? `p-0 m-0 max-w-none ${currentTrack ? 'pb-24' : 'pb-6'}`
                  : `max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 ${currentTrack ? 'pb-24' : 'pb-12'}`
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

                  {activeTab === 'ai' && (
                    <AiView />
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
                    />
                  )}

                  {activeTab === 'music' && (
                    <MusicView
                      currentTrack={currentTrack}
                      isPlaying={isPlayingMusic}
                      onPlayTrack={handlePlayTrack}
                      onTogglePlay={handleTogglePlay}
                      currentTime={audioCurrentTime}
                      playQueue={playQueue}
                      onAddToQueue={handleAddToQueue}
                      onRemoveFromQueue={handleRemoveFromQueue}
                      onClearQueue={handleClearQueue}
                      onNavigateHome={() => setActiveTab('home')}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsView
                      currentWallpaper={currentWallpaper}
                      onSelectWallpaper={handleSelectWallpaper}
                      effectSettings={effectSettings}
                      onChangeEffectSettings={handleChangeEffectSettings}
                      onReplayBoot={() => setShowBootScreen(true)}
                      userProfile={userProfile}
                      onSaveProfile={(updated) => setUserProfile(updated)}
                      onOpenAppealModal={() => setIsBanAppealOpen(true)}
                      isYunoLiteEnabled={isYunoLiteActive}
                      onToggleYunoLite={handleToggleYunoLite}
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
        remoteStreams={remoteStreams}
      />

      {/* Ban & Timeout Appeal Petition Modal */}
      <BanAppealModal
        isOpen={isBanAppealOpen}
        onClose={() => setIsBanAppealOpen(false)}
        defaultUsername={userProfile.username}
        onSubmitted={fetchAdminStatusData}
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

      {/* Tab Masking & Cloaker Modal */}
      <TabMaskModal
        isOpen={isTabMaskModalOpen}
        onClose={() => setIsTabMaskModalOpen(false)}
      />

      {/* Global Picture-in-Picture (PiP) Floating Video Player Overlay */}
      <PipVideoOverlay
        pipVideo={pipVideo}
        onClose={() => setPipVideo(null)}
        onExpand={(video) => {
          setPipInitialVideo(video);
          setActiveTab('youtube');
          setPipVideo(null);
        }}
      />
    </div>
  );
}
