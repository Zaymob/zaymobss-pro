import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MonitorUp,
  X,
  Plus,
  Users,
  Flame,
  Volume2,
  ArrowLeft,
  Camera,
  Edit2,
  Lock,
  Radio,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { UserProfile } from '../types';

interface ChatAttachment {
  type: 'image' | 'audio' | 'voice' | 'link' | 'file';
  url: string;
  fileName?: string;
  duration?: number;
  fileSize?: string;
}

interface ChatMessage {
  id: string;
  channelId: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  createdAt?: number;
  badge?: string;
  attachment?: ChatAttachment;
  streak?: number;
  hasProfanity?: boolean;
}

interface ActiveCallSession {
  isActive: boolean;
  channelId: string;
  callType: 'voice' | 'video';
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  participants: string[];
}

interface ChatViewProps {
  userProfile: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
}

const COMMON_BADWORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
  'cock', 'damn', 'slut', 'whore', 'fucking', 'shitty', 'bitching',
];

export const ChatView: React.FC<ChatViewProps> = ({ userProfile, onUpdateProfile }) => {
  const [currentUsername, setCurrentUsername] = useState<string>(userProfile.username || 'Guest');
  const [currentAvatar, setCurrentAvatar] = useState<string>(userProfile.avatar || '');

  // View state: 'lobby' (Rooms / Hub screen) or 'room' (inside chat room)
  const [currentView, setCurrentView] = useState<'lobby' | 'room'>('lobby');

  // Active room / channel: 'general' (Public) or custom room name e.g. 'room_Secret'
  const [activeRoomId, setActiveRoomId] = useState<string>('general');
  const [activeRoomTitle, setActiveRoomTitle] = useState<string>('Public');

  // Input states in lobby
  const [createCallName, setCreateCallName] = useState<string>('');
  const [joinCallName, setJoinCallName] = useState<string>('');
  const [createRoomName, setCreateRoomName] = useState<string>('');
  const [joinRoomName, setJoinRoomName] = useState<string>('');

  // Editing profile in lobby
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Messages state - cached in localStorage to prevent reset on tab change
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem(`yuno_chat_cache_${activeRoomId}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [inputContent, setInputContent] = useState<string>('');
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
  const [onlineUsersList, setOnlineUsersList] = useState<string[]>([]);
  const [userStreak, setUserStreak] = useState<number>(1);

  // Moderation / Ban status
  const [isChatBanned, setIsChatBanned] = useState<boolean>(false);
  const [banHoursLeft, setBanHoursLeft] = useState<number>(0);
  const [banErrorMessage, setBanErrorMessage] = useState<string | null>(null);

  // Image upload attachment (images only)
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live Public / Private Calling State
  const [callSession, setCallSession] = useState<ActiveCallSession>({
    isActive: false,
    channelId: '',
    callType: 'voice',
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    localStream: null,
    screenStream: null,
    participants: [],
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Call Overlay & Active Speaker State
  const [overlayMode, setOverlayMode] = useState<'normal' | 'fullscreen' | 'minimized'>('normal');
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);
  const [callParticipants, setCallParticipants] = useState<any[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<{ username: string; avatar?: string } | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  // Typing Indicators State (3 grey dots)
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Profanity filter setting (stored in localStorage)
  const [isProfanityFilterEnabled] = useState<boolean>(() => {
    return localStorage.getItem('yuno_profanity_filter') !== 'false';
  });

  // Sync profile when prop changes
  useEffect(() => {
    if (userProfile.username) setCurrentUsername(userProfile.username);
    if (userProfile.avatar !== undefined) setCurrentAvatar(userProfile.avatar);
  }, [userProfile.username, userProfile.avatar]);

  // Save profile updates
  const saveProfileChange = (newUname: string, newAv: string) => {
    setCurrentUsername(newUname);
    setCurrentAvatar(newAv);
    const updated: UserProfile = {
      ...userProfile,
      username: newUname,
      displayName: newUname,
      avatar: newAv,
    };
    try {
      localStorage.setItem('yuno_user_profile', JSON.stringify(updated));
    } catch {}
    onUpdateProfile?.(updated);
  };

  // Check chat ban status periodically
  const checkUserStatus = useCallback(async () => {
    if (!currentUsername || currentUsername === 'Guest') return;
    try {
      const res = await fetch(`/api/chat/user-status?username=${encodeURIComponent(currentUsername)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.banned) {
          setIsChatBanned(true);
          setBanHoursLeft(data.hoursLeft || 72);
        } else {
          setIsChatBanned(false);
          setBanHoursLeft(0);
          setBanErrorMessage(null);
        }
        if (data.streak) {
          setUserStreak(data.streak);
        }
      }
    } catch {}
  }, [currentUsername]);

  useEffect(() => {
    checkUserStatus();
    const interval = setInterval(checkUserStatus, 15000);
    return () => clearInterval(interval);
  }, [checkUserStatus]);

  // Load and cache messages for current active room
  const loadChannelMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/messages?channelId=${encodeURIComponent(activeRoomId)}&username=${encodeURIComponent(currentUsername)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
          try {
            localStorage.setItem(`yuno_chat_cache_${activeRoomId}`, JSON.stringify(data.messages));
          } catch {}
        }
        if (data.streaks && data.streaks[currentUsername.toLowerCase()]) {
          setUserStreak(data.streaks[currentUsername.toLowerCase()].count || 1);
        }
      }
    } catch (e) {
      console.warn('Failed to load chat messages:', e);
    }
  }, [activeRoomId, currentUsername]);

  // Heartbeat & Online users list
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/chat/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUsername,
            avatar: currentAvatar,
            status: 'Online',
          }),
        });

        const activeRes = await fetch('/api/chat/active-users');
        if (activeRes.ok) {
          const actData = await activeRes.json();
          if (Array.isArray(actData.activeUsers)) {
            setActiveUsersCount(actData.activeUsers.length);
            setOnlineUsersList(actData.activeUsers.map((u: any) => u.username));
          }
        }
      } catch {}
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [currentUsername, currentAvatar]);

  // Load cache when switching room
  useEffect(() => {
    if (currentView === 'room') {
      try {
        const cached = localStorage.getItem(`yuno_chat_cache_${activeRoomId}`);
        if (cached) {
          setMessages(JSON.parse(cached));
        }
      } catch {}
      loadChannelMessages();
    }
  }, [activeRoomId, currentView, loadChannelMessages]);

  // Polling fallback when in room
  useEffect(() => {
    if (currentView !== 'room') return;
    const pollInterval = setInterval(() => {
      loadChannelMessages();
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [currentView, loadChannelMessages]);

  // Report typing state to server
  const reportTyping = useCallback(async (isTyping: boolean) => {
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeRoomId,
          username: currentUsername,
          isTyping,
        }),
      });
    } catch {}
  }, [activeRoomId, currentUsername]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputContent(val);
    if (val.trim()) {
      reportTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        reportTyping(false);
      }, 2500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      reportTyping(false);
    }
  };

  // Poll typing users for activeRoomId
  useEffect(() => {
    if (currentView !== 'room') return;
    const fetchTyping = async () => {
      try {
        const res = await fetch(
          `/api/chat/typing?channelId=${encodeURIComponent(activeRoomId)}&excludeUser=${encodeURIComponent(currentUsername)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.typingUsers)) {
            setTypingUsers(data.typingUsers);
          }
        }
      } catch {}
    };

    fetchTyping();
    const timer = setInterval(fetchTyping, 2000);
    return () => clearInterval(timer);
  }, [activeRoomId, currentUsername, currentView]);

  // Audio volume analyzer to detect if local user is speaking in call
  useEffect(() => {
    if (!callSession.isActive || !callSession.localStream || callSession.isMuted) {
      setIsLocalSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animId: number | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaStreamSource(callSession.localStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setIsLocalSpeaking(avg > 14);
          animId = requestAnimationFrame(checkVolume);
        };
        animId = requestAnimationFrame(checkVolume);
      }
    } catch (e) {
      console.warn('AudioContext volume check error:', e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (source) source.disconnect();
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [callSession.isActive, callSession.localStream, callSession.isMuted]);

  // Sync call presence and detect active speaker
  useEffect(() => {
    if (!callSession.isActive) return;

    const syncCall = async () => {
      try {
        const res = await fetch('/api/calls/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: callSession.channelId,
            username: currentUsername,
            avatar: currentAvatar,
            isMuted: callSession.isMuted,
            isCameraOn: !callSession.isCameraOff && callSession.callType === 'video',
            isScreenSharing: callSession.isScreenSharing,
            isSpeaking: isLocalSpeaking,
            action: 'update',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.participants)) {
            setCallParticipants(data.participants);
            const remoteSpeaking = data.participants.find(
              (p: any) => p.isSpeaking && p.username.toLowerCase() !== currentUsername.toLowerCase()
            );
            if (remoteSpeaking) {
              setActiveSpeaker({ username: remoteSpeaking.username, avatar: remoteSpeaking.avatar });
            } else if (isLocalSpeaking) {
              setActiveSpeaker({ username: currentUsername, avatar: currentAvatar });
            } else {
              setActiveSpeaker(null);
            }
          }
        }
      } catch {}
    };

    syncCall();
    const interval = setInterval(syncCall, 2000);
    return () => clearInterval(interval);
  }, [
    callSession.isActive,
    callSession.channelId,
    callSession.isMuted,
    callSession.isCameraOff,
    callSession.callType,
    callSession.isScreenSharing,
    isLocalSpeaking,
    currentUsername,
    currentAvatar,
  ]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (currentView === 'room') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentView]);

  // Navigation: Enter a room
  const handleEnterRoom = (roomId: string, roomTitle: string) => {
    setActiveRoomId(roomId);
    setActiveRoomTitle(roomTitle);
    setCurrentView('room');
  };

  // Send message handler
  const handleSendMessage = async () => {
    if (isChatBanned) {
      setBanErrorMessage(`You are chat banned for ${banHoursLeft} more hour(s).`);
      return;
    }

    const trimmed = inputContent.trim();
    if (!trimmed && !pendingImage) return;

    let attachmentObj: ChatAttachment | undefined = undefined;
    if (pendingImage) {
      attachmentObj = {
        type: 'image',
        url: pendingImage,
        fileName: 'image.jpg',
      };
    }

    const payload = {
      channelId: activeRoomId,
      user: currentUsername,
      avatar: currentAvatar,
      content: trimmed || '(Image)',
      attachment: attachmentObj,
    };

    setInputContent('');
    setPendingImage(null);
    setBanErrorMessage(null);
    reportTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setIsChatBanned(true);
          setBanHoursLeft(errData.isSlurBan ? 72 : (errData.hoursLeft || 72));
          setBanErrorMessage(
            errData.error || 'You have been automatically banned from chat for 72 hours for hate speech/slur violation.'
          );
        } else {
          setBanErrorMessage(errData.error || 'Failed to send message.');
        }
        return;
      }

      const newMsg: ChatMessage = await res.json();
      setMessages((prev) => {
        const next = [...prev, newMsg];
        try {
          localStorage.setItem(`yuno_chat_cache_${activeRoomId}`, JSON.stringify(next));
        } catch {}
        return next;
      });
      if (newMsg.streak) {
        setUserStreak(newMsg.streak);
      }
    } catch (e) {
      console.error('Error sending chat message:', e);
    }
  };

  // Image Selection Handler (images only, not files)
  const handleSelectImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only images (PNG, JPG, WEBP, GIF) are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setPendingImage(base64);
      }
    };
    reader.readAsDataURL(file);
    if (chatImageInputRef.current) chatImageInputRef.current.value = '';
  };

  // Avatar file upload in lobby
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          saveProfileChange(currentUsername, base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const audioBase64 = reader.result as string;
          if (audioBase64) {
            await sendVoiceMessage(audioBase64);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission denied:', err);
      alert('Microphone access is required to record voice messages.');
    }
  };

  const stopVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const sendVoiceMessage = async (audioBase64: string) => {
    if (isChatBanned) return;
    const payload = {
      channelId: activeRoomId,
      user: currentUsername,
      avatar: currentAvatar,
      content: '🎙️ Voice message',
      attachment: {
        type: 'voice' as const,
        url: audioBase64,
        duration: recordingSeconds,
      },
    };

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newMsg: ChatMessage = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error('Error sending voice message:', err);
    }
  };

  // Start / Join Voice or Video Call
  const handleStartCall = async (type: 'voice' | 'video', callChannel: string) => {
    try {
      const constraints = {
        audio: true,
        video: type === 'video',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCallSession({
        isActive: true,
        channelId: callChannel,
        callType: type,
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        localStream: stream,
        screenStream: null,
        participants: [currentUsername],
      });
      setOverlayMode('normal');

      if (type === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Media devices access error:', e);
      alert('Camera/Microphone permission was not granted.');
    }
  };

  // Toggle Screen Sharing in Call
  const handleToggleScreenShare = async () => {
    if (callSession.isScreenSharing) {
      if (callSession.screenStream) {
        callSession.screenStream.getTracks().forEach((track) => track.stop());
      }
      setCallSession((prev) => ({
        ...prev,
        isScreenSharing: false,
        screenStream: null,
      }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getVideoTracks()[0].onended = () => {
          setCallSession((prev) => ({
            ...prev,
            isScreenSharing: false,
            screenStream: null,
          }));
        };

        setCallSession((prev) => ({
          ...prev,
          isScreenSharing: true,
          screenStream: stream,
        }));

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Screen share canceled or error:', err);
      }
    }
  };

  // Toggle Fullscreen Call Overlay
  const handleToggleFullscreen = () => {
    if (overlayMode === 'fullscreen') {
      setOverlayMode('normal');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      setOverlayMode('fullscreen');
      if (overlayContainerRef.current && !document.fullscreenElement) {
        overlayContainerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  // Leave Call
  const handleEndCall = () => {
    if (callSession.localStream) {
      callSession.localStream.getTracks().forEach((t) => t.stop());
    }
    if (callSession.screenStream) {
      callSession.screenStream.getTracks().forEach((t) => t.stop());
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setCallSession({
      isActive: false,
      channelId: '',
      callType: 'voice',
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      localStream: null,
      screenStream: null,
      participants: [],
    });
    setOverlayMode('normal');
    setIsLocalSpeaking(false);
    setActiveSpeaker(null);
  };

  // Profanity Blur Filter Helper
  const renderMessageContent = (text: string) => {
    if (!isProfanityFilterEnabled) return <span>{text}</span>;

    const words = text.split(/(\s+)/);
    return (
      <span>
        {words.map((word, idx) => {
          const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isBad = COMMON_BADWORDS.includes(clean);
          if (isBad) {
            return (
              <span
                key={idx}
                className="filter blur-[5px] hover:blur-none transition-all duration-200 select-none bg-[#2f1754]/80 text-purple-200 px-1 rounded cursor-pointer"
                title="Curse word (click to unblur)"
              >
                {word}
              </span>
            );
          }
          return <span key={idx}>{word}</span>;
        })}
      </span>
    );
  };

  // Render Full / Floating Call Overlay
  const renderCallOverlay = () => {
    if (!callSession.isActive) return null;

    // Minimized PiP Card
    if (overlayMode === 'minimized') {
      return (
        <div className="fixed bottom-5 right-5 z-50 bg-[#120824]/95 border border-[#482080] rounded-2xl shadow-2xl p-3 w-72 flex flex-col space-y-2 backdrop-blur-md select-none animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {callSession.channelId === 'public-call' ? 'Public Call' : callSession.channelId}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setOverlayMode('normal')}
                className="p-1 hover:bg-[#251242] text-purple-200 rounded text-xs transition-colors cursor-pointer"
                title="Expand Call Overlay"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleEndCall}
                className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs transition-colors cursor-pointer"
                title="Leave Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {activeSpeaker && (
            <div className="text-[11px] text-purple-300 flex items-center space-x-1.5 bg-[#1e0f38] px-2 py-1 rounded-lg">
              <Volume2 className="w-3 h-3 text-purple-300 shrink-0" />
              <span className="truncate"><b>{activeSpeaker.username}</b> is speaking</span>
            </div>
          )}
        </div>
      );
    }

    // Normal Overlay & Fullscreen View
    return (
      <div
        ref={overlayContainerRef}
        className={
          overlayMode === 'fullscreen'
            ? 'fixed inset-0 z-50 bg-[#090314] flex flex-col select-none'
            : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 select-none'
        }
      >
        <div
          className={
            overlayMode === 'fullscreen'
              ? 'w-full h-full flex flex-col justify-between relative overflow-hidden bg-[#090314]'
              : 'w-full max-w-4xl h-[82vh] bg-[#100720] border border-[#3e1e6f] rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden'
          }
        >
          {/* Top Overlay Bar */}
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#29134a] bg-[#120824]/90 backdrop-blur-md z-20">
            <div className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-purple-300" />
              <span className="font-bold text-xs sm:text-sm text-white">
                {callSession.channelId === 'public-call' ? 'Public Call' : `#${callSession.channelId}`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#20103b] border border-[#441f7a] text-[10px] text-purple-300 font-semibold">
                {callParticipants.length > 0 ? `${callParticipants.length} connected` : '1 connected'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleFullscreen}
                className="p-1.5 text-purple-300 hover:text-white bg-[#1f0e38] hover:bg-[#2e1554] border border-[#411e73] rounded-lg transition-colors cursor-pointer"
                title={overlayMode === 'fullscreen' ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {overlayMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setOverlayMode('minimized')}
                className="p-1.5 text-purple-300 hover:text-white bg-[#1f0e38] hover:bg-[#2e1554] border border-[#411e73] rounded-lg transition-colors cursor-pointer"
                title="Minimize Overlay"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={handleEndCall}
                className="p-1.5 text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors cursor-pointer"
                title="Leave Call"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Central Overlay Stage: Speaker / Screen Sharing fills the overlay */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#090314]">
            {/* Case A: Screen Sharing Active -> Shared screen fills the overlay */}
            {callSession.isScreenSharing && callSession.screenStream ? (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-[#180c30]/90 border border-[#482080] text-purple-200 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-lg backdrop-blur-sm">
                  <MonitorUp className="w-4 h-4 text-purple-300" />
                  <span className="font-semibold">Screen Share Active</span>
                  <button
                    onClick={handleToggleFullscreen}
                    className="ml-2 px-2 py-0.5 bg-[#2f1556] hover:bg-[#431f7a] text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    {overlayMode === 'fullscreen' ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                </div>
              </div>
            ) : activeSpeaker ? (
              /* Case B: Someone is talking -> That person fills the overlay */
              <div className="w-full h-full flex flex-col items-center justify-center relative p-6 text-center">
                {activeSpeaker.username.toLowerCase() === currentUsername.toLowerCase() && !callSession.isCameraOff && callSession.callType === 'video' ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-5 z-10">
                    {/* Animated voice aura rings expanding from the speaker's avatar */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-2 border-purple-500/30 absolute animate-ping [animation-duration:2.5s]" />
                      <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-2 border-purple-500/50 absolute animate-pulse" />
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-[#20103b] border-4 border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.35)] flex items-center justify-center font-bold text-3xl md:text-5xl text-white overflow-hidden z-10">
                        {activeSpeaker.avatar ? (
                          <img src={activeSpeaker.avatar} alt={activeSpeaker.username} className="w-full h-full object-cover" />
                        ) : (
                          activeSpeaker.username.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
                        {activeSpeaker.username}
                      </h2>
                      <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-purple-900/60 border border-purple-500/50 text-purple-200 text-xs font-semibold">
                        <Volume2 className="w-3.5 h-3.5 text-purple-300" />
                        <span>Speaking</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Case C: Nobody speaking -> Waiting / participant card */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-28 h-28 rounded-full bg-[#1b0d33] border-2 border-[#3c1c6e] flex items-center justify-center font-bold text-3xl text-purple-300 shadow-xl overflow-hidden">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt={currentUsername} className="w-full h-full object-cover" />
                  ) : (
                    currentUsername.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-base font-bold text-white">{currentUsername}</p>
                  <p className="text-xs text-purple-300/70 mt-0.5">Connected to #{callSession.channelId}</p>
                </div>
                <p className="text-[11px] text-zinc-400 max-w-sm">
                  Start speaking into your microphone or share your screen. When someone speaks, they will automatically fill this view.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Dock Controls */}
          <div className="w-full px-4 py-3.5 flex items-center justify-center border-t border-[#29134a] bg-[#120824]/90 backdrop-blur-md z-20">
            <div className="flex items-center space-x-3 bg-[#1c0e35] border border-[#3e1e6f] px-4 py-2 rounded-full shadow-2xl">
              {/* Mic toggle */}
              <button
                onClick={() => {
                  if (callSession.localStream) {
                    const newMuted = !callSession.isMuted;
                    callSession.localStream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
                    setCallSession((prev) => ({ ...prev, isMuted: newMuted }));
                  }
                }}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  callSession.isMuted
                    ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                    : 'bg-[#2e1554] text-purple-200 hover:bg-[#411e75] border border-[#522596]'
                }`}
                title={callSession.isMuted ? 'Unmute' : 'Mute'}
              >
                {callSession.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Camera toggle */}
              <button
                onClick={() => {
                  if (callSession.localStream) {
                    const newCamOff = !callSession.isCameraOff;
                    callSession.localStream.getVideoTracks().forEach((t) => (t.enabled = !newCamOff));
                    setCallSession((prev) => ({ ...prev, isCameraOff: newCamOff }));
                  }
                }}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  callSession.isCameraOff
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-[#2e1554] text-purple-200 hover:bg-[#411e75] border border-[#522596]'
                }`}
                title={callSession.isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {callSession.isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {/* Screen share toggle */}
              <button
                onClick={handleToggleScreenShare}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  callSession.isScreenSharing
                    ? 'bg-purple-600 text-white border border-purple-400'
                    : 'bg-[#2e1554] text-purple-200 hover:bg-[#411e75] border border-[#522596]'
                }`}
                title={callSession.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <MonitorUp className="w-4 h-4" />
              </button>

              {/* Fullscreen button */}
              <button
                onClick={handleToggleFullscreen}
                className="p-2.5 rounded-full bg-[#2e1554] text-purple-200 hover:bg-[#411e75] border border-[#522596] transition-colors cursor-pointer"
                title="Fullscreen (Watch Screen)"
              >
                {overlayMode === 'fullscreen' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Leave Call */}
              <button
                onClick={handleEndCall}
                className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-lg"
                title="Leave Call"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW 1: LOBBY / ROOMS HUB (Matching Video)
  // ==========================================
  if (currentView === 'lobby') {
    return (
      <div className="w-full min-h-[calc(100vh-65px)] flex items-center justify-center p-3 sm:p-6 select-none relative">
        {renderCallOverlay()}
        <div className="w-full max-w-2xl space-y-4">
          


          {/* Voice Calls Section */}
          <div className="bg-[#120a22]/80 backdrop-blur-md border border-[#311756] rounded-2xl p-4.5 space-y-3.5 shadow-xl">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <Phone className="w-4 h-4 text-purple-300" />
              <span>Voice calls</span>
            </div>

            {/* Grid for public call + create private call */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Join Public Call */}
              <button
                onClick={() => handleStartCall('voice', 'public-call')}
                className="bg-[#1b0e33]/90 hover:bg-[#251347] border border-[#3c1c6e] hover:border-[#5a2a9e] rounded-xl p-3.5 text-left transition-colors cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center space-x-2 text-white font-semibold text-xs mb-1">
                  <Phone className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
                  <span>Join public call</span>
                </div>
                <p className="text-[11px] text-zinc-400">Open voice room for everyone</p>
              </button>

              {/* Create Private Call */}
              <div className="bg-[#1b0e33]/90 border border-[#3c1c6e] rounded-xl p-3.5 flex flex-col justify-between space-y-2">
                <span className="text-white font-semibold text-xs">Create private call</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={createCallName}
                    onChange={(e) => setCreateCallName(e.target.value)}
                    placeholder="Call name"
                    className="flex-1 bg-[#0b0517] border border-[#311756] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      if (createCallName.trim()) {
                        handleStartCall('voice', `call_${createCallName.trim()}`);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#2b144d] hover:bg-[#3d1d6e] border border-[#542599] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>

            {/* Join Private Call by Name */}
            <div className="bg-[#1b0e33]/90 border border-[#3c1c6e] rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <span className="text-white font-semibold text-xs shrink-0">Join private call by name</span>
              <div className="flex items-center space-x-2 flex-1 max-w-sm">
                <input
                  type="text"
                  value={joinCallName}
                  onChange={(e) => setJoinCallName(e.target.value)}
                  placeholder="Call name"
                  className="flex-1 bg-[#0b0517] border border-[#311756] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => {
                    if (joinCallName.trim()) {
                      handleStartCall('voice', `call_${joinCallName.trim()}`);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#2b144d] hover:bg-[#3d1d6e] border border-[#542599] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Online Status */}
            <div className="pt-1 flex items-center space-x-2 text-[11px] text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="font-semibold text-zinc-300">Online ({activeUsersCount})</span>
              <span>—</span>
              <span>
                {activeUsersCount <= 1
                  ? 'Nobody else is online right now.'
                  : `${onlineUsersList.join(', ')} online right now.`}
              </span>
            </div>
          </div>

          {/* Public Chat Section (Video Frame 00:01) */}
          <div className="bg-[#120a22]/80 backdrop-blur-md border border-[#311756] rounded-2xl p-4.5 space-y-3 shadow-xl">
            <div className="flex items-center space-x-2 text-white font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-purple-300" />
              <span>Public chat</span>
            </div>

            <button
              onClick={() => handleEnterRoom('general', 'Public')}
              className="w-full py-2.5 bg-[#251242] hover:bg-[#351961] border border-[#4d238c] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-2"
            >
              <span>Join public chat</span>
            </button>
          </div>

          {/* Private Chat Rooms Section (Video Frame 00:01 bottom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Create Private Room */}
            <div className="bg-[#120a22]/80 backdrop-blur-md border border-[#311756] rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <Plus className="w-4 h-4 text-purple-300" />
                <span>Create private room</span>
              </div>
              <input
                type="text"
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full bg-[#0b0517] border border-[#311756] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => {
                  if (createRoomName.trim()) {
                    handleEnterRoom(`room_${createRoomName.trim()}`, createRoomName.trim());
                  }
                }}
                className="w-full py-2 bg-[#2b144d] hover:bg-[#3d1d6e] border border-[#542599] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Create & join
              </button>
            </div>

            {/* Join Private Room */}
            <div className="bg-[#120a22]/80 backdrop-blur-md border border-[#311756] rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <Users className="w-4 h-4 text-purple-300" />
                <span>Join private room</span>
              </div>
              <input
                type="text"
                value={joinRoomName}
                onChange={(e) => setJoinRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full bg-[#0b0517] border border-[#311756] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => {
                  if (joinRoomName.trim()) {
                    handleEnterRoom(`room_${joinRoomName.trim()}`, joinRoomName.trim());
                  }
                }}
                className="w-full py-2 bg-[#2b144d] hover:bg-[#3d1d6e] border border-[#542599] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // VIEW 2: CHAT ROOM (Floating text directly on wallpaper)
  // No outer container box / No border covering wallpaper!
  // ====================================================
  return (
    <div className="w-full h-[calc(100vh-60px)] flex flex-col justify-between overflow-hidden relative select-text">
      {renderCallOverlay()}
      
      {/* Top Floating Room Bar */}
      <div className="w-full px-4 sm:px-8 py-3 flex items-center justify-between select-none z-20">
        <div className="flex items-center space-x-4">
          {/* Back to Rooms button (Video frame 00:03 / 00:06) */}
          <button
            onClick={() => setCurrentView('lobby')}
            className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#100720]/75 hover:bg-[#1a0c33] border border-[#321658] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Rooms</span>
          </button>

          {/* Room Title */}
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white drop-shadow">
              #{activeRoomTitle}
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-[#20103b]/80 border border-[#441f7a] text-[11px] text-amber-400 font-semibold">
              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{userStreak}</span>
            </span>
          </div>
        </div>

        {/* Live Call Control if Call is Active, or Quick Join Call */}
        {callSession.isActive ? (
          <div className="flex items-center space-x-2 bg-[#1b0e33]/90 border border-[#4d238c] px-3 py-1.5 rounded-xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <button
              onClick={() => setOverlayMode('normal')}
              className="text-xs font-semibold text-purple-200 hover:text-white cursor-pointer"
            >
              Call Active
            </button>
            <button
              onClick={handleToggleScreenShare}
              className={`p-1.5 rounded text-xs border ${
                callSession.isScreenSharing
                  ? 'bg-purple-900 text-purple-200 border-purple-500'
                  : 'bg-[#2b144d] text-zinc-300 border-[#542599]'
              }`}
              title="Share Screen"
            >
              <MonitorUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs"
              title="Leave Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleStartCall('voice', activeRoomId === 'general' ? 'public-call' : `call_${activeRoomTitle}`)}
            className="flex items-center space-x-1.5 text-xs font-semibold text-purple-200 hover:text-white bg-[#1b0e33] hover:bg-[#28134d] border border-[#3c1c6e] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            <Phone className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline">Join call</span>
          </button>
        )}
      </div>

      {/* 72-Hour Chat Ban Notice */}
      {isChatBanned && (
        <div className="mx-4 sm:mx-8 px-4 py-2 bg-rose-950/85 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center space-x-2 z-20 shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            You are currently chat banned for 72 hours for hate speech/slur violation. (Expires in {banHoursLeft} hours).
          </span>
        </div>
      )}

      {/* Floating Chat Messages Area (Directly Over Wallpaper) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-4 space-y-4 z-10 scrollbar-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none opacity-60">
            <MessageSquare className="w-8 h-8 text-purple-300 mb-2" />
            <p className="text-sm font-semibold text-white">No messages yet</p>
            <p className="text-xs text-zinc-300 mt-1">Start chatting in #{activeRoomTitle}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user.toLowerCase() === currentUsername.toLowerCase();
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* User Avatar Circle */}
                <div className="w-8 h-8 rounded-full bg-[#20103b] border border-[#482080] flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden shadow-md">
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.user} className="w-full h-full object-cover" />
                  ) : (
                    msg.user.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Bubble Container */}
                <div className={`max-w-[78%] sm:max-w-md flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Username above bubble */}
                  <div className="flex items-center space-x-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold text-white drop-shadow">
                      {msg.user}
                    </span>
                    {msg.streak && msg.streak > 1 ? (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center">
                        🔥{msg.streak}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-purple-300/70 font-mono">{msg.timestamp}</span>
                  </div>

                  {/* Rounded Chat Bubble */}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs break-words leading-relaxed shadow-lg backdrop-blur-sm ${
                      isOwn
                        ? 'bg-[#2c1652]/90 text-white border border-[#522596]'
                        : 'bg-[#1c1238]/90 text-white border border-[#3e1e6f]'
                    }`}
                  >
                    {/* Voice message player */}
                    {msg.attachment?.type === 'voice' && (
                      <div className="flex items-center space-x-2 py-1">
                        <Volume2 className="w-4 h-4 text-purple-300 shrink-0" />
                        <audio
                          controls
                          src={msg.attachment.url}
                          className="h-8 max-w-[210px]"
                        />
                      </div>
                    )}

                    {/* Image message */}
                    {msg.attachment?.type === 'image' && (
                      <div className="mb-1.5 rounded-lg overflow-hidden max-w-sm">
                        <img
                          src={msg.attachment.url}
                          alt="Attachment"
                          className="max-h-60 rounded object-cover cursor-pointer hover:opacity-95"
                          onClick={() => window.open(msg.attachment?.url, '_blank')}
                        />
                      </div>
                    )}

                    {/* Text Content with Profanity Filter Blur */}
                    {msg.content && msg.content !== '(Image)' && renderMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {/* Typing indicator: 3 grey dots */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#170c2a]/90 border border-[#391a66] w-fit shadow-md my-1 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar (Floating over wallpaper as seen in video 00:03/00:08) */}
      <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-1 z-20">
        {/* Pending Image Preview */}
        {pendingImage && (
          <div className="mb-2 px-3 py-2 bg-[#120a22]/90 backdrop-blur-md border border-[#3a1b66] rounded-xl flex items-center justify-between text-white text-xs">
            <div className="flex items-center space-x-2">
              <img src={pendingImage} alt="Preview" className="w-10 h-10 rounded object-cover border border-[#4d238c]" />
              <span className="text-purple-200">Ready to send image</span>
            </div>
            <button onClick={() => setPendingImage(null)} className="p-1 hover:text-rose-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error notice */}
        {banErrorMessage && (
          <div className="mb-2 px-3 py-1.5 bg-rose-950/90 text-rose-300 text-xs rounded-xl border border-rose-800 flex items-center justify-between">
            <span>{banErrorMessage}</span>
            <button onClick={() => setBanErrorMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Recording active bar */}
        {isRecordingVoice ? (
          <div className="bg-[#120a22]/90 backdrop-blur-md border border-[#3a1b66] rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl">
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Recording voice message ({recordingSeconds}s)...</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={cancelVoiceRecording}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={stopVoiceRecording}
                className="px-3 py-1 bg-[#4d238a] hover:bg-[#602ca8] text-white rounded-lg text-xs font-bold"
              >
                Send Audio
              </button>
            </div>
          </div>
        ) : (
          /* Floating Input pill / bar */
          <div className="bg-[#120a22]/85 backdrop-blur-md border border-[#3a1b66] focus-within:border-[#602ca8] rounded-2xl px-3 py-2 flex items-center space-x-2 shadow-2xl transition-colors">
            {/* Image Upload Button */}
            <input
              ref={chatImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectImageFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => chatImageInputRef.current?.click()}
              disabled={isChatBanned}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-[#251242] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Send Image (Images only)"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Voice Message Mic Button */}
            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={isChatBanned}
              className="p-1.5 text-purple-300 hover:text-white hover:bg-[#251242] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              title="Record Voice Message"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Input field */}
            <input
              type="text"
              value={inputContent}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isChatBanned}
              placeholder={
                isChatBanned
                  ? 'You are chat banned for 72 hours...'
                  : `Message as ${currentUsername}...`
              }
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-400 focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isChatBanned || (!inputContent.trim() && !pendingImage)}
              className="p-2 bg-[#3b1c6d] hover:bg-[#522596] disabled:opacity-30 text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
