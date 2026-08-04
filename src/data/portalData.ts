import { ShortcutItem, MovieItem, GameItem, AiModelOption, MusicTrack, WallpaperOption, PartnerItem, AnnouncementItem } from '../types';

export const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    iconEmoji: '🚀',
    title: 'v2.0 System Update:',
    description: 'Upgraded desktop interface and smooth animations.',
    badge: 'SYSTEM',
    createdAt: 'Today',
  },
  {
    id: 'ann-2',
    iconEmoji: '⚡',
    title: 'Performance Improvements:',
    description: 'Faster loading times and better window management.',
    badge: 'OPTIMIZATION',
    createdAt: 'Today',
  },
];

export const DEFAULT_PARTNERS: PartnerItem[] = [];
import autumnBg from '../assets/images/autumn_landscape_1785047200293.jpg';
import mcSkylineBg from '../assets/images/mc_skyline_cherry_1785119205625.jpg';
import knightStarlitBg from '../assets/images/knight_starlit_tree_1785119215571.jpg';
import samuraiValleyBg from '../assets/images/samurai_misty_valley_1785119223820.jpg';
import mcCherryPondBg from '../assets/images/mc_cherry_pond_night_1785119233644.jpg';
import retroAe86Bg from '../assets/images/retro_ae86_night_1785119250124.jpg';
import redBmwBg from '../assets/images/red_bmw_e30_field_1785119263670.jpg';
import surrealEyeBg from '../assets/images/surreal_cloud_eye_1785119271944.jpg';
import handsCreationBg from '../assets/images/hands_creation_clouds_1785119281273.jpg';
import pinkTulipsBg from '../assets/images/pink_tulips_water_1785119290831.jpg';

export const SHORTCUTS: ShortcutItem[] = [
  { id: '1', name: 'Roblox', url: 'https://now.gg/apps/roblox-corporation/5349/roblox.html', iconName: 'Gamepad2', category: 'Games' },
  { id: '2', name: 'YouTube', url: 'https://youtube.com', iconName: 'Youtube', category: 'Media' },
  { id: '3', name: 'TikTok', url: 'https://tiktok.com', iconName: 'Video', category: 'Media' },
  { id: '4', name: 'GitHub', url: 'https://github.com', iconName: 'Github', category: 'Code' },
  { id: '5', name: 'Twitch', url: 'https://twitch.tv', iconName: 'Tv', category: 'Media' },
  { id: '6', name: 'Instagram', url: 'https://instagram.com', iconName: 'Instagram', category: 'Social' },
  { id: '7', name: 'Spotify', url: 'https://spotify.com', iconName: 'Music', category: 'Media' },
  { id: '8', name: 'Discord', url: 'https://discord.com', iconName: 'MessageSquare', category: 'Social' },
  { id: '9', name: 'ChatGPT', url: 'https://chat.openai.com', iconName: 'Bot', category: 'AI' },
];

export const MOVIES: MovieItem[] = [];

export const GAMES: GameItem[] = [
  {
    id: 'roblox-cloud',
    title: 'Roblox Cloud Unblocked (Yuno-Web)',
    category: 'Popular',
    image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=500&auto=format&fit=crop&q=80',
    description: 'Play Roblox Cloud unblocked directly in your browser.',
    plays: '4.9M',
    rating: 5.0,
    type: 'embed',
    embedUrl: 'https://now.gg/apps/roblox-corporation/5349/roblox.html',
  },
];

