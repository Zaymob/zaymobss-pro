export type NavTab = 'home' | 'movies' | 'games' | 'youtube' | 'ai' | 'community' | 'music' | 'settings' | 'proxy' | 'private_chat' | 'links';

export interface ProxyBrowserTab {
  id: string;
  title: string;
  url: string;
  inputUrl: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
  error: string | null;
  favicon?: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  channelAvatar?: string;
  viewCount?: string;
  duration?: string;
  isLive?: boolean;
}

export interface ShortcutItem {
  id: string;
  name: string;
  url: string;
  iconName: string;
  category: string;
}

export interface MovieItem {
  id: string;
  tmdbId?: number;
  anilistId?: number;
  mediaType?: 'movie' | 'tv' | 'anime';
  title: string;
  year: number;
  rating: number;
  category: 'trending' | 'fresh' | 'popular' | 'anime' | 'shows' | string;
  image: string;
  backdrop: string;
  description: string;
  genres: string[];
  duration: string;
  youtubeTrailerId?: string;
  seasonsCount?: number;
  episodesCount?: number;
}

export type StreamSource =
  | 'vidfast'
  | 'vidcore'
  | 'streamrip'
  | 'viduki'
  | 'vidsrc'
  | 'streamrip-anime';

export interface GameItem {
  id: string;
  title: string;
  category: 'Popular' | 'Action' | 'Puzzle' | 'Arcade' | 'Retro';
  image: string;
  description: string;
  plays: string;
  rating: number;
  type: 'canvas' | 'embed';
  canvasGameType?: '2048' | 'snake' | 'flappy' | 'wordle' | 'space_invaders' | 'tetris' | 'dino';
  embedUrl?: string;
}

export interface AiModelOption {
  id: string;
  name: string;
  badge?: string;
  provider: string;
  description: string;
  color: string;
  speed?: string;
  category?: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatAttachment {
  type: 'image' | 'audio' | 'link' | 'file';
  url: string;
  fileName?: string;
  duration?: number; // duration in seconds for voice notes
  fileSize?: string;
}

export interface ChatMessage {
  id: string;
  channelId?: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  createdAt?: number;
  badge?: string;
  isMe?: boolean;
  replyTo?: {
    id: string;
    user: string;
    content: string;
  };
  attachment?: ChatAttachment;
  reactions?: ChatReaction[];
  hasProfanity?: boolean;
  isUpsideDown?: boolean;
}

export interface MusicTrack {
  id: string;
  songId?: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  cover: string;
  audioUrl?: string;
  lrcUrl?: string;
  jooxMsg?: string;
  jooxN?: number;
  audioFreqs?: number[];
  genre: string;
  synthType?: 'lofi' | 'synthwave' | 'ambient' | 'chill';
}

export interface WallpaperOption {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  type: 'image' | 'video' | 'gif' | 'gradient';
}

export interface PartnerItem {
  id: string;
  name: string;
  logo: string;
  url: string;
  description?: string;
  addedAt?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  iconEmoji?: string;
  badge?: string;
  createdAt?: string;
}

export interface UserProfile {
  username: string;
  displayName: string;
  avatar: string;
  banner: string;
  status: string;
  bio: string;
  badge: string;
  accentColor: string;
}

export interface FriendItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  status: 'Online' | 'Away' | 'In Game' | 'In Call' | 'Offline';
  customStatus?: string;
  badge?: string;
}

export interface CallParticipant {
  id: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
}

export interface CallState {
  isActive: boolean;
  channelId: string;
  channelName: string;
  callType: 'voice' | 'video' | 'screen';
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  durationSeconds: number;
  participants: CallParticipant[];
}

export interface UserModerationInfo {
  username: string;
  avatar: string;
  status: string;
  isBanned: boolean;
  isTimedOut: boolean;
  timeoutUntil?: string;
  trollDisco?: boolean;
  trollUpsideDown?: boolean;
}

export interface ProfanityConfig {
  blurProfanity: boolean;
  strictness: 'strict' | 'standard' | 'off';
  customBadwords: string[];
}

export interface PlaybackContext {
  type: 'playlist' | 'general';
  playlistId?: string;
  playlistTracks?: MusicTrack[];
}

export interface TabMaskPreset {
  id: string;
  name: string;
  title: string;
  icon: string;
  category: 'Google' | 'School' | 'Tools' | 'Reference' | 'Custom';
  description?: string;
}

export interface TabCloakSettings {
  activeMaskId: string;
  customTitle: string;
  customIcon: string;
  panicKey: string;
  panicUrl: string;
  antiCloseEnabled: boolean;
  autoAboutBlank: boolean;
}

export type AiSpeakingStyle =
  | 'jacks_cough'
  | 'sarcastic'
  | 'chill'
  | 'concise'
  | 'academic'
  | 'tutor'
  | 'custom'
  | 'friendly'
  | 'cyberpunk'
  | 'pirate';

export type AiResponseSpeed = 'fast' | 'smooth' | 'balanced' | 'instant' | 'thoughtful';
export type AiEmojiMode = 'heavily' | 'standard' | 'minimal' | 'none';

export interface AiPersonalitySettings {
  style: AiSpeakingStyle;
  customToneText?: string;
  speed: AiResponseSpeed;
  emojiMode: AiEmojiMode;
  userCallSign: string; // What AI calls the user (e.g. "user", "Boss", "bruh", username)
  customPrompt: string; // Custom instructions
  customSymbolRules: string; // Formatting / symbol rules (e.g. "use symbols for list items")
  memoryEnabled: boolean;
  memories: string[]; // Cross-chat persistent memories / facts
  creativity: number; // 0 to 100
}

export interface ChatPreferences {
  enableProfanityFilter: boolean;
  blurProfanity: boolean;
  profanityStrictness: 'strict' | 'standard' | 'off';
  blockedWords: string[];
  soundEffects: boolean;
  compactMode: boolean;
  showTimestamps: boolean;
  autoScroll: boolean;
}

export interface BanAppealItem {
  id: string;
  username: string;
  reason: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
}

