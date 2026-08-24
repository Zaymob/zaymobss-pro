import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, CallState, ChatAttachment } from '../types';
import {
  Hash,
  Send,
  Users,
  MessageSquare,
  Crown,
  Volume2,
  Phone,
  Video,
  User,
  Image as ImageIcon,
  Smile,
  Reply,
  ShieldAlert,
  Radio,
  Plus,
  Monitor,
  X,
  Compass,
  Search,
  Lock,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Paperclip,
  Download,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAvatar } from './UserAvatar';
import { getSavedChatPreferences } from '../utils/chatSettings';

interface UserProfile {
  configured: boolean;
  username: string;
  avatar: string;
  bio: string;
  badge?: string;
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
}

interface CommunityViewProps {
  callState: CallState;
  onStartCall: (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => void;
}

const EMOJI_PILLS = ['👍', '❤️', '🔥', '😂', '🎉', '👑', '🚀', '👀'];

const PROFANITY_WORDS = [
  'shit', 'fuck', 'bitch', 'asshole', 'crap', 'bastard', 'dick', 'pussy', 'slut', 'whore', 'fucking', 'bullshit',
  'vibecoded', 'vibe coded', 'vibe-coded', 'vibecoded slop', 'slop'
];

// Audio Voice Note Player Component
const AudioMessagePlayer: React.FC<{ url: string; duration?: number }> = ({ url, duration }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-zinc-900/90 p-2 px-3 rounded-xl border border-zinc-800 my-1 max-w-xs shadow-inner">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && (!totalDuration || isNaN(totalDuration))) {
            setTotalDuration(audioRef.current.duration);
          }
        }}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
        title={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1 min-w-0">
        <input
          type="range"
          min="0"
          max={totalDuration || 1}
          step="0.1"
          value={currentTime}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setCurrentTime(val);
            if (audioRef.current) audioRef.current.currentTime = val;
          }}
          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
          <span>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}</span>
          <span>{Math.floor(totalDuration / 60)}:{String(Math.floor(totalDuration % 60)).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};

