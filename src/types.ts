export type NavTab = 'home' | 'movies' | 'games' | 'youtube' | 'ai' | 'community' | 'music' | 'settings' | 'proxy' | 'private_chat' | 'halo';

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

export type StreamSource = 'vidcore' | 'vidfast' | 'streamrip' | 'viduki' | 'vidsrc' | 'streamrip-anime';

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

export interface ChatMessage {
  id: string;
  channelId?: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  badge?: string;
  isMe?: boolean;
  replyTo?: {
    id: string;
    user: string;
    content: string;
  };
  attachment?: {
    type: 'image' | 'link';
    url: string;
  };
  reactions?: ChatReaction[];
  hasProfanity?: boolean;
  isUpsideDown?: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  cover: string;
  audioUrl?: string;
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

