export type NavTab = 'home' | 'games' | 'vivi' | 'movies' | 'youtube' | 'music' | 'settings' | 'links' | 'proxy';

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
  posterUrl?: string;
  backdropUrl?: string;
  description: string;
  genres: string[];
  duration: string;
  youtubeTrailerId?: string;
  seasonsCount?: number;
  episodesCount?: number;
  isTvShow?: boolean;
}

export type StreamSource =
  | 'vidcore'
  | 'viduki'
  | 'vidfast_pro'
  | 'vidlink_pro'
  | 'vidfast_vc'
  | 'vidsrc_to'
  | 'smashystream'
  | 'vidlink_anime'
  | 'streamrip_anime'
  | 'videasy_anime';

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
  coverUrl?: string;
  audioUrl?: string;
  streamUrl?: string;
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

export interface PartnerLink {
  label?: string;
  url: string;
}

export interface PartnerItem {
  id: string;
  name: string;
  logo?: string;
  image?: string;
  url?: string;
  links?: PartnerLink[];
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
  isAdmin?: boolean;
  showNowPlaying?: boolean;
  nowPlaying?: {
    title: string;
    artist: string;
    cover?: string;
    isPlaying: boolean;
  };
}

export interface BanInfo {
  username: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
  banImageUrl?: string;
}

export interface UserReportItem {
  id: string;
  type: 'message' | 'user' | 'bug';
  reporter: string;
  targetUser?: string;
  messageContent?: string;
  messageId?: string;
  channelId?: string;
  reason: string;
  details?: string;
  timestamp: string;
  status: 'open' | 'resolved' | 'dismissed';
}

export interface BugReportItem {
  id: string;
  reporter: string;
  title: string;
  description: string;
  category: 'Streaming' | 'Audio/Music' | 'Games' | 'Chat' | 'UI' | 'Other';
  timestamp: string;
  status: 'open' | 'in_progress' | 'fixed';
}

export interface FriendRequestItem {
  id: string;
  fromUser: string;
  toUser: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

export interface WatchHistoryItem {
  id: string;
  movieId: string;
  title: string;
  image: string;
  mediaType: 'movie' | 'tv' | 'anime';
  season?: number;
  episode?: number;
  timestamp: number;
}

export interface PlayHistoryItem {
  id: string;
  gameId: string;
  title: string;
  image: string;
  category: string;
  timestamp: number;
}

export interface ListenHistoryItem {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  timestamp: number;
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

export interface DmStreakInfo {
  count: number;
  lastDate: string; // YYYY-MM-DD
  lastSender?: string;
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
  | 'dior_sharp'
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