export const AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    badge: 'DEFAULT',
    provider: 'GOOGLE',
    category: 'Google Models',
    speed: 'Speed: Ultra Fast',
    description: 'Next gen multimodal model with ultra-fast streaming & high reasoning accuracy.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    badge: 'PRO',
    provider: 'GOOGLE',
    category: 'Google Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Advanced reasoning for complex coding, math, and architectural logic.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'SPEED',
    provider: 'GOOGLE',
    category: 'Google Models',
    speed: 'Speed: Ultra Fast',
    description: 'Lightweight model optimized for rapid low-latency interactions.',
    color: 'from-cyan-400 to-teal-500',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    badge: 'FEATURED',
    provider: 'ANTHROPIC',
    category: 'Anthropic Models',
    speed: 'Speed: Balanced',
    description: 'Top-tier intelligence for coding, nuanced prose, and complex instruction following.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    badge: 'FAST',
    provider: 'ANTHROPIC',
    category: 'Anthropic Models',
    speed: 'Speed: Ultra Fast',
    description: 'Lightning-fast responses with exceptional natural language understanding.',
    color: 'from-orange-400 to-amber-500',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    badge: 'DEEP',
    provider: 'ANTHROPIC',
    category: 'Anthropic Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Deep analytical model for academic writing and deep research tasks.',
    color: 'from-rose-400 to-red-600',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    badge: 'NEW',
    provider: 'DEEPSEEK',
    category: 'DeepSeek Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Cutting-edge open weights model with state-of-the-art coding & reasoning.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 Reasoning',
    badge: 'REASONING',
    provider: 'DEEPSEEK',
    category: 'DeepSeek Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Open thought-of-thought reasoning engine for math, logic, and system engineering.',
    color: 'from-indigo-400 to-purple-600',
  },
  {
    id: 'deepseek-coder-v2',
    name: 'DeepSeek Coder V2',
    badge: 'CODE',
    provider: 'DEEPSEEK',
    category: 'DeepSeek Models',
    speed: 'Speed: Balanced',
    description: 'Specialized 236B parameter programming & codebase synthesis model.',
    color: 'from-purple-400 to-indigo-600',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    badge: 'POPULAR',
    provider: 'OPENAI',
    category: 'OpenAI Models',
    speed: 'Speed: Balanced',
    description: 'Flagship high-intelligence model for multimodal text, vision, and logic.',
    color: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    badge: 'LIGHTWEIGHT',
    provider: 'OPENAI',
    category: 'OpenAI Models',
    speed: 'Speed: Ultra Fast',
    description: 'Efficient, fast, and highly capable model for daily conversational tasks.',
    color: 'from-emerald-400 to-green-500',
  },
  {
    id: 'o1-reasoning',
    name: 'OpenAI o1 Reasoning',
    badge: 'MATH & LOGIC',
    provider: 'OPENAI',
    category: 'OpenAI Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Spends extra time thinking before answering complex logic & scientific problems.',
    color: 'from-sky-400 to-blue-500',
  },
  {
    id: 'o3-mini-high',
    name: 'OpenAI o3-Mini',
    badge: 'STEM',
    provider: 'OPENAI',
    category: 'OpenAI Models',
    speed: 'Speed: Ultra Fast',
    description: 'High-speed reasoning model specialized for coding and STEM disciplines.',
    color: 'from-cyan-300 to-blue-500',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    badge: 'OPEN SOURCE',
    provider: 'META',
    category: 'Meta Models',
    speed: 'Speed: Balanced',
    description: 'Open source powerhouse rivaling closed flagship models in versatility.',
    color: 'from-rose-500 to-pink-500',
  },
  {
    id: 'llama-3.1-405b',
    name: 'Llama 3.1 405B',
    badge: '405B',
    provider: 'META',
    category: 'Meta Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Massive frontier-class open weights model for complex system design.',
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'grok-3',
    name: 'Grok 3 (xAI)',
    badge: 'FRONTIER',
    provider: 'XAI',
    category: 'xAI Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Real-time knowledge integration with witty, direct, and deep explanations.',
    color: 'from-zinc-100 to-zinc-400',
  },
  {
    id: 'grok-2-vision',
    name: 'Grok 2 Vision',
    badge: 'VISION',
    provider: 'XAI',
    category: 'xAI Models',
    speed: 'Speed: Balanced',
    description: 'Advanced vision and visual diagram comprehension.',
    color: 'from-zinc-300 to-slate-500',
  },
  {
    id: 'mistral-large-2',
    name: 'Mistral Large 2',
    badge: 'MULTILINGUAL',
    provider: 'MISTRAL',
    category: 'Other Models',
    speed: 'Speed: Balanced',
    description: 'European flagship model with 128k context and fluent multilingual mastery.',
    color: 'from-yellow-400 to-amber-600',
  },
  {
    id: 'qwen-2.5-max',
    name: 'Qwen 2.5 Max',
    badge: 'CODE HEAVY',
    provider: 'ALIBABA',
    category: 'Other Models',
    speed: 'Speed: Balanced',
    description: 'Alibaba Cloud flagship model excelling in coding, math, and instruction.',
    color: 'from-teal-400 to-emerald-500',
  },
  {
    id: 'gemini-deep-research',
    name: 'Gemini Deep Research',
    badge: 'RESEARCH',
    provider: 'GOOGLE',
    category: 'Google Models',
    speed: 'Speed: Deep Reasoning',
    description: 'Autonomous research agent for deep whitepaper synthesis and data gathering.',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    id: 'perplexity-sonar-pro',
    name: 'Perplexity Sonar Pro',
    badge: 'LIVE WEB',
    provider: 'PERPLEXITY',
    category: 'Other Models',
    speed: 'Speed: Ultra Fast',
    description: 'Search-augmented AI model with real-time web citations.',
    color: 'from-teal-300 to-emerald-500',
  },
  {
    id: 'command-r-plus',
    name: 'Command R+',
    badge: 'RAG',
    provider: 'COHERE',
    category: 'Other Models',
    speed: 'Speed: Balanced',
    description: 'Optimized for enterprise document retrieval and grounded search.',
    color: 'from-violet-400 to-purple-500',
  },
  {
    id: 'yi-lightning',
    name: 'Yi Lightning',
    badge: 'CREATIVE',
    provider: '01.AI',
    category: 'Other Models',
    speed: 'Speed: Ultra Fast',
    description: 'High-speed storytelling and creative narrative generation.',
    color: 'from-amber-300 to-yellow-500',
  },
  {
    id: 'gemma-2-27b',
    name: 'Gemma 2 27B',
    badge: 'EFFICIENT',
    provider: 'GOOGLE',
    category: 'Google Models',
    speed: 'Speed: Ultra Fast',
    description: 'High-performance compact open model developed by DeepMind.',
    color: 'from-blue-300 to-cyan-500',
  },
  {
    id: 'yuno-omni-core',
    name: 'Yunø Omni Core',
    badge: 'PORTAL EXCLUSIVE',
    provider: 'YUNØ',
    category: 'Other Models',
    speed: 'Speed: Ultra Fast',
    description: 'Custom hybrid model blending real-time web search and code execution.',
    color: 'from-cyan-400 via-purple-400 to-indigo-500',
  },
];