export const CommunityView: React.FC<CommunityViewProps> = ({
  callState,
  onStartCall,
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'dms'>('groups');
  const [activeChannel, setActiveChannel] = useState<string>('general');

  // Messages with localStorage cache for instant persistence
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem(`yuno_chat_cache_general`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [inputMessage, setInputMessage] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Rich media attachments state
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [showAttachmentInput, setShowAttachmentInput] = useState<boolean>(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState<string>('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const [showMemberList, setShowMemberList] = useState<boolean>(true);

  // Filter State synced with chat settings (profanity toggle is in Settings only)
  const [blurProfanity, setBlurProfanity] = useState<boolean>(() => {
    return getSavedChatPreferences().blurProfanity;
  });

  // User Profile
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('yuno_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      configured: false,
      username: 'Guest',
      avatar: '',
      bio: 'Yunø Community Member',
      status: 'online',
    };
  });

  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(!profile.configured);
  const [tempName, setTempName] = useState<string>(profile.username);
  const [tempAvatar, setTempAvatar] = useState<string>(profile.avatar);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Direct Messages & Dynamic Groups
  const [dmsList, setDmsList] = useState<Array<{ id: string; username: string; avatar: string; status: string }>>([]);
  const [newDmName, setNewDmName] = useState<string>('');
  const [showAddDmModal, setShowAddDmModal] = useState<boolean>(false);

  // Joined Groups / Servers
  const [groupsList, setGroupsList] = useState<
    Array<{
      id: string;
      name: string;
      banner: string;
      picture: string;
      createdBy: string;
      createdAt: string;
      channels: Array<{ id: string; name: string; topic?: string }>;
    }>
  >([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('yuno_joined_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [groupJoinCode, setGroupJoinCode] = useState<string>('');

  // Active Users Online
  const [activeOnlineUsers, setActiveOnlineUsers] = useState<
    Array<{ username: string; avatar: string; status: string }>
  >([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<Array<{ id: string; content: string; createdAt: string; author: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Sync settings when preferences update in the global Settings modal
  useEffect(() => {
    const handleStorage = () => {
      setBlurProfanity(getSavedChatPreferences().blurProfanity);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchDms = async () => {
    if (!profile.username) return;
    try {
      const res = await fetch(`/api/chat/dms?username=${encodeURIComponent(profile.username)}`);
      if (res.ok) {
        const data = await res.json();
        setDmsList(data.dms || []);
      }
    } catch (e) {}
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/chat/groups');
      if (res.ok) {
        const data = await res.json();
        setGroupsList(data.groups || []);
      }
    } catch (e) {}
  };

  // Real-time Heartbeat & Active Users Fetch
  const sendHeartbeat = async () => {
    if (!profile.username) return;
    try {
      await fetch('/api/chat/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          avatar: profile.avatar,
          status: 'Online',
        }),
      });
    } catch (e) {}
  };

  const fetchActiveUsers = async () => {
    try {
      const res = await fetch('/api/chat/active-users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activeUsers)) {
          setActiveOnlineUsers(data.activeUsers);
        }
      }
    } catch (e) {}
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?channelId=${encodeURIComponent(activeChannel)}&username=${encodeURIComponent(profile.username)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
          // Persist to local cache for instant load
          try {
            localStorage.setItem(`yuno_chat_cache_${activeChannel}`, JSON.stringify(data.messages));
          } catch (e) {}
        }
        if (data.announcements) setAnnouncements(data.announcements);
      }
    } catch (e) {}
  };

  // Channel switch: load from cache first
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`yuno_chat_cache_${activeChannel}`);
      if (cached) setMessages(JSON.parse(cached));
    } catch (e) {}
    fetchMessages();
  }, [activeChannel]);

  useEffect(() => {
    sendHeartbeat();
    fetchDms();
    fetchGroups();
    fetchActiveUsers();

    const interval = setInterval(() => {
      sendHeartbeat();
      fetchDms();
      fetchGroups();
      fetchActiveUsers();
    }, 4000);

    return () => clearInterval(interval);
  }, [profile.username, profile.avatar]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [activeChannel, profile.username]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Voice Note Recording Handlers
  const handleStartVoiceRecording = async () => {
    if (!profile.configured || !profile.username) {
      setIsEditingProfile(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setPendingAttachment({
            type: 'audio',
            url: base64Audio,
            fileName: `Voice Note (${recordingSeconds || 1}s)`,
            duration: recordingSeconds || 1,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone permission needed to record voice note:', err);
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
  };

  const handleCancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isAud = file.type.startsWith('audio/');
    const type: 'image' | 'audio' | 'file' = isImg ? 'image' : isAud ? 'audio' : 'file';

    const reader = new FileReader();
    reader.onloadend = () => {
      setPendingAttachment({
        type,
        url: reader.result as string,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachUrl = () => {
    const url = attachmentUrlInput.trim();
    if (!url) return;

    setPendingAttachment({
      type: 'image',
      url,
      fileName: 'Image Link',
    });
    setAttachmentUrlInput('');
    setShowAttachmentInput(false);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const gName = newGroupName.trim();
    if (!gName || !profile.username) return;

    try {
      const res = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: gName,
          createdBy: profile.username,
          channels: ['general', 'media'],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.group) {
          const nextJoined = Array.from(new Set([...joinedGroupIds, data.group.id]));
          setJoinedGroupIds(nextJoined);
          localStorage.setItem('yuno_joined_groups', JSON.stringify(nextJoined));
          await fetchGroups();
          if (data.group.channels && data.group.channels[0]) {
            setActiveChannel(data.group.channels[0].id);
          }
        }
        setShowCreateGroupModal(false);
        setNewGroupName('');
      }
    } catch (err) {}
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = groupJoinCode.trim();
    if (!code) return;

    const found = groupsList.find(
      (g) => g.id.toLowerCase() === code.toLowerCase() || g.name.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      const nextJoined = Array.from(new Set([...joinedGroupIds, found.id]));
      setJoinedGroupIds(nextJoined);
      localStorage.setItem('yuno_joined_groups', JSON.stringify(nextJoined));
      if (found.channels && found.channels[0]) {
        setActiveChannel(found.channels[0].id);
      }
      setShowJoinGroupModal(false);
      setGroupJoinCode('');
    }
  };

  const handleCreateDm = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = newDmName.trim();
    if (!target || !profile.username) return;

    try {
      const res = await fetch('/api/chat/dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profile.username,
          targetUsername: target,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowAddDmModal(false);
        setNewDmName('');
        await fetchDms();
        if (data.channelId) {
          setActiveChannel(data.channelId);
        }
      }
    } catch (err) {}
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmed = tempName.trim();
    if (!trimmed) {
      setProfileError('Username is required.');
      return;
    }

    const updatedProfile: UserProfile = {
      configured: true,
      username: trimmed,
      avatar: tempAvatar ? tempAvatar.trim() : '',
      bio: 'Yunø Community Member',
      badge: 'MEMBER',
      status: 'online',
    };

    setProfile(updatedProfile);
    localStorage.setItem('yuno_user_profile', JSON.stringify(updatedProfile));
    setIsEditingProfile(false);
  };

  const getMessageDateLabel = (timestampMs?: number, fallbackStr?: string): { label: string; key: string } => {
    let date: Date;
    if (timestampMs && !isNaN(timestampMs)) {
      date = new Date(timestampMs);
    } else {
      date = new Date();
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (isToday) {
      return { label: 'Today', key };
    }
    if (isYesterday) {
      return { label: 'Yesterday', key };
    }

    const isSameYear = date.getFullYear() === now.getFullYear();
    const label = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(isSameYear ? {} : { year: 'numeric' }),
    });

    return { label, key };
  };

  const getMessageTimeString = (timestampMs?: number, fallbackTime?: string): string => {
    if (timestampMs && !isNaN(timestampMs)) {
      return new Date(timestampMs).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return fallbackTime || new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; key: string; items: ChatMessage[] }> = [];

    messages.forEach((msg) => {
      let msgTime = msg.createdAt;
      if (!msgTime) {
        const parsedId = parseInt(msg.id, 10);
        if (!isNaN(parsedId) && parsedId > 1600000000000) {
          msgTime = parsedId;
        }
      }

      const { label, key } = getMessageDateLabel(msgTime, msg.timestamp);
      const existingGroup = groups.find((g) => g.key === key);

      if (existingGroup) {
        existingGroup.items.push(msg);
      } else {
        groups.push({
          label,
          key,
          items: [msg],
        });
      }
    });

    return groups;
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !pendingAttachment) return;

    if (!profile.configured || !profile.username) {
      setIsEditingProfile(true);
      return;
    }

    const now = Date.now();
    const payload = {
      channelId: activeChannel,
      user: profile.username,
      avatar: profile.avatar,
      badge: profile.badge,
      content: inputMessage.trim(),
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            user: replyingTo.user,
            content: replyingTo.content.substring(0, 60),
          }
        : undefined,
      attachment: pendingAttachment || undefined,
    };

    // Optimistic message append
    const optimisticMsg: ChatMessage = {
      id: `${now}-${Math.floor(Math.random() * 10000)}`,
      channelId: activeChannel,
      user: profile.username,
      avatar: profile.avatar,
      content: inputMessage.trim(),
      badge: profile.badge,
      timestamp: new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      createdAt: now,
      replyTo: payload.replyTo,
      attachment: payload.attachment,
    };

    setMessages((prev) => {
      const next = [...prev, optimisticMsg];
      try {
        localStorage.setItem(`yuno_chat_cache_${activeChannel}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    setInputMessage('');
    setReplyingTo(null);
    setPendingAttachment(null);
    setShowAttachmentInput(false);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchMessages();
      }
    } catch (e) {}
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      await fetch('/api/chat/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          emoji,
          username: profile.username || 'Guest',
        }),
      });
      fetchMessages();
    } catch (e) {}
  };

  const renderMessageContent = (content: string) => {
    if (!blurProfanity) return <span>{content}</span>;

    const words = content.split(/(\s+)/);
    return (
      <span>
        {words.map((word, idx) => {
          const lower = word.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isBad = PROFANITY_WORDS.some((b) => lower.includes(b));
          if (isBad) {
            return (
              <span
                key={idx}
                className="inline-block bg-zinc-800 text-transparent hover:text-white px-1 py-0.5 rounded transition-all cursor-pointer select-none font-mono text-[11px] border border-zinc-700 group relative"
                title="Profanity blurred according to Settings"
              >
                [blurred]
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-zinc-900 text-amber-300 text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-zinc-700">
                  Reveal: {word}
                </span>
              </span>
            );
          }
          return <React.Fragment key={idx}>{word}</React.Fragment>;
        })}
      </span>
    );
  };

  // Get active channel display name
  const currentGroup = groupsList.find((g) => g.channels.some((c) => c.id === activeChannel));
  const currentGroupChannel = currentGroup?.channels.find((c) => c.id === activeChannel);

  const currentChannelName =
    currentGroupChannel?.name
      ? `#${currentGroupChannel.name}`
      : activeChannel.startsWith('dm_')
      ? `DM with ${activeChannel.replace('dm_', '').replace(profile.username, '').replace('_', '')}`
      : activeChannel;

  return (
    <div className="h-[calc(100vh-75px)] w-full flex bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,.pdf,.txt,.zip,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPreviewImage}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-zinc-800"
            />
          </div>
        </div>
      )}

      {/* PROFILE SETUP MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-amber-400 mx-auto flex items-center justify-center mb-2 font-bold text-lg">
                Y
              </div>
              <h3 className="text-lg font-bold text-white">Set Up Yunø Chat Handle</h3>
              <p className="text-xs text-zinc-400">Join real-time channels, video & voice calls, and direct messages.</p>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-red-900/30 border border-red-800 text-xs text-red-400 font-medium text-center">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Username / Handle</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g. ShadowRider"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Avatar Image URL (Optional)</label>
                <input
                  type="text"
                  value={tempAvatar}
                  onChange={(e) => setTempAvatar(e.target.value)}
                  placeholder="Paste direct image URL or leave empty for Yunø initials"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors"
              >
                Join Yunø Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Create Group Chat</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Group chat name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* JOIN GROUP MODAL */}
      {showJoinGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Join Group Chat</h3>
              <button onClick={() => setShowJoinGroupModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleJoinGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Group ID or Name..."
                value={groupJoinCode}
                onChange={(e) => setGroupJoinCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW DM MODAL */}
      {showAddDmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Start Direct Message</h3>
              <button onClick={() => setShowAddDmModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDm} className="space-y-3">
              <input
                type="text"
                placeholder="Enter username..."
                value={newDmName}
                onChange={(e) => setNewDmName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl border border-zinc-700"
              >
                Open DM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHAT SIDEBAR (GROUPS & DMS) */}
      <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0">
        {/* Navigation Tabs: Group Chats vs Direct Messages */}
        <div className="p-2 border-b border-zinc-800 flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors ${
              activeTab === 'groups'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            Groups
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors ${
              activeTab === 'dms'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            Direct Messages
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          {activeTab === 'groups' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                  Joined Groups
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowJoinGroupModal(true)}
                    className="text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700"
                    title="Join Group"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="text-zinc-400 hover:text-white p-1"
                    title="Create Group"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Show only groups user has joined or created */}
              {groupsList.filter((g) => joinedGroupIds.includes(g.id) || g.createdBy === profile.username).length === 0 ? (
                <div className="p-3 text-center rounded-lg bg-zinc-950/40 border border-zinc-800/60 space-y-1">
                  <p className="text-[11px] text-zinc-500">No joined group chats.</p>
                  <p className="text-[10px] text-zinc-600">Join or create a group to start.</p>
                </div>
              ) : (
                groupsList
                  .filter((g) => joinedGroupIds.includes(g.id) || g.createdBy === profile.username)
                  .map((grp) => (
                    <div key={grp.id} className="space-y-1">
                      <div className="text-xs font-semibold text-zinc-300 px-2 py-1 flex items-center justify-between">
                        <span className="truncate">{grp.name}</span>
                      </div>
                      {grp.channels.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => setActiveChannel(ch.id)}
                          className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                            activeChannel === ch.id
                              ? 'bg-zinc-800 text-white font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                          }`}
                        >
                          <Hash className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500" />
                          <span className="truncate">{ch.name}</span>
                        </button>
                      ))}
                    </div>
                  ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                  Conversations
                </span>
                <button
                  onClick={() => setShowAddDmModal(true)}
                  className="text-zinc-400 hover:text-white p-1"
                  title="New Direct Message"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {dmsList.length === 0 ? (
                <div className="p-3 text-center rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                  <p className="text-[11px] text-zinc-500">No direct messages.</p>
                </div>
              ) : (
                dmsList.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => setActiveChannel(dm.id)}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                      activeChannel === dm.id
                        ? 'bg-zinc-800 text-white font-semibold'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <UserAvatar username={dm.username} avatar={dm.avatar} size="xs" showOnlineDot isOnline={dm.status === 'Online'} />
                    <span className="truncate">{dm.username}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Handle Footer */}
        <div className="p-2.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <UserAvatar username={profile.username} avatar={profile.avatar} size="sm" showOnlineDot isOnline />
            <div className="truncate">
              <span className="text-xs font-bold text-zinc-200 block truncate">{profile.username}</span>
              <span className="text-[10px] text-emerald-400 font-mono">Online</span>
            </div>
          </div>

          <button
            onClick={() => setIsEditingProfile(true)}
            className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-800 border border-zinc-700"
          >
            Edit
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        {/* Chat Channel Header (Profanity blur removed from here; only in Settings) */}
        <div className="p-3 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <div className="truncate">
              <h3 className="text-xs font-bold text-white truncate">{currentChannelName}</h3>
              <p className="text-[10px] text-zinc-400 truncate hidden sm:block">
                {currentGroupChannel?.topic || (activeChannel.startsWith('dm_') ? 'Direct Message' : 'Chat Channel')}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Real WebRTC Calls */}
            <button
              onClick={() => onStartCall(activeChannel, currentChannelName, 'voice')}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
              title="Start Voice Call"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onStartCall(activeChannel, currentChannelName, 'video')}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
              title="Start Video Call"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onStartCall(activeChannel, currentChannelName, 'screen')}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
              title="Share Screen"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowMemberList(!showMemberList)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
              title="Toggle Online Members"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Announcements Banner */}
        {announcements.length > 0 && (
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center space-x-2 text-xs text-amber-400">
            <Radio className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-bold">ANNOUNCEMENT:</span>
            <span className="truncate text-zinc-300">{announcements[0].content}</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-zinc-700" />
              <h4 className="text-sm font-bold text-zinc-400">Welcome to {currentChannelName}!</h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                This is the start of persistent conversation history. Send messages, voice recordings, and files with everyone.
              </p>
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.key} className="space-y-3">
                {/* Date Group Divider */}
                <div className="flex items-center my-3">
                  <div className="flex-1 border-t border-zinc-800" />
                  <span className="px-3 py-0.5 text-[10px] font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full shadow-sm">
                    {group.label}
                  </span>
                  <div className="flex-1 border-t border-zinc-800" />
                </div>

                {group.items.map((msg) => {
                  const isSelf = msg.user === profile.username;
                  const timeFormatted = getMessageTimeString(msg.createdAt, msg.timestamp);

                  return (
                    <div
                      key={msg.id}
                      className={`group flex items-start space-x-3 p-1.5 -mx-1.5 rounded-xl hover:bg-zinc-900/60 transition-colors relative ${
                        isSelf ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <UserAvatar username={msg.user} avatar={msg.avatar} size="sm" />

                      <div className={`flex-1 min-w-0 space-y-1 ${isSelf ? 'items-end text-right' : ''}`}>
                        {/* Header info */}
                        <div className={`flex items-center space-x-2 ${isSelf ? 'justify-end space-x-reverse' : ''}`}>
                          <span className="text-xs font-bold text-white">{msg.user}</span>
                          {msg.badge && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono border border-amber-500/30">
                              {msg.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">{timeFormatted}</span>
                        </div>

                        {/* Replying banner indicator */}
                        {msg.replyTo && (
                          <div
                            className={`flex items-center space-x-1.5 text-[11px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800/80 ${
                              isSelf ? 'justify-end' : ''
                            }`}
                          >
                            <Reply className="w-3 h-3 text-zinc-500" />
                            <span>
                              <span className="font-semibold text-zinc-300">@{msg.replyTo.user}:</span> {msg.replyTo.content}
                            </span>
                          </div>
                        )}

                        {/* Message content */}
                        {msg.content && (
                          <div
                            className={`text-xs text-zinc-200 leading-relaxed break-words max-w-prose ${
                              isSelf
                                ? 'bg-zinc-800 text-zinc-100 p-2.5 px-3.5 rounded-2xl rounded-tr-sm inline-block border border-zinc-700'
                                : 'bg-zinc-900 text-zinc-200 p-2.5 px-3.5 rounded-2xl rounded-tl-sm inline-block border border-zinc-800'
                            }`}
                          >
                            {renderMessageContent(msg.content)}
                          </div>
                        )}

                        {/* Rich Attachments (Image, Voice / Audio, File) */}
                        {msg.attachment && (
                          <div className={`mt-1.5 ${isSelf ? 'flex justify-end' : ''}`}>
                            {msg.attachment.type === 'image' && (
                              <div
                                onClick={() => setSelectedPreviewImage(msg.attachment?.url || null)}
                                className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 max-w-xs cursor-pointer group/img"
                              >
                                <img
                                  src={msg.attachment.url}
                                  alt="Attachment"
                                  className="max-h-60 w-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                />
                              </div>
                            )}

                            {msg.attachment.type === 'audio' && (
                              <AudioMessagePlayer url={msg.attachment.url} duration={msg.attachment.duration} />
                            )}

                            {msg.attachment.type === 'file' && (
                              <a
                                href={msg.attachment.url}
                                download={msg.attachment.fileName || 'file'}
                                className="flex items-center space-x-2.5 p-2.5 px-3 bg-zinc-900 hover:bg-zinc-800/80 rounded-xl border border-zinc-800 max-w-xs transition-colors"
                              >
                                <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />
                                <div className="truncate flex-1 min-w-0 text-left">
                                  <span className="text-xs font-semibold text-white truncate block">
                                    {msg.attachment.fileName || 'Attached Document'}
                                  </span>
                                  {msg.attachment.fileSize && (
                                    <span className="text-[10px] text-zinc-400 font-mono">
                                      {(msg.attachment.fileSize / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                                <Download className="w-4 h-4 text-zinc-400 hover:text-white" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-1 pt-1 ${isSelf ? 'justify-end' : ''}`}>
                            {msg.reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                onClick={() => handleReact(msg.id, r.emoji)}
                                className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:border-zinc-700 flex items-center space-x-1"
                              >
                                <span>{r.emoji}</span>
                                <span className="font-mono text-zinc-500">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reaction Toolbar */}
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex items-center space-x-1 shadow-md z-10">
                        {EMOJI_PILLS.slice(0, 4).map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className="p-1 hover:bg-zinc-800 rounded text-xs"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Reply"
                        >
                          <Reply className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center space-x-2 truncate">
              <Reply className="w-3.5 h-3.5 text-zinc-400" />
              <span>Replying to <span className="font-bold text-white">@{replyingTo.user}</span>: {replyingTo.content}</span>
            </div>
            <X className="w-3.5 h-3.5 cursor-pointer text-zinc-500 hover:text-white" onClick={() => setReplyingTo(null)} />
          </div>
        )}

        {/* Attachment URL Stager Modal */}
        {showAttachmentInput && (
          <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Paste direct image URL..."
              value={attachmentUrlInput}
              onChange={(e) => setAttachmentUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleAttachUrl}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400"
            >
              Attach
            </button>
            <X className="w-4 h-4 cursor-pointer text-zinc-400 hover:text-white" onClick={() => setShowAttachmentInput(false)} />
          </div>
        )}

        {/* Pending Attachment Preview Banner */}
        {pendingAttachment && (
          <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-200">
            <div className="flex items-center space-x-2 truncate">
              {pendingAttachment.type === 'image' ? (
                <ImageIcon className="w-4 h-4 text-amber-400" />
              ) : pendingAttachment.type === 'audio' ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <FileText className="w-4 h-4 text-blue-400" />
              )}
              <span className="font-medium text-white truncate">{pendingAttachment.fileName || 'Attached item'}</span>
            </div>
            <button
              onClick={() => setPendingAttachment(null)}
              className="text-zinc-400 hover:text-white"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar & Live Voice Recorder */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-2">
          {isRecordingVoice ? (
            <div className="flex items-center justify-between p-2 px-3 bg-red-950/40 border border-red-900 rounded-xl animate-pulse">
              <div className="flex items-center space-x-2.5">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-red-300">Recording Voice Note...</span>
                <span className="text-xs font-mono text-zinc-300">
                  {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCancelVoiceRecording}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs border border-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStopVoiceRecording}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              {/* Media File Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
                title="Upload File / Image / Audio"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Paste Image URL Button */}
              <button
                type="button"
                onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors border border-zinc-700"
                title="Attach Image Link"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder={`Message ${currentChannelName}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />

              {/* Voice Note Button */}
              <button
                type="button"
                onClick={handleStartVoiceRecording}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors border border-zinc-700"
                title="Record Voice Note"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-colors shadow-md"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: REAL ONLINE MEMBERS LIST */}
      {showMemberList && (
        <div className="w-56 bg-zinc-900 border-l border-zinc-800 flex flex-col flex-shrink-0">
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white">Online Users ({activeOnlineUsers.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {activeOnlineUsers.length === 0 ? (
              <p className="text-[11px] text-zinc-500 px-2 py-1 italic">No other users online</p>
            ) : (
              activeOnlineUsers.map((user) => (
                <div
                  key={user.username}
                  className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
                >
                  <UserAvatar username={user.username} avatar={user.avatar} size="xs" showOnlineDot isOnline />
                  <div className="truncate">
                    <span className="text-xs font-medium text-zinc-200 block truncate">{user.username}</span>
                    <span className="text-[9px] text-emerald-400 font-mono">Online</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
