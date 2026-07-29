import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, FriendItem, CallState } from '../types';
import {
  Hash,
  Send,
  Users,
  Shield,
  MessageSquare,
  Sparkles,
  Crown,
  Volume2,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  Camera,
  UserPlus,
  MessageCircle,
  User,
  Settings,
  CheckCircle2,
  Image,
  Smile,
  Paperclip,
  Trash2,
  Reply,
  ShieldAlert,
  Flame,
  Radio,
  Eye,
  EyeOff,
  Plus,
  Monitor,
  MoreVertical,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  configured: boolean;
  username: string;
  avatar: string;
  bio: string;
  badge?: string;
}

interface CommunityViewProps {
  callState: CallState;
  onStartCall: (channelId: string, channelName: string, callType: 'voice' | 'video' | 'screen') => void;
  onOpenAdminPanel: () => void;
}

const DEFAULT_CHANNELS = [
  { id: 'global-chat', name: 'global-chat', icon: 'Hash', topic: 'General discussion, streaming & hanging out' },
  { id: 'movies-lounge', name: 'movies-lounge', icon: 'Tv', topic: 'Watch movies & TV shows together' },
  { id: 'gaming-hub', name: 'gaming-hub', icon: 'Gamepad', topic: 'Unblocked arcade games & high scores' },
  { id: 'code-and-ai', name: 'code-and-ai', icon: 'Cpu', topic: 'AI models, prompt engineering & dev projects' },
  { id: 'announcements', name: 'announcements', icon: 'Radio', topic: 'Official Yunø system updates' },
];

const VOICE_CHANNELS = [
  { id: 'global-voice', name: '🔊 Global Voice Lounge', type: 'voice' as const },
  { id: 'movies-watch-party', name: '🎬 Movie Watch Party', type: 'video' as const },
  { id: 'gaming-screen-share', name: '🎮 Gaming Screen Share', type: 'screen' as const },
];

const PROFANITY_WORDS = [
  'shit', 'fuck', 'bitch', 'asshole', 'crap', 'bastard', 'dick', 'pussy', 'slut', 'whore', 'fucking', 'bullshit'
];