export interface FeaturedAlbum {
  id: string;
  artist: 'Tyler, The Creator' | 'Kanye West' | 'Don Toliver' | 'Malcolm Todd';
  title: string;
  year: number;
  cover: string;
  genre: string;
  description: string;
  tracks: { title: string; duration: string; url?: string }[];
}

export const EDITORS_PICKS_ALBUMS: FeaturedAlbum[] = [];

export const MUSIC_TRACKS: MusicTrack[] = [];

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'autumn',
    name: 'Autumn Park Golden Hour (Default)',
    url: autumnBg,
    thumbnail: autumnBg,
    type: 'image',
  },
  {
    id: 'mc_skyline',
    name: 'Minecraft Cherry Skyline R33',
    url: mcSkylineBg,
    thumbnail: mcSkylineBg,
    type: 'image',
  },
  {
    id: 'knight_starlit',
    name: 'Starlit Knight Under Tree',
    url: knightStarlitBg,
    thumbnail: knightStarlitBg,
    type: 'image',
  },
  {
    id: 'samurai_valley',
    name: 'Samurai Overlooking Valley',
    url: samuraiValleyBg,
    thumbnail: samuraiValleyBg,
    type: 'image',
  },
  {
    id: 'mc_cherry_pond',
    name: 'Minecraft Cherry Blossom Pond',
    url: mcCherryPondBg,
    thumbnail: mcCherryPondBg,
    type: 'image',
  },
  {
    id: 'retro_ae86',
    name: 'Retro AE86 Night Blossoms',
    url: retroAe86Bg,
    thumbnail: retroAe86Bg,
    type: 'image',
  },
  {
    id: 'red_bmw_e30',
    name: 'Red Vintage E30 Sunset',
    url: redBmwBg,
    thumbnail: redBmwBg,
    type: 'image',
  },
  {
    id: 'surreal_eye',
    name: 'Surreal Eye in Cloud Sky',
    url: surrealEyeBg,
    thumbnail: surrealEyeBg,
    type: 'image',
  },
  {
    id: 'hands_creation',
    name: 'Aesthetic Sky Hands',
    url: handsCreationBg,
    thumbnail: handsCreationBg,
    type: 'image',
  },
  {
    id: 'pink_tulips',
    name: 'Pink Tulips Sparkle Water',
    url: pinkTulipsBg,
    thumbnail: pinkTulipsBg,
    type: 'image',
  },
];