// Helper to render user avatar or default icon if no avatar provided
const renderUserAvatar = (url: string | undefined, name: string | undefined, sizeClass: string = "w-8 h-8", borderClass: string = "border border-zinc-700") => {
  if (url && url.trim()) {
    return (
      <img
        src={url}
        alt={name || 'User'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${borderClass}`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 text-cyan-400 font-bold ${borderClass}`}>
      <User className="w-1/2 h-1/2" />
    </div>
  );
};

export const CommunityView: React.FC<CommunityViewProps> = ({
  callState,
  onStartCall,
  onOpenAdminPanel,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('global-chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [showAttachmentInput, setShowAttachmentInput] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Profanity Blur State
  const [blurProfanity, setBlurProfanity] = useState<boolean>(true);

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
      username: '',
      avatar: '',
      bio: 'Yunø Community Member',
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

  // Groups / Servers
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
  const [showAddGroupModal, setShowAddGroupModal] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupBanner, setNewGroupBanner] = useState<string>('');
  const [newGroupPicture, setNewGroupPicture] = useState<string>('');
  const [newGroupChannels, setNewGroupChannels] = useState<string>('general, lounge');

  // Active Users Online (no presets)
  const [activeOnlineUsers, setActiveOnlineUsers] = useState<
    Array<{ username: string; avatar: string; status: string }>
  >([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<Array<{ id: string; content: string; createdAt: string; author: string }>>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat stream
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch DMs
  const fetchDms = async () => {
    if (!profile.username) return;
    try {
      const res = await fetch(`/api/chat/dms?username=${encodeURIComponent(profile.username)}`);
      if (res.ok) {
        const data = await res.json();
        setDmsList(data.dms || []);
      }
    } catch (e) {
      console.warn('Failed to fetch DMs:', e);
    }
  };

  // Fetch Groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/chat/groups');
      if (res.ok) {
        const data = await res.json();
        setGroupsList(data.groups || []);
      }
    } catch (e) {
      console.warn('Failed to fetch groups:', e);
    }
  };

  // Fetch Active Users
  const fetchActiveUsers = async () => {
    try {
      const res = await fetch('/api/chat/active-users');
      if (res.ok) {
        const data = await res.json();
        setActiveOnlineUsers(data.activeUsers || []);
      }
    } catch (e) {
      console.warn('Failed to fetch active users:', e);
    }
  };

  // Create DM handler
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
      } else {
        const err = await res.json();
        alert(err.error || 'Could not create DM');
      }
    } catch (err) {
      console.error('Create DM failed:', err);
    }
  };

  // Create Group handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name || !profile.username) return;

    const channelsArray = newGroupChannels
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          banner: newGroupBanner.trim(),
          picture: newGroupPicture.trim(),
          createdBy: profile.username,
          channels: channelsArray,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowAddGroupModal(false);
        setNewGroupName('');
        setNewGroupBanner('');
        setNewGroupPicture('');
        setNewGroupChannels('general, lounge');
        await fetchGroups();
        if (data.group && data.group.channels && data.group.channels.length > 0) {
          setActiveChannel(data.group.channels[0].id);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Could not create group');
      }
    } catch (err) {
      console.error('Create Group failed:', err);
    }
  };

  useEffect(() => {
    fetchDms();
    fetchGroups();
    fetchActiveUsers();

    const interval = setInterval(() => {
      fetchDms();
      fetchGroups();
      fetchActiveUsers();
    }, 4000);

    return () => clearInterval(interval);
  }, [profile.username]);

  // Fetch messages from backend
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?channelId=${activeChannel}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.announcements) setAnnouncements(data.announcements);
      }
    } catch (e) {
      console.warn('Failed to fetch chat messages:', e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Profile Save & Security Check for "Yuno dev isa"
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmed = tempName.trim();
    if (!trimmed) {
      setProfileError('Username is required.');
      return;
    }

    // Check if user is attempting to claim "Yuno dev isa" or "isaman"
    const lowerTrimmed = trimmed.toLowerCase();
    let assignedBadge = 'MEMBER';
    if (lowerTrimmed === 'yuno dev isa' || lowerTrimmed === 'isaman') {
      try {
        const clientKey = localStorage.getItem('yuno_client_key') || `client-${Date.now()}`;
        localStorage.setItem('yuno_client_key', clientKey);

        const res = await fetch('/api/admin/claim-developer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: trimmed, clientKey }),
        });

        const claimData = await res.json();
        if (!res.ok || !claimData.claimed) {
          setProfileError(
            claimData.error || `The handle '${trimmed}' is taken and secured by another administrator session. Please choose another username.`
          );
          return;
        }
        assignedBadge = 'ADMIN / DEV';
      } catch (err) {
        setProfileError('Network error checking developer credentials.');
        return;
      }
    }

    const updatedProfile: UserProfile = {
      configured: true,
      username: trimmed,
      avatar: tempAvatar ? tempAvatar.trim() : '',
      bio: 'Yunø Community Member',
      badge: assignedBadge,
    };

    setProfile(updatedProfile);
    localStorage.setItem('yuno_user_profile', JSON.stringify(updatedProfile));
    setIsEditingProfile(false);
  };

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && !attachmentUrl.trim()) return;

    if (!profile.configured || !profile.username) {
      setIsEditingProfile(true);
      return;
    }

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
      attachment: attachmentUrl.trim()
        ? {
            type: 'image' as const,
            url: attachmentUrl.trim(),
          }
        : undefined,
    };

    setInputMessage('');
    setReplyingTo(null);
    setAttachmentUrl('');
    setShowAttachmentInput(false);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchMessages();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to send message.');
      }
    } catch (e) {
      console.error('Send message failed:', e);
    }
  };

  // Add Emoji Reaction
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
    } catch (e) {
      console.warn('React error:', e);
    }
  };

  // Format Message Text with Profanity Blur
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
                className="inline-block bg-zinc-800 text-transparent hover:text-white backdrop-blur-md px-1.5 py-0.5 rounded transition-all cursor-pointer select-none font-mono text-[11px] border border-red-500/30 group relative"
                title="Profanity blurred. Hover or tap to reveal"
              >
                ██████
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/90 text-amber-300 text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-amber-500/40">
                  Click to reveal: {word}
                </span>
              </span>
            );
          }
          return <React.Fragment key={idx}>{word}</React.Fragment>;
        })}
      </span>
    );
  };

  const isAdminUser = profile.username.trim() === 'Yuno dev isa';

  return (
    <div className="h-[calc(100vh-100px)] w-full flex flex-col bg-zinc-950/90 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
      {/* Setup Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center mb-2">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">Join Yunø Community</h3>
              <p className="text-xs text-zinc-400">Choose your handle to start chatting and sharing calls.</p>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-xs text-red-300 font-bold text-center">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                  DISPLAY NAME / HANDLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Here"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Profile Avatar Upload / URL / Go Without */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-zinc-300 uppercase">
                    Profile Picture (Optional)
                  </label>
                  {tempAvatar && (
                    <button
                      type="button"
                      onClick={() => setTempAvatar('')}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Remove Picture
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
                  {tempAvatar ? (
                    <img src={tempAvatar} alt="Preview" className="w-12 h-12 rounded-xl object-cover ring-2 ring-cyan-500/40" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-cyan-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <label className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-bold cursor-pointer transition-colors border border-zinc-700">
                      <Image className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                      <span>Upload Picture...</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) {
                                setTempAvatar(ev.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="url"
                      placeholder="or paste image URL..."
                      value={tempAvatar}
                      onChange={(e) => setTempAvatar(e.target.value)}
                      className="w-full px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-cyan-500 truncate"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Upload an image file, paste a direct URL, or leave blank to continue without a profile picture.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-sm shadow-xl hover:brightness-110 transition-all"
              >
                JOIN COMMUNITY CHAT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main 3-Column Desktop Chat Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: LEFT SIDEBAR (Channels & Direct Messages) */}
        <div className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between select-none">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">Yunø Community</h3>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Network</span>
                </span>
              </div>
            </div>
          </div>

          {/* Channels & Voice Scroll */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            {/* Text Channels */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                TEXT CHANNELS
              </span>
              {DEFAULT_CHANNELS.map((ch) => {
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-lg'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <Hash className="w-4 h-4 text-cyan-400/80" />
                    <span className="truncate">{ch.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Voice & Video Party Channels */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                VOICE & WATCH PARTIES
              </span>
              {VOICE_CHANNELS.map((vc) => (
                <button
                  key={vc.id}
                  onClick={() => onStartCall(vc.id, vc.name, vc.type)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-300 border border-transparent hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Volume2 className="w-4 h-4 text-emerald-400 group-hover:animate-bounce" />
                    <span className="truncate">{vc.name}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    JOIN
                  </span>
                </button>
              ))}
            </div>

            {/* GROUPS / CUSTOM SERVERS */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  GROUPS & SERVERS
                </span>
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="text-zinc-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
                  title="Create New Group"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {groupsList.map((grp) => (
                <div key={grp.id} className="space-y-1 rounded-2xl bg-zinc-900/60 p-2 border border-zinc-800/60 my-1">
                  {/* Group Header Banner & Picture */}
                  <div className="relative h-12 w-full rounded-xl overflow-hidden border border-zinc-800">
                    <img src={grp.banner} alt={grp.name} className="w-full h-full object-cover brightness-75" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 space-x-2">
                      <img src={grp.picture} alt={grp.name} className="w-6 h-6 rounded-lg object-cover ring-1 ring-cyan-400 flex-shrink-0" />
                      <span className="text-xs font-black text-white truncate drop-shadow">{grp.name}</span>
                    </div>
                  </div>

                  {/* Group Channels List */}
                  <div className="space-y-0.5 pt-1 pl-1">
                    {grp.channels.map((c) => {
                      const isActive = activeChannel === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setActiveChannel(c.id)}
                          className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <Hash className="w-3.5 h-3.5 text-cyan-400/80" />
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Messages */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                  DIRECT MESSAGES
                </span>
                <button
                  onClick={() => setShowAddDmModal(true)}
                  className="text-zinc-500 hover:text-cyan-400 p-0.5 rounded transition-colors"
                  title="New DM"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {dmsList.length === 0 ? (
                <div className="p-2 text-[11px] text-zinc-600 font-mono text-center">
                  No DMs yet. Click + to add!
                </div>
              ) : (
                dmsList.map((dm) => {
                  const isActive = activeChannel === dm.id;
                  return (
                    <button
                      key={dm.id}
                      onClick={() => setActiveChannel(dm.id)}
                      className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-lg'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      {renderUserAvatar(dm.avatar, dm.username, "w-5 h-5", "border border-zinc-800")}
                      <span className="truncate">{dm.username}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* User Footer Card */}
          <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between">
            <div
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center space-x-2.5 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
            >
              {renderUserAvatar(profile.avatar, profile.username || 'My Avatar', "w-8 h-8", "border border-cyan-500/50")}
              <div className="truncate">
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-bold text-white truncate">{profile.username || 'Set Handle'}</span>
                  {isAdminUser && <Crown className="w-3 h-3 text-amber-400" />}
                </div>
                <span className="text-[10px] text-zinc-400 block truncate">{profile.badge || 'MEMBER'}</span>
              </div>
            </div>

            {isAdminUser && (
              <button
                onClick={onOpenAdminPanel}
                className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
                title="Open Admin & Developer Control Panel"
              >
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* COLUMN 2: MIDDLE MAIN CHAT PANEL */}
        <div className="flex-1 flex flex-col bg-zinc-950/60 overflow-hidden">
          {/* Channel Header Bar */}
          <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Hash className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-black text-white">{activeChannel}</h2>
                <p className="text-[11px] text-zinc-400">
                  {DEFAULT_CHANNELS.find((c) => c.id === activeChannel)?.topic || 'Direct Message Channel'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Profanity Blur Toggle */}
              <button
                onClick={() => setBlurProfanity(!blurProfanity)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  blurProfanity
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title="Toggle Profanity Blur Filter"
              >
                {blurProfanity ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{blurProfanity ? 'blurProfanity ON' : 'blurProfanity OFF'}</span>
              </button>

              {/* Start Call Launchers */}
              <button
                onClick={() => onStartCall(activeChannel, `# ${activeChannel}`, 'voice')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors"
                title="Start Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall(activeChannel, `# ${activeChannel}`, 'video')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-cyan-400 transition-colors"
                title="Start Video Call"
              >
                <Video className="w-4 h-4" />
              </button>
              <button
                onClick={() => onStartCall(activeChannel, `# ${activeChannel}`, 'screen')}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-indigo-400 transition-colors"
                title="Share Screen"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Announcements Banner */}
          {announcements.length > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 p-2.5 px-4 flex items-center space-x-2 text-xs text-amber-300 font-medium">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
              <span className="font-bold">GLOBAL ANNOUNCEMENT:</span>
              <span className="truncate">{announcements[0].content}</span>
            </div>
          )}

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <MessageSquare className="w-12 h-12 text-zinc-700" />
                <h4 className="text-sm font-bold text-zinc-400">No messages in this channel yet</h4>
                <p className="text-xs text-zinc-600">Be the first to say hello!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.user === profile.username;
                const isDevAdmin = msg.user === 'Yuno dev isa' || msg.badge?.includes('ADMIN');

                return (
                  <div
                    key={msg.id}
                    className={`group relative flex space-x-3 p-2.5 rounded-2xl transition-all ${
                      isMe ? 'bg-cyan-950/20 border border-cyan-500/20' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    {renderUserAvatar(
                      msg.avatar,
                      msg.user,
                      "w-9 h-9",
                      isDevAdmin ? 'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'border-zinc-700'
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold ${isDevAdmin ? 'text-amber-400' : 'text-white'}`}>
                          {msg.user}
                        </span>

                        {isDevAdmin && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                            DEV / ADMIN
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-500">{msg.timestamp}</span>
                      </div>

                      {/* Reply quote */}
                      {msg.replyTo && (
                        <div className="p-2 rounded-xl bg-zinc-900 border-l-2 border-cyan-500 text-xs text-zinc-400">
                          <span className="font-bold text-cyan-400 mr-1">@{msg.replyTo.user}:</span>
                          <span>{msg.replyTo.content}</span>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="text-xs text-zinc-200 leading-relaxed break-words">
                        {renderMessageContent(msg.content)}
                      </div>

                      {/* Image Attachment */}
                      {msg.attachment && msg.attachment.url && (
                        <div className="mt-2 max-w-sm rounded-xl overflow-hidden border border-zinc-800">
                          <img src={msg.attachment.url} alt="Attachment" className="w-full object-cover max-h-60" />
                        </div>
                      )}

                      {/* Reaction Emojis Row */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.reactions.map((r, rIdx) => (
                            <button
                              key={rIdx}
                              onClick={() => handleReact(msg.id, r.emoji)}
                              className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:border-cyan-500/40 flex items-center space-x-1"
                            >
                              <span>{r.emoji}</span>
                              <span className="font-mono text-[10px] text-cyan-400">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Hover Toolbar */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex items-center space-x-1 shadow-lg">
                      {['👍', '❤️', '🔥', '👑'].map((emoji) => (
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
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center space-x-2 truncate">
                <Reply className="w-3.5 h-3.5 text-cyan-400" />
                <span>Replying to <span className="font-bold text-cyan-300">@{replyingTo.user}</span>: {replyingTo.content}</span>
              </div>
              <X className="w-4 h-4 cursor-pointer text-zinc-500 hover:text-white" onClick={() => setReplyingTo(null)} />
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 bg-zinc-900/90 border-t border-zinc-800">
            {showAttachmentInput && (
              <div className="mb-2 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Paste image URL attachment..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <X className="w-4 h-4 cursor-pointer text-zinc-400" onClick={() => setShowAttachmentInput(false)} />
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-400 transition-colors"
                title="Attach Image"
              >
                <Image className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Message #${activeChannel}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800/80 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() && !attachmentUrl.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-bold disabled:opacity-40 hover:brightness-110 shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* COLUMN 3: RIGHT SIDEBAR (Online Members) */}
        <div className="w-56 bg-zinc-950 border-l border-zinc-800/80 p-4 hidden md:flex flex-col space-y-4 select-none">
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
            <Users className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">ONLINE MEMBERS</h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Developer / Admin Section */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                ADMIN / DEVELOPERS
              </span>
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80"
                    alt="Yuno dev isa"
                    className="w-8 h-8 rounded-full object-cover border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
                </div>
                <div className="truncate">
                  <span className="text-xs font-bold text-amber-300 block truncate">Yuno dev isa</span>
                  <span className="text-[9px] font-mono text-amber-400/80">DEV OWNER</span>
                </div>
              </div>
            </div>

            {/* Active Online Members */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                ONLINE MEMBERS ({activeOnlineUsers.length + (profile.username ? 1 : 0)})
              </span>

              {/* Current user */}
              {profile.username && (
                <div className="flex items-center space-x-2.5 p-1.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                  <div className="relative">
                    {renderUserAvatar(profile.avatar, profile.username, "w-7 h-7", "border border-cyan-400")}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-cyan-300 block truncate">{profile.username} (You)</span>
                    <span className="text-[9px] text-zinc-400 block truncate">{profile.badge || 'Online'}</span>
                  </div>
                </div>
              )}

              {/* Server Active Users */}
              {activeOnlineUsers.filter((u) => u.username !== profile.username).map((m) => (
                <div key={m.username} className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-zinc-900 transition-colors">
                  <div className="relative">
                    {renderUserAvatar(m.avatar, m.username, "w-7 h-7", "border border-zinc-700")}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-medium text-zinc-200 block truncate">{m.username}</span>
                    <span className="text-[9px] text-zinc-500 block truncate">{m.status || 'Active'}</span>
                  </div>
                </div>
              ))}

              {activeOnlineUsers.length === 0 && !profile.username && (
                <div className="text-[10px] text-zinc-600 font-mono text-center p-2">
                  No other active members online right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE DM MODAL */}
      {showAddDmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Create Direct Message</h4>
              </div>
              <button onClick={() => setShowAddDmModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDm} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Target Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter handle e.g. Kairo_Dev..."
                  value={newDmName}
                  onChange={(e) => setNewDmName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDmModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg hover:brightness-110"
                >
                  Start DM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-cyan-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Create Group / Server</h4>
              </div>
              <button onClick={() => setShowAddGroupModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Gaming Guild, Arcade Squad..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Group Banner Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newGroupBanner}
                  onChange={(e) => setNewGroupBanner(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Group Picture / Logo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newGroupPicture}
                  onChange={(e) => setNewGroupPicture(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-400 font-bold uppercase">Text Channels / Sections (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. general, announcements, lounge, clips"
                  value={newGroupChannels}
                  onChange={(e) => setNewGroupChannels(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black text-xs font-bold shadow-lg hover:brightness-110"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
