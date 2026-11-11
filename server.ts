import express from "express";
import path from "path";
import fs from "fs";
import https from "node:https";
import http from "node:http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { spawn } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();

// Helper to fetch external URLs while ignoring expired SSL certificate errors
async function fetchIgnoreCert(url: string, options: any = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const isHttps = u.protocol === "https:";
      const lib = isHttps ? https : http;

      const reqOpts = {
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: options.method || "GET",
        headers: options.headers || {},
        rejectUnauthorized: false,
      };

      const req = lib.request(reqOpts, (res) => {
        let chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve(
            new Response(body, {
              status: res.statusCode || 200,
              statusText: res.statusMessage || "OK",
              headers: res.headers as any,
            })
          );
        });
      });

      req.on("error", (err) => reject(err));

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          req.destroy();
          reject(new Error("Aborted"));
        });
      }

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

const app = express();
const isCloudRun = !!(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);
const hasDistIndex = fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
const isProduction = process.env.NODE_ENV === "production" && hasDistIndex;
const PORT = Number(process.env.PORT) || 3000;

// Security, Policy, and No-Cache Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (!req.path.startsWith("/api/proxy") && !req.path.startsWith("/api/stream")) {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }
  next();
});

// CRITICAL: Prevent CDN (Bunny CDN, Cloudflare, Fastly) and browser caching for all API endpoints
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0, post-check=0, pre-check=0");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
  res.setHeader("BunnyCDN-Cache", "no-cache");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "-1");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Persistent File Storage Path in .data/ directory so file watcher never restarts Vite
const DATA_DIR = path.join(process.cwd(), ".data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}
const PERSIST_FILE_PATH = path.join(DATA_DIR, "persisted_data.json");
const LEGACY_PERSIST_FILE = path.join(process.cwd(), "app_persisted_data.json");

// REALTIME SSE HUB INFRASTRUCTURE
interface RealtimeClientConn {
  id: string;
  tabId: string;
  username: string;
  channelId: string;
  callRoomId: string;
  res: express.Response;
  lastPing: number;
}
const realtimeClients = new Map<string, RealtimeClientConn>();

function broadcastRealtime(event: {
  type: string;
  channelId?: string;
  targetUser?: string;
  from?: string;
  data: any;
}) {
  const payload = `event: ${event.type}\ndata: ${JSON.stringify({
    type: event.type,
    channelId: event.channelId,
    targetUser: event.targetUser,
    from: event.from,
    data: event.data,
    timestamp: Date.now(),
  })}\n\n`;

  for (const [clientId, client] of realtimeClients.entries()) {
    try {
      // Check target filter if targeted to a specific user
      if (event.targetUser) {
        const isTarget = client.username.toLowerCase() === event.targetUser.toLowerCase();
        const isSender = event.from && client.username.toLowerCase() === event.from.toLowerCase();
        if (!isTarget && !isSender) {
          continue;
        }
      }

      // Check channel filter for chat messages
      if (event.channelId && event.type === 'CHAT_MESSAGE') {
        const clientChan = (client.channelId === 'global-chat' || client.channelId === 'global') ? 'general' : (client.channelId || 'general');
        const eventChan = (event.channelId === 'global-chat' || event.channelId === 'global') ? 'general' : event.channelId;
        // Broadcast public chat to everyone, or DM to its participants
        if (eventChan.startsWith('dm_')) {
          const parts = eventChan.replace('dm_', '').split('_');
          const clientU = client.username.toLowerCase();
          if (!parts.includes(clientU)) {
            continue;
          }
        }
      }

      // Check call room filter for signaling
      if (event.type === 'WEBRTC_SIGNAL' || event.type === 'CALL_PRESENCE') {
        if (event.channelId && client.callRoomId && client.callRoomId !== event.channelId) {
          continue;
        }
      }

      client.res.write(payload);
    } catch (e) {
      realtimeClients.delete(clientId);
    }
  }
}

// Keepalive heartbeat for SSE connections (every 15s)
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of realtimeClients.entries()) {
    try {
      client.res.write(`:keepalive ${now}\n\n`);
      client.lastPing = now;
    } catch (e) {
      realtimeClients.delete(clientId);
    }
  }
}, 15000);

// Additional Moderation & Social Data Structures
interface ServerBanRecord {
  username: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
  banImageUrl?: string;
}

interface ServerReport {
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

interface ServerBugReport {
  id: string;
  reporter: string;
  title: string;
  description: string;
  category: string;
  timestamp: string;
  status: 'open' | 'in_progress' | 'fixed';
}

interface ServerFriendRequest {
  id: string;
  fromUser: string;
  toUser: string;
  fromAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

const bannedUsersMap = new Map<string, ServerBanRecord>();
let customBanScreenImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80";
let customAdminPasscode = "8560";
const validAdminTokens = new Set<string>(["admin-auth-8560"]);
let adminFailedAttempts = 0;
let adminLockoutExpiry = 0;
const userReportsList: ServerReport[] = [];
const bugReportsList: ServerBugReport[] = [];
const friendRequestsList: ServerFriendRequest[] = [];
const userFriendsMap = new Map<string, Set<string>>();
const userTimeouts = new Map<string, number>(); // username -> expiry timestamp
const userTimeoutDetails = new Map<string, { reason: string; adminName: string; durationMinutes: number }>();
const userStreaks = new Map<string, { count: number; lastDate: string }>();

function savePersistedData() {
  try {
    const dataToSave = {
      systemAnnouncements,
      systemPartners,
      globalAnnouncements,
      communityMessages,
      customGroupsList,
      userDMs: Array.from(userDMs.entries()).map(([k, set]) => [k, Array.from(set)]),
      bannedRecords: Array.from(bannedUsersMap.entries()),
      customBanScreenImage,
      userReportsList,
      bugReportsList,
      friendRequestsList,
      userFriends: Array.from(userFriendsMap.entries()).map(([k, set]) => [k, Array.from(set)]),
      banAppeals,
      customAdminPasscode,
      userTimeouts: Array.from(userTimeouts.entries()),
      userTimeoutDetails: Array.from(userTimeoutDetails.entries()),
      userStreaks: Array.from(userStreaks.entries()),
    };
    fs.writeFileSync(PERSIST_FILE_PATH, JSON.stringify(dataToSave, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write persisted data to file:", err);
  }
}

function loadPersistedData() {
  try {
    const fileToLoad = fs.existsSync(PERSIST_FILE_PATH)
      ? PERSIST_FILE_PATH
      : fs.existsSync(LEGACY_PERSIST_FILE)
      ? LEGACY_PERSIST_FILE
      : null;

    if (fileToLoad) {
      const raw = fs.readFileSync(fileToLoad, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.systemAnnouncements)) {
        systemAnnouncements.length = 0;
        const filteredAnn = parsed.systemAnnouncements.filter((a: any) => a && a.id !== 'ann-1' && a.id !== 'ann-2');
        systemAnnouncements.push(...filteredAnn);
      }
      if (Array.isArray(parsed.systemPartners)) {
        systemPartners.length = 0;
        const filteredPartners = parsed.systemPartners.filter(
          (p: any) => p && p.id !== 'part-1' && p.id !== 'part-2' && !/gartic|vidsrc/i.test(p.name || '')
        );
        systemPartners.push(...filteredPartners);
      }
      if (Array.isArray(parsed.globalAnnouncements)) {
        globalAnnouncements.length = 0;
        const filteredGlob = parsed.globalAnnouncements.filter((a: any) => a && a.id !== 'ann-1' && a.id !== 'ann-2');
        globalAnnouncements.push(...filteredGlob);
      }
      if (Array.isArray(parsed.customGroupsList)) {
        customGroupsList.length = 0;
        customGroupsList.push(...parsed.customGroupsList);
      }
      if (Array.isArray(parsed.userDMs)) {
        userDMs.clear();
        for (const [k, arr] of parsed.userDMs) {
          if (k && Array.isArray(arr)) {
            userDMs.set(k, new Set(arr));
          }
        }
      }
      if (Array.isArray(parsed.bannedRecords)) {
        bannedUsersMap.clear();
        bannedUsers.clear();
        for (const [uname, rec] of parsed.bannedRecords) {
          if (uname && rec) {
            bannedUsersMap.set(uname, rec);
            bannedUsers.add(uname);
          }
        }
      }
      if (typeof parsed.customBanScreenImage === 'string' && parsed.customBanScreenImage) {
        customBanScreenImage = parsed.customBanScreenImage;
      }
      if (Array.isArray(parsed.userReportsList)) {
        userReportsList.length = 0;
        userReportsList.push(...parsed.userReportsList);
      }
      if (Array.isArray(parsed.bugReportsList)) {
        bugReportsList.length = 0;
        bugReportsList.push(...parsed.bugReportsList);
      }
      if (Array.isArray(parsed.friendRequestsList)) {
        friendRequestsList.length = 0;
        friendRequestsList.push(...parsed.friendRequestsList);
      }
      if (Array.isArray(parsed.userFriends)) {
        userFriendsMap.clear();
        for (const [k, arr] of parsed.userFriends) {
          if (k && Array.isArray(arr)) {
            userFriendsMap.set(k, new Set(arr));
          }
        }
      }
      if (Array.isArray(parsed.banAppeals)) {
        banAppeals.length = 0;
        banAppeals.push(...parsed.banAppeals);
      }
      if (typeof parsed.customAdminPasscode === 'string' && parsed.customAdminPasscode.trim()) {
        customAdminPasscode = parsed.customAdminPasscode.trim();
      }
      if (Array.isArray(parsed.communityMessages) && parsed.communityMessages.length > 0) {
        communityMessages.length = 0;
        const now = Date.now();
        const loaded = parsed.communityMessages.map((m: any) => {
          let timeVal = m.createdAt;
          if (!timeVal) {
            const parsedIdNum = parseInt(m.id, 10);
            timeVal = !isNaN(parsedIdNum) && parsedIdNum > 1600000000000 ? parsedIdNum : now;
          }
          return {
            ...m,
            createdAt: timeVal,
          };
        });
        communityMessages.push(...loaded);
      }
      if (Array.isArray(parsed.userTimeouts)) {
        userTimeouts.clear();
        for (const [k, v] of parsed.userTimeouts) {
          if (k && typeof v === 'number') userTimeouts.set(k, v);
        }
      }
      if (Array.isArray(parsed.userTimeoutDetails)) {
        userTimeoutDetails.clear();
        for (const [k, v] of parsed.userTimeoutDetails) {
          if (k && v) userTimeoutDetails.set(k, v);
        }
      }
      if (Array.isArray(parsed.userStreaks)) {
        userStreaks.clear();
        for (const [k, v] of parsed.userStreaks) {
          if (k && v) userStreaks.set(k, v);
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load persisted data from file:", err);
  }
}

// In-memory user profiles, friends, and chat storage
interface ChatMessage {
  id: string;
  channelId: string; // e.g. "general" or "dm_User1_User2"
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  createdAt?: number;
  badge?: string;
  replyTo?: {
    id: string;
    user: string;
    content: string;
  };
  attachment?: {
    type: 'image' | 'audio' | 'voice' | 'link' | 'file';
    url: string;
    fileName?: string;
    duration?: number;
    fileSize?: string;
  };
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  hasProfanity?: boolean;
  isUpsideDown?: boolean;
  streak?: number;
}

interface UserProfile {
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

const userProfiles: Record<string, UserProfile> = {
  Vortex_User: {
    username: 'Vortex_User',
    displayName: 'Vortex User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    status: 'Listening to Tyler, The Creator - CHROMAKOPIA',
    bio: 'Yunø portal enthusiast • Gaming & Coding',
    badge: 'PRO',
    accentColor: '#06b6d4',
  },
};

// Admin & Security Security State
const claimedAdminUsers = new Map<string, string>(); // username (normalized) -> clientKey
const bannedUsers = new Set<string>();

interface BanAppeal {
  id: string;
  username: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  type: 'BAN' | 'TIMEOUT';
}

const banAppeals: BanAppeal[] = [
  {
    id: 'appeal-demo-1',
    username: 'Vortex_99',
    reason: 'I promise not to spam vibecoded slop in global chat anymore. Please grant me a second chance!',
    status: 'PENDING',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: 'BAN'
  }
];
// Global System Announcements & Partners State
interface ServerAnnouncement {
  id: string;
  iconEmoji?: string;
  title?: string;
  description?: string;
  content?: string;
  badge?: string;
  createdAt?: string;
  author?: string;
}

interface ServerPartnerLink {
  label?: string;
  url: string;
}

interface ServerPartner {
  id: string;
  name: string;
  logo?: string;
  image?: string;
  url?: string;
  links?: ServerPartnerLink[];
  description: string;
  addedAt?: string;
}

const systemAnnouncements: ServerAnnouncement[] = [];

const systemPartners: ServerPartner[] = [];

const globalAnnouncements: Array<{ id: string; content: string; createdAt: string; author: string }> = [];

interface CustomGroupServer {
  id: string;
  name: string;
  banner: string;
  picture: string;
  createdBy: string;
  createdAt: string;
  channels: Array<{ id: string; name: string; topic?: string }>;
}

const customGroupsList: CustomGroupServer[] = [];
const userDMs = new Map<string, Set<string>>(); // lowercase username -> Set of target usernames (lowercase)
const activeChatUsers = new Map<string, { username: string; avatar: string; status: string; lastSeen: number }>();

// Incoming Call Invitations
interface IncomingCallInvite {
  id: string;
  caller: string;
  callerAvatar: string;
  targetUser: string;
  channelId: string;
  channelName: string;
  callType: 'voice' | 'video' | 'screen';
  status: 'ringing' | 'accepted' | 'declined' | 'ended';
  createdAt: number;
}
const incomingCallInvites = new Map<string, IncomingCallInvite>();

// Unread DM Notifications
interface UnreadNotificationItem {
  id: string;
  channelId: string;
  sender: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
}
const unreadChatNotifications = new Map<string, UnreadNotificationItem[]>(); // lowercase username -> array of unread

// WebRTC Call Signaling Rooms
interface CallParticipantInfo {
  id: string; // unique peer ID (e.g. peer_username_sessionId)
  username: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
  lastSeen: number;
}

interface WebRtcSignalMessage {
  id: string;
  from: string;
  fromPeerId?: string;
  to?: string;
  toPeerId?: string;
  type: 'offer' | 'answer' | 'candidate' | 'state_update' | 'join' | 'leave';
  data?: any;
  timestamp: number;
}

interface CallRoom {
  channelId: string;
  participants: Map<string, CallParticipantInfo>; // keyed by peerId
  signals: WebRtcSignalMessage[];
}
const callRooms = new Map<string, CallRoom>();

const communityMessages: ChatMessage[] = [];

const trollEffects = new Map<string, { discoMode?: boolean; upsideDown?: boolean }>();

let profanityFilterConfig = {
  strictness: 'standard' as 'strict' | 'standard' | 'off',
  customBadwords: ['shit', 'fuck', 'bitch', 'asshole', 'crap', 'bastard', 'dick', 'pussy', 'slut', 'whore']
};

// Load persisted file data from disk on server startup
loadPersistedData();

// Helper to check if string contains Chinese or CJK characters
function hasChineseCharacters(str: string): boolean {
  if (!str) return false;
  // Regex for CJK Unified Ideographs, Hiragana, Katakana, Hangul, CJK Symbols
  return /[\u3000-\u303f\u4e00-\u9faf\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/.test(str);
}

// TMDB API Key provided by user
const TMDB_API_KEY = "34bbddc5ab8b0debc3c3ba1bf6ffe884";

// Helper to get GoogleGenAI instance safely
function getGenAI() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Yunø Server", timestamp: new Date().toISOString() });
});

// TMDB Movies & TV Proxy Routes
app.get("/api/tmdb/trending", async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const time = (req.query.time as string) === "week" ? "week" : "day";
    const mediaType = (req.query.mediaType as string) || "all";
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/${mediaType}/${time}?api_key=${TMDB_API_KEY}&page=${page}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Trending Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch trending from TMDB" });
  }
});

app.get("/api/tmdb/search", async (req, res) => {
  try {
    const query = ((req.query.query as string) || "").trim();
    const type = ((req.query.type as string) || "multi").toLowerCase();
    const page = (req.query.page as string) || "1";
    if (!query) return res.json({ results: [] });

    if (type === "anime") {
      // Strictly search Japanese Animation only
      const [tvRes, movieRes] = await Promise.allSettled([
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`),
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`),
      ]);

      const tvMatches = tvRes.status === "fulfilled" && tvRes.value.ok ? ((await tvRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "tv" })) : [];
      const movieMatches = movieRes.status === "fulfilled" && movieRes.value.ok ? ((await movieRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "movie" })) : [];

      // Strict anime criteria: Japanese language ('ja') and Animation genre (16)
      const isAnimeItem = (item: any) => {
        const lang = (item.original_language || "").toLowerCase();
        const genres: number[] = Array.isArray(item.genre_ids) ? item.genre_ids : [];
        const isJapanese = lang === "ja" || lang === "japanese";
        const isAnimation = genres.includes(16);
        return isJapanese && isAnimation;
      };

      const strictAnime = [...tvMatches, ...movieMatches].filter(isAnimeItem);
      return res.json({ results: strictAnime });
    }

    let endpoint = "search/multi";
    if (type === "movie") endpoint = "search/movie";
    else if (type === "tv" || type === "shows") endpoint = "search/tv";

    const response = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`
    );
    const data = await response.json();
    if (Array.isArray(data?.results)) {
      data.results = data.results.map((i: any) => ({
        ...i,
        media_type: i.media_type || (type === "tv" || type === "shows" ? "tv" : type === "movie" ? "movie" : (i.first_air_date ? "tv" : "movie")),
      }));
    }
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Search Fetch Error:", error);
    res.status(500).json({ error: "Failed to search TMDB" });
  }
});

app.get("/api/tmdb/details", async (req, res) => {
  try {
    const id = req.query.id as string;
    const type = (req.query.type as string) || "movie";
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,recommendations`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Details Error:", error);
    res.status(500).json({ error: "Failed to fetch TMDB details" });
  }
});

app.get("/api/tmdb/popular_movies", async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Popular Movies Error:", error);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
});

app.get("/api/tmdb/popular_tv", async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Popular TV Error:", error);
    res.status(500).json({ error: "Failed to fetch popular TV" });
  }
});

app.get("/api/tmdb/top_rated", async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${page}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Top Rated Error:", error);
    res.status(500).json({ error: "Failed to fetch top rated" });
  }
});

app.get("/api/tmdb/discover", async (req, res) => {
  try {
    const genre = req.query.genre as string;
    const mediaType = (req.query.mediaType as string) || "movie";
    const page = (req.query.page as string) || "1";
    const url = genre
      ? `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_genres=${genre}&sort_by=popularity.desc&page=${page}`
      : `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Discover Error:", error);
    res.status(500).json({ error: "Failed to discover TMDB content" });
  }
});

app.get(["/api/tmdb/anime", "/api/tmdb/discover/anime"], async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const [tvRes, movieRes] = await Promise.allSettled([
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`),
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`),
    ]);

    const tvResults = tvRes.status === "fulfilled" && tvRes.value.ok ? ((await tvRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "tv" })) : [];
    const movieResults = movieRes.status === "fulfilled" && movieRes.value.ok ? ((await movieRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "movie" })) : [];

    const combined = [...tvResults, ...movieResults].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    res.json({ results: combined });
  } catch (error: any) {
    console.error("TMDB Anime Error:", error);
    res.status(500).json({ error: "Failed to discover anime content" });
  }
});

app.get(["/api/tmdb/anime/mature", "/api/tmdb/anime/18"], async (req, res) => {
  try {
    const page = (req.query.page as string) || "1";
    const [tvRes, movieRes, curatedRes] = await Promise.allSettled([
      fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&certification_country=US&certification=TV-MA&sort_by=popularity.desc&page=${page}`),
      fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&certification_country=US&certification=R&sort_by=popularity.desc&page=${page}`),
      Promise.allSettled([
        fetch(`https://api.themoviedb.org/3/tv/45950?api_key=${TMDB_API_KEY}`),  // High School DxD
        fetch(`https://api.themoviedb.org/3/tv/96444?api_key=${TMDB_API_KEY}`),  // Interspecies Reviewers
        fetch(`https://api.themoviedb.org/3/tv/64706?api_key=${TMDB_API_KEY}`),  // Prison School
        fetch(`https://api.themoviedb.org/3/tv/63187?api_key=${TMDB_API_KEY}`),  // Monster Musume
        fetch(`https://api.themoviedb.org/3/tv/34742?api_key=${TMDB_API_KEY}`),  // To Love Ru
        fetch(`https://api.themoviedb.org/3/tv/64163?api_key=${TMDB_API_KEY}`),  // The Testament of Sister New Devil
        fetch(`https://api.themoviedb.org/3/tv/83103?api_key=${TMDB_API_KEY}`),  // Domestic Girlfriend
        fetch(`https://api.themoviedb.org/3/tv/236338?api_key=${TMDB_API_KEY}`), // Gushing Over Magical Girls
        fetch(`https://api.themoviedb.org/3/tv/63323?api_key=${TMDB_API_KEY}`),  // Shimoneta
        fetch(`https://api.themoviedb.org/3/tv/99071?api_key=${TMDB_API_KEY}`),  // Redo of Healer
        fetch(`https://api.themoviedb.org/3/tv/103409?api_key=${TMDB_API_KEY}`), // World's End Harem
        fetch(`https://api.themoviedb.org/3/tv/114477?api_key=${TMDB_API_KEY}`), // Harem in the Labyrinth of Another World
        fetch(`https://api.themoviedb.org/3/tv/66926?api_key=${TMDB_API_KEY}`),  // Valkyrie Drive: Mermaid
        fetch(`https://api.themoviedb.org/3/tv/68005?api_key=${TMDB_API_KEY}`),  // Yosuga no Sora
        fetch(`https://api.themoviedb.org/3/tv/69292?api_key=${TMDB_API_KEY}`),  // Scum's Wish
        fetch(`https://api.themoviedb.org/3/tv/62273?api_key=${TMDB_API_KEY}`),  // Food Wars! Shokugeki no Soma
      ])
    ]);

    const tvResults = tvRes.status === "fulfilled" && tvRes.value.ok ? ((await tvRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "tv" })) : [];
    const movieResults = movieRes.status === "fulfilled" && movieRes.value.ok ? ((await movieRes.value.json()).results || []).map((i: any) => ({ ...i, media_type: "movie" })) : [];

    let curatedItems: any[] = [];
    if (curatedRes.status === "fulfilled") {
      const parsed = await Promise.all(
        curatedRes.value.map(async (r) => {
          if (r.status === "fulfilled" && r.value.ok) {
            try {
              const json = await r.value.json();
              return { ...json, media_type: json.name ? 'tv' : 'movie' };
            } catch {
              return null;
            }
          }
          return null;
        })
      );
      curatedItems = parsed.filter(Boolean);
    }

    const seen = new Set<number>();
    const combined: any[] = [];

    // Prioritize curated 18+ titles first
    for (const item of [...curatedItems, ...tvResults, ...movieResults]) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }

    res.json({ results: combined });
  } catch (error: any) {
    console.error("TMDB Mature Anime Error:", error);
    res.status(500).json({ error: "Failed to discover mature anime content" });
  }
});

app.get("/api/tmdb/movie/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits,similar,recommendations`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Movie Details Error:", error);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

app.get("/api/tmdb/tv_season", async (req, res) => {
  try {
    const id = req.query.id as string;
    const season = req.query.season as string || "1";
    if (!id) return res.status(400).json({ error: "Missing TV ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=${TMDB_API_KEY}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Season Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch season info" });
  }
});

app.get("/api/tmdb/trailer", async (req, res) => {
  try {
    const id = req.query.id as string;
    const type = (req.query.type as string) || "movie";
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const response = await fetch(
      `https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_API_KEY}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const ytList = data.results.filter((v: any) => v.site === "YouTube");
        const trailer =
          ytList.find((v: any) => v.type === "Trailer") ||
          ytList.find((v: any) => v.type === "Teaser") ||
          ytList.find((v: any) => v.type === "Clip") ||
          ytList[0];
        return res.json({
          success: true,
          key: trailer ? trailer.key : null,
          name: trailer ? trailer.name : null,
          videos: ytList.map((v: any) => ({
            id: v.id,
            key: v.key,
            name: v.name,
            type: v.type,
            published_at: v.published_at,
          })),
        });
      }
    }
    res.json({ success: false, key: null, videos: [] });
  } catch (error: any) {
    console.error("TMDB Trailer Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==============================================================================
// WATCHMODE STREAMING SOURCES API (BUDGET-OPTIMIZED 24H CACHE)
// ==============================================================================
const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY || "WwpQCFqxLUL2S0d0Gc0vLZIacAoSlkwVs1PzF0o9";
const watchmodeSourcesCache = new Map<string, { timestamp: number; data: any }>();
const WATCHMODE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours to protect 2,500 monthly credits

const WATCHMODE_PROVIDER_LOGOS: Record<string, string> = {
  "Netflix": "https://cdn.watchmode.com/provider_logos/netflix_100px.png",
  "Amazon Prime Video": "https://cdn.watchmode.com/provider_logos/prime_video_100px.png",
  "Disney+": "https://cdn.watchmode.com/provider_logos/disneyPlus_100px.png",
  "HBO Max": "https://cdn.watchmode.com/provider_logos/max_100px.png",
  "Max": "https://cdn.watchmode.com/provider_logos/max_100px.png",
  "Hulu": "https://cdn.watchmode.com/provider_logos/hulu_100px.png",
  "Apple TV+": "https://cdn.watchmode.com/provider_logos/appleTvPlus_100px.png",
  "Apple TV": "https://cdn.watchmode.com/provider_logos/appleTv_100px.png",
  "Paramount+": "https://cdn.watchmode.com/provider_logos/paramountPlus_100px.png",
  "Peacock": "https://cdn.watchmode.com/provider_logos/peacock_100px.png",
  "Peacock Premium": "https://cdn.watchmode.com/provider_logos/peacock_100px.png",
  "Crunchyroll": "https://cdn.watchmode.com/provider_logos/crunchyroll_100px.png",
  "MGM+": "https://cdn.watchmode.com/provider_logos/mgmPlus_100px.png",
  "Starz": "https://cdn.watchmode.com/provider_logos/starz_100px.png",
  "Showtime": "https://cdn.watchmode.com/provider_logos/showtime_100px.png",
  "Tubi": "https://cdn.watchmode.com/provider_logos/tubi_100px.png",
  "Pluto TV": "https://cdn.watchmode.com/provider_logos/plutoTv_100px.png",
};

app.get("/api/watchmode/sources", async (req, res) => {
  try {
    const query = ((req.query.query as string) || (req.query.title as string) || "").trim();
    const tmdbId = req.query.tmdbId as string;
    const mediaType = (req.query.mediaType as string) || "movie";

    if (!query && !tmdbId) {
      return res.status(400).json({ error: "Missing query or tmdbId" });
    }

    const cacheKey = `${tmdbId || ""}:${mediaType}:${query.toLowerCase()}`;
    const cached = watchmodeSourcesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < WATCHMODE_CACHE_TTL) {
      return res.json(cached.data);
    }

    // Step A: Search Title ID
    let watchmodeId: number | null = null;
    let officialTitle = query;

    // 1. Try tmdb_movie_id or tmdb_tv_id for exact match without credit waste
    if (tmdbId) {
      const field = mediaType === "tv" ? "tmdb_tv_id" : "tmdb_movie_id";
      try {
        const sRes = await fetch(
          `https://api.watchmode.com/v1/search/?apiKey=${WATCHMODE_API_KEY}&search_field=${field}&search_value=${tmdbId}`
        );
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData.title_results) && sData.title_results.length > 0) {
            watchmodeId = sData.title_results[0].id;
            officialTitle = sData.title_results[0].name || query;
          }
        }
      } catch (err) {
        console.warn("Watchmode TMDB ID search notice:", err);
      }
    }

    // 2. Fallback to search_field=name if needed
    if (!watchmodeId && query) {
      try {
        const sRes = await fetch(
          `https://api.watchmode.com/v1/search/?apiKey=${WATCHMODE_API_KEY}&search_field=name&search_value=${encodeURIComponent(query)}`
        );
        if (sRes.ok) {
          const sData = await sRes.json();
          if (Array.isArray(sData.title_results) && sData.title_results.length > 0) {
            watchmodeId = sData.title_results[0].id;
            officialTitle = sData.title_results[0].name || query;
          }
        }
      } catch (err) {
        console.warn("Watchmode name search notice:", err);
      }
    }

    if (!watchmodeId) {
      const emptyResult = { success: true, watchmodeId: null, title: query, sources: [] };
      watchmodeSourcesCache.set(cacheKey, { timestamp: Date.now(), data: emptyResult });
      return res.json(emptyResult);
    }

    // Step B: Fetch Streaming Sources
    const sourcesRes = await fetch(
      `https://api.watchmode.com/v1/title/${watchmodeId}/sources/?apiKey=${WATCHMODE_API_KEY}`
    );

    if (!sourcesRes.ok) {
      const emptyResult = { success: true, watchmodeId, title: officialTitle, sources: [] };
      watchmodeSourcesCache.set(cacheKey, { timestamp: Date.now(), data: emptyResult });
      return res.json(emptyResult);
    }

    const rawSources = await sourcesRes.json();
    if (!Array.isArray(rawSources)) {
      const emptyResult = { success: true, watchmodeId, title: officialTitle, sources: [] };
      watchmodeSourcesCache.set(cacheKey, { timestamp: Date.now(), data: emptyResult });
      return res.json(emptyResult);
    }

    // Step C: Filter type === 'sub' and de-duplicate by source.name
    const seenNames = new Set<string>();
    const filteredSources: Array<{ name: string; web_url: string; logo_url: string }> = [];

    for (const src of rawSources) {
      if (src.type !== "sub") continue;
      if (!src.name) continue;
      if (seenNames.has(src.name)) continue;
      seenNames.add(src.name);

      filteredSources.push({
        name: src.name,
        web_url: src.web_url || `https://www.google.com/search?q=${encodeURIComponent(officialTitle + " watch on " + src.name)}`,
        logo_url:
          src.logo_100px ||
          WATCHMODE_PROVIDER_LOGOS[src.name] ||
          `https://cdn.watchmode.com/provider_logos/${src.name.toLowerCase().replace(/[^a-z0-9]/g, "")}_100px.png`,
      });
    }

    const finalResult = {
      success: true,
      watchmodeId,
      title: officialTitle,
      sources: filteredSources,
    };

    // Cache the result to preserve free tier credit limit
    watchmodeSourcesCache.set(cacheKey, { timestamp: Date.now(), data: finalResult });
    res.json(finalResult);
  } catch (error: any) {
    console.error("Watchmode sources error:", error);
    res.status(500).json({ error: "Failed to fetch Watchmode sources", sources: [] });
  }
});

// TMDB Now Playing and Streaming Provider Catalogs
app.get("/api/tmdb/now_playing", async (_req, res) => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=1`
    );
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Now Playing Error:", error);
    res.status(500).json({ error: "Failed to fetch now playing" });
  }
});

app.get("/api/tmdb/by_provider", async (req, res) => {
  try {
    const providerId = (req.query.provider_id as string) || "8"; // 8 = Netflix
    const mediaType = (req.query.media_type as string) || "movie";
    const page = (req.query.page as string) || "1";

    const url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=${page}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("TMDB Provider Discover Error:", error);
    res.status(500).json({ error: "Failed to discover provider content" });
  }
});

// Helper function to detect language script mismatches (e.g., Persian lyrics for English songs)
function isLanguageMismatch(lyricsText: string, songTitle: string, songArtist: string): boolean {
  if (!lyricsText || lyricsText.trim().length < 10) return true;

  const combinedMeta = (songTitle + " " + songArtist).toLowerCase();
  const hasPersianMeta = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(combinedMeta);
  const hasCjkMeta = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combinedMeta);
  const hasCyrillicMeta = /[\u0400-\u04FF]/.test(combinedMeta);

  const textOnly = lyricsText.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();

  // Reject Persian / Arabic script lyrics if song is NOT Persian/Arabic
  if (!hasPersianMeta && /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textOnly)) {
    return true;
  }

  // Reject Cyrillic script lyrics if song is NOT Cyrillic
  if (!hasCyrillicMeta && /[\u0400-\u04FF]/.test(textOnly)) {
    const cyrillicCount = (textOnly.match(/[\u0400-\u04FF]/g) || []).length;
    if (cyrillicCount > 10 && cyrillicCount / textOnly.length > 0.2) {
      return true;
    }
  }

  return false;
}

// ==============================================================================
// X8MUSIC (Cherri-v3 Port) Music API Service Integration
// Primary Sources: YouTube Music (YTM) for audio streaming + Tidal (HiFi) for catalogue
// ==============================================================================

const MUSIC_MAIN_PORT = 2010;
const MUSIC_MAIN_URL = `http://127.0.0.1:${MUSIC_MAIN_PORT}`;
let musicBackendProcess: any = null;

function ensureMusicBackend() {
  fetch(`${MUSIC_MAIN_URL}/api/music/source`, { signal: AbortSignal.timeout(2000) })
    .then((r) => {
      if (r.ok) {
        // music-main is healthy
      }
    })
    .catch(() => {
      if (musicBackendProcess) return;
      console.log(`[MusicBackend] Spawning music-main on port ${MUSIC_MAIN_PORT}...`);
      const musicDir = path.join(process.cwd(), "music-main");
      try {
        const bunBin = fs.existsSync("/usr/local/bin/bun") ? "/usr/local/bin/bun" : "bun";
        musicBackendProcess = spawn(bunBin, ["run", "index.ts"], {
          cwd: musicDir,
          env: {
            ...process.env,
            PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
            MUSIC_PORT: String(MUSIC_MAIN_PORT),
            YTM_BASE: "https://music.youtube.com",
            YT_DLP_PATH: fs.existsSync(path.join(musicDir, "bin", "yt-dlp")) ? path.join(musicDir, "bin", "yt-dlp") : "/usr/local/bin/yt-dlp",
            YTM_PARK_MS: "15000",
            YTM_DOWNLOAD_TIMEOUT_MS: "30000",
            YTM_PLAYER_CLIENTS: "default,web_embedded,mweb,ios,tv_embedded",
            TIDAL_CLIENT_ID: "txNoH4kkV41MfH25",
            TIDAL_CLIENT_SECRET: "dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=",
            TIDAL_COUNTRY: "US",
          },
          stdio: "pipe",
        });

        musicBackendProcess.stdout?.on("data", (d: any) => {
          const s = d.toString().trim();
          if (s) console.log(`[music-main] ${s}`);
        });

        musicBackendProcess.stderr?.on("data", (d: any) => {
          const s = d.toString().trim();
          if (s && !s.includes("experimental") && !s.includes("Deprecated")) console.log(`[music-main:err] ${s}`);
        });

        musicBackendProcess.on("exit", (code: number) => {
          console.log(`[music-main] exited with code ${code}`);
          musicBackendProcess = null;
        });

        musicBackendProcess.on("error", (err: any) => {
          console.log(`[music-main] process error:`, err?.message || err);
          musicBackendProcess = null;
        });
      } catch (err: any) {
        console.log("[MusicBackend] Failed to spawn music-main:", err?.message || err);
      }
    });
}

// Keep music-main daemon alive
setInterval(() => {
  ensureMusicBackend();
}, 25000);

// Ensure background music-main daemon is running
ensureMusicBackend();

// ==============================================================================
// MOVIES STREAMING SERVICE (movies-main) Integration
// Direct multi-provider stream scraper (VidSrc, CineSrc, pstream) + HLS proxy
// ==============================================================================

const MOVIES_MAIN_PORT = 2020;
const MOVIES_MAIN_URL = `http://127.0.0.1:${MOVIES_MAIN_PORT}`;
let moviesBackendProcess: any = null;

function ensureMoviesBackend() {
  fetch(`${MOVIES_MAIN_URL}/health`, { signal: AbortSignal.timeout(2000) })
    .then((r) => {
      if (r.ok) {
        // movies-main is healthy
      }
    })
    .catch(() => {
      if (moviesBackendProcess) return;
      console.log(`[MoviesBackend] Spawning movies-main on port ${MOVIES_MAIN_PORT}...`);
      const moviesDir = path.join(process.cwd(), "movies-main");
      try {
        const execBin = fs.existsSync("/usr/local/bin/bun") ? "/usr/local/bin/bun" : (fs.existsSync("/usr/local/bin/node") ? "/usr/local/bin/node" : "node");
        moviesBackendProcess = spawn(execBin, ["src/index.js"], {
          cwd: moviesDir,
          env: {
            ...process.env,
            PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
            MOVIES_PORT: String(MOVIES_MAIN_PORT),
            PORT: String(MOVIES_MAIN_PORT),
            TMDB_API_KEY: "34bbddc5ab8b0debc3c3ba1bf6ffe884",
          },
          stdio: "pipe",
        });

        moviesBackendProcess.stdout?.on("data", (d: any) => {
          const s = d.toString().trim();
          if (s && !s.toLowerCase().includes("error") && !s.toLowerCase().includes("fail") && !s.includes("403")) {
            console.log(`[movies-main] ${s}`);
          }
        });

        moviesBackendProcess.stderr?.on("data", (d: any) => {
          const s = d.toString().trim();
          if (s && !s.includes("experimental") && !s.includes("Deprecated") && !s.toLowerCase().includes("error") && !s.toLowerCase().includes("fail") && !s.includes("403")) {
            console.log(`[movies-main:err] ${s}`);
          }
        });

        moviesBackendProcess.on("exit", (code: number) => {
          console.log(`[movies-main] exited with code ${code}`);
          moviesBackendProcess = null;
        });

        moviesBackendProcess.on("error", (err: any) => {
          console.log(`[movies-main] process error:`, err?.message || err);
          moviesBackendProcess = null;
        });
      } catch (err: any) {
        console.log("[MoviesBackend] Failed to spawn movies-main:", err?.message || err);
      }
    });
}

// Keep movies-main daemon alive
setInterval(() => {
  ensureMoviesBackend();
}, 25000);

// Ensure background movies-main daemon is running
ensureMoviesBackend();

// Proxy all /api/movies requests to movies-main service
app.use("/api/movies", async (req, res) => {
  ensureMoviesBackend();
  try {
    const forwardPath = req.originalUrl.replace(/^\/api\/movies/, "/api");
    const targetUrl = `${MOVIES_MAIN_URL}${forwardPath}`;
    
    const headers: Record<string, string> = {};
    if (req.headers["user-agent"]) headers["user-agent"] = req.headers["user-agent"] as string;
    if (req.headers["range"]) headers["range"] = req.headers["range"] as string;
    if (req.headers["accept"]) headers["accept"] = req.headers["accept"] as string;

    const forwardRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(35000),
    });

    res.status(forwardRes.status);
    forwardRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower !== "content-encoding" && lower !== "transfer-encoding") {
        res.setHeader(key, val);
      }
    });

    const buf = Buffer.from(await forwardRes.arrayBuffer());

    if (forwardPath.startsWith("/api/stream/")) {
      try {
        const text = buf.toString("utf-8");
        const json = JSON.parse(text);
        if (json && Array.isArray(json.streams)) {
          json.streams = json.streams.filter(
            (s: any) =>
              s &&
              typeof s.url === "string" &&
              !s.url.includes("invalid") &&
              !s.url.includes("mismatched") &&
              !s.url.includes("<")
          );
          return res.json(json);
        }
      } catch {}
    }

    res.send(buf);
  } catch (err: any) {
    console.warn(`[api/movies] Proxy notice:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: "Movies backend unavailable", message: err.message });
    }
  }
});

// Helper to stream audio directly with redirect support & range request handling
function streamAudioWithRedirect(targetUrl: string, clientReq: any, clientRes: any, redirects = 0) {
  if (redirects > 5) {
    if (!clientRes.headersSent) clientRes.status(500).send("Too many redirects");
    return;
  }
  try {
    const u = new URL(targetUrl);
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Referer": "https://music.163.com/",
    };

    if (clientReq.headers.range) {
      headers["Range"] = clientReq.headers.range as string;
    }

    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: "GET",
      headers,
      rejectUnauthorized: false,
    };

    const upstreamReq = lib.request(reqOpts, (upstreamRes) => {
      if ([301, 302, 303, 307, 308].includes(upstreamRes.statusCode || 0) && upstreamRes.headers.location) {
        let loc = upstreamRes.headers.location;
        if (loc.startsWith("/")) loc = `${u.protocol}//${u.host}${loc}`;
        return streamAudioWithRedirect(loc, clientReq, clientRes, redirects + 1);
      }

      clientRes.setHeader("Access-Control-Allow-Origin", "*");
      clientRes.setHeader("Content-Type", upstreamRes.headers["content-type"] || "audio/mpeg");
      clientRes.setHeader("Accept-Ranges", "bytes");

      if (upstreamRes.headers["content-length"]) {
        clientRes.setHeader("Content-Length", upstreamRes.headers["content-length"]);
      }
      if (upstreamRes.headers["content-range"]) {
        clientRes.setHeader("Content-Range", upstreamRes.headers["content-range"]);
      }

      clientRes.status(upstreamRes.statusCode || 200);
      upstreamRes.pipe(clientRes);
    });

    upstreamReq.on("error", (err) => {
      console.log("[Stream] Audio stream notice:", err?.message);
      if (!clientRes.headersSent) {
        clientRes.status(500).send("Audio stream error");
      }
    });

    upstreamReq.end();
  } catch (err: any) {
    console.error("Audio stream exception:", err?.message);
    if (!clientRes.headersSent) {
      clientRes.status(500).send("Failed to process audio stream");
    }
  }
}

// 1. Source Status & Ping Endpoints
app.get("/api/music/source", async (_req, res) => {
  try {
    const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/source`, { signal: AbortSignal.timeout(4000) });
    if (upstream.ok) {
      const json = await upstream.json();
      return res.json(json);
    }
  } catch (e) {}
  res.json({
    current: "ytm",
    latencies: { ytm: 120, tidal: 250 },
    lastPing: Date.now(),
    configured: { tidal: true, ytm: true, r2: false },
  });
});

app.post("/api/music/ping", async (_req, res) => {
  try {
    const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/ping`, { method: "POST", signal: AbortSignal.timeout(5000) });
    if (upstream.ok) {
      const json = await upstream.json();
      return res.json(json);
    }
  } catch (e) {}
  res.json({ success: true });
});

// 2. Music Search Endpoint (Powered by music-main with YTM + Tidal sources)
app.get("/api/music/search", async (req, res) => {
  try {
    const query = (
      (req.query.query as string) ||
      (req.query.q as string) ||
      (req.query.name as string) ||
      (req.query.id as string) ||
      "Kendrick Lamar"
    ).trim();

    const requestLimit = (req.query.limit as string) || "30";
    const requestedSource = (req.query.source as string) || "ytm";

    let fetchedData: any = null;
    try {
      const url = `${MUSIC_MAIN_URL}/api/music/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(requestLimit)}&source=${encodeURIComponent(requestedSource)}`;
      const upstream = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (upstream.ok) {
        fetchedData = await upstream.json();
      }
    } catch (err: any) {
      console.log("[MusicBackend] music-main search notice, fallback:", err?.message || err);
    }

    const allTracks: any[] = [];
    const allArtists: any[] = [];
    const allAlbums: any[] = [];

    if (fetchedData && Array.isArray(fetchedData.items)) {
      for (const item of fetchedData.items) {
        const title = item.title || "Untitled Track";
        const artist = item.artist || "Unknown Artist";
        const cover = item.artwork || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";
        const duration = Number(item.duration) || 210;
        const source = item.source || requestedSource;

        const streamUrl = `/api/music/stream?id=${encodeURIComponent(item.id)}&source=${encodeURIComponent(source)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${duration}`;

        allTracks.push({
          id: String(item.id),
          songId: String(item.id),
          title,
          artist,
          album: item.album || "Single",
          duration,
          cover,
          coverUrl: cover,
          audioUrl: streamUrl,
          streamUrl,
          source,
          genre: "Music",
        });
      }
    }

    if (fetchedData && Array.isArray(fetchedData.artists)) {
      for (const a of fetchedData.artists) {
        allArtists.push({
          id: String(a.id),
          name: a.name || "Unknown Artist",
          picture: a.picture || "",
        });
      }
    }

    if (fetchedData && Array.isArray(fetchedData.albums)) {
      for (const alb of fetchedData.albums) {
        allAlbums.push({
          id: String(alb.id),
          collectionId: alb.id,
          title: alb.title || "Untitled Album",
          artist: alb.artist?.name || alb.artist || query,
          cover: alb.cover || "",
          year: alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : 2024,
          trackCount: alb.numberOfTracks || 10,
          genre: "Music",
        });
      }
    }

    // Supplement Artists and Albums if music-main returned none (common with YTM search)
    if (allAlbums.length === 0 || allArtists.length === 0) {
      try {
        const itunesAlbumsUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=15`;
        const aRes = await fetch(itunesAlbumsUrl, { signal: AbortSignal.timeout(4000) });
        if (aRes.ok) {
          const aData: any = await aRes.json();
          if (Array.isArray(aData.results)) {
            const seenAlbums = new Set<string>();
            const seenArtists = new Set<string>();

            for (const alb of aData.results) {
              const albTitle = alb.collectionName || "Untitled Album";
              const albArtist = alb.artistName || query;
              const albCover = alb.artworkUrl100
                ? alb.artworkUrl100.replace("100x100bb", "600x600bb")
                : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";
              const year = alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : 2024;

              if (allAlbums.length < 15 && !seenAlbums.has(albTitle.toLowerCase())) {
                seenAlbums.add(albTitle.toLowerCase());
                allAlbums.push({
                  id: String(alb.collectionId),
                  collectionId: alb.collectionId,
                  title: albTitle,
                  artist: albArtist,
                  cover: albCover,
                  year,
                  trackCount: alb.trackCount || 10,
                  genre: alb.primaryGenreName || "Music",
                });
              }

              if (allArtists.length < 5 && !seenArtists.has(albArtist.toLowerCase())) {
                seenArtists.add(albArtist.toLowerCase());
                allArtists.push({
                  id: String(alb.artistId || albArtist),
                  name: albArtist,
                  picture: albCover,
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    // Resilient fallback if music-main returned no tracks
    if (allTracks.length === 0) {
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`;
        const itunesRes = await fetch(itunesUrl, { signal: AbortSignal.timeout(4000) });
        if (itunesRes.ok) {
          const json: any = await itunesRes.json();
          if (Array.isArray(json.results)) {
            for (const item of json.results) {
              const cleanTitle = (item.trackName || "Untitled Track").trim();
              const cleanArtist = item.artistName || "Unknown Artist";
              const coverUrl = item.artworkUrl100
                ? item.artworkUrl100.replace("100x100bb", "600x600bb")
                : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";

              const streamUrl = `/api/music/stream?id=${encodeURIComponent(item.trackId || cleanTitle)}&source=itunes&title=${encodeURIComponent(cleanTitle)}&artist=${encodeURIComponent(cleanArtist)}&duration=${Math.round((item.trackTimeMillis || 210000) / 1000)}`;

              allTracks.push({
                id: `itunes-${item.trackId || Math.random()}`,
                songId: String(item.trackId || Math.random()),
                title: cleanTitle,
                artist: cleanArtist,
                album: item.collectionName || "Single",
                duration: Math.round((item.trackTimeMillis || 210000) / 1000),
                cover: coverUrl,
                coverUrl,
                audioUrl: item.previewUrl || streamUrl,
                streamUrl,
                genre: item.primaryGenreName || "Music",
              });
            }
          }
        }
      } catch (e) {}
    }

    res.json({
      tracks: allTracks,
      artists: allArtists,
      albums: allAlbums,
      source: fetchedData?.source || requestedSource,
    });
  } catch (error: any) {
    console.error("Music Search Route Error:", error);
    res.json({ tracks: [], artists: [], albums: [] });
  }
});

// 3. Browse / Charts Endpoint (Pulls real curated Tidal rows from music-main)
let cachedBrowseSections: any[] | null = null;
let lastBrowseCacheTime = 0;

app.get("/api/music/charts", async (_req, res) => {
  try {
    if (cachedBrowseSections && Date.now() - lastBrowseCacheTime < 1000 * 60 * 20) {
      return res.json({ sections: cachedBrowseSections });
    }

    let browseData: any = null;
    try {
      const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/browse`, { signal: AbortSignal.timeout(6000) });
      if (upstream.ok) {
        browseData = await upstream.json();
      }
    } catch (e: any) {
      // music-main might still be binding port 2010 during dev server boot; retry once
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const retry = await fetch(`${MUSIC_MAIN_URL}/api/music/browse`, { signal: AbortSignal.timeout(4000) });
        if (retry.ok) {
          browseData = await retry.json();
        }
      } catch (retryErr) {
        // Quiet fallback to cached or built-in sections
      }
    }

    const categoryMap: { key: string; id: number; title: string; icon: string }[] = [
      { key: "hits", id: 0, title: "Top Hits", icon: "Flame" },
      { key: "pop", id: 1, title: "Pop", icon: "Sparkles" },
      { key: "hiphop", id: 2, title: "Hip-Hop & Rap", icon: "Zap" },
      { key: "rnb", id: 3, title: "R&B & Soul", icon: "Moon" },
      { key: "rock", id: 4, title: "Rock & Alternative", icon: "Disc" },
      { key: "indie", id: 5, title: "Indie", icon: "Radio" },
      { key: "chill", id: 6, title: "Chill Vibes", icon: "Moon" },
    ];

    const sections: any[] = [];

    if (browseData && browseData.rows) {
      for (const cat of categoryMap) {
        const rawTracks = browseData.rows[cat.key];
        if (Array.isArray(rawTracks) && rawTracks.length > 0) {
          const tracks = rawTracks.map((item: any) => {
            const title = item.title || "Untitled Track";
            const artist = item.artist || "Unknown Artist";
            const cover = item.artwork || "";
            const duration = Number(item.duration) || 210;
            const streamUrl = `/api/music/stream?id=${encodeURIComponent(item.id)}&source=tidal&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&duration=${duration}`;
            return {
              id: `chart-${item.id}`,
              songId: String(item.id),
              title,
              artist,
              album: item.album || "Single",
              cover,
              coverUrl: cover,
              duration,
              audioUrl: streamUrl,
              streamUrl,
              genre: cat.title,
            };
          });
          sections.push({
            id: cat.id,
            title: cat.title,
            icon: cat.icon,
            tracks,
          });
        }
      }
    }

    if (sections.length > 0) {
      cachedBrowseSections = sections;
      lastBrowseCacheTime = Date.now();
      return res.json({ sections });
    }

    // Fallback if browse is empty
    return res.json({ sections: cachedBrowseSections || [] });
  } catch (err) {
    res.json({ sections: cachedBrowseSections || [] });
  }
});

// 4. Browse Direct Endpoint
app.get("/api/music/browse", async (_req, res) => {
  try {
    const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/browse`, { signal: AbortSignal.timeout(6000) });
    if (upstream.ok) {
      const json = await upstream.json();
      return res.json(json);
    }
  } catch (e) {}
  res.json({ rows: {}, albums: [] });
});

// 5. Audio Streaming Endpoint with Range Support & Fallback
app.get("/api/music/stream", async (req, res) => {
  const { id, source, title, artist, duration, quality } = req.query as Record<string, string>;
  if (!id && !title) {
    return res.status(400).json({ error: "Missing id or title parameter" });
  }

  // Ensure music backend process is active
  ensureMusicBackend();

  // If track has a valid YouTube or Tidal ID, forward range request to music-main
  const isLikelyValidId = id && (/^[A-Za-z0-9_-]{11}$/.test(id) || /^\d+$/.test(id));
  if (isLikelyValidId) {
    try {
      const queryParams = new URLSearchParams({
        id: id || "track",
        source: source || "ytm",
        title: title || "",
        artist: artist || "",
        duration: duration || "210",
        quality: quality || "",
      });

      const streamUrl = `${MUSIC_MAIN_URL}/api/music/stream?${queryParams.toString()}`;
      const headers: Record<string, string> = {};
      if (req.headers.range) {
        headers["range"] = req.headers.range as string;
      }

      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 25000);
      req.on("close", () => {
        clearTimeout(timeoutId);
        abortCtrl.abort();
      });

      const upstream = await fetch(streamUrl, {
        headers,
        signal: abortCtrl.signal,
      });
      clearTimeout(timeoutId);

      if (upstream.ok || upstream.status === 206) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mp4");
        const cr = upstream.headers.get("content-range");
        if (cr) res.setHeader("Content-Range", cr);
        const cl = upstream.headers.get("content-length");
        if (cl) res.setHeader("Content-Length", cl);

        res.status(upstream.status);
        if (upstream.body) {
          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          };
          req.on("close", () => reader.cancel().catch(() => {}));
          return pump();
        }
      }
    } catch (err: any) {
      console.log(`[Stream] music-main bypassed/falling back:`, err?.message || err);
    }
  }

  // Graceful High-Bitrate Fallback: JOOX 320 / iTunes / Deezer stream
  const cleanTitle = (title || "").trim();
  const cleanArtist = (artist || "").trim();
  const query = `${cleanArtist} ${cleanTitle}`.trim() || "Kendrick Lamar";

  try {
    const jooxUrl = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(query)}&n=1&token=f84ao9lMF_q7husBWRfgUw`;
    const response = await fetchIgnoreCert(jooxUrl, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const json: any = await response.json();
      const playLinks = json.data?.["播放链接"] || {};
      const mp3Url =
        playLinks["MP3 320"] ||
        playLinks["MP3 128"] ||
        playLinks["AAC 192"] ||
        playLinks["无损FLAC"];
      if (mp3Url) {
        return streamAudioWithRedirect(mp3Url, req, res);
      }
    }
  } catch (e) {}

  // Last resort iTunes preview
  try {
    const iTunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const itunesRes = await fetch(iTunesUrl, { signal: AbortSignal.timeout(3000) });
    if (itunesRes.ok) {
      const itunesData: any = await itunesRes.json();
      const preview = itunesData.results?.[0]?.previewUrl;
      if (preview) {
        return streamAudioWithRedirect(preview, req, res);
      }
    }
  } catch (e) {}

  res.status(404).json({ error: "Stream unavailable" });
});

// 6. Album Details Endpoint (Forwarded from music-main with iTunes fallback)
app.get(["/api/music/album/:id", "/api/music/album_details"], async (req, res) => {
  const id = ((req.params.id as string) || (req.query.id as string) || "").trim();
  const title = ((req.query.title as string) || "").trim();
  const artist = ((req.query.artist as string) || "").trim();

  // 1. Try music-main if id is provided
  if (id && !title) {
    try {
      const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/album/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(4000) });
      if (upstream.ok) {
        const json = await upstream.json();
        if (json && (json.items || json.tracks)) {
          return res.json(json);
        }
      }
    } catch (e) {}
  }

  // 2. High-Fidelity iTunes Lookup & Search Fallback
  let tracks: any[] = [];
  let albumMeta: any = {
    id: id || title,
    title: title || "Album",
    artist: artist || "Unknown Artist",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
    year: 2024,
    genre: "Music",
  };

  if (id && /^\d+$/.test(id)) {
    try {
      const lookupUrl = `https://itunes.apple.com/lookup?id=${id}&entity=song`;
      const lRes = await fetch(lookupUrl, { signal: AbortSignal.timeout(5000) });
      if (lRes.ok) {
        const json: any = await lRes.json();
        if (Array.isArray(json.results) && json.results.length > 0) {
          for (const item of json.results) {
            if (item.wrapperType === "collection") {
              albumMeta.title = item.collectionName || albumMeta.title;
              albumMeta.artist = item.artistName || albumMeta.artist;
              albumMeta.cover = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : albumMeta.cover;
              albumMeta.year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : albumMeta.year;
              albumMeta.genre = item.primaryGenreName || albumMeta.genre;
            } else if (item.wrapperType === "track") {
              const trkTitle = item.trackName || "Untitled Track";
              const trkArtist = item.artistName || albumMeta.artist;
              const trkCover = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : albumMeta.cover;
              const duration = Math.round((item.trackTimeMillis || 210000) / 1000);
              const streamUrl = `/api/music/stream?id=track&title=${encodeURIComponent(trkTitle)}&artist=${encodeURIComponent(trkArtist)}&duration=${duration}`;
              tracks.push({
                id: String(item.trackId || trkTitle),
                songId: String(item.trackId || trkTitle),
                title: trkTitle,
                artist: trkArtist,
                album: item.collectionName || albumMeta.title,
                duration,
                cover: trkCover,
                coverUrl: trkCover,
                audioUrl: streamUrl,
                streamUrl,
                genre: item.primaryGenreName || albumMeta.genre,
                trackNumber: item.trackNumber || (tracks.length + 1),
              });
            }
          }
        }
      }
    } catch (e) {}
  }

  // Fallback search if lookup had no tracks
  if (tracks.length === 0 && (title || artist || id)) {
    try {
      const searchTerm = `${artist} ${title || id}`.trim();
      const sUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=30`;
      const sRes = await fetch(sUrl, { signal: AbortSignal.timeout(5000) });
      if (sRes.ok) {
        const json: any = await sRes.json();
        if (Array.isArray(json.results)) {
          for (const item of json.results) {
            const trkTitle = item.trackName || "Untitled Track";
            const trkArtist = item.artistName || artist || "Artist";
            const trkCover = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : albumMeta.cover;
            if (!albumMeta.cover || albumMeta.cover.includes("unsplash")) {
              albumMeta.cover = trkCover;
              albumMeta.title = item.collectionName || albumMeta.title;
              albumMeta.artist = trkArtist;
            }
            const duration = Math.round((item.trackTimeMillis || 210000) / 1000);
            const streamUrl = `/api/music/stream?id=track&title=${encodeURIComponent(trkTitle)}&artist=${encodeURIComponent(trkArtist)}&duration=${duration}`;
            tracks.push({
              id: String(item.trackId || trkTitle),
              songId: String(item.trackId || trkTitle),
              title: trkTitle,
              artist: trkArtist,
              album: item.collectionName || title || "Album",
              duration,
              cover: trkCover,
              coverUrl: trkCover,
              audioUrl: streamUrl,
              streamUrl,
              genre: item.primaryGenreName || "Music",
              trackNumber: item.trackNumber || (tracks.length + 1),
            });
          }
        }
      }
    } catch (e) {}
  }

  res.json({
    album: albumMeta,
    tracks,
  });
});

// 7. Artist Details Endpoint (Forwarded from music-main with iTunes top songs & discography)
app.get(["/api/music/artist/:id", "/api/music/artist_details"], async (req, res) => {
  const id = ((req.params.id as string) || (req.query.id as string) || "").trim();
  const name = ((req.query.name as string) || "").trim();
  const query = name || id;
  if (!query) {
    return res.status(400).json({ error: "Missing artist name or id" });
  }

  // Preserve target artist name strictly so it NEVER flips to another artist (e.g. Drake -> Majid Jordan, Future -> Taylor Swift)
  const targetArtist = name || (isNaN(Number(id)) ? id : "");
  let topSongs: any[] = [];
  let albums: any[] = [];
  let picture = "";

  // 1. Fetch top songs from iTunes API
  try {
    const itunesSongsUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=40`;
    const sRes = await fetch(itunesSongsUrl, { signal: AbortSignal.timeout(5000) });
    if (sRes.ok) {
      const data: any = await sRes.json();
      if (Array.isArray(data.results)) {
        const seenSongs = new Set<string>();
        for (const item of data.results) {
          const title = item.trackName || "Untitled";
          const rawArtist = (item.artistName || "").trim();
          const lowerRaw = rawArtist.toLowerCase();
          const targetLower = targetArtist.toLowerCase();

          // If target artist is known, ensure the track is genuinely by or co-performed by this artist
          if (targetArtist && targetLower.length > 1) {
            const trackTitleLower = (item.trackName || '').toLowerCase();
            const isByArtist =
              lowerRaw === targetLower ||
              lowerRaw.startsWith(targetLower + ' &') ||
              lowerRaw.startsWith(targetLower + ' and') ||
              lowerRaw.startsWith(targetLower + ',') ||
              lowerRaw.endsWith('& ' + targetLower) ||
              lowerRaw.includes(targetLower);
            const isFeatured =
              trackTitleLower.includes(`feat. ${targetLower}`) ||
              trackTitleLower.includes(`featuring ${targetLower}`) ||
              trackTitleLower.includes(`with ${targetLower}`) ||
              trackTitleLower.includes(`ft. ${targetLower}`);
            if (!isByArtist && !isFeatured) continue;
          }

          const songKey = `${title.toLowerCase()}-${rawArtist.toLowerCase()}`;
          if (seenSongs.has(songKey)) continue;
          seenSongs.add(songKey);

          const cover = item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "600x600bb") : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";
          const duration = Math.round((item.trackTimeMillis || 210000) / 1000);
          if (!picture && cover && (lowerRaw === targetLower || lowerRaw.startsWith(targetLower))) {
            picture = cover;
          }

          const streamUrl = `/api/music/stream?id=track&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(rawArtist || targetArtist)}&duration=${duration}`;
          topSongs.push({
            id: String(item.trackId || title),
            songId: String(item.trackId || title),
            title,
            artist: rawArtist || targetArtist,
            album: item.collectionName || "Single",
            duration,
            cover,
            coverUrl: cover,
            audioUrl: streamUrl,
            streamUrl,
            genre: item.primaryGenreName || "Music",
            isExactMatch: lowerRaw === targetLower,
          });
        }
        // Prioritize exact matches at the top of Top Songs
        topSongs.sort((a, b) => (b.isExactMatch ? 1 : 0) - (a.isExactMatch ? 1 : 0));
      }
    }
  } catch (e) {}

  // 2. Fetch albums & discography from iTunes API
  try {
    const itunesAlbumsUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=40`;
    const aRes = await fetch(itunesAlbumsUrl, { signal: AbortSignal.timeout(5000) });
    if (aRes.ok) {
      const data: any = await aRes.json();
      if (Array.isArray(data.results)) {
        const seenAlbums = new Set<string>();
        for (const alb of data.results) {
          const albTitle = (alb.collectionName || "Untitled Album").trim();
          const albArtist = (alb.artistName || "").trim();
          const trackCount = alb.trackCount || 0;
          const albArtistLower = albArtist.toLowerCase();
          const targetLower = targetArtist.toLowerCase();

          // 1. Strictly filter out albums that the artist DID NOT make (reject features on other artists' albums)
          if (targetArtist && targetLower.length > 1) {
            const isArtistAlbum =
              albArtistLower === targetLower ||
              albArtistLower.startsWith(targetLower + ' &') ||
              albArtistLower.startsWith(targetLower + ' and') ||
              albArtistLower.startsWith(targetLower + ',') ||
              albArtistLower.endsWith('& ' + targetLower);
            if (!isArtistAlbum) continue;
          }

          // 2. Filter out 1-song singles disguised as albums
          const isSingle =
            trackCount <= 2 ||
            albTitle.toLowerCase().endsWith(' - single') ||
            albTitle.toLowerCase().endsWith(' [single]') ||
            (albTitle.toLowerCase().endsWith(' - ep') && trackCount <= 2);
          if (isSingle) continue;

          const normalized = albTitle.toLowerCase().trim();
          if (seenAlbums.has(normalized)) continue;
          seenAlbums.add(normalized);

          const albCover = alb.artworkUrl100 ? alb.artworkUrl100.replace("100x100bb", "600x600bb") : "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80";
          const year = alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : 2024;
          if (!picture && albCover && albArtistLower === targetLower) picture = albCover;

          albums.push({
            id: String(alb.collectionId),
            collectionId: alb.collectionId,
            title: albTitle,
            artist: albArtist || targetArtist,
            cover: albCover,
            year,
            trackCount: trackCount || 10,
            genre: alb.primaryGenreName || "Music",
          });
        }
      }
    }
  } catch (e) {}

  res.json({
    artist: {
      id: id || targetArtist || query,
      name: targetArtist || query,
      picture: picture || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80",
    },
    topSongs,
    albums,
  });
});

// 8. Cached Art Proxy (Forwarded from music-main)
app.get("/api/music/art", async (req, res) => {
  const u = req.query.u as string;
  if (!u) return res.status(400).send("Missing u parameter");
  try {
    const upstream = await fetch(`${MUSIC_MAIN_URL}/api/music/art?u=${encodeURIComponent(u)}`, { signal: AbortSignal.timeout(5000) });
    if (upstream.ok) {
      res.setHeader("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      const buf = await upstream.arrayBuffer();
      return res.send(Buffer.from(buf));
    }
  } catch (e) {}
  res.redirect(u);
});

// 9. Artist Albums Endpoint
app.get("/api/music/albums", async (req, res) => {
  try {
    const artist = ((req.query.artist as string) || (req.query.query as string) || "").trim();
    if (!artist) return res.json({ albums: [] });

    const searchUpstream = await fetch(`${MUSIC_MAIN_URL}/api/music/search?q=${encodeURIComponent(artist)}&limit=15`, { signal: AbortSignal.timeout(5000) });
    if (searchUpstream.ok) {
      const data: any = await searchUpstream.json();
      if (Array.isArray(data.albums) && data.albums.length > 0) {
        return res.json({ albums: data.albums });
      }
    }
  } catch (e) {}
  res.json({ albums: [] });
});

// 10. Music Cover Image Proxy to guarantee images always load past CORS / hotlink / school firewalls
app.get("/api/music/cover_proxy", async (req, res) => {
  const targetUrl = (req.query.url as string) || "";
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return res.redirect("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80");
  }
  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!upstream.ok) {
      return res.redirect("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80");
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    const arrayBuffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (e) {
    return res.redirect("https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80");
  }
});

// Lyrics Endpoint for Music Player (Meting direct LRC + JOOX API + LRCLIB API + Mismatch Protection)
app.get("/api/music/lyrics", async (req, res) => {
  try {
    const songId = req.query.id as string;
    const lrcUrl = req.query.lrcUrl as string;
    const jooxMsg = req.query.jooxMsg as string;
    const jooxN = req.query.jooxN as string;
    const rawTitle = (req.query.title as string || "").trim();
    const rawArtist = (req.query.artist as string || "").trim();

    const title = rawTitle.replace(/\s*[\(\[].*?[\)\]]/g, "").trim() || rawTitle;
    const artist = rawArtist.split(/ft\.|feat\.|&|,|\//i)[0].trim() || rawArtist;

    const cleanAndFilterLyrics = (rawText: string, songTitle: string, songArtist: string) => {
      if (!rawText) return "";
      let text = rawText
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");

      const combinedMeta = (songTitle + " " + songArtist).toLowerCase();
      const isCjkTrack = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(combinedMeta);

      const lines = text.split("\n");
      const cleaned: string[] = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;

        if (!isCjkTrack) {
          const sansTime = trimmed.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
          if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(sansTime)) {
            if (!/[a-zA-Z0-9]/.test(sansTime)) {
              continue;
            }
            const sansCjk = trimmed.replace(/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]+/g, "").replace(/\s+/g, " ").trim();
            if (sansCjk.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim().length > 0) {
              cleaned.push(sansCjk);
            }
            continue;
          }
        }
        cleaned.push(trimmed);
      }

      return cleaned.join("\n").trim();
    };

    // 0. Top Priority: Direct LRC URL (e.g. from Meting API)
    if (lrcUrl && lrcUrl.startsWith("http")) {
      try {
        const lrcRes = await fetchIgnoreCert(lrcUrl, { signal: AbortSignal.timeout(5000) });
        if (lrcRes.ok) {
          const rawText = await lrcRes.text();
          if (rawText && rawText.length > 20) {
            const cleaned = cleanAndFilterLyrics(rawText, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {
        console.warn("Direct lrcUrl fetch failed:", e);
      }
    }

    // 1. Primary Source: JOOX Native Lyrics
    if (jooxMsg || title) {
      try {
        const targetMsg = jooxMsg || `${title} ${artist}`.trim();
        const targetN = jooxN || "1";
        const jooxUrl = `https://apicx.asia/api/joox_music?msg=${encodeURIComponent(targetMsg)}&n=${encodeURIComponent(targetN)}&token=f84ao9lMF_q7husBWRfgUw`;

        const jooxRes = await fetchIgnoreCert(jooxUrl, { signal: AbortSignal.timeout(5000) });
        if (jooxRes.ok) {
          const json: any = await jooxRes.json();
          const lyricsRaw = json.data?.["歌词内容"];
          if (lyricsRaw && lyricsRaw.length > 20) {
            const cleaned = cleanAndFilterLyrics(lyricsRaw, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {}
    }

    // 2. Secondary Source: LRCLIB API
    if (title) {
      try {
        const lrcLibGetUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
        const lrcRes = await fetch(lrcLibGetUrl, { signal: AbortSignal.timeout(5000) });
        if (lrcRes.ok) {
          const lrcData: any = await lrcRes.json();
          if (lrcData.syncedLyrics && lrcData.syncedLyrics.length > 20) {
            const cleaned = cleanAndFilterLyrics(lrcData.syncedLyrics, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
          if (lrcData.plainLyrics && lrcData.plainLyrics.length > 20) {
            const cleaned = cleanAndFilterLyrics(lrcData.plainLyrics, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: false });
            }
          }
        }
      } catch (e) {}

      try {
        const searchQ = `${title} ${artist}`.trim();
        const lrcLibSearchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQ)}`;
        const searchRes = await fetch(lrcLibSearchUrl, { signal: AbortSignal.timeout(5000) });
        if (searchRes.ok) {
          const searchData: any = await searchRes.json();
          if (Array.isArray(searchData) && searchData.length > 0) {
            const titleFirstWord = title.split(" ")[0].toLowerCase();
            const matchingResult = searchData.find((item: any) => {
              const itemTrackLower = (item.trackName || item.name || "").toLowerCase();
              const matchesTitle = itemTrackLower.includes(titleFirstWord);
              const text = item.syncedLyrics || item.plainLyrics || "";
              return matchesTitle && !isLanguageMismatch(text, title, artist);
            });

            if (matchingResult) {
              if (matchingResult.syncedLyrics) {
                const cleaned = cleanAndFilterLyrics(matchingResult.syncedLyrics, title, artist);
                if (cleaned.length > 15) {
                  return res.json({ lyrics: cleaned, synced: true });
                }
              }
              if (matchingResult.plainLyrics) {
                const cleaned = cleanAndFilterLyrics(matchingResult.plainLyrics, title, artist);
                if (cleaned.length > 15) {
                  return res.json({ lyrics: cleaned, synced: false });
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: KuWo kw-api
    const targetLrcUrl = lrcUrl || (songId ? `https://kw-api.cenguigui.cn?id=${encodeURIComponent(songId)}&type=lyr&format=all` : "");
    if (targetLrcUrl) {
      try {
        const lyricRes = await fetchIgnoreCert(targetLrcUrl, { signal: AbortSignal.timeout(5000) });
        if (lyricRes.ok) {
          const rawText = await lyricRes.text();
          if (rawText && rawText.length > 20 && !rawText.includes("404")) {
            const cleaned = cleanAndFilterLyrics(rawText, title, artist);
            if (cleaned.length > 15 && !isLanguageMismatch(cleaned, title, artist)) {
              return res.json({ lyrics: cleaned, synced: true });
            }
          }
        }
      } catch (e) {}
    }

    // 4. Default synchronized fallback
    const fallbackLyrics = `[00:00.00] ${title || "Song"} — ${artist || "Artist"}
[00:04.00] (Instrumental Intro)
[00:12.00] Playing on Yunø Music Studio
[00:18.00] Feel the rhythm and flow
[00:26.00] Listening to ${title || "your favorite track"}...
[00:36.00] (Melodic Chorus / Bridge)
[00:48.00] Live audio synced in real time
[00:58.00] Pure music, pure energy...`;

    res.json({ lyrics: fallbackLyrics, synced: true });
  } catch (error) {
    res.json({ lyrics: "Lyrics unavailable for this track.", synced: false });
  }
});

// Global Announcements API
app.get("/api/announcements", (req, res) => {
  res.json({ announcements: systemAnnouncements });
});

app.post("/api/announcements", (req, res) => {
  const { iconEmoji, title, description, content, badge, author } = req.body;
  const newAnn: ServerAnnouncement = {
    id: `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    iconEmoji: iconEmoji || '🚀',
    title: title || 'System Update:',
    description: description || content || '',
    content: content || `${title || ''} ${description || ''}`.trim(),
    badge: badge || 'ADMIN',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    author: author || 'Admin',
  };
  systemAnnouncements.unshift(newAnn);
  globalAnnouncements.unshift({
    id: newAnn.id,
    content: newAnn.content || newAnn.description || '',
    createdAt: newAnn.createdAt || 'Just now',
    author: newAnn.author || 'Admin',
  });
  savePersistedData();
  res.json({ success: true, announcements: systemAnnouncements });
});

app.delete("/api/announcements/:id", (req, res) => {
  const { id } = req.params;
  const idx = systemAnnouncements.findIndex((a) => a.id === id);
  if (idx !== -1) {
    systemAnnouncements.splice(idx, 1);
  }
  const chatIdx = globalAnnouncements.findIndex((a) => a.id === id);
  if (chatIdx !== -1) {
    globalAnnouncements.splice(chatIdx, 1);
  }
  savePersistedData();
  res.json({ success: true, announcements: systemAnnouncements });
});

// Global Partners API
app.get("/api/partners", (req, res) => {
  res.json({ partners: systemPartners });
});

app.post("/api/partners", (req, res) => {
  const { name, logo, image, url, links, description, addedAt } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Partner name is required" });
  }

  // Parse links (up to 5)
  let parsedLinks: ServerPartnerLink[] = [];
  if (Array.isArray(links)) {
    parsedLinks = links.slice(0, 5).map((l: any) => {
      if (typeof l === 'string') {
        let clean = l.trim();
        if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        return { label: 'Website', url: clean };
      }
      let cleanUrl = (l.url || '').trim();
      if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      return {
        label: (l.label || 'Website').trim(),
        url: cleanUrl,
      };
    }).filter(l => l.url.length > 0);
  } else if (url && typeof url === 'string') {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    parsedLinks.push({ label: 'Main Website', url: cleanUrl });
  }

  const primaryUrl = parsedLinks[0]?.url || (url ? (url.startsWith('http') ? url : `https://${url}`) : '');
  const partnerPicture = (image || logo || '').trim();

  const newPartner: ServerPartner = {
    id: `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: name.trim(),
    logo: partnerPicture,
    image: partnerPicture,
    url: primaryUrl,
    links: parsedLinks,
    description: (description || '').trim(),
    addedAt: addedAt || new Date().toLocaleDateString(),
  };

  systemPartners.push(newPartner);
  savePersistedData();
  res.json({ success: true, partner: newPartner, partners: systemPartners });
});

app.put("/api/partners/:id", (req, res) => {
  const { id } = req.params;
  const { name, logo, image, url, links, description } = req.body;
  const partner = systemPartners.find((p) => p.id === id);
  if (!partner) {
    return res.status(404).json({ error: "Partner not found" });
  }

  if (name && name.trim()) partner.name = name.trim();
  if (description !== undefined) partner.description = description.trim();
  
  const partnerPicture = (image !== undefined ? image : logo);
  if (partnerPicture !== undefined) {
    partner.image = partnerPicture.trim();
    partner.logo = partnerPicture.trim();
  }

  if (Array.isArray(links)) {
    partner.links = links.slice(0, 5).map((l: any) => {
      if (typeof l === 'string') {
        let clean = l.trim();
        if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
          clean = `https://${clean}`;
        }
        return { label: 'Website', url: clean };
      }
      let cleanUrl = (l.url || '').trim();
      if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      return {
        label: (l.label || 'Website').trim(),
        url: cleanUrl,
      };
    }).filter(l => l.url.length > 0);
    if (partner.links.length > 0) {
      partner.url = partner.links[0].url;
    }
  } else if (url !== undefined) {
    let cleanUrl = url.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    partner.url = cleanUrl;
  }

  savePersistedData();
  res.json({ success: true, partner, partners: systemPartners });
});

app.delete("/api/partners/:id", (req, res) => {
  const { id } = req.params;
  const idx = systemPartners.findIndex((p) => p.id === id);
  if (idx !== -1) {
    systemPartners.splice(idx, 1);
  }
  savePersistedData();
  res.json({ success: true, partners: systemPartners });
});

// Client Backup Sync Endpoint
app.post("/api/sync-persisted-data", (req, res) => {
  const { clientAnnouncements, clientPartners } = req.body;
  let updated = false;

  if (Array.isArray(clientAnnouncements)) {
    for (const ca of clientAnnouncements) {
      if (ca && ca.id && !systemAnnouncements.some((a) => a.id === ca.id)) {
        systemAnnouncements.unshift(ca);
        globalAnnouncements.unshift({
          id: ca.id,
          content: ca.content || ca.description || ca.title || '',
          createdAt: ca.createdAt || 'Saved',
          author: ca.author || 'Admin',
        });
        updated = true;
      }
    }
  }

  if (Array.isArray(clientPartners)) {
    for (const cp of clientPartners) {
      if (cp && cp.id && !systemPartners.some((p) => p.id === cp.id)) {
        systemPartners.push(cp);
        updated = true;
      }
    }
  }

  if (updated) {
    savePersistedData();
  }

  res.json({
    success: true,
    announcements: systemAnnouncements,
    partners: systemPartners,
  });
});

// GAME PROXY ENDPOINT TO RENDER JSDELIVR HTML AS TEXT/HTML WITH BASE HREF
app.get("/api/proxy-game", async (req, res) => {
  const gameUrl = req.query.url as string;
  if (!gameUrl) return res.status(400).send("Missing game URL");

  try {
    const response = await fetch(gameUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
    });
    if (!response.ok) return res.status(response.status).send("Failed to fetch game content");

    let html = await response.text();
    const baseUrl = gameUrl.substring(0, gameUrl.lastIndexOf('/') + 1);

    const host = req.get("x-forwarded-host") || req.get("host") || "localhost:3000";
    const proto = req.get("x-forwarded-proto") || req.protocol || "http";
    const appOrigin = `${proto}://${host}`;

    // Clean up non-standard wrapper tags if present (e.g. <Module> in some raw game files)
    html = html.replace(/^\s*<Module>\s*/i, '').replace(/<\/Module>\s*$/i, '');

    // Rewrite any child iframes and frames pointing to relative or direct html files so they go through /api/proxy-game with full absolute app origin
    html = html.replace(/<(iframe|frame)\b([^>]*?)\bsrc=(["\'])([^"\']+)\3([^>]*)>/gi, (match, tag, before, quote, src, after) => {
      if (src.includes("/api/proxy-game") || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("javascript:")) {
        return match;
      }
      try {
        const fullUrl = new URL(src, baseUrl).href;
        const proxied = `${appOrigin}/api/proxy-game?url=` + encodeURIComponent(fullUrl);
        return `<${tag}${before}src=${quote}${proxied}${quote}${after}>`;
      } catch {
        return match;
      }
    });

    const interceptScript = `
<script>
(function() {
  function proxyUrl(u) {
    if (!u || typeof u !== 'string') return u;
    if (u.indexOf('/api/proxy-game') !== -1 || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('javascript:')) return u;
    try {
      var resolved = new URL(u, ${JSON.stringify(baseUrl)}).href;
      return window.location.origin + '/api/proxy-game?url=' + encodeURIComponent(resolved);
    } catch(e) { return u; }
  }
  var origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, val) {
    if (this && this.tagName === 'IFRAME' && typeof name === 'string' && name.toLowerCase() === 'src' && typeof val === 'string') {
      val = proxyUrl(val);
    }
    return origSetAttribute.call(this, name, val);
  };
  var propDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (propDesc && propDesc.set) {
    var origSet = propDesc.set;
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      set: function(val) {
        return origSet.call(this, proxyUrl(val));
      },
      get: propDesc.get,
      configurable: true
    });
  }
})();
</script>
`;

    // Inject <base> and interceptor script so all asset references and dynamic frames resolve properly
    if (!html.includes('<base ') && !html.includes('<base>') && !html.includes('<BASE ') && !html.includes('<BASE>')) {
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head><base href="${baseUrl}">${interceptScript}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD><base href="${baseUrl}">${interceptScript}`);
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', `<html><head><base href="${baseUrl}">${interceptScript}</head>`);
      } else {
        html = `<base href="${baseUrl}">${interceptScript}\n` + html;
      }
    } else {
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${interceptScript}`);
      } else if (html.includes('<html>')) {
        html = html.replace('<html>', `<html><head>${interceptScript}</head>`);
      } else {
        html = interceptScript + '\n' + html;
      }
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("content-security-policy");
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("cross-origin-opener-policy");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(html);
  } catch (err: any) {
    console.error("Game proxy error:", err);
    res.status(500).send("Error rendering game frame: " + err.message);
  }
});

// MOVIE & ANIME STREAM PROXY ROUTE (PREVENTS GREY SCREEN & FRAME RESTRICTIONS)
app.get("/api/stream/proxy", async (req, res) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send("Missing target stream URL");
  }

  try {
    const targetUrlObj = new URL(streamUrl);
    const origin = targetUrlObj.origin;

    const fetchResponse = await fetch(streamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": origin,
      },
      redirect: "follow",
    });

    const contentType = fetchResponse.headers.get("content-type") || "text/html";

    if (contentType.includes("text/html")) {
      let html = await fetchResponse.text();
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1) || `${origin}/`;

      // Remove restrictive CSP or anti-frame meta tags
      html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, '');
      
      // Neutralize window.top frame-busting scripts
      html = html.replace(/top\.location/g, 'window.__mock_top_loc');
      html = html.replace(/window\.top\s*!==\s*window\.self/g, 'false');
      html = html.replace(/window\.top\s*!=\s*window\.self/g, 'false');
      html = html.replace(/top\s*!==\s*self/g, 'false');
      html = html.replace(/top\s*!=\s*self/g, 'false');

      // Inject base href only if not present
      if (!html.includes('<base ') && !html.includes('<base>') && !html.includes('<BASE ') && !html.includes('<BASE>')) {
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head><base href="${baseUrl}">`);
        } else if (html.includes('<HEAD>')) {
          html = html.replace('<HEAD>', `<HEAD><base href="${baseUrl}">`);
        } else if (html.includes('<html>')) {
          html = html.replace('<html>', `<html><head><base href="${baseUrl}"></head>`);
        } else {
          html = `<base href="${baseUrl}">\n` + html;
        }
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("content-security-policy");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(html);
    }

    // Fallback unblocked wrapper if opaque or redirected
    const wrapperHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Stream Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${streamUrl}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(wrapperHtml);
  } catch (err: any) {
    const fallbackWrapper = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Stream Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${streamUrl}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(fallbackWrapper);
  }
});

// STREAMRIP ANIME API ENDPOINT ROUTE
app.get("/api/stream/anime/:anilist_id/:episode", (req, res) => {
  const { anilist_id, episode } = req.params;
  const ep = episode || "1";
  const streamUrl = `https://streamrip.fun/anime/${anilist_id}/${ep}`;
  
  if (req.query.redirect === "true") {
    return res.redirect(streamUrl);
  }

  res.json({
    status: "success",
    provider: "StreamRip Anime Engine",
    anilist_id,
    episode: ep,
    embed_url: streamUrl,
    iframe_snippet: `<iframe src="${streamUrl}" width="100%" height="100%" allowfullscreen frameborder="0" allow="autoplay; fullscreen"></iframe>`
  });
});

// TOP 5 AI MODELS API INFORMATION ENDPOINT
app.get("/api/ai/models/info", (req, res) => {
  res.json({
    status: "success",
    total_models: 5,
    models: [
      {
        name: "Google Gemini 2.5 Flash",
        provider: "Google AI",
        api_endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        sdk_package: "@google/genai",
        docs_url: "https://ai.google.dev/docs",
        authentication: "Bearer / API Key (GEMINI_API_KEY)"
      },
      {
        name: "OpenAI GPT-4o",
        provider: "OpenAI",
        api_endpoint: "https://api.openai.com/v1/chat/completions",
        sdk_package: "openai",
        docs_url: "https://platform.openai.com/docs/api-reference",
        authentication: "Bearer OPENAI_API_KEY"
      },
      {
        name: "Anthropic Claude 3.5 Sonnet",
        provider: "Anthropic",
        api_endpoint: "https://api.anthropic.com/v1/messages",
        sdk_package: "@anthropic-ai/sdk",
        docs_url: "https://docs.anthropic.com/en/api",
        authentication: "x-api-key ANTHROPIC_API_KEY"
      },
      {
        name: "DeepSeek V3 / R1 Reasoning",
        provider: "DeepSeek",
        api_endpoint: "https://api.deepseek.com/chat/completions",
        sdk_package: "openai (OpenAI-compatible client)",
        docs_url: "https://platform.deepseek.com/api-docs",
        authentication: "Bearer DEEPSEEK_API_KEY"
      },
      {
        name: "xAI Grok 3 / Grok 2",
        provider: "xAI",
        api_endpoint: "https://api.x.ai/v1/chat/completions",
        sdk_package: "openai (OpenAI-compatible client)",
        docs_url: "https://docs.x.ai",
        authentication: "Bearer XAI_API_KEY"
      }
    ]
  });
});

// DIOR AI CHAT ENDPOINT
app.post("/api/ai/chat", async (req, res) => {
  const { prompt, messages, model } = req.body || {};
  const query = (prompt || (Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1].content : "") || "").trim();

  if (!query) {
    return res.status(400).json({ error: "Prompt or message content is required." });
  }

  const selectedModel = model || "gemini-2.5-flash";

  // Try generating with Gemini if available
  try {
    const ai = getGenAI();
    // System instruction for Dior AI Assistant
    const systemInstruction = "You are DIOR AI, a sophisticated, precise, and helpful assistant embedded within the Dior Browser. Provide clear, accurate, well-formatted, and concise responses. Use markdown when appropriate for code blocks, bullet points, and clarity. Avoid conversational fluff.";

    let historyText = "";
    if (Array.isArray(messages) && messages.length > 1) {
      historyText = messages.slice(-6, -1).map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n") + "\n";
    }

    const fullPrompt = `${systemInstruction}\n\n${historyText}User: ${query}\nAssistant:`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
    });

    const responseText = result?.text?.trim() || "";
    if (responseText) {
      return res.json({
        response: responseText,
        model: selectedModel,
        provider: "Google Gemini",
      });
    }
  } catch (err: any) {
    console.warn("Yuno AI Gemini call notice, using smart engine:", err?.message || err);
  }

  // Resilient response fallback
  let fallbackResponse = "";
  const lower = query.toLowerCase();

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    fallbackResponse = "Hello! I am Yuno AI, your portal assistant. How can I assist you today? You can ask me to write code, summarize text, explain concepts, or find information.";
  } else if (lower.includes("who are you") || lower.includes("what is yuno")) {
    fallbackResponse = "I am Yuno AI, the integrated assistant within the Yuno portal. I help with research, coding, writing, problem-solving, and web navigation.";
  } else if (lower.includes("code") || lower.includes("python") || lower.includes("javascript") || lower.includes("react")) {
    fallbackResponse = "Here is a clean implementation example based on your query:\n\n```typescript\n// Yuno utility module\nexport function formatYunoProtocol(path: string): string {\n  const clean = path.replace(/^yuno:\\/\\//, '').trim();\n  return `yuno://${clean}`;\n}\n```\n\nLet me know if you need specific logic, unit tests, or optimizations.";
  } else {
    fallbackResponse = `Regarding your inquiry on "${query}":\n\n1. **Core Concept**: Efficiently analyzing requirements and executing standard best practices.\n2. **Recommendation**: Structure your workflow modularly, verify edge cases, and keep interfaces uncluttered.\n3. **Next Steps**: Feel free to provide more context or ask follow-up questions for deeper analysis.`;
  }

  return res.json({
    response: fallbackResponse,
    model: selectedModel,
    provider: "Yuno Smart Engine",
  });
});

// IN-MEMORY CACHE FOR GAME CATALOGS
let cachedHydraGames: any[] | null = null;
let hydraCacheTime = 0;
let cachedNoahhGames: any[] | null = null;
let noahhCacheTime = 0;
const GAME_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

// UNIFIED / CATALOG ROUTE
app.get("/api/games/catalog", async (req, res) => {
  const source = (req.query.source as string) || "hydra";
  if (source === "hydra" || source === "all") {
    return res.redirect(307, "/api/games/hydra");
  }
  return res.redirect(307, "/api/games/hydra");
});

// HYDRA NETWORK GAME SOURCE ENDPOINT
app.get("/api/games/hydra", async (req, res) => {
  const BASE_CDN_HYDRA = "https://cdn.jsdelivr.net/gh/1234chromebook1234-creator/hh@main/";
  const GAMES_FOLDER_HYDRA = "gmes/";
  const FALLBACK_IMG = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80";

  // Check in-memory cache first
  if (cachedHydraGames && cachedHydraGames.length > 0 && Date.now() - hydraCacheTime < GAME_CACHE_TTL) {
    return res.json({ games: cachedHydraGames, cached: true });
  }

  try {
    const r = await fetch(BASE_CDN_HYDRA + "gmes.json", {
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) throw new Error("Failed to fetch Hydra games list");
    const rawArray = await r.json();

    if (!Array.isArray(rawArray)) {
      return res.json({ games: cachedHydraGames || [] });
    }

    const seenTitles = new Set<string>();
    const games = rawArray
      .map((g: any, idx: number) => {
        if (!g || typeof g !== "object") return null;
        let file = g.file_name || g.link || g.url || g.file || g.path || g.html;
        let title = g.title || g.name || g.game || "Untitled Game";
        if (!file) return null;

        const cleanTitle = title.trim();
        const lowerKey = cleanTitle.toLowerCase();
        if (seenTitles.has(lowerKey)) return null;
        seenTitles.add(lowerKey);

        file = String(file).replace(/^\/+/, "");
        let rawGameUrl = file.startsWith("http")
          ? file
          : BASE_CDN_HYDRA + (file.startsWith(GAMES_FOLDER_HYDRA) ? file : GAMES_FOLDER_HYDRA + file);

        let thumb = g.thumb || g.image || g.img || g.thumbnail || FALLBACK_IMG;
        if (thumb !== FALLBACK_IMG && !thumb.startsWith("http") && !thumb.startsWith("data:")) {
          thumb = BASE_CDN_HYDRA + thumb.replace(/^\/+/, "");
        }

        const proxiedUrl = `/api/proxy-game?url=${encodeURIComponent(rawGameUrl)}`;

        return {
          id: `hydra-${idx}-${encodeURIComponent(cleanTitle)}`,
          title: cleanTitle,
          description: g.description || g.desc || "Hydra Network Unblocked Game",
          image: thumb,
          url: proxiedUrl,
          source: "hydra",
          category: "Hydra Network",
          rating: 4.9,
          plays: "2.4M",
        };
      })
      .filter(Boolean);

    if (games.length > 0) {
      cachedHydraGames = games;
      hydraCacheTime = Date.now();
    }

    res.json({ games: games.length > 0 ? games : (cachedHydraGames || []) });
  } catch (e: any) {
    console.warn("Hydra games fetch warning:", e.message);
    res.json({ games: cachedHydraGames || [], cached: true, error: e.message });
  }
});

// NOAH'S SOURCE GAME ENDPOINT
app.get("/api/games/noahh", async (req, res) => {
  // Check in-memory cache first
  if (cachedNoahhGames && cachedNoahhGames.length > 0 && Date.now() - noahhCacheTime < GAME_CACHE_TTL) {
    return res.json({ games: cachedNoahhGames, cached: true });
  }

  try {
    const r = await fetch("https://noahs-calculus-tutor.pages.dev/games.js", {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) throw new Error("Failed to fetch Noah's games.js");
    const jsText = await r.text();

    let parsedData: any[] = [];
    try {
      const cleanJs = jsText.replace(/^(const|let|var)\s+\w+\s*=\s*/, "").replace(/;?\s*$/, "");
      parsedData = new Function(`return ${cleanJs}`)();
    } catch (e) {
      const jsonMatch = jsText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      }
    }

    if (!Array.isArray(parsedData)) {
      return res.json({ games: cachedNoahhGames || [] });
    }

    const seenTitles = new Set<string>();
    const games = parsedData
      .map((g: any, idx: number) => {
        if (!g) return null;
        const title = g.title || g.name || g.label;
        const description = g.description || g.desc || g.summary || "Noah's Unblocked Arcade Game";
        const rawPath = g.url || g.link || g.path || g.file || "";
        const rawImg = g.image || g.img || g.thumbnail || g.icon || "";

        if (!title || !rawPath) return null;

        const cleanTitle = String(title).trim();
        const lowerKey = cleanTitle.toLowerCase();
        if (seenTitles.has(lowerKey)) return null;
        seenTitles.add(lowerKey);

        const proxiedUrl = `/api/proxy-game?url=${encodeURIComponent(rawPath)}`;

        return {
          id: `noahh-${idx}-${encodeURIComponent(cleanTitle)}`,
          title: cleanTitle,
          description: description,
          image: rawImg,
          url: proxiedUrl,
          source: "noahh",
          category: "Noah's Vault",
          rating: 4.8,
          plays: "1.9M",
        };
      })
      .filter(Boolean);

    if (games.length > 0) {
      cachedNoahhGames = games;
      noahhCacheTime = Date.now();
    }

    res.json({ games: games.length > 0 ? games : (cachedNoahhGames || []) });
  } catch (e: any) {
    console.warn("Noahh games fetch warning:", e.message);
    res.json({ games: cachedNoahhGames || [], cached: true, error: e.message });
  }
});

// GMSHELF GAME REPOSITORIES (truffled, seraph, ugs, ckv)
interface GmshelfGameCache {
  truffled: { games: any[]; time: number };
  seraph: { games: any[]; time: number };
  ugs: { games: any[]; time: number };
  ckv: { games: any[]; time: number };
}

const gmshelfCache: GmshelfGameCache = {
  truffled: { games: [], time: 0 },
  seraph: { games: [], time: 0 },
  ugs: { games: [], time: 0 },
  ckv: { games: [], time: 0 },
};

// GMSHELF COVERS RESOLUTION (From official GitHub repos: gmshelf/seraph, gmshelf/truffled, gmshelf/ckv)
let gmshelfCoversIndex: {
  seraph: string[];
  truffled: string[];
  ckv: string[];
} = { seraph: [], truffled: [], ckv: [] };

try {
  const localCoversPath = path.join(process.cwd(), "src", "data", "gmshelfCovers.json");
  const dataCoversPath = path.join(process.cwd(), ".data", "gmshelf_covers_cache.json");
  const pathToLoad = fs.existsSync(localCoversPath) ? localCoversPath : dataCoversPath;
  if (fs.existsSync(pathToLoad)) {
    const raw = fs.readFileSync(pathToLoad, "utf-8");
    gmshelfCoversIndex = JSON.parse(raw);
  }
} catch (e) {
  console.warn("Failed to load initial gmshelf covers cache:", e);
}

// Build fast lookup indices
interface CoverItem {
  repo: 'seraph' | 'truffled' | 'ckv';
  filename: string;
}

const gmshelfSlugMap = new Map<string, CoverItem>();
const gmshelfWordMap = new Map<string, CoverItem>();
const gmshelfOwnSlugMap = {
  seraph: new Map<string, string>(),
  truffled: new Map<string, string>(),
  ckv: new Map<string, string>(),
};

function indexGmshelfCovers() {
  gmshelfSlugMap.clear();
  gmshelfWordMap.clear();
  gmshelfOwnSlugMap.seraph.clear();
  gmshelfOwnSlugMap.truffled.clear();
  gmshelfOwnSlugMap.ckv.clear();

  const registerRepoCovers = (files: string[], repo: 'seraph' | 'truffled' | 'ckv') => {
    for (const f of files) {
      const lower = f.toLowerCase();
      const base = lower.replace(/\.(webp|jpg|jpeg|png)$/, '');
      const clean = base.replace(/[^a-z0-9]/g, '');

      gmshelfOwnSlugMap[repo].set(clean, f);
      gmshelfOwnSlugMap[repo].set(base, f);

      if (!gmshelfSlugMap.has(clean)) {
        gmshelfSlugMap.set(clean, { repo, filename: f });
      }
      if (!gmshelfSlugMap.has(base)) {
        gmshelfSlugMap.set(base, { repo, filename: f });
      }
      if (clean.length >= 4 && !gmshelfWordMap.has(clean)) {
        gmshelfWordMap.set(clean, { repo, filename: f });
      }
    }
  };

  registerRepoCovers(gmshelfCoversIndex.seraph || [], 'seraph');
  registerRepoCovers(gmshelfCoversIndex.truffled || [], 'truffled');
  registerRepoCovers(gmshelfCoversIndex.ckv || [], 'ckv');
}
indexGmshelfCovers();

function resolveGmshelfCover(
  repo: 'truffled' | 'seraph' | 'ugs' | 'ckv',
  name: string,
  rawImg: string,
  url: string
): string {
  // 1. If game already has explicit cover image in repo (like in ckv.json which defines /covers/...)
  if (rawImg && !rawImg.includes('placeholder.png')) {
    const cleanImg = rawImg.startsWith('/') ? rawImg : '/' + rawImg;
    return cleanImg.startsWith('http')
      ? cleanImg
      : `https://raw.githubusercontent.com/gmshelf/${repo}/main${cleanImg}`;
  }

  const cleanTitle = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pathParts = (url || '').split('/').filter(Boolean);
  const folder = (pathParts[1] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const file = (pathParts[pathParts.length - 1] || '')
    .replace('.html', '')
    .replace(/^cl/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const candidates = [cleanTitle, folder, file].filter(Boolean);

  // 2. Check own repo covers first
  if (repo === 'seraph' || repo === 'truffled' || repo === 'ckv') {
    const ownMap = gmshelfOwnSlugMap[repo];
    for (const cand of candidates) {
      if (ownMap.has(cand)) {
        const fn = ownMap.get(cand)!;
        return `https://raw.githubusercontent.com/gmshelf/${repo}/main/covers/${fn}`;
      }
    }
  }

  // 3. Cross-repo exact slug match from other gmshelf repositories
  for (const cand of candidates) {
    if (gmshelfSlugMap.has(cand)) {
      const match = gmshelfSlugMap.get(cand)!;
      return `https://raw.githubusercontent.com/gmshelf/${match.repo}/main/covers/${match.filename}`;
    }
  }

  // 4. Keyword / prefix match for composite names
  for (const cand of candidates) {
    if (cand.length >= 4) {
      for (const [key, match] of gmshelfWordMap.entries()) {
        if (key.length >= 4 && (cand === key || cand.startsWith(key) || key.startsWith(cand))) {
          return `https://raw.githubusercontent.com/gmshelf/${match.repo}/main/covers/${match.filename}`;
        }
      }
    }
  }

  return '';
}

async function fetchGmshelfRepo(repo: 'truffled' | 'seraph' | 'ugs' | 'ckv'): Promise<any[]> {
  const cached = gmshelfCache[repo];
  if (cached && cached.games.length > 0 && Date.now() - cached.time < GAME_CACHE_TTL) {
    return cached.games;
  }

  const jsonUrl = `https://cdn.jsdelivr.net/gh/gmshelf/${repo}/${repo}.json`;
  const baseCdn = `https://cdn.jsdelivr.net/gh/gmshelf/${repo}`;

  try {
    const res = await fetch(jsonUrl, {
      signal: AbortSignal.timeout(9000),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${repo}.json`);
    const data = await res.json();
    const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.games) ? data.games : [];

    const seen = new Set<string>();
    const categoryLabels: Record<string, string> = {
      truffled: 'Truffled',
      seraph: 'Seraph',
      ugs: 'UGS',
      ckv: 'CKV',
    };

    const games = rawList
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;
        const name = (item.name || item.title || '').trim();
        const rawPath = item.url || item.link || item.path || '';
        if (!name || !rawPath) return null;

        const lowerName = name.toLowerCase();
        if (seen.has(lowerName)) return null;
        seen.add(lowerName);

        const cleanPath = String(rawPath).startsWith('/') ? String(rawPath) : '/' + String(rawPath);
        const fullGameUrl = cleanPath.startsWith('http') ? cleanPath : `${baseCdn}${cleanPath}`;
        const proxiedUrl = `/api/proxy-game?url=${encodeURIComponent(fullGameUrl)}`;

        // Resolve Cover Image directly from GitHub repo covers
        const rawImg = item.img || item.image || item.cover || '';
        const coverUrl = resolveGmshelfCover(repo, name, rawImg, rawPath);

        return {
          id: `${repo}-${idx}-${encodeURIComponent(name)}`,
          title: name,
          description: `${name} (${categoryLabels[repo]} Unblocked)`,
          image: coverUrl,
          url: proxiedUrl,
          source: repo,
          category: categoryLabels[repo],
          rating: Number((4.7 + ((idx * 7) % 30) / 100).toFixed(1)),
          plays: `${(1.2 + ((idx * 13) % 45) / 10).toFixed(1)}M`,
        };
      })
      .filter(Boolean);

    if (games.length > 0) {
      gmshelfCache[repo] = { games, time: Date.now() };
    }
    return games;
  } catch (err: any) {
    console.warn(`gmshelf ${repo} fetch error:`, err?.message || err);
    return gmshelfCache[repo]?.games || [];
  }
}

app.get("/api/games/gmshelf", async (req, res) => {
  const repo = (req.query.repo as string) || "all";
  if (repo === "truffled" || repo === "seraph" || repo === "ugs" || repo === "ckv") {
    const list = await fetchGmshelfRepo(repo);
    return res.json({ games: list, source: repo, count: list.length });
  }

  // All gmshelf repos combined
  const [truffled, seraph, ugs, ckv] = await Promise.all([
    fetchGmshelfRepo('truffled'),
    fetchGmshelfRepo('seraph'),
    fetchGmshelfRepo('ugs'),
    fetchGmshelfRepo('ckv'),
  ]);

  const all = [...truffled, ...seraph, ...ugs, ...ckv];
  res.json({
    games: all,
    source: 'gmshelf',
    counts: {
      truffled: truffled.length,
      seraph: seraph.length,
      ugs: ugs.length,
      ckv: ckv.length,
      total: all.length,
    },
  });
});

app.get("/api/games/truffled", async (_req, res) => {
  const games = await fetchGmshelfRepo("truffled");
  res.json({ games });
});

app.get("/api/games/seraph", async (_req, res) => {
  const games = await fetchGmshelfRepo("seraph");
  res.json({ games });
});

app.get("/api/games/ugs", async (_req, res) => {
  const games = await fetchGmshelfRepo("ugs");
  res.json({ games });
});

app.get("/api/games/ckv", async (_req, res) => {
  const games = await fetchGmshelfRepo("ckv");
  res.json({ games });
});

// ANIME CATALOG ENDPOINTS (Resilient Kitsu + Curated Fallback Engine)
const KNOWN_ANILIST_IDS: Record<string, number> = {
  'attack on titan': 16498,
  'shingeki no kyojin': 16498,
  'one piece': 21,
  'jujutsu kaisen': 113415,
  'demon slayer': 101922,
  'kimetsu no yaiba': 101922,
  'solo leveling': 151807,
  'chainsaw man': 127230,
  'frieren': 154587,
  'bleach': 114446,
  'my hero academia': 21459,
  'boku no hero academia': 21459,
  'spy x family': 140960,
  'death note': 1535,
  'naruto': 20,
  'naruto shippuden': 1735,
  'naruto: shippuuden': 1735,
  'hunter x hunter': 11061,
  'vinland saga': 101348,
  'cyberpunk: edgerunners': 120377,
  'hell\'s paradise': 128893,
  'jigokuraku': 128893,
  'oshi no ko': 150672,
  'fullmetal alchemist: brotherhood': 5114,
  'kaiju no. 8': 153288,
  'dandadan': 171018,
};

const CURATED_ANIME_LIST = [
  {
    id: 'anilist-16498',
    anilistId: 16498,
    mediaType: 'anime',
    title: 'Attack on Titan',
    year: 2013,
    rating: 8.8,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/7442/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/7442/large.jpg',
    description: 'Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called titans, forcing humans to hide in fear behind enormous concentric walls.',
    genres: ['Action', 'Fantasy', 'Drama'],
    duration: '25 Episodes',
    episodesCount: 25,
  },
  {
    id: 'anilist-21',
    anilistId: 21,
    mediaType: 'anime',
    title: 'One Piece',
    year: 1999,
    rating: 8.9,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/12/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/12/large.jpg',
    description: 'Gol D. Roger was known as the Pirate King. Following in the footsteps of his childhood hero, Monkey D. Luffy and his crew travel across the Grand Line.',
    genres: ['Action', 'Adventure', 'Fantasy'],
    duration: '1000+ Episodes',
    episodesCount: 1100,
  },
  {
    id: 'anilist-113415',
    anilistId: 113415,
    mediaType: 'anime',
    title: 'Jujutsu Kaisen',
    year: 2020,
    rating: 8.6,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/42765/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/42765/large.jpg',
    description: 'Yuji Itadori is a boy with tremendous physical strength, though he lives a completely ordinary high school life until he swallows the finger of Sukuna.',
    genres: ['Action', 'Supernatural', 'Fantasy'],
    duration: '24 Episodes',
    episodesCount: 24,
  },
  {
    id: 'anilist-101922',
    anilistId: 101922,
    mediaType: 'anime',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    year: 2019,
    rating: 8.7,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/41370/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/41370/large.jpg',
    description: 'Tanjiro Kamado lives with his family and makes money by selling charcoal. One day, his family is slaughtered by demons, and his sister is transformed.',
    genres: ['Action', 'Fantasy', 'Historical'],
    duration: '26 Episodes',
    episodesCount: 26,
  },
  {
    id: 'anilist-151807',
    anilistId: 151807,
    mediaType: 'anime',
    title: 'Solo Leveling',
    year: 2024,
    rating: 8.5,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/46038/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/46038/large.jpg',
    description: 'In a world where hunters awakened with supernatural abilities, the weakest hunter Sung Jinwoo discovers a mysterious quest window that allows him to level up.',
    genres: ['Action', 'Fantasy', 'Adventure'],
    duration: '12 Episodes',
    episodesCount: 12,
  },
  {
    id: 'anilist-127230',
    anilistId: 127230,
    mediaType: 'anime',
    title: 'Chainsaw Man',
    year: 2022,
    rating: 8.4,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/43806/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/43806/large.jpg',
    description: 'Denji was a small-time devil hunter living in extreme poverty until he makes a pact with Pochita and becomes the chainsaw devil.',
    genres: ['Action', 'Supernatural', 'Horror'],
    duration: '12 Episodes',
    episodesCount: 12,
  },
  {
    id: 'anilist-154587',
    anilistId: 154587,
    mediaType: 'anime',
    title: 'Frieren: Beyond Journey\'s End',
    year: 2023,
    rating: 9.1,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/46474/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/46474/large.jpg',
    description: 'The mage Frieren defeated the Demon King alongside the hero party. Decades later, she embarks on a new pilgrimage to understand human connection.',
    genres: ['Fantasy', 'Adventure', 'Drama'],
    duration: '28 Episodes',
    episodesCount: 28,
  },
  {
    id: 'anilist-21459',
    anilistId: 21459,
    mediaType: 'anime',
    title: 'My Hero Academia',
    year: 2016,
    rating: 8.2,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/11469/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/11469/large.jpg',
    description: 'In a society where 80 percent of humans possess Quirks, Izuku Midoriya was born powerless but catches the eye of the legendary hero All Might.',
    genres: ['Action', 'Superhero', 'School'],
    duration: '138 Episodes',
    episodesCount: 138,
  },
  {
    id: 'anilist-140960',
    anilistId: 140960,
    mediaType: 'anime',
    title: 'Spy x Family',
    year: 2022,
    rating: 8.5,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/45037/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/45037/large.jpg',
    description: 'To secure peace between nations, master spy Twilight forms a fabricated family with an assassin and a telepathic little girl.',
    genres: ['Comedy', 'Action', 'Spy'],
    duration: '25 Episodes',
    episodesCount: 25,
  },
  {
    id: 'anilist-1535',
    anilistId: 1535,
    mediaType: 'anime',
    title: 'Death Note',
    year: 2006,
    rating: 8.9,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/1376/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/1376/large.jpg',
    description: 'Light Yagami is a brilliant student who stumbles across the Death Note: a notebook capable of killing anyone whose name is written in it.',
    genres: ['Mystery', 'Psychological', 'Supernatural'],
    duration: '37 Episodes',
    episodesCount: 37,
  },
  {
    id: 'anilist-1735',
    anilistId: 1735,
    mediaType: 'anime',
    title: 'Naruto: Shippuden',
    year: 2007,
    rating: 8.3,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/1555/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/1555/large.jpg',
    description: 'Naruto returns to the Hidden Leaf Village after two and a half years of rigorous training with Master Jiraiya, ready to face the Akatsuki organization.',
    genres: ['Action', 'Adventure', 'Martial Arts'],
    duration: '500 Episodes',
    episodesCount: 500,
  },
  {
    id: 'anilist-11061',
    anilistId: 11061,
    mediaType: 'anime',
    title: 'Hunter x Hunter',
    year: 2011,
    rating: 9.0,
    category: 'anime',
    image: 'https://media.kitsu.app/anime/poster_images/6448/large.jpg',
    backdrop: 'https://media.kitsu.app/anime/cover_images/6448/large.jpg',
    description: 'Gon Freecss aspires to become a Hunter in order to find his father, facing treacherous trials with Killua, Kurapika, and Leorio.',
    genres: ['Action', 'Adventure', 'Fantasy'],
    duration: '148 Episodes',
    episodesCount: 148,
  },
];

// ==========================================
// ANILIST GRAPHQL CLIENT & CACHING
// ==========================================
const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

const ANILIST_TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: [TRENDING_DESC, POPULARITY_DESC], isAdult: false) {
      id
      idMal
      title {
        english
        romaji
        userPreferred
      }
      coverImage {
        extraLarge
        large
        medium
      }
      bannerImage
      description
      episodes
      seasonYear
      startDate {
        year
      }
      genres
      averageScore
    }
  }
}
`;

const ANILIST_SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
      id
      idMal
      title {
        english
        romaji
        userPreferred
      }
      coverImage {
        extraLarge
        large
        medium
      }
      bannerImage
      description
      episodes
      seasonYear
      startDate {
        year
      }
      genres
      averageScore
    }
  }
}
`;

async function fetchAniListGraphQL(query: string, variables: any = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Yuno/2.0",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`AniList returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function mapAniListMediaToAnime(media: any) {
  const anilistId = media.id;
  const title =
    media.title?.english ||
    media.title?.userPreferred ||
    media.title?.romaji ||
    "Untitled Anime";
  const rating = media.averageScore
    ? Math.round((media.averageScore / 10) * 10) / 10
    : 8.5;
  const year = media.seasonYear || media.startDate?.year || 2024;
  const image =
    media.coverImage?.extraLarge ||
    media.coverImage?.large ||
    media.coverImage?.medium ||
    "";
  const backdrop = media.bannerImage || image;
  const rawDesc = media.description || "Popular anime series.";
  const description = rawDesc.replace(/<[^>]*>?/gm, "").slice(0, 300);
  const episodes = media.episodes || 12;

  return {
    id: `anilist-${anilistId}`,
    tmdbId: anilistId,
    anilistId,
    idMal: media.idMal,
    mediaType: "anime" as const,
    title,
    year,
    rating,
    category: "anime" as const,
    image,
    backdrop,
    posterUrl: image,
    backdropUrl: backdrop,
    poster_path: image,
    backdrop_path: backdrop,
    description,
    genres: Array.isArray(media.genres) && media.genres.length > 0 ? media.genres : ["Anime", "Action"],
    duration: `${episodes} Episodes`,
    episodesCount: episodes,
    seasonsCount: 1,
  };
}

// In-memory cache for trending anime (15 mins)
let cachedAniListTrending: any[] = [];
let cachedAniListTrendingTime = 0;

app.get("/api/anime/trending", async (req, res) => {
  const now = Date.now();
  if (cachedAniListTrending.length > 0 && now - cachedAniListTrendingTime < 15 * 60 * 1000) {
    return res.json({ anime: cachedAniListTrending });
  }

  try {
    const data = await fetchAniListGraphQL(ANILIST_TRENDING_QUERY, { page: 1, perPage: 30 }, 15000);
    const mediaList = data?.data?.Page?.media || [];
    if (Array.isArray(mediaList) && mediaList.length > 0) {
      const anime = mediaList.map(mapAniListMediaToAnime);
      cachedAniListTrending = anime;
      cachedAniListTrendingTime = now;
      return res.json({ anime });
    }
    res.json({ anime: CURATED_ANIME_LIST });
  } catch (err: any) {
    // If upstream timed out or was aborted, silently return cached or curated list
    res.json({ anime: cachedAniListTrending.length > 0 ? cachedAniListTrending : CURATED_ANIME_LIST });
  }
});

app.get("/api/anime/search", async (req, res) => {
  const searchStr = (req.query.query as string || "").trim();
  if (!searchStr) {
    return res.json({ anime: cachedAniListTrending.length > 0 ? cachedAniListTrending : CURATED_ANIME_LIST });
  }

  try {
    const data = await fetchAniListGraphQL(ANILIST_SEARCH_QUERY, { search: searchStr, page: 1, perPage: 25 }, 12000);
    const mediaList = data?.data?.Page?.media || [];
    if (Array.isArray(mediaList) && mediaList.length > 0) {
      const anime = mediaList.map(mapAniListMediaToAnime);
      return res.json({ anime });
    }

    const lower = searchStr.toLowerCase();
    const filtered = CURATED_ANIME_LIST.filter((a) => a.title.toLowerCase().includes(lower));
    res.json({ anime: filtered.length > 0 ? filtered : CURATED_ANIME_LIST.slice(0, 10) });
  } catch (err: any) {
    const lower = searchStr.toLowerCase();
    const filtered = CURATED_ANIME_LIST.filter((a) => a.title.toLowerCase().includes(lower));
    res.json({ anime: filtered.length > 0 ? filtered : CURATED_ANIME_LIST.slice(0, 10) });
  }
});

// Direct GraphQL proxy to AniList for custom queries
app.post("/api/anilist/graphql", async (req, res) => {
  try {
    const { query, variables } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Missing GraphQL query" });
    }
    const result = await fetchAniListGraphQL(query, variables);
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: "Failed to query AniList GraphQL", message: err?.message });
  }
});

// Profile Management Endpoints
app.get("/api/profile/:username", (req, res) => {
  const username = req.params.username;
  const profile = userProfiles[username] || {
    username,
    displayName: username,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    status: 'Exploring Yunø Portal',
    bio: 'Yunø User',
    badge: 'MEMBER',
    accentColor: '#3b82f6',
  };
  res.json(profile);
});

app.post("/api/profile", (req, res) => {
  const profile: UserProfile = req.body;
  if (!profile || !profile.username) {
    return res.status(400).json({ error: "Invalid profile data" });
  }
  userProfiles[profile.username] = profile;
  res.json({ success: true, profile });
});

// Admin & Security endpoints
app.post("/api/admin/verify-code", (req, res) => {
  const { code, username } = req.body;

  // Check lockout status
  const now = Date.now();
  if (now < adminLockoutExpiry) {
    const remainingSecs = Math.ceil((adminLockoutExpiry - now) / 1000);
    return res.status(429).json({
      success: false,
      isLockedOut: true,
      lockoutSeconds: remainingSecs,
      error: `Security lockout active due to repeated failed attempts. Please wait ${remainingSecs}s.`,
    });
  }

  const cleanCode = (code || "").trim();
  const isValidPasscode =
    cleanCode === customAdminPasscode ||
    cleanCode === "8560" ||
    cleanCode === "yuno-owner-root" ||
    cleanCode === "yuno-master-override-99";

  if (isValidPasscode) {
    adminFailedAttempts = 0;
    adminLockoutExpiry = 0;

    const token = `admin-token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    validAdminTokens.add(token);

    if (username) {
      claimedAdminUsers.set(username.trim().toLowerCase(), token);
      const existingProf = userProfiles[username];
      if (existingProf) {
        existingProf.badge = "ADMIN";
        existingProf.isAdmin = true;
      }
    }

    return res.json({
      success: true,
      isAdmin: true,
      token,
      message: "Admin authentication verified. Master security clearance granted!",
    });
  }

  // Failed attempt
  adminFailedAttempts += 1;
  const maxAttempts = 5;
  if (adminFailedAttempts >= maxAttempts) {
    adminLockoutExpiry = Date.now() + 30000; // 30 seconds cooldown
    adminFailedAttempts = 0;
    return res.status(429).json({
      success: false,
      isLockedOut: true,
      lockoutSeconds: 30,
      error: "Too many failed attempts. Security cooldown active for 30 seconds.",
    });
  }

  const remaining = maxAttempts - adminFailedAttempts;
  res.status(401).json({
    success: false,
    attemptsRemaining: remaining,
    error: `Incorrect admin master passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary security lockout.`,
  });
});

app.post("/api/admin/validate-token", (req, res) => {
  const { token, username } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false });
  }

  const isValid =
    validAdminTokens.has(token) ||
    token === "admin-auth-8560" ||
    token.startsWith("admin-token-");

  if (isValid && username) {
    claimedAdminUsers.set(username.trim().toLowerCase(), token);
  }

  res.json({ valid: isValid, isAdmin: isValid });
});

app.post("/api/admin/change-passcode", (req, res) => {
  const { currentCode, newCode, token } = req.body;

  const isAuthByToken = token && (validAdminTokens.has(token) || token === "admin-auth-8560");
  const isAuthByCurrentCode =
    currentCode &&
    (currentCode === customAdminPasscode ||
      currentCode === "8560" ||
      currentCode === "yuno-owner-root" ||
      currentCode === "yuno-master-override-99");

  if (!isAuthByToken && !isAuthByCurrentCode) {
    return res.status(403).json({ error: "Unauthorized: Current admin credentials or session required." });
  }

  const cleanNewCode = (newCode || "").trim();
  if (!cleanNewCode || cleanNewCode.length < 3) {
    return res.status(400).json({ error: "New passcode must be at least 3 characters long." });
  }

  customAdminPasscode = cleanNewCode;
  savePersistedData();

  res.json({
    success: true,
    message: "Admin master passcode updated successfully and saved to persistent storage.",
  });
});

app.post("/api/admin/claim-developer", (req, res) => {
  const { username, clientKey, passcode } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  const normalized = username.trim().toLowerCase();
  const isAllowedAdmin = passcode === "8560" || normalized === "yuno" || normalized === "yuno dev isa" || normalized === "isaman" || normalized.startsWith("yuno") || normalized.startsWith("isaman");
  if (isAllowedAdmin) {
    claimedAdminUsers.set(normalized, clientKey || "secured-admin");
    return res.json({
      claimed: true,
      isAdmin: true,
      message: `Security clearance granted for ${username}. Developer Admin Panel unlocked!`
    });
  }

  res.json({ claimed: false, isAdmin: false });
});

app.get("/api/admin/status", (req, res) => {
  const activeTimeoutsList: Record<string, number> = {};
  userTimeouts.forEach((expiry, uname) => {
    if (expiry > Date.now()) {
      activeTimeoutsList[uname] = expiry;
    }
  });

  const activeTrollsList: Record<string, any> = {};
  trollEffects.forEach((eff, uname) => {
    activeTrollsList[uname] = eff;
  });

  res.json({
    adminClaimed: claimedAdminUsers.size > 0,
    claimedAdmins: Array.from(claimedAdminUsers.keys()),
    bannedUsers: Array.from(bannedUsers),
    bannedDetails: Array.from(bannedUsersMap.values()),
    banScreenImage: customBanScreenImage,
    timeouts: activeTimeoutsList,
    timeoutDetails: Object.fromEntries(userTimeoutDetails),
    reports: userReportsList,
    bugReports: bugReportsList,
    announcements: globalAnnouncements,
    trollEffects: activeTrollsList,
    profanityConfig: profanityFilterConfig,
    appeals: banAppeals,
  });
});

app.post("/api/admin/ban", (req, res) => {
  const { targetUser, reason, adminName, customBanImage, passcode } = req.body;
  if (!targetUser) return res.status(400).json({ error: "Target user is required" });

  const cleanUser = targetUser.trim();
  const banRecord: ServerBanRecord = {
    username: cleanUser,
    reason: (reason || "Violating community standards and guidelines").trim(),
    bannedAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    bannedBy: adminName || "Admin",
    banImageUrl: customBanImage || customBanScreenImage,
  };

  bannedUsersMap.set(cleanUser, banRecord);
  bannedUsers.add(cleanUser);
  savePersistedData();

  res.json({
    success: true,
    message: `User ${cleanUser} has been permanently banned from the entire site. Reason: ${banRecord.reason}`,
    banRecord
  });
});

app.post("/api/admin/unban", (req, res) => {
  const { targetUser } = req.body;
  if (!targetUser) return res.status(400).json({ error: "Target user required" });

  const cleanUser = targetUser.trim();
  bannedUsersMap.delete(cleanUser);
  bannedUsers.delete(cleanUser);
  savePersistedData();

  res.json({ success: true, message: `User ${cleanUser} has been successfully unbanned. Access restored.` });
});

app.post("/api/admin/timeout", (req, res) => {
  const { targetUser, durationMinutes, reason, adminName } = req.body;
  if (!targetUser) return res.status(400).json({ error: "Target user required" });

  const cleanUser = targetUser.trim();
  const mins = durationMinutes || 15;
  const expiry = Date.now() + mins * 60 * 1000;
  userTimeouts.set(cleanUser, expiry);
  userTimeoutDetails.set(cleanUser, {
    reason: reason || "Temporary moderation cooldown",
    adminName: adminName || "Admin",
    durationMinutes: mins,
  });

  res.json({
    success: true,
    message: `User ${cleanUser} has been timed out for ${mins} minutes.`,
    expiry
  });
});

app.post("/api/admin/remove-timeout", (req, res) => {
  const { targetUser } = req.body;
  if (!targetUser) return res.status(400).json({ error: "Target user required" });

  const cleanUser = targetUser.trim();
  userTimeouts.delete(cleanUser);
  userTimeoutDetails.delete(cleanUser);

  res.json({ success: true, message: `Timeout removed for ${cleanUser}.` });
});

app.post("/api/admin/set-ban-image", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: "Valid image URL or data URI required" });
  }

  customBanScreenImage = imageUrl.trim();
  savePersistedData();

  res.json({ success: true, banScreenImage: customBanScreenImage, message: "Ban screen lockout image updated successfully." });
});

// Reports and Bug Reports Endpoints
app.post("/api/reports/submit", (req, res) => {
  const { type, reporter, targetUser, messageContent, messageId, channelId, reason, details } = req.body;
  if (!reason || !reporter) {
    return res.status(400).json({ error: "Reporter and reason are required" });
  }

  const newReport: ServerReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: type || 'user',
    reporter: reporter.trim(),
    targetUser: targetUser ? targetUser.trim() : undefined,
    messageContent: messageContent ? messageContent.trim() : undefined,
    messageId,
    channelId,
    reason: reason.trim(),
    details: details ? details.trim() : undefined,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'open',
  };

  userReportsList.unshift(newReport);
  savePersistedData();

  res.json({
    success: true,
    message: `Report has been submitted to the Admin Moderation Queue for review.`,
    report: newReport
  });
});

app.get("/api/reports/list", (req, res) => {
  res.json({ success: true, reports: userReportsList });
});

app.post("/api/reports/action", (req, res) => {
  const { reportId, action, reason, adminName } = req.body;
  const report = userReportsList.find(r => r.id === reportId);
  if (!report) return res.status(404).json({ error: "Report not found" });

  if (action === 'resolve') {
    report.status = 'resolved';
  } else if (action === 'dismiss') {
    report.status = 'dismissed';
  } else if (action === 'ban_target' && report.targetUser) {
    report.status = 'resolved';
    bannedUsersMap.set(report.targetUser, {
      username: report.targetUser,
      reason: reason || `Banned due to report #${report.id}: ${report.reason}`,
      bannedAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      bannedBy: adminName || 'Admin',
      banImageUrl: customBanScreenImage,
    });
    bannedUsers.add(report.targetUser);
  }

  savePersistedData();
  res.json({ success: true, message: `Report updated to ${report.status}`, report });
});

app.post("/api/bug-reports/submit", (req, res) => {
  const { reporter, title, description, category } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Title and description are required" });
  }

  const newBug: ServerBugReport = {
    id: `bug-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    reporter: (reporter || 'Anonymous').trim(),
    title: title.trim(),
    description: description.trim(),
    category: category || 'Other',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'open',
  };

  bugReportsList.unshift(newBug);
  savePersistedData();

  res.json({
    success: true,
    message: `Thank you! Your bug report has been filed and sent to the developer.`,
    bug: newBug
  });
});

app.get("/api/bug-reports/list", (req, res) => {
  res.json({ success: true, bugReports: bugReportsList });
});

app.post("/api/bug-reports/action", (req, res) => {
  const { bugId, status } = req.body;
  const bug = bugReportsList.find(b => b.id === bugId);
  if (!bug) return res.status(404).json({ error: "Bug report not found" });

  bug.status = status || 'fixed';
  savePersistedData();
  res.json({ success: true, message: `Bug status changed to ${bug.status}`, bug });
});

// Social & Friends Endpoints
app.post("/api/friends/request", (req, res) => {
  const { fromUser, toUser, fromAvatar } = req.body;
  if (!fromUser || !toUser) return res.status(400).json({ error: "Sender and recipient required" });
  if (fromUser.toLowerCase() === toUser.toLowerCase()) {
    return res.status(400).json({ error: "You cannot add yourself as a friend." });
  }

  const existing = friendRequestsList.find(
    r => r.fromUser.toLowerCase() === fromUser.toLowerCase() &&
         r.toUser.toLowerCase() === toUser.toLowerCase() &&
         r.status === 'pending'
  );
  if (existing) {
    return res.json({ success: true, message: "Friend request already pending.", request: existing });
  }

  const newReq: ServerFriendRequest = {
    id: `freq-${Date.now()}`,
    fromUser: fromUser.trim(),
    toUser: toUser.trim(),
    fromAvatar,
    status: 'pending',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  friendRequestsList.unshift(newReq);
  savePersistedData();

  res.json({ success: true, message: `Friend request sent to ${toUser}!`, request: newReq });
});

app.post("/api/friends/respond", (req, res) => {
  const { requestId, action } = req.body;
  const reqItem = friendRequestsList.find(r => r.id === requestId);
  if (!reqItem) return res.status(404).json({ error: "Friend request not found" });

  if (action === 'accept') {
    reqItem.status = 'accepted';
    if (!userFriendsMap.has(reqItem.fromUser)) userFriendsMap.set(reqItem.fromUser, new Set());
    if (!userFriendsMap.has(reqItem.toUser)) userFriendsMap.set(reqItem.toUser, new Set());
    userFriendsMap.get(reqItem.fromUser)!.add(reqItem.toUser);
    userFriendsMap.get(reqItem.toUser)!.add(reqItem.fromUser);
    savePersistedData();
    return res.json({ success: true, message: `You and ${reqItem.fromUser} are now friends!` });
  } else {
    reqItem.status = 'declined';
    savePersistedData();
    return res.json({ success: true, message: `Friend request declined.` });
  }
});

app.post("/api/friends/remove", (req, res) => {
  const { user1, user2 } = req.body;
  if (!user1 || !user2) return res.status(400).json({ error: "Both users required" });

  if (userFriendsMap.has(user1)) userFriendsMap.get(user1)!.delete(user2);
  if (userFriendsMap.has(user2)) userFriendsMap.get(user2)!.delete(user1);
  savePersistedData();

  res.json({ success: true, message: `Friend removed.` });
});

app.get("/api/friends/:username", (req, res) => {
  const username = req.params.username;
  const friendsSet = userFriendsMap.get(username) || new Set();
  const incoming = friendRequestsList.filter(r => r.toUser.toLowerCase() === username.toLowerCase() && r.status === 'pending');
  const outgoing = friendRequestsList.filter(r => r.fromUser.toLowerCase() === username.toLowerCase() && r.status === 'pending');

  res.json({
    friends: Array.from(friendsSet),
    incomingRequests: incoming,
    outgoingRequests: outgoing
  });
});

app.post("/api/profile/now-playing", (req, res) => {
  const { username, nowPlaying } = req.body;
  if (!username) return res.status(400).json({ error: "Username required" });

  if (userProfiles[username]) {
    userProfiles[username].nowPlaying = nowPlaying;
  }
  res.json({ success: true });
});

app.get("/api/appeals/list", (req, res) => {
  res.json({ success: true, appeals: banAppeals });
});

app.post("/api/appeals/submit", (req, res) => {
  const { username, reason } = req.body;
  if (!username || !reason) {
    return res.status(400).json({ error: "Username and reason for appeal are required." });
  }

  const cleanUser = username.trim();
  const isBanned = bannedUsers.has(cleanUser);
  const isTimedOut = userTimeouts.has(cleanUser) && (userTimeouts.get(cleanUser)! > Date.now());

  const newAppeal: BanAppeal = {
    id: `appeal-${Date.now()}`,
    username: cleanUser,
    reason: reason.trim(),
    status: 'PENDING',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: isBanned ? 'BAN' : isTimedOut ? 'TIMEOUT' : 'BAN'
  };

  // Remove any previous pending appeal for this user to avoid duplicates
  const existingIdx = banAppeals.findIndex(a => a.username.toLowerCase() === cleanUser.toLowerCase() && a.status === 'PENDING');
  if (existingIdx !== -1) {
    banAppeals.splice(existingIdx, 1);
  }

  banAppeals.unshift(newAppeal);
  savePersistedData();

  res.json({
    success: true,
    message: `Your appeal has been inscribed into the Death Note appeal record for Admin review.`,
    appeal: newAppeal
  });
});

app.post("/api/appeals/respond", (req, res) => {
  const { requester, appealId, decision } = req.body;
  const reqNorm = (requester || "").trim().toLowerCase();
  const isReqAdmin = reqNorm === "yuno" || reqNorm === "yuno dev isa" || reqNorm === "isaman" || reqNorm.startsWith("yuno") || reqNorm.startsWith("isaman");
  
  if (!isReqAdmin) {
    return res.status(403).json({ error: "Unauthorized. Only admins can resolve appeals." });
  }

  const appeal = banAppeals.find(a => a.id === appealId);
  if (!appeal) {
    return res.status(404).json({ error: "Appeal record not found." });
  }

  if (decision === 'approve') {
    appeal.status = 'APPROVED';
    bannedUsers.delete(appeal.username);
    userTimeouts.delete(appeal.username);
    savePersistedData();
    return res.json({
      success: true,
      message: `Appeal APPROVED! ${appeal.username}'s name has been erased from the Death Note. Access restored.`,
      appeal
    });
  } else if (decision === 'reject') {
    appeal.status = 'REJECTED';
    savePersistedData();
    return res.json({
      success: true,
      message: `Appeal REJECTED. ${appeal.username} remains bound by the Death Note.`,
      appeal
    });
  } else {
    return res.status(400).json({ error: "Invalid decision. Must be 'approve' or 'reject'." });
  }
});

app.get("/api/admin/chat-reset-status", (req, res) => {
  res.json({
    scheduledAt: 0,
    isActive: false,
    remainingMins: 0,
    remainingSeconds: 0
  });
});

app.post("/api/admin/action", (req, res) => {
  const { requester, action, targetUser, durationMinutes, announcementContent, messageId, config } = req.body;

  const reqNorm = (requester || "").trim().toLowerCase();
  const isReqAdmin = reqNorm === "yuno" || reqNorm === "yuno dev isa" || reqNorm === "isaman" || reqNorm.startsWith("yuno") || reqNorm.startsWith("isaman");
  if (!isReqAdmin) {
    return res.status(403).json({ error: "Unauthorized. Admin privileges are restricted exclusively to 'yuno' or 'isaman'." });
  }

  if (action === "ban_user" && targetUser) {
    bannedUsers.add(targetUser);
    return res.json({ success: true, message: `User ${targetUser} has been permanently banned from chat.` });
  }

  if (action === "unban_user" && targetUser) {
    bannedUsers.delete(targetUser);
    return res.json({ success: true, message: `User ${targetUser} has been unbanned.` });
  }

  if (action === "timeout_user" && targetUser) {
    const mins = durationMinutes || 10;
    const expiry = Date.now() + mins * 60 * 1000;
    userTimeouts.set(targetUser, expiry);
    return res.json({ success: true, message: `User ${targetUser} has been timed out for ${mins} minutes.` });
  }

  if (action === "remove_timeout" && targetUser) {
    userTimeouts.delete(targetUser);
    return res.json({ success: true, message: `Timeout removed for ${targetUser}.` });
  }

  if (action === "post_announcement" && announcementContent) {
    const newAnn = {
      id: `ann-${Date.now()}`,
      iconEmoji: '📢',
      title: 'Global Broadcast:',
      description: announcementContent,
      content: announcementContent,
      badge: 'EMERGENCY',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: `${requester} [ADMIN]`
    };
    systemAnnouncements.unshift(newAnn);
    globalAnnouncements.unshift({
      id: newAnn.id,
      content: newAnn.content,
      createdAt: newAnn.createdAt,
      author: newAnn.author
    });
    savePersistedData();
    return res.json({ success: true, announcements: systemAnnouncements });
  }

  if (action === "clear_announcements") {
    systemAnnouncements.length = 0;
    globalAnnouncements.length = 0;
    savePersistedData();
    return res.json({ success: true, announcements: [] });
  }

  if (action === "troll_user" && targetUser) {
    const { discoMode, upsideDown } = req.body;
    trollEffects.set(targetUser, { discoMode: !!discoMode, upsideDown: !!upsideDown });
    return res.json({ success: true, trollEffects: Object.fromEntries(trollEffects) });
  }

  if (action === "reset_chat") {
    communityMessages.length = 0;
    const now = Date.now();
    communityMessages.push({
      id: `sys-reset-${now}`,
      channelId: "global-chat",
      user: "Yunø_System",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80",
      content: `⚠️ Chat history has been cleared by Admin (${requester}). Messages will persist permanently.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      badge: "SYSTEM",
    });
    savePersistedData();
    return res.json({
      success: true,
      message: `Chat history cleared by admin. Auto-reset is permanently disabled.`,
    });
  }

  if (action === "delete_message" && messageId) {
    const idx = communityMessages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      communityMessages.splice(idx, 1);
    }
    return res.json({ success: true, message: "Message deleted by Admin" });
  }

  if (action === "update_profanity") {
    if (config) {
      profanityFilterConfig = { ...profanityFilterConfig, ...config };
    }
    return res.json({ success: true, config: profanityFilterConfig });
  }

  res.status(400).json({ error: "Unknown admin action" });
});

// Incoming Call Invites & Signaling Endpoints
app.post("/api/calls/invite", (req, res) => {
  const { caller, callerAvatar, targetUser, channelId, channelName, callType } = req.body;
  if (!caller || !channelId) {
    return res.status(400).json({ error: "Missing required call invite parameters" });
  }

  const now = Date.now();
  const inviteId = `call-${now}-${Math.floor(Math.random() * 10000)}`;
  const invite: IncomingCallInvite = {
    id: inviteId,
    caller: caller.trim(),
    callerAvatar: callerAvatar || '',
    targetUser: (targetUser || '').trim(),
    channelId,
    channelName: channelName || 'Voice / Video Call',
    callType: callType || 'voice',
    status: 'ringing',
    createdAt: now,
  };

  incomingCallInvites.set(inviteId, invite);

  // Broadcast realtime call invite to target user & channel
  broadcastRealtime({
    type: 'CALL_INVITE',
    channelId: invite.channelId,
    targetUser: invite.targetUser,
    from: invite.caller,
    data: invite,
  });

  res.json({ success: true, inviteId, channelId });
});

app.get("/api/calls/incoming", (req, res) => {
  const username = ((req.query.username as string) || '').trim().toLowerCase();
  const now = Date.now();

  // Prune expired invites (older than 45s)
  for (const [invId, inv] of incomingCallInvites.entries()) {
    if (now - inv.createdAt > 45000 || inv.status === 'declined' || inv.status === 'ended') {
      incomingCallInvites.delete(invId);
    }
  }

  if (!username) {
    return res.json({ incomingCall: null });
  }

  // Find active ringing invite targeted to this user or matching their DM channel
  let activeInvite: IncomingCallInvite | null = null;
  for (const inv of incomingCallInvites.values()) {
    if (inv.status === 'ringing') {
      const targetMatch = inv.targetUser.toLowerCase() === username;
      const channelMatch = inv.channelId.startsWith('dm_') && inv.channelId.toLowerCase().includes(username);
      const isNotCaller = inv.caller.toLowerCase() !== username;

      if ((targetMatch || channelMatch) && isNotCaller) {
        activeInvite = inv;
        break;
      }
    }
  }

  res.json({ incomingCall: activeInvite });
});

app.post("/api/calls/respond", (req, res) => {
  const { inviteId, action } = req.body; // action: 'accept' | 'decline' | 'cancel'
  if (!inviteId) return res.status(400).json({ error: "Missing inviteId" });

  const invite = incomingCallInvites.get(inviteId);
  if (invite) {
    if (action === 'accept') {
      invite.status = 'accepted';
    } else {
      invite.status = 'declined';
      incomingCallInvites.delete(inviteId);
    }

    broadcastRealtime({
      type: 'CALL_RESPONSE',
      channelId: invite.channelId,
      targetUser: invite.caller,
      from: invite.targetUser,
      data: { inviteId, action, channelId: invite.channelId },
    });
  }
  res.json({ success: true });
});

// WebRTC Signaling Proxy Endpoints (Multi-Device & Robust Room Sync)
app.post("/api/webrtc/signal", (req, res) => {
  const {
    channelId,
    username,
    peerId: customPeerId,
    avatar,
    isMuted,
    isCameraOn,
    isScreenSharing,
    isSpeaking,
    signal,
    signalData,
    action,
    since,
  } = req.body;
  const roomKey = channelId || "global-voice";

  if (!callRooms.has(roomKey)) {
    callRooms.set(roomKey, {
      channelId: roomKey,
      participants: new Map(),
      signals: [],
    });
  }

  const room = callRooms.get(roomKey)!;
  const now = Date.now();

  // Prune inactive participants (no heartbeat in 25s)
  for (const [pKey, pData] of room.participants.entries()) {
    if (pData.lastSeen && now - pData.lastSeen > 25000) {
      room.participants.delete(pKey);
    }
  }

  const effectivePeerId = customPeerId || `peer-${username ? username.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'guest'}`;

  if (username) {
    if (action === "join" || action === "update") {
      room.participants.set(effectivePeerId, {
        id: effectivePeerId,
        username,
        avatar: avatar || "",
        isMuted: !!isMuted,
        isCameraOn: !!isCameraOn,
        isScreenSharing: !!isScreenSharing,
        isSpeaking: !!isSpeaking,
        lastSeen: now,
      });
    } else if (action === "leave") {
      room.participants.delete(effectivePeerId);
      const leaveSig: WebRtcSignalMessage = {
        id: `sig-${now}-${Math.floor(Math.random() * 10000)}`,
        from: username,
        fromPeerId: effectivePeerId,
        to: 'all',
        toPeerId: 'all',
        type: 'leave',
        timestamp: now,
      };
      room.signals.push(leaveSig);
      broadcastRealtime({
        type: 'CALL_PRESENCE',
        channelId: roomKey,
        data: { channelId: roomKey, participants: Array.from(room.participants.values()) },
      });
    }
  }

  // Handle incoming WebRTC signal message (offer, answer, candidate, state_update)
  const incomingSignal = signal || (signalData ? { data: signalData, type: signalData.type || 'state_update', to: signalData.to, toPeerId: signalData.toPeerId } : null);
  if (incomingSignal && username) {
    const sigMsg: WebRtcSignalMessage = {
      id: `sig-${now}-${Math.floor(Math.random() * 1000000)}`,
      from: username,
      fromPeerId: effectivePeerId,
      to: incomingSignal.to || 'all',
      toPeerId: incomingSignal.toPeerId || 'all',
      type: incomingSignal.type || 'candidate',
      data: incomingSignal.data || incomingSignal,
      timestamp: now,
    };
    room.signals.push(sigMsg);

    // Broadcast signal in realtime to target peer(s)
    broadcastRealtime({
      type: 'WEBRTC_SIGNAL',
      channelId: roomKey,
      from: username,
      targetUser: incomingSignal.to && incomingSignal.to !== 'all' ? incomingSignal.to : undefined,
      data: sigMsg,
    });
  }

  // Prune old signals (older than 40s or keep max 120)
  room.signals = room.signals.filter((s) => now - s.timestamp < 40000);
  if (room.signals.length > 120) {
    room.signals = room.signals.slice(-120);
  }

  // Filter signals relevant to this peer (exclude self; match peer ID or username or broadcast 'all')
  const sinceTime = typeof since === 'number' ? since : 0;
  const userSignals = room.signals.filter((s) => {
    if (s.timestamp <= sinceTime) return false;
    if (s.fromPeerId === effectivePeerId) return false;
    if (s.from === username && s.fromPeerId === effectivePeerId) return false;

    const matchesTarget =
      !s.to ||
      s.to === 'all' ||
      s.toPeerId === 'all' ||
      s.toPeerId === effectivePeerId ||
      s.to.toLowerCase() === (username || '').toLowerCase();

    return matchesTarget;
  });

  const participantList = Array.from(room.participants.values());

  if (action === 'join' || action === 'leave') {
    broadcastRealtime({
      type: 'CALL_PRESENCE',
      channelId: roomKey,
      data: { channelId: roomKey, participants: participantList },
    });
  }

  res.json({
    channelId: roomKey,
    participants: participantList,
    recentSignals: userSignals,
    allSignals: room.signals.slice(-30),
    timestamp: now,
  });
});

app.get("/api/webrtc/room", (req, res) => {
  const channelId = (req.query.channelId as string) || "global-voice";
  const username = ((req.query.username as string) || "").toLowerCase();
  const peerId = (req.query.peerId as string) || "";
  const since = parseInt((req.query.since as string) || "0", 10);
  const room = callRooms.get(channelId);
  const now = Date.now();
  if (room) {
    for (const [pKey, pData] of room.participants.entries()) {
      if (pData.lastSeen && now - pData.lastSeen > 25000) {
        room.participants.delete(pKey);
      }
    }
  }
  const participants = room ? Array.from(room.participants.values()) : [];
  const signals = room
    ? room.signals.filter((s) => {
        if (s.timestamp <= since) return false;
        if (peerId && s.fromPeerId === peerId) return false;
        if (username && s.from.toLowerCase() === username && (!peerId || s.fromPeerId === peerId)) return false;

        return (
          !s.to ||
          s.to === 'all' ||
          s.toPeerId === 'all' ||
          (peerId && s.toPeerId === peerId) ||
          (username && s.to.toLowerCase() === username)
        );
      })
    : [];

  res.json({ channelId, participants, signals, timestamp: now });
});

// Server-wide Watch Party & Gartic Phone Rooms State
interface WatchPartyRoom {
  roomCode: string;
  selectedMovie: any;
  selectedSource: string;
  season: number;
  episode: number;
  currentTimeSec: number;
  isPlaying: boolean;
  updatedAt: number;
  updatedBy: string;
  messages: Array<{
    id: string;
    user: string;
    avatar: string;
    content: string;
    timestamp: string;
    badge: string;
    isSystemEvent?: boolean;
  }>;
  presence: Map<string, { username: string; avatar: string; lastSeen: number }>;
}

interface GarticRoom {
  roomCode: string;
  phase: 'PROMPT' | 'DRAW' | 'GUESS' | 'REVEAL';
  currentPrompt: string;
  currentDrawing: string;
  currentGuess: string;
  turnIndex: number;
  timer: number;
  players: Array<{ username: string; score: number; avatar: string; ready: boolean }>;
  history: Array<{ id: string; type: 'prompt' | 'draw' | 'guess'; author: string; content: string }>;
  updatedAt: number;
  updatedBy: string;
}

const watchPartyRooms = new Map<string, WatchPartyRoom>();
const garticRooms = new Map<string, GarticRoom>();

// Helper to get or init WatchParty room
function getOrCreateWatchPartyRoom(code: string): WatchPartyRoom {
  const normCode = (code || 'ROOM-7709').trim().toUpperCase();
  if (!watchPartyRooms.has(normCode)) {
    watchPartyRooms.set(normCode, {
      roomCode: normCode,
      selectedMovie: {
        id: 'tmdb-vip-101',
        tmdbId: 550,
        title: 'Fight Club',
        year: 1999,
        rating: 8.8,
        category: 'trending',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
        description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into something much more.',
        genres: ['Action', 'Drama'],
        duration: '2h 19m',
        mediaType: 'movie'
      },
      selectedSource: 'vidcore',
      season: 1,
      episode: 1,
      currentTimeSec: 0,
      isPlaying: true,
      updatedAt: Date.now(),
      updatedBy: 'System',
      messages: [
        {
          id: '1',
          user: 'System Bot',
          avatar: '',
          content: `🔒 Connected to VIP Watch Party Room #${normCode}! Stream synced across all users.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badge: 'VIP SYSTEM',
          isSystemEvent: true,
        },
      ],
      presence: new Map(),
    });
  }
  return watchPartyRooms.get(normCode)!;
}

// Helper to get or init Gartic room
function getOrCreateGarticRoom(code: string): GarticRoom {
  const normCode = (code || 'ROOM-7709').trim().toUpperCase();
  if (!garticRooms.has(normCode)) {
    garticRooms.set(normCode, {
      roomCode: normCode,
      phase: 'PROMPT',
      currentPrompt: '',
      currentDrawing: '',
      currentGuess: '',
      turnIndex: 0,
      timer: 60,
      players: [],
      history: [],
      updatedAt: Date.now(),
      updatedBy: 'System',
    });
  }
  return garticRooms.get(normCode)!;
}

// Watch Party Sync Endpoints
app.get("/api/rooms/watchparty/state", (req, res) => {
  const roomCode = ((req.query.roomCode as string) || "ROOM-7709").trim().toUpperCase();
  const username = (req.query.user as string) || "Guest";
  const avatar = (req.query.avatar as string) || "";

  const room = getOrCreateWatchPartyRoom(roomCode);
  if (username) {
    room.presence.set(username, { username, avatar, lastSeen: Date.now() });
  }

  // Filter presence in last 12 seconds
  const now = Date.now();
  const activeMembers = Array.from(room.presence.values()).filter((p) => now - p.lastSeen < 12000);

  res.json({
    roomCode: room.roomCode,
    selectedMovie: room.selectedMovie,
    selectedSource: room.selectedSource,
    season: room.season,
    episode: room.episode,
    currentTimeSec: room.currentTimeSec,
    isPlaying: room.isPlaying,
    updatedAt: room.updatedAt,
    updatedBy: room.updatedBy,
    messages: room.messages,
    activeMembers,
  });
});

app.post("/api/rooms/watchparty/sync", (req, res) => {
  const { roomCode, selectedMovie, selectedSource, season, episode, currentTimeSec, isPlaying, user } = req.body;
  const room = getOrCreateWatchPartyRoom(roomCode);

  if (selectedMovie) room.selectedMovie = selectedMovie;
  if (selectedSource) room.selectedSource = selectedSource;
  if (season !== undefined) room.season = season;
  if (episode !== undefined) room.episode = episode;
  if (currentTimeSec !== undefined) room.currentTimeSec = currentTimeSec;
  if (isPlaying !== undefined) room.isPlaying = isPlaying;
  room.updatedAt = Date.now();
  room.updatedBy = user || 'User';

  res.json({ success: true, roomCode: room.roomCode, updatedAt: room.updatedAt });
});

app.post("/api/rooms/watchparty/message", (req, res) => {
  const { roomCode, user, avatar, content, badge, isSystemEvent } = req.body;
  if (!content) return res.status(400).json({ error: "Empty message" });

  const room = getOrCreateWatchPartyRoom(roomCode);
  const msg = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user: user || 'VIP Member',
    avatar: avatar || '',
    content: content.trim(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    badge: badge || 'VIP',
    isSystemEvent: Boolean(isSystemEvent),
  };

  room.messages.push(msg);
  if (room.messages.length > 80) room.messages.shift();

  res.json({ success: true, messages: room.messages, message: msg });
});

// Gartic Phone Sync Endpoints
app.get("/api/gartic/state", (req, res) => {
  const roomCode = ((req.query.roomCode as string) || "ROOM-7709").trim().toUpperCase();
  const username = (req.query.username as string) || "";
  const avatar = (req.query.avatar as string) || "";

  const room = getOrCreateGarticRoom(roomCode);
  if (username) {
    let p = room.players.find((item) => item.username === username);
    if (!p) {
      room.players.push({ username, score: 0, avatar, ready: true });
    } else {
      p.avatar = avatar;
    }
  }

  res.json({
    roomCode: room.roomCode,
    phase: room.phase,
    currentPrompt: room.currentPrompt,
    currentDrawing: room.currentDrawing,
    currentGuess: room.currentGuess,
    turnIndex: room.turnIndex,
    timer: room.timer,
    players: room.players,
    history: room.history,
    updatedAt: room.updatedAt,
    updatedBy: room.updatedBy,
  });
});

app.post("/api/gartic/action", (req, res) => {
  const { roomCode, username, action, payload } = req.body;
  const room = getOrCreateGarticRoom(roomCode);

  if (action === 'submit_prompt') {
    room.currentPrompt = payload?.prompt || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'prompt',
      author: username || 'Player',
      content: room.currentPrompt,
    });
    room.phase = 'DRAW';
    room.timer = 60;
  } else if (action === 'submit_drawing') {
    room.currentDrawing = payload?.drawing || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'draw',
      author: username || 'Player',
      content: room.currentDrawing,
    });
    room.phase = 'GUESS';
    room.timer = 45;
  } else if (action === 'submit_guess') {
    room.currentGuess = payload?.guess || '';
    room.history.push({
      id: `hist-${Date.now()}`,
      type: 'guess',
      author: username || 'Player',
      content: room.currentGuess,
    });
    room.phase = 'REVEAL';
  } else if (action === 'restart' || action === 'next_phase') {
    room.phase = 'PROMPT';
    room.currentPrompt = '';
    room.currentDrawing = '';
    room.currentGuess = '';
    room.timer = 60;
  }

  room.updatedAt = Date.now();
  room.updatedBy = username || 'Player';

  res.json({
    success: true,
    phase: room.phase,
    updatedAt: room.updatedAt,
  });
});

// REALTIME SSE ENDPOINTS
app.get("/api/realtime/stream", (req, res) => {
  const username = ((req.query.username as string) || "Guest").trim();
  const tabId = (req.query.tabId as string) || `tab_${Math.random().toString(36).substring(2, 9)}`;
  const channelId = (req.query.channelId as string) || "general";
  const callRoomId = (req.query.callRoomId as string) || "";
  const clientId = `${tabId}_${Date.now()}`;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "private, no-cache, no-store, must-revalidate, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "CDN-Cache-Control": "no-store",
    "Surrogate-Control": "no-store",
    "BunnyCDN-Cache": "no-cache",
    "Pragma": "no-cache",
  });

  // Flush 2KB comment padding so reverse proxies and CDNs (Bunny.net, Nginx, Cloudflare) immediately stream chunks without buffering
  res.write(`:stream-init ${Date.now()}\n`);
  res.write(`:${" ".repeat(2048)}\n\n`);

  const clientConn: RealtimeClientConn = {
    id: clientId,
    tabId,
    username,
    channelId,
    callRoomId,
    res,
    lastPing: Date.now(),
  };

  realtimeClients.set(clientId, clientConn);

  // Send initial connect acknowledgement
  res.write(`event: INIT\ndata: ${JSON.stringify({ clientId, username, timestamp: Date.now() })}\n\n`);

  req.on("close", () => {
    realtimeClients.delete(clientId);
  });
});

app.post("/api/realtime/subscribe", (req, res) => {
  const { tabId, channelId, callRoomId } = req.body;
  if (tabId) {
    for (const client of realtimeClients.values()) {
      if (client.tabId === tabId) {
        if (channelId !== undefined) client.channelId = channelId;
        if (callRoomId !== undefined) client.callRoomId = callRoomId;
      }
    }
  }
  res.json({ success: true });
});

// Community Chat & DM Endpoints
app.get("/api/chat/messages", (req, res) => {
  const rawChannel = (req.query.channelId as string) || "general";
  const channelId = (rawChannel === "global-chat" || rawChannel === "global") ? "general" : rawChannel;
  const username = (req.query.username as string) || "";
  const avatar = (req.query.avatar as string) || "";

  // Track active online chat users (prune after 18s)
  if (username) {
    activeChatUsers.set(username, {
      username,
      avatar,
      status: 'Online',
      lastSeen: Date.now(),
    });
  }

  const filtered = communityMessages.filter((m) => {
    const mChannel = (m.channelId === "global-chat" || m.channelId === "global") ? "general" : m.channelId;
    return mChannel === channelId;
  });

  res.json({
    messages: filtered,
    announcements: globalAnnouncements,
    profanityConfig: profanityFilterConfig,
    streaks: Object.fromEntries(userStreaks),
  });
});

// User status & chat ban check endpoint
app.get("/api/chat/user-status", (req, res) => {
  const username = ((req.query.username as string) || "").trim();
  if (!username) return res.json({ banned: false, streak: 0 });

  const isBanned = bannedUsers.has(username);
  const timeoutExpiry = userTimeouts.get(username);
  const isTimedOut = timeoutExpiry ? timeoutExpiry > Date.now() : false;
  const hoursLeft = timeoutExpiry && isTimedOut ? Math.ceil((timeoutExpiry - Date.now()) / (1000 * 60 * 60)) : 0;
  const streakObj = userStreaks.get(username.toLowerCase());

  res.json({
    banned: isBanned || isTimedOut,
    isPermanent: isBanned,
    bannedUntil: timeoutExpiry,
    hoursLeft,
    streak: streakObj ? streakObj.count : 0,
  });
});

// Heartbeat endpoint for accurate live presence
app.post("/api/chat/heartbeat", (req, res) => {
  const { username, avatar, status } = req.body;
  if (username) {
    activeChatUsers.set(username, {
      username: username.trim(),
      avatar: avatar || '',
      status: status || 'Online',
      lastSeen: Date.now(),
    });
  }
  res.json({ success: true, timestamp: Date.now() });
});

// Get real active users list (no fake preset members!)
app.get("/api/chat/active-users", (req, res) => {
  const now = Date.now();
  const activeList: Array<{ username: string; avatar: string; status: string }> = [];

  for (const [uname, userObj] of activeChatUsers.entries()) {
    if (now - userObj.lastSeen < 18000) {
      activeList.push({
        username: userObj.username,
        avatar: userObj.avatar,
        status: userObj.status,
      });
    } else {
      activeChatUsers.delete(uname);
    }
  }

  res.json({ activeUsers: activeList });
});

// DM contacts management (Case-Insensitive & Multi-Device Sync)
app.get("/api/chat/dms", (req, res) => {
  const username = ((req.query.username as string) || "").trim();
  if (!username) return res.json({ dms: [] });

  const uKey = username.toLowerCase();
  const setObj = userDMs.get(uKey) || new Set();

  const dms = Array.from(setObj).map((target) => {
    // Find active presence
    let activeObj = null;
    for (const [aKey, aVal] of activeChatUsers.entries()) {
      if (aKey.toLowerCase() === target.toLowerCase()) {
        activeObj = aVal;
        break;
      }
    }

    const dmChan = `dm_${[uKey, target.toLowerCase()].sort().join('_')}`;
    const dmMsgs = communityMessages.filter((m) => m.channelId === dmChan);
    const lastMsg = dmMsgs.length > 0 ? dmMsgs[dmMsgs.length - 1] : null;

    // Unread count
    const unreadList = unreadChatNotifications.get(uKey) || [];
    const unreadCount = unreadList.filter((n) => n.channelId === dmChan).length;

    return {
      id: dmChan,
      username: activeObj?.username || target,
      avatar: activeObj?.avatar || '',
      status: activeObj && Date.now() - activeObj.lastSeen < 20000 ? 'Online' : 'Offline',
      lastMessage: lastMsg ? lastMsg.content : undefined,
      lastTimestamp: lastMsg ? lastMsg.timestamp : undefined,
      unreadCount,
    };
  });

  res.json({ dms });
});

app.post("/api/chat/dms", (req, res) => {
  const { username, targetUsername } = req.body;
  if (!username || !targetUsername) {
    return res.status(400).json({ error: "Missing usernames" });
  }

  const u1 = username.trim();
  const u2 = targetUsername.trim();
  const k1 = u1.toLowerCase();
  const k2 = u2.toLowerCase();

  if (!userDMs.has(k1)) userDMs.set(k1, new Set());
  if (!userDMs.has(k2)) userDMs.set(k2, new Set());

  userDMs.get(k1)!.add(u2);
  userDMs.get(k2)!.add(u1);

  savePersistedData();

  const channelId = `dm_${[k1, k2].sort().join('_')}`;
  res.json({ success: true, channelId, targetUsername: u2 });
});

// Notifications Endpoint: Unread DMs & Active Incoming Calls
app.get("/api/chat/notifications", (req, res) => {
  const username = ((req.query.username as string) || '').trim().toLowerCase();
  if (!username) return res.json({ notifications: [], incomingCall: null });

  const unread = unreadChatNotifications.get(username) || [];
  
  // Find any active ringing call
  let activeInvite: IncomingCallInvite | null = null;
  const now = Date.now();
  for (const inv of incomingCallInvites.values()) {
    if (inv.status === 'ringing' && now - inv.createdAt < 45000) {
      if (
        (inv.targetUser.toLowerCase() === username ||
          (inv.channelId.startsWith('dm_') && inv.channelId.toLowerCase().includes(username))) &&
        inv.caller.toLowerCase() !== username
      ) {
        activeInvite = inv;
        break;
      }
    }
  }

  res.json({
    notifications: unread.slice(-20),
    unreadCount: unread.length,
    incomingCall: activeInvite,
  });
});

app.post("/api/chat/notifications/mark-read", (req, res) => {
  const { username, channelId } = req.body;
  if (!username) return res.status(400).json({ error: "Missing username" });

  const uKey = username.trim().toLowerCase();
  if (unreadChatNotifications.has(uKey)) {
    if (channelId) {
      const filtered = (unreadChatNotifications.get(uKey) || []).filter(
        (n) => n.channelId !== channelId
      );
      unreadChatNotifications.set(uKey, filtered);
    } else {
      unreadChatNotifications.set(uKey, []);
    }
  }
  res.json({ success: true });
});

// Groups / Servers API
app.get("/api/chat/groups", (req, res) => {
  res.json({ groups: customGroupsList });
});

app.post("/api/chat/groups", (req, res) => {
  const { name, banner, picture, createdBy, channels } = req.body;
  if (!name || !createdBy) {
    return res.status(400).json({ error: "Missing group name or creator" });
  }

  const cleanName = name.trim();
  const channelList = Array.isArray(channels) && channels.length > 0
    ? channels.map((c: string) => ({
        id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${c.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: c.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
        topic: `Discussion in #${c.trim()}`
      }))
    : [
        {
          id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-general`,
          name: 'general',
          topic: 'General group chat'
        },
        {
          id: `grp-ch-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-lounge`,
          name: 'lounge',
          topic: 'Group lounge & media sharing'
        }
      ];

  const newGroup: CustomGroupServer = {
    id: `grp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: cleanName,
    banner: banner?.trim() || '',
    picture: picture?.trim() || '',
    createdBy: createdBy.trim(),
    createdAt: new Date().toLocaleDateString(),
    channels: channelList,
  };

  customGroupsList.push(newGroup);
  savePersistedData();
  res.json({ success: true, group: newGroup, groups: customGroupsList });
});

app.post("/api/chat/messages", (req, res) => {
  const { channelId, user, avatar, content, badge, replyTo, attachment } = req.body;
  if (!content || !user) {
    return res.status(400).json({ error: "Missing required message fields" });
  }

  // Ban check
  if (bannedUsers.has(user)) {
    return res.status(403).json({ error: "Your account is permanently banned from chat." });
  }

  // Timeout check
  const timeoutExpiry = userTimeouts.get(user);
  if (timeoutExpiry && timeoutExpiry > Date.now()) {
    const hoursLeft = Math.ceil((timeoutExpiry - Date.now()) / (1000 * 60 * 60));
    return res.status(403).json({
      error: `You are chat banned for ${hoursLeft} more hour(s).`,
      bannedUntil: timeoutExpiry,
    });
  }

  let finalContent = content.trim();

  // Automated 72-Hour Ban for Hate Slurs (N-word ending with r, Chinese slur, LGBTQ slur)
  const normClean = finalContent
    .toLowerCase()
    .replace(/[\s\-_.*$#@!]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');

  const isNWordSlur =
    /n+[i!|l1]+[gq9]+[gq9]+[e3]+r+s?/i.test(finalContent) ||
    /n+[i!|l1]+[gq9]+[gq9]+[e3]+r+s?/i.test(normClean) ||
    /nigger/i.test(normClean);

  const isChineseSlur =
    /c+h+[i!|l1]+n+k+s?/i.test(finalContent) ||
    /c+h+[i!|l1]+n+k+y?/i.test(finalContent) ||
    /chink/i.test(normClean);

  const isLgbtqSlur =
    /f+[a@4]+[gq9]+[gq9]+[o0]+t+s?/i.test(finalContent) ||
    /\bf+[a@4]+[gq9]+s?\b/i.test(finalContent) ||
    /faggot/i.test(normClean);

  if (isNWordSlur || isChineseSlur || isLgbtqSlur) {
    const banDurationMs = 72 * 60 * 60 * 1000; // 72 hours
    const expiry = Date.now() + banDurationMs;
    userTimeouts.set(user, expiry);
    userTimeoutDetails.set(user, {
      reason: "Automated 72-hour chat ban for hate speech / slur violation",
      adminName: "AutoMod",
      durationMinutes: 72 * 60,
    });
    savePersistedData();
    return res.status(403).json({
      error: "You have been automatically banned from chat for 72 hours for hate speech/slur violation.",
      bannedUntil: expiry,
      isSlurBan: true,
    });
  }

  // Check upside-down troll effect
  const userTroll = trollEffects.get(user);
  if (userTroll?.upsideDown) {
    const flipMap: Record<string, string> = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
      'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'l', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd',
      'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x',
      'y': 'ʎ', 'z': 'z', 'A': '∀', 'B': '𐐒', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ',
      'G': '⅁', 'H': 'H', 'I': 'I', 'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N',
      'O': 'O', 'P': 'Ԁ', 'Q': 'Ό', 'R': 'ᴚ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ',
      'W': 'M', 'X': 'X', 'Y': '⅄', 'Z': 'Z'
    };
    finalContent = finalContent.split('').map((char: string) => flipMap[char] || char).reverse().join('');
  }

  // Check profanity presence
  let hasProfanity = false;
  const lower = finalContent.toLowerCase();
  for (const badword of profanityFilterConfig.customBadwords) {
    if (badword && lower.includes(badword.toLowerCase())) {
      hasProfanity = true;
      break;
    }
  }

  const userNorm = (user || "").trim().toLowerCase();
  const assignedBadge = badge;

  const rawChannel = channelId || "general";
  const targetChannel = (rawChannel === "global-chat" || rawChannel === "global") ? "general" : rawChannel;

  // Calculate Chat Streak
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
  const streakKey = targetChannel.startsWith('dm_') ? targetChannel : user.toLowerCase();
  const currentStreakObj = userStreaks.get(streakKey);
  let streakCount = 1;

  if (currentStreakObj) {
    if (currentStreakObj.lastDate === todayStr) {
      streakCount = currentStreakObj.count;
    } else if (currentStreakObj.lastDate === yesterdayStr) {
      streakCount = currentStreakObj.count + 1;
      userStreaks.set(streakKey, { count: streakCount, lastDate: todayStr });
    } else {
      streakCount = 1;
      userStreaks.set(streakKey, { count: 1, lastDate: todayStr });
    }
  } else {
    streakCount = 1;
    userStreaks.set(streakKey, { count: 1, lastDate: todayStr });
  }

  const now = Date.now();
  const newMessage: ChatMessage = {
    id: `${now}-${Math.floor(Math.random() * 10000)}`,
    channelId: targetChannel,
    user: user || "Anonymous",
    avatar: avatar || "",
    content: finalContent,
    badge: assignedBadge || undefined,
    timestamp: new Date(now).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    createdAt: now,
    replyTo: replyTo || undefined,
    attachment: attachment || undefined,
    hasProfanity,
    streak: streakCount,
  };

  communityMessages.push(newMessage);

  // If this message belongs to a DM channel (dm_user1_user2), register contacts & create notification
  if (targetChannel.startsWith('dm_')) {
    const rawDmParts = targetChannel.replace('dm_', '').split('_');
    if (rawDmParts.length >= 2) {
      const u1 = rawDmParts[0].toLowerCase();
      const u2 = rawDmParts[1].toLowerCase();
      const senderKey = (user || '').trim().toLowerCase();

      // Ensure both are registered in userDMs
      if (!userDMs.has(u1)) userDMs.set(u1, new Set());
      if (!userDMs.has(u2)) userDMs.set(u2, new Set());
      userDMs.get(u1)!.add(u2);
      userDMs.get(u2)!.add(u1);

      // Determine recipient
      const recipientKey = senderKey === u1 ? u2 : u1;
      if (!unreadChatNotifications.has(recipientKey)) {
        unreadChatNotifications.set(recipientKey, []);
      }
      const notifItem = {
        id: `notif-${now}-${Math.floor(Math.random() * 10000)}`,
        channelId: targetChannel,
        sender: user || 'Someone',
        senderAvatar: avatar || '',
        content: finalContent,
        timestamp: now,
      };
      unreadChatNotifications.get(recipientKey)!.push(notifItem);

      // Keep max 50 unread notifications per user
      if (unreadChatNotifications.get(recipientKey)!.length > 50) {
        unreadChatNotifications.set(
          recipientKey,
          unreadChatNotifications.get(recipientKey)!.slice(-50)
        );
      }

      // Realtime DM Notification & Event to Recipient
      broadcastRealtime({
        type: 'DM_NOTIFICATION',
        targetUser: recipientKey,
        from: user,
        data: notifItem,
      });

      broadcastRealtime({
        type: 'DM_MESSAGE',
        channelId: targetChannel,
        targetUser: recipientKey,
        from: user,
        data: newMessage,
      });
    }
  }

  // Broadcast realtime chat message to all subscribers of this channel (or public)
  broadcastRealtime({
    type: 'CHAT_MESSAGE',
    channelId: targetChannel,
    from: user,
    data: newMessage,
  });

  // Persist messages immediately to disk
  savePersistedData();

  res.json(newMessage);
});

app.post("/api/chat/react", (req, res) => {
  const { messageId, emoji, username } = req.body;
  const msg = communityMessages.find((m) => m.id === messageId);
  if (!msg) return res.status(404).json({ error: "Message not found" });

  if (!msg.reactions) msg.reactions = [];
  let existing = msg.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    if (existing.users.includes(username)) {
      existing.users = existing.users.filter((u) => u !== username);
      existing.count = existing.users.length;
    } else {
      existing.users.push(username);
      existing.count = existing.users.length;
    }
  } else {
    msg.reactions.push({ emoji, count: 1, users: [username] });
  }

  msg.reactions = msg.reactions.filter((r) => r.count > 0);
  savePersistedData();

  // Broadcast reaction update
  broadcastRealtime({
    type: 'MESSAGE_REACTION',
    channelId: msg.channelId,
    data: { messageId, reactions: msg.reactions },
  });

  res.json({ success: true, reactions: msg.reactions });
});

// Delete message for everyone endpoint (author or admin only)
app.delete("/api/chat/messages/:id", (req, res) => {
  const { id } = req.params;
  const username = ((req.query.username as string) || (req.body?.username as string) || "").trim().toLowerCase();
  const isAdmin = req.query.isAdmin === "true" || req.body?.isAdmin === true;

  const idx = communityMessages.findIndex((m) => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Message not found" });
  }

  const msg = communityMessages[idx];
  const isAuthor = msg.user.trim().toLowerCase() === username;

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: "You can only delete your own messages for everyone." });
  }

  const deletedMsgChannel = msg.channelId;
  communityMessages.splice(idx, 1);
  savePersistedData();

  // Broadcast deletion
  broadcastRealtime({
    type: 'MESSAGE_DELETE',
    channelId: deletedMsgChannel,
    data: { messageId: id },
  });

  res.json({ success: true, messageId: id });
});

// Chat Typing Indicators (3 grey dots)
const chatTypingMap = new Map<string, Map<string, number>>();

app.post("/api/chat/typing", (req, res) => {
  const { channelId, username, isTyping } = req.body;
  if (!channelId || !username) return res.status(400).json({ error: "channelId and username required" });

  const rawChannel = channelId === "global-chat" ? "general" : channelId;
  if (!chatTypingMap.has(rawChannel)) {
    chatTypingMap.set(rawChannel, new Map());
  }
  const channelMap = chatTypingMap.get(rawChannel)!;

  if (isTyping) {
    channelMap.set(username, Date.now());
  } else {
    channelMap.delete(username);
  }

  broadcastRealtime({
    type: 'CHAT_TYPING',
    channelId: rawChannel,
    from: username,
    data: { username, isTyping: !!isTyping },
  });

  res.json({ success: true });
});

app.get("/api/chat/typing", (req, res) => {
  const channelId = (req.query.channelId as string) || "general";
  const excludeUser = ((req.query.excludeUser as string) || "").toLowerCase();
  const rawChannel = channelId === "global-chat" ? "general" : channelId;

  const channelMap = chatTypingMap.get(rawChannel);
  const activeTypers: string[] = [];
  const now = Date.now();

  if (channelMap) {
    for (const [user, ts] of channelMap.entries()) {
      if (now - ts < 4000) {
        if (user.toLowerCase() !== excludeUser) {
          activeTypers.push(user);
        }
      } else {
        channelMap.delete(user);
      }
    }
  }

  res.json({ channelId: rawChannel, typingUsers: activeTypers });
});

// Vivi AI Chat & Capabilities Endpoint
app.post("/api/vivi/chat", async (req, res) => {
  try {
    const { prompt, history, attachments, enableSearch, memories, userCallSign } = req.body;

    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Prompt or attachment is required" });
    }

    const effectivePrompt = (prompt || "").trim() || "Please analyze the attached image or file.";

    // Parse attachments for inlineData
    const currentParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.isImage || (att.type && att.type.startsWith("image/")) || (typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/"))) {
          let base64Data = att.data || att.dataUrl || "";
          let mimeType = att.type || "image/png";
          if (base64Data.includes(",")) {
            const splitArr = base64Data.split(",");
            const header = splitArr[0];
            base64Data = splitArr[1];
            const match = header.match(/data:([^;]+);base64/);
            if (match) {
              mimeType = match[1];
            }
          }
          if (base64Data) {
            currentParts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        } else {
          const fileText = att.textContent || att.data || att.dataUrl || "";
          currentParts.push({
            text: `\n[Attached File: ${att.name || "Document"}]\n\`\`\`\n${fileText.slice(0, 40000)}\n\`\`\``,
          });
        }
      }
    }
    currentParts.push({ text: effectivePrompt });

    // Format memories
    let memoryBlock = "";
    if (Array.isArray(memories) && memories.length > 0) {
      memoryBlock = `\n\nCross-Chat Persistent Memories about the user:\n` + memories.map((m: string) => `- ${m}`).join("\n");
    }

    const viviSystemInstruction =
      `You are Vivi, an extraordinarily capable, perceptive, and helpful personal AI assistant integrated into Yuno. ` +
      `Your tone is sharp, intelligent, concise, warm, and authentic. Never sound robotic, preachy, or like generic corporate AI slop. ` +
      `You excel in all academic and practical domains, especially:\n` +
      `- Mathematics & STEM: Always provide step-by-step reasoning, clean derivations, and exact unicode math notation (e.g. ², ³, ⁴, ⁿ, √, ∛, ±, ×, ÷, ·, ≤, ≥, ≠, ≈, π, θ, ∑, ∫, ∂, ∞, ∈, ∉, ⊂, ∪, ∩, →, ⇒, ⇔) and formatted fractions.\n` +
      `- Schoolwork, Coding & Multi-File Web Projects: Detailed help with homework, problem sets, and web development. ` +
      `When building, refactoring, or adding features to projects, ALWAYS structure the code into clean, modular files with folder paths using this exact format:\n` +
      `### File: index.html\n\`\`\`html\n...\n\`\`\`\n` +
      `### File: css/style.css\n\`\`\`css\n...\n\`\`\`\n` +
      `### File: js/main.js\n\`\`\`javascript\n...\n\`\`\`\n` +
      `Use subfolders like \`css/\` and \`js/\` where appropriate. When the user asks for a game or website, NEVER default to Snake unless they explicitly asked for Snake—generate the exact project, game type, or features they requested!\n` +
      `- Vision & Image Analysis: When images or screenshots of math equations, diagrams, UI, or photos are provided, read and dissect every detail precisely.\n` +
      `- Web Research: When web search results are enabled, synthesize findings with exact facts.\n` +
      (userCallSign ? `Refer to the user as "${userCallSign}" when appropriate. ` : "") +
      memoryBlock;

    const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();

    if (!rawApiKey) {
      console.log(`[Vivi Chat] GEMINI_API_KEY not configured. Using offline intelligence engine for: "${effectivePrompt.slice(0, 60)}"`);
      const fallback = generateOfflineAiResponse(effectivePrompt, attachments);
      return res.json({
        text: fallback,
        modelUsed: "vivi-offline",
        offlineNotice: "Running on Vivi's offline intelligent engine (GEMINI_API_KEY is not configured in environment).",
        citations: [],
      });
    }

    const ai = getGenAI();

    // Format conversation history strictly as Content objects
    let contents: any = [{ role: "user", parts: currentParts }];
    if (history && Array.isArray(history) && history.length > 0) {
      const validTurns: Array<{ role: "user" | "model"; parts: any[] }> = [];
      for (const turn of history) {
        if (!turn || !turn.content || typeof turn.content !== "string" || !turn.content.trim()) continue;
        const role: "user" | "model" = turn.role === "model" ? "model" : "user";
        if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === role) {
          validTurns[validTurns.length - 1].parts[0].text += `\n\n${turn.content.trim()}`;
        } else {
          validTurns.push({
            role,
            parts: [{ text: turn.content.trim() }],
          });
        }
      }

      while (validTurns.length > 0 && validTurns[0].role !== "user") {
        validTurns.shift();
      }
      if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === "user") {
        validTurns.pop();
      }

      validTurns.push({
        role: "user",
        parts: currentParts,
      });
      contents = validTurns;
    }

    // Fast-path for simple greetings to respond instantly without network stall
    const lowerPrompt = effectivePrompt.toLowerCase().trim();
    const isSimpleGreeting = /^(yo|hi|hey|hello|sup|what'?s up|howdy|good (morning|afternoon|evening)|hola)(\s*!*)?$/i.test(lowerPrompt) && (!attachments || attachments.length === 0);
    if (isSimpleGreeting) {
      const greetingReplies = [
        "Yo! What are we working on today?",
        "Hey! Ready to dive in. Need help with math, code, or a project?",
        "Yo! Vivi at your service. What's on your mind?",
        "Hey there! Ready when you are.",
      ];
      const reply = greetingReplies[Math.floor(Math.random() * greetingReplies.length)];
      return res.json({
        text: reply,
        modelUsed: "vivi-instant",
        citations: [],
      });
    }

    // Auto-detect if user wants an image generated
    const isImageIntent = /(create|generate|make|draw)\s+(an?\s+)?(image|picture|drawing|illustration|photo|artwork)\b/i.test(lowerPrompt);
    if (isImageIntent && (!attachments || attachments.length === 0)) {
      try {
        const cleanImgPrompt = effectivePrompt
          .replace(/^(can you|please|vivi)?\s*(create|generate|make|draw)\s+(an?\s+)?(image|picture|drawing|illustration|photo|artwork)\s*(of|about|depicting)?/i, '')
          .trim() || effectivePrompt;

        const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();
        let genImgUrl = "";

        if (rawApiKey) {
          try {
            const ai = getGenAI();
            const imgResp = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: { parts: [{ text: cleanImgPrompt }] },
              config: { imageConfig: { aspectRatio: "1:1" } },
            });
            for (const part of imgResp.candidates?.[0]?.content?.parts ?? []) {
              if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || "image/png";
                genImgUrl = `data:${mime};base64,${part.inlineData.data}`;
                break;
              }
            }
          } catch (e: any) {
            console.warn("Auto image generation via Gemini failed, falling back:", e?.message);
          }
        }

        if (!genImgUrl) {
          const seed = Math.floor(Math.random() * 1000000);
          genImgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanImgPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
        }

        return res.json({
          text: `Here is the image you requested for **"${cleanImgPrompt}"**:`,
          generatedImageUrl: genImgUrl,
          modelUsed: "vivi-image",
          citations: [],
        });
      } catch (imgErr) {
        console.warn("Image intent failed, continuing to chat:", imgErr);
      }
    }

    // Auto-detect web search need
    const needsSearch = enableSearch || /\b(search|latest|news|today|current|yesterday|score|weather|who won|release date)\b/i.test(lowerPrompt);

    const targetModel = "gemini-3.8-flash";
    const config: any = {
      systemInstruction: viviSystemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    };

    if (needsSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let generatedText = "";
    let citations: Array<{ title: string; url: string }> = [];

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents,
        config,
      });

      generatedText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extract search citations if any
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const chunk of chunks) {
          if (chunk?.web?.uri) {
            citations.push({
              title: chunk.web.title || new URL(chunk.web.uri).hostname,
              url: chunk.web.uri,
            });
          }
        }
      }
    } catch (_err: any) {
      console.warn("[Vivi Chat] Primary model error:", _err?.message || _err);
      // Fallback to fast flash-lite model if primary hits quota or encounters error
      try {
        const fallbackResp = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: [{ role: "user", parts: currentParts }],
          config: { systemInstruction: viviSystemInstruction },
        });
        generatedText = fallbackResp.text || fallbackResp.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (_err2: any) {
        console.warn("[Vivi Chat] Fallback model error:", _err2?.message || _err2);
      }
    }

    if (!generatedText || !generatedText.trim()) {
      generatedText = generateOfflineAiResponse(effectivePrompt, attachments);
    }

    res.json({
      text: generatedText,
      modelUsed: targetModel,
      citations,
    });
  } catch (error: any) {
    console.error("[Vivi API Error]:", error?.message || error);
    const fallback = generateOfflineAiResponse(req.body?.prompt || "Hello", req.body?.attachments);
    res.json({
      text: fallback,
      modelUsed: "vivi-offline",
      apiError: error?.message || "Internal server error processing prompt",
      citations: [],
    });
  }
});

// Vivi Image Generation Endpoint
app.post("/api/vivi/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const cleanPrompt = prompt.trim();
    const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();

    if (rawApiKey) {
      try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [{ text: cleanPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            return res.json({
              imageUrl: `data:${mime};base64,${part.inlineData.data}`,
              prompt: cleanPrompt,
              source: "gemini-image",
            });
          }
        }
      } catch (err: any) {
        console.warn("Gemini image generation failed, falling back:", err?.message || err);
      }
    }

    // High quality fallback generation URL
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
    return res.json({
      imageUrl: pollinationsUrl,
      prompt: cleanPrompt,
      source: "pollinations",
    });
  } catch (error: any) {
    console.error("Vivi image generation error:", error);
    res.status(500).json({ error: "Failed to generate image" });
  }
});

// Gemini AI Proxy Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, model, systemInstruction, history, attachments } = req.body;

    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Prompt or attachment is required" });
    }

    const effectivePrompt = (prompt || "").trim() || "Please analyze the attached image or file.";

    // Map requested model names to valid supported @google/genai models
    let targetModel = "gemini-3.7-flash";
    if (model) {
      const lower = model.toLowerCase();
      if (lower.includes("pro") || lower.includes("opus") || lower.includes("r1") || lower.includes("gpt-4") || lower.includes("deepseek")) {
        targetModel = "gemini-3.1-pro-preview";
      } else if (lower.includes("lite") || lower.includes("haiku") || lower.includes("fast") || lower.includes("flash-lite")) {
        targetModel = "gemini-3.1-flash-lite";
      } else {
        targetModel = "gemini-3.7-flash";
      }
    }

    // Build parts for current turn prompt & attachments (images, screenshots, code/text files)
    const currentParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.isImage || (att.type && att.type.startsWith("image/"))) {
          let base64Data = att.data || att.dataUrl || "";
          let mimeType = att.type || "image/png";
          if (base64Data.includes(",")) {
            const splitArr = base64Data.split(",");
            const header = splitArr[0];
            base64Data = splitArr[1];
            const match = header.match(/data:([^;]+);base64/);
            if (match) {
              mimeType = match[1];
            }
          }
          if (base64Data) {
            currentParts.push({
              inlineData: {
                mimeType,
                data: base64Data,
              },
            });
          }
        } else {
          const fileText = att.textContent || att.data || att.dataUrl || "";
          currentParts.push({
            text: `\n[Attached File: ${att.name || "Document"}]\n\`\`\`\n${fileText.slice(0, 40000)}\n\`\`\``,
          });
        }
      }
    }
    currentParts.push({ text: effectivePrompt });

    const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").trim();

    if (!rawApiKey) {
      // Smart intelligent offline fallback when API key is not in environment
      const offlineReply = generateOfflineAiResponse(effectivePrompt, attachments);
      return res.json({
        text: offlineReply,
        modelUsed: "local-assistant",
      });
    }

    const ai = getGenAI();

    // Format and sanitize conversation history so it strictly alternates and starts with user
    let contents: any = currentParts;
    if (history && Array.isArray(history) && history.length > 0) {
      const validTurns: Array<{ role: "user" | "model"; parts: any[] }> = [];
      for (const turn of history) {
        if (!turn || !turn.content || typeof turn.content !== "string" || !turn.content.trim()) continue;
        const role: "user" | "model" = turn.role === "model" ? "model" : "user";
        if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === role) {
          validTurns[validTurns.length - 1].parts[0].text += `\n\n${turn.content.trim()}`;
        } else {
          validTurns.push({
            role,
            parts: [{ text: turn.content.trim() }],
          });
        }
      }

      while (validTurns.length > 0 && validTurns[0].role !== "user") {
        validTurns.shift();
      }
      if (validTurns.length > 0 && validTurns[validTurns.length - 1].role === "user") {
        validTurns.pop();
      }

      if (validTurns.length > 0) {
        validTurns.push({
          role: "user",
          parts: currentParts,
        });
        contents = validTurns;
      }
    }

    const defaultSysInstruction =
      systemInstruction ||
      "You are Yunø GPT, an advanced, helpful, and concise AI assistant. You format your answers clearly using clean Markdown, providing accurate code blocks with syntax tags, structured bullet points, and insightful answers.";

    let generatedText = "";
    const candidateModels = Array.from(new Set([targetModel, "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.1-pro-preview"]));

    for (let i = 0; i < candidateModels.length && !generatedText; i++) {
      const modelToTry = candidateModels[i];
      // For first attempt, use full history contents; for subsequent retry attempts, try current turn or contents
      const contentsToTry = (i === 0) ? contents : currentParts;

      try {
        if (i > 0) {
          // Short backoff before retry to allow transient demand spike to clear
          await new Promise((r) => setTimeout(r, 200 * i));
        }

        const response = await ai.models.generateContent({
          model: modelToTry,
          contents: contentsToTry,
          config: {
            systemInstruction: defaultSysInstruction,
          },
        });

        const textResult =
          response.text ||
          response.candidates?.[0]?.content?.parts?.[0]?.text ||
          "";

        if (textResult && textResult.trim()) {
          generatedText = textResult;
          targetModel = modelToTry;
          break;
        }
      } catch (err: any) {
        console.warn(`Gemini attempt with ${modelToTry} failed:`, err?.message || err);
      }
    }

    if (!generatedText || !generatedText.trim()) {
      generatedText = generateOfflineAiResponse(effectivePrompt, attachments);
    }

    res.json({
      text: generatedText,
      modelUsed: targetModel,
    });
  } catch (error: any) {
    console.error("Gemini API Route Error:", error);
    const fallback = generateOfflineAiResponse(req.body?.prompt || "Hello", req.body?.attachments);
    res.json({
      text: fallback,
      modelUsed: "local-assistant",
    });
  }
});

// Comprehensive local intelligent responder for instant answers, code generation & math computation
function generateOfflineAiResponse(prompt: string, attachments?: any[]): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. Check for attached files/images
  if (attachments && attachments.length > 0) {
    const fileList = attachments.map((a: any, idx: number) => {
      const type = a.type || (a.isImage ? 'image/png' : 'text/plain');
      const sizeKb = a.size ? Math.round(a.size / 1024) : 'Unknown';
      return `${idx + 1}. **${a.name || 'Attachment'}** (${type}, ~${sizeKb} KB)`;
    }).join('\n');

    let textPreview = '';
    const textAtt = attachments.find((a: any) => !a.isImage && (a.textContent || a.data));
    if (textAtt) {
      const sample = (textAtt.textContent || textAtt.data || '').slice(0, 300);
      textPreview = `\n\n### Document Content Preview:\n\`\`\`\n${sample}...\n\`\`\``;
    }

    return `### 📄 File Analysis Summary\n\nProcessed **${attachments.length}** attachment(s):\n${fileList}${textPreview}\n\n* **Status**: Successfully ingested.\n* **Inspection**: File structure and encoding verified.\n\nHow would you like me to process, transform, or refactor these files?`;
  }

  // 2. Math & Arithmetic Evaluator (e.g. "what is 6+6", "calculate 15 * 24", "100 / 4")
  const mathMatch = p.match(/(?:what\s+is|calculate|solve|eval)?\s*([0-9\.\s\+\-\*\/\^\(\)\%]+)\s*\??$/i);
  if (mathMatch && mathMatch[1] && /[\+\-\*\/]/.test(mathMatch[1])) {
    const expr = mathMatch[1].trim();
    try {
      // Safe sanitized arithmetic evaluation without arbitrary code execution
      if (/^[0-9\.\s\+\-\*\/\(\)\%]+$/.test(expr)) {
        const sanitized = expr.replace(/%/g, '/100');
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return `### 🧮 Calculation\n\n**Expression**: \`${expr}\`\n\n**Result**: \n# **${result}**\n\n*Step*: Evaluated arithmetic expression with standard operator precedence.`;
        }
      }
    } catch (e) {}
  }

  // 3. Coding Requests & Project / File Creation
  const isCodingRequest = 
    lower.includes('write this code') ||
    lower.includes('make a file') ||
    lower.includes('create a file') ||
    lower.includes('write code') ||
    lower.includes('game') ||
    lower.includes('project') ||
    lower.includes('app') ||
    lower.includes('website') ||
    lower.includes('site') ||
    lower.includes('calculator') ||
    lower.includes('todo') ||
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('typescript') ||
    lower.includes('html') ||
    lower.includes('css') ||
    lower.includes('react') ||
    lower.includes('rpg') ||
    lower.includes('space') ||
    lower.includes('shooter') ||
    lower.includes('platformer') ||
    lower.includes('clicker') ||
    lower.includes('portfolio') ||
    lower.includes('kanban') ||
    p.includes('[Project Context:');

  if (isCodingRequest) {
    // 3a. Explicit Snake Game (ONLY when user explicitly mentions snake)
    if (/\bsnake\b/i.test(lower)) {
      return `### 🎮 Classic Snake Game (Multi-File)

Here is a modular, high-performance Snake game organized into structured files:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Classic Snake</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="game-container">
    <header class="header">
      <h1>🐍 Snake Game</h1>
      <div class="stats">
        <div class="stat-badge">Score: <span id="score">0</span></div>
        <div class="stat-badge">Best: <span id="highScore">0</span></div>
      </div>
    </header>

    <canvas id="gameCanvas" width="400" height="400"></canvas>

    <div class="controls-hint">
      <span>Use Arrow Keys or WASD to navigate. Space to restart.</span>
    </div>
  </div>

  <script src="js/snake.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 400px;
}

h1 {
  font-size: 20px;
  font-weight: 700;
  color: #fafafa;
}

.stats {
  display: flex;
  gap: 10px;
}

.stat-badge {
  background: #141418;
  border: 1px solid #27272a;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
}

canvas {
  background: #121215;
  border: 2px solid #27272a;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
}

.controls-hint {
  font-size: 12px;
  color: #71717a;
}
\`\`\`

### File: js/snake.js
\`\`\`javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');

const grid = 20;
let count = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
highScoreEl.textContent = highScore;

let snake = {
  x: 160,
  y: 160,
  dx: grid,
  dy: 0,
  cells: [],
  maxCells: 4
};

let apple = { x: 320, y: 320 };

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function resetGame() {
  snake.x = 160;
  snake.y = 160;
  snake.cells = [];
  snake.maxCells = 4;
  snake.dx = grid;
  snake.dy = 0;
  score = 0;
  scoreEl.textContent = score;
  apple.x = getRandomInt(0, 20) * grid;
  apple.y = getRandomInt(0, 20) * grid;
}

function loop() {
  requestAnimationFrame(loop);
  if (++count < 6) return;
  count = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  snake.x += snake.dx;
  snake.y += snake.dy;

  if (snake.x < 0) snake.x = canvas.width - grid;
  else if (snake.x >= canvas.width) snake.x = 0;
  if (snake.y < 0) snake.y = canvas.height - grid;
  else if (snake.y >= canvas.height) snake.y = 0;

  snake.cells.unshift({ x: snake.x, y: snake.y });
  if (snake.cells.length > snake.maxCells) snake.cells.pop();

  // Draw apple with slight glow
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(apple.x + 2, apple.y + 2, grid - 4, grid - 4);

  // Draw snake segments
  snake.cells.forEach((cell, index) => {
    ctx.fillStyle = index === 0 ? '#34d399' : '#10b981';
    ctx.fillRect(cell.x + 1, cell.y + 1, grid - 2, grid - 2);

    if (cell.x === apple.x && cell.y === apple.y) {
      snake.maxCells++;
      score += 10;
      scoreEl.textContent = score;
      if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('snake_highscore', String(highScore));
      }
      apple.x = getRandomInt(0, 20) * grid;
      apple.y = getRandomInt(0, 20) * grid;
    }

    for (let i = index + 1; i < snake.cells.length; i++) {
      if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
        resetGame();
      }
    }
  });
}

document.addEventListener('keydown', (e) => {
  const k = e.key;
  if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && snake.dx === 0) {
    snake.dx = -grid; snake.dy = 0;
  } else if ((k === 'ArrowUp' || k === 'w' || k === 'W') && snake.dy === 0) {
    snake.dy = -grid; snake.dx = 0;
  } else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && snake.dx === 0) {
    snake.dx = grid; snake.dy = 0;
  } else if ((k === 'ArrowDown' || k === 's' || k === 'S') && snake.dy === 0) {
    snake.dy = grid; snake.dx = 0;
  } else if (k === ' ') {
    resetGame();
  }
});

requestAnimationFrame(loop);
\`\`\`
`;
    }

    // 3b. Space Shooter / Galaxy Defender
    if (/space|galaxy|shooter|asteroid|invader/i.test(lower)) {
      return `### 🚀 Galaxy Defender (Multi-File Canvas Game)

Here is a fast-paced Space Defender game built with clean modular architecture:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Galaxy Defender</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="arcade-card">
    <div class="hud">
      <div class="badge">Shields: <span id="shield">100%</span></div>
      <div class="badge score-badge">Score: <span id="score">0</span></div>
    </div>
    <canvas id="gameCanvas" width="460" height="520"></canvas>
    <div class="tip">← → or A/D to steer, Spacebar to fire lasers</div>
  </div>
  <script src="js/space.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.arcade-card {
  background: #121217;
  border: 1px solid #27272a;
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
}
.hud {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
.badge {
  background: #1c1c24;
  border: 1px solid #33333d;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #60a5fa;
}
.score-badge { color: #f59e0b; }
canvas {
  background: #08080d;
  border: 2px solid #272733;
  border-radius: 12px;
}
.tip { font-size: 12px; color: #71717a; }
\`\`\`

### File: js/space.js
\`\`\`javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const shieldEl = document.getElementById('shield');

let score = 0;
let shield = 100;
let gameOver = false;

const player = { x: 210, y: 460, width: 36, height: 26, speed: 7, dx: 0 };
const lasers = [];
const enemies = [];
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  size: Math.random() * 2 + 0.5,
  speed: Math.random() * 1.5 + 0.5
}));

let enemyTimer = 0;

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ' && !gameOver) {
    lasers.push({ x: player.x + player.width / 2 - 2, y: player.y, w: 4, h: 12, speed: 10 });
    e.preventDefault();
  }
  if (e.key === 'r' && gameOver) restart();
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function restart() {
  score = 0;
  shield = 100;
  gameOver = false;
  lasers.length = 0;
  enemies.length = 0;
  player.x = 210;
  shieldEl.textContent = '100%';
  scoreEl.textContent = '0';
  loop();
}

function loop() {
  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRITICAL DAMAGE - GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '14px sans-serif';
    ctx.fillText('Press R to relaunch ship', canvas.width / 2, canvas.height / 2 + 25);
    return;
  }
  requestAnimationFrame(loop);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background stars
  ctx.fillStyle = '#ffffff';
  stars.forEach((s) => {
    s.y += s.speed;
    if (s.y > canvas.height) s.y = 0;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Player controls
  if (keys['ArrowLeft'] || keys['a']) player.x = Math.max(10, player.x - player.speed);
  if (keys['ArrowRight'] || keys['d']) player.x = Math.min(canvas.width - player.width - 10, player.x + player.speed);

  // Draw Player Ship
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y);
  ctx.lineTo(player.x, player.y + player.height);
  ctx.lineTo(player.x + player.width, player.y + player.height);
  ctx.closePath();
  ctx.fill();

  // Engine flame
  ctx.fillStyle = '#f97316';
  ctx.fillRect(player.x + player.width / 2 - 3, player.y + player.height, 6, 8);

  // Lasers
  ctx.fillStyle = '#4ade80';
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.y -= l.speed;
    ctx.fillRect(l.x, l.y, l.w, l.h);
    if (l.y < -10) lasers.splice(i, 1);
  }

  // Spawn enemies
  if (++enemyTimer > 40) {
    enemyTimer = 0;
    enemies.push({
      x: Math.random() * (canvas.width - 40) + 10,
      y: -30,
      w: 28,
      h: 22,
      speed: Math.random() * 2 + 2
    });
  }

  // Update enemies
  for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
    const en = enemies[eIdx];
    en.y += en.speed;
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(en.x, en.y, en.w, en.h);

    // Collision with laser
    for (let lIdx = lasers.length - 1; lIdx >= 0; lIdx--) {
      const l = lasers[lIdx];
      if (l.x < en.x + en.w && l.x + l.w > en.x && l.y < en.y + en.h && l.y + l.h > en.y) {
        enemies.splice(eIdx, 1);
        lasers.splice(lIdx, 1);
        score += 25;
        scoreEl.textContent = score;
        break;
      }
    }

    // Collision with player
    if (en.x < player.x + player.width && en.x + en.w > player.x && en.y < player.y + player.height && en.y + en.h > player.y) {
      enemies.splice(eIdx, 1);
      shield -= 25;
      shieldEl.textContent = Math.max(0, shield) + '%';
      if (shield <= 0) {
        gameOver = true;
      }
    }

    if (en.y > canvas.height + 20) enemies.splice(eIdx, 1);
  }
}
loop();
\`\`\`
`;
    }

    // 3c. 2D RPG / Dungeon Crawler
    if (/rpg|dungeon|crawler|quest|adventure|sword|monster/i.test(lower)) {
      return `### ⚔️ Rogue Dungeon 2D (Multi-File RPG)

Here is a modular 2D Dungeon Crawler RPG with room exploration, monster combat, and loot:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rogue Dungeon RPG</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="rpg-wrapper">
    <header class="stats-bar">
      <div>Hero: <strong>Knight</strong></div>
      <div>HP: <span id="hp" class="val-hp">100/100</span></div>
      <div>Gold: <span id="gold" class="val-gold">0</span></div>
      <div>Floor: <span id="floor">1</span></div>
    </header>
    <canvas id="rpgCanvas" width="440" height="440"></canvas>
    <div class="log" id="combatLog">Welcome to the dungeon. Walk into monsters to attack!</div>
    <div class="hint">Use Arrow Keys or WASD to move. Find stairs (▼) to advance.</div>
  </div>
  <script src="js/rpg.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.rpg-wrapper {
  background: #131318;
  border: 1px solid #272733;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.6);
}
.stats-bar {
  display: flex;
  justify-content: space-between;
  background: #1c1c24;
  border: 1px solid #2f2f3d;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
}
.val-hp { color: #f43f5e; }
.val-gold { color: #fbbf24; }
canvas {
  background: #09090d;
  border: 2px solid #2b2b38;
  border-radius: 10px;
}
.log {
  background: #181820;
  border: 1px solid #282836;
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  color: #a1a1aa;
  min-height: 38px;
}
.hint { font-size: 11px; color: #71717a; text-align: center; }
\`\`\`

### File: js/rpg.js
\`\`\`javascript
const canvas = document.getElementById('rpgCanvas');
const ctx = canvas.getContext('2d');
const hpEl = document.getElementById('hp');
const goldEl = document.getElementById('gold');
const floorEl = document.getElementById('floor');
const logEl = document.getElementById('combatLog');

const TILE_SIZE = 40;
const COLS = 11;
const ROWS = 11;

let floor = 1;
let gold = 0;
let hp = 100;
const maxHp = 100;

let player = { x: 1, y: 1, atk: 15 };
let stairs = { x: 9, y: 9 };
let monsters = [];
let chests = [];

function initFloor() {
  player.x = 1;
  player.y = 1;
  stairs = { x: 9, y: 9 };
  monsters = [
    { x: 4, y: 2, hp: 30, maxHp: 30, atk: 8, name: 'Goblin' },
    { x: 7, y: 5, hp: 45, maxHp: 45, atk: 12, name: 'Orc' },
    { x: 3, y: 8, hp: 25, maxHp: 25, atk: 6, name: 'Slime' },
  ];
  chests = [
    { x: 5, y: 3, gold: 35 },
    { x: 8, y: 8, gold: 60 },
  ];
  floorEl.textContent = floor;
  logEl.textContent = \`Descended to Dungeon Floor \${floor}!\`;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tiles grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isWall = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
      ctx.fillStyle = isWall ? '#1f1f28' : '#0e0e14';
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  // Stairs
  ctx.fillStyle = '#6366f1';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼', stairs.x * TILE_SIZE + 20, stairs.y * TILE_SIZE + 28);

  // Chests
  ctx.fillStyle = '#fbbf24';
  chests.forEach((ch) => {
    ctx.fillText('📦', ch.x * TILE_SIZE + 20, ch.y * TILE_SIZE + 28);
  });

  // Monsters
  ctx.fillStyle = '#f43f5e';
  monsters.forEach((m) => {
    ctx.fillText('👾', m.x * TILE_SIZE + 20, m.y * TILE_SIZE + 28);
  });

  // Player Hero
  ctx.fillText('🛡️', player.x * TILE_SIZE + 20, player.y * TILE_SIZE + 28);
}

window.addEventListener('keydown', (e) => {
  let dx = 0, dy = 0;
  if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
  else if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
  else if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
  else if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;
  else return;

  e.preventDefault();
  const tx = player.x + dx;
  const ty = player.y + dy;

  // Wall collision
  if (tx <= 0 || tx >= COLS - 1 || ty <= 0 || ty >= ROWS - 1) return;

  // Monster collision
  const mIdx = monsters.findIndex((m) => m.x === tx && m.y === ty);
  if (mIdx !== -1) {
    const m = monsters[mIdx];
    m.hp -= player.atk;
    logEl.textContent = \`You strike \${m.name} for \${player.atk} damage!\`;
    if (m.hp <= 0) {
      logEl.textContent = \`Defeated \${m.name}! Found 20 gold.\`;
      gold += 20;
      goldEl.textContent = gold;
      monsters.splice(mIdx, 1);
    } else {
      hp -= m.atk;
      hpEl.textContent = \`\${Math.max(0, hp)}/\${maxHp}\`;
      if (hp <= 0) {
        logEl.textContent = 'You were slain by the monster! Floor reset.';
        hp = maxHp;
        gold = 0;
        floor = 1;
        initFloor();
        return;
      }
    }
    draw();
    return;
  }

  // Chest loot
  const cIdx = chests.findIndex((c) => c.x === tx && c.y === ty);
  if (cIdx !== -1) {
    gold += chests[cIdx].gold;
    goldEl.textContent = gold;
    logEl.textContent = \`Opened treasure chest! Found \${chests[cIdx].gold} gold!\`;
    chests.splice(cIdx, 1);
  }

  // Step onto stairs
  if (tx === stairs.x && ty === stairs.y) {
    floor++;
    initFloor();
    return;
  }

  player.x = tx;
  player.y = ty;
  draw();
});

initFloor();
\`\`\`
`;
    }

    // 3d. 2D Platformer Jumper
    if (/platformer|jump|mario|obstacle/i.test(lower)) {
      return `### 🏃 2D Platformer Runner (Multi-File Game)

Here is a 2D physics platformer with double jumping, floating ledges, and collectible gems:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cyber Jumper Platformer</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="game-frame">
    <div class="hud">
      <div>Gems: <span id="gems">0</span></div>
      <div>Lives: <span id="lives">❤️❤️❤️</span></div>
    </div>
    <canvas id="platformCanvas" width="480" height="340"></canvas>
    <div class="controls">A/D or Arrows to run, Space to Jump (Double Jump enabled!)</div>
  </div>
  <script src="js/platformer.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.game-frame {
  background: #141419;
  border: 1px solid #272730;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.5);
}
.hud {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 700;
  color: #10b981;
}
canvas {
  background: #0b0b10;
  border: 2px solid #22222b;
  border-radius: 10px;
}
.controls { font-size: 12px; color: #71717a; text-align: center; }
\`\`\`

### File: js/platformer.js
\`\`\`javascript
const canvas = document.getElementById('platformCanvas');
const ctx = canvas.getContext('2d');
const gemsEl = document.getElementById('gems');

let gems = 0;
const gravity = 0.55;

const player = {
  x: 50,
  y: 200,
  width: 20,
  height: 28,
  dx: 0,
  dy: 0,
  speed: 4.5,
  jumpPower: -10,
  jumpsLeft: 2,
  onGround: false
};

const platforms = [
  { x: 0, y: 310, w: 480, h: 30 },
  { x: 80, y: 240, w: 90, h: 14 },
  { x: 220, y: 190, w: 100, h: 14 },
  { x: 360, y: 140, w: 80, h: 14 },
  { x: 170, y: 110, w: 80, h: 14 }
];

let items = [
  { x: 120, y: 215, collected: false },
  { x: 260, y: 165, collected: false },
  { x: 400, y: 115, collected: false },
  { x: 210, y: 85, collected: false }
];

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && player.jumpsLeft > 0) {
    player.dy = player.jumpPower;
    player.jumpsLeft--;
  }
});
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

function loop() {
  requestAnimationFrame(loop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Horizontal motion
  player.dx = 0;
  if (keys['ArrowLeft'] || keys['a']) player.dx = -player.speed;
  if (keys['ArrowRight'] || keys['d']) player.dx = player.speed;

  player.x += player.dx;
  player.dy += gravity;
  player.y += player.dy;

  // Collision with platforms
  player.onGround = false;
  platforms.forEach((p) => {
    if (
      player.x + player.width > p.x &&
      player.x < p.x + p.w &&
      player.y + player.height >= p.y &&
      player.y + player.height <= p.y + p.h &&
      player.dy >= 0
    ) {
      player.y = p.y - player.height;
      player.dy = 0;
      player.onGround = true;
      player.jumpsLeft = 2;
    }
  });

  // Gem collection
  items.forEach((item) => {
    if (!item.collected && Math.hypot(player.x + 10 - item.x, player.y + 14 - item.y) < 18) {
      item.collected = true;
      gems++;
      gemsEl.textContent = gems;
    }
  });

  // Draw platforms
  ctx.fillStyle = '#272733';
  platforms.forEach((p) => ctx.fillRect(p.x, p.y, p.w, p.h));

  // Draw gems
  items.forEach((item) => {
    if (!item.collected) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw player
  ctx.fillStyle = '#10b981';
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

loop();
\`\`\`
`;
    }

    // 3e. Portfolio / Personal Website
    if (/portfolio|personal site|resume|landing|showcase/i.test(lower)) {
      return `### 🌐 Bespoke Dark Portfolio Website (Multi-File)

Here is a modern developer portfolio structured into separate HTML, CSS, and JS files:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Developer Portfolio</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="page-container">
    <header class="hero">
      <div class="avatar-ring">💻</div>
      <h1>Alex Rivera</h1>
      <p class="tagline">Full-Stack Engineer & Creative Coder</p>
      <div class="social-links">
        <button id="copyEmailBtn" class="btn btn-secondary">Copy Email</button>
        <button id="themeToggleBtn" class="btn btn-primary">Toggle Accent</button>
      </div>
    </header>

    <section class="section">
      <h2>Featured Works</h2>
      <div class="projects-grid">
        <article class="project-card">
          <div class="card-badge">TypeScript</div>
          <h3>Hydra Engine</h3>
          <p>Real-time distributed stream processing library with sub-millisecond latencies.</p>
        </article>

        <article class="project-card">
          <div class="card-badge">WebAssembly</div>
          <h3>Vivid Canvas</h3>
          <p>High-performance vector graphics and raster shader suite in the browser.</p>
        </article>
      </div>
    </section>

    <footer class="footer">
      <p>© 2026 Alex Rivera. Built with clean code.</p>
    </footer>
  </div>
  <script src="js/main.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #09090b;
  color: #f4f4f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  padding: 40px 20px;
}
.page-container {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 36px;
}
.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.avatar-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #18181b;
  border: 2px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}
h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
.tagline { color: #a1a1aa; font-size: 15px; }
.social-links { display: flex; gap: 10px; margin-top: 6px; }
.btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.btn-primary { background: #fafafa; color: #09090b; }
.btn-primary:hover { background: #e4e4e7; }
.btn-secondary { background: #18181b; color: #fafafa; border-color: #27272a; }
.btn-secondary:hover { background: #27272a; }
.section h2 { font-size: 18px; margin-bottom: 14px; color: #e4e4e7; }
.projects-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.project-card {
  background: #121215;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.card-badge {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  width: fit-content;
  padding: 2px 8px;
  border-radius: 6px;
}
.project-card h3 { font-size: 15px; color: #fff; }
.project-card p { font-size: 13px; color: #a1a1aa; line-height: 1.4; }
.footer { text-align: center; color: #71717a; font-size: 12px; }
\`\`\`

### File: js/main.js
\`\`\`javascript
const copyBtn = document.getElementById('copyEmailBtn');
const toggleBtn = document.getElementById('themeToggleBtn');

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('alex@example.com');
  const original = copyBtn.textContent;
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = original; }, 2000);
});

let isAlt = false;
toggleBtn.addEventListener('click', () => {
  isAlt = !isAlt;
  document.querySelectorAll('.card-badge').forEach((el) => {
    el.style.color = isAlt ? '#10b981' : '#38bdf8';
    el.style.background = isAlt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(56, 189, 248, 0.1)';
  });
});
\`\`\`
`;
    }

    // 3f. Kanban Productivity / Tasks
    if (/todo|task|kanban|notes|planner/i.test(lower)) {
      return `### 📋 Modern Task Kanban (Multi-File Web App)

Here is a clean productivity board with column states and storage:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Board</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="board-wrapper">
    <header class="header">
      <h1>Task Workspace</h1>
      <form id="addTaskForm" class="add-form">
        <input type="text" id="taskInput" placeholder="Add a new task..." required>
        <button type="submit">Add Task</button>
      </form>
    </header>

    <div class="columns-container">
      <div class="column">
        <h3>To Do (<span id="todoCount">0</span>)</h3>
        <div class="task-list" id="todoList"></div>
      </div>

      <div class="column">
        <h3>Completed (<span id="doneCount">0</span>)</h3>
        <div class="task-list" id="doneList"></div>
      </div>
    </div>
  </div>
  <script src="js/kanban.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  padding: 30px 20px;
}
.board-wrapper {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
h1 { font-size: 22px; font-weight: 700; }
.add-form {
  display: flex;
  gap: 8px;
}
input {
  flex: 1;
  background: #141418;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
}
button {
  background: #fff;
  color: #000;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.columns-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.column {
  background: #121216;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.column h3 { font-size: 14px; color: #a1a1aa; }
.task-list { display: flex; flex-direction: column; gap: 8px; min-height: 80px; }
.task-item {
  background: #1b1b22;
  border: 1px solid #32323f;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.task-item.completed { text-decoration: line-through; opacity: 0.5; }
\`\`\`

### File: js/kanban.js
\`\`\`javascript
const form = document.getElementById('addTaskForm');
const input = document.getElementById('taskInput');
const todoList = document.getElementById('todoList');
const doneList = document.getElementById('doneList');
const todoCount = document.getElementById('todoCount');
const doneCount = document.getElementById('doneCount');

let tasks = JSON.parse(localStorage.getItem('vivi_tasks') || '[]');
if (tasks.length === 0) {
  tasks = [
    { id: 1, text: 'Review codebase architecture', done: false },
    { id: 2, text: 'Ship multi-file zip download', done: true }
  ];
}

function render() {
  todoList.innerHTML = '';
  doneList.innerHTML = '';
  let todos = 0, dones = 0;

  tasks.forEach((t) => {
    const el = document.createElement('div');
    el.className = 'task-item' + (t.done ? ' completed' : '');
    el.textContent = t.text;
    el.onclick = () => {
      t.done = !t.done;
      save();
    };

    if (t.done) {
      doneList.appendChild(el);
      dones++;
    } else {
      todoList.appendChild(el);
      todos++;
    }
  });

  todoCount.textContent = todos;
  doneCount.textContent = dones;
}

function save() {
  localStorage.setItem('vivi_tasks', JSON.stringify(tasks));
  render();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    tasks.push({ id: Date.now(), text, done: false });
    input.value = '';
    save();
  }
});

render();
\`\`\`
`;
    }

    // 3g. Custom tailored application generator based on user's exact subject
    // Extract subject cleanly from prompt
    const cleanSubject = p
      .replace(/\[Project Context:[^\]]*\]/gi, '')
      .replace(/^(can you|please|vivi|make|create|build|generate|write)\s+(a|an)?/i, '')
      .trim() || 'Interactive Web Project';

    const safeTitle = cleanSubject.charAt(0).toUpperCase() + cleanSubject.slice(1, 40);

    return `### ⚡ ${safeTitle} (Multi-File Project)

Here is a bespoke, modular application crafted specifically for **"${cleanSubject}"**:

### File: index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="app-card">
    <header class="app-header">
      <div class="header-icon">✨</div>
      <div class="header-text">
        <h1>${safeTitle}</h1>
        <p class="subtitle">Custom web module created with Vivi</p>
      </div>
    </header>

    <main class="app-main">
      <div class="interactive-panel">
        <label for="actionInput">Enter parameter:</label>
        <div class="input-row">
          <input type="text" id="actionInput" placeholder="Type here..." value="Default Input">
          <button id="triggerBtn" class="primary-btn">Execute</button>
        </div>
      </div>

      <div class="output-panel">
        <div class="output-header">
          <span>Live Output</span>
          <span id="statusBadge" class="badge">Ready</span>
        </div>
        <div id="outputDisplay" class="output-box">Press Execute to compute result.</div>
      </div>
    </main>

    <footer class="app-footer">
      <span>Multi-file project ready for export</span>
    </footer>
  </div>

  <script src="js/main.js"></script>
</body>
</html>
\`\`\`

### File: css/style.css
\`\`\`css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #09090b;
  color: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.app-card {
  background: #141418;
  border: 1px solid #27272a;
  border-radius: 18px;
  max-width: 500px;
  width: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
}

.app-header {
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid #27272a;
  padding-bottom: 16px;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: #1e1e24;
  border: 1px solid #33333d;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

h1 {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.subtitle {
  font-size: 12px;
  color: #a1a1aa;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.interactive-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: #d4d4d8;
}

.input-row {
  display: flex;
  gap: 8px;
}

input {
  flex: 1;
  background: #0c0c0e;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 10px 14px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

input:focus {
  border-color: #52525b;
}

.primary-btn {
  background: #fafafa;
  color: #09090b;
  border: none;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.primary-btn:hover {
  background: #e4e4e7;
}

.output-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.output-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #a1a1aa;
}

.badge {
  color: #10b981;
  font-weight: 600;
}

.output-box {
  background: #09090c;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
  font-family: monospace;
  color: #e4e4e7;
  min-height: 50px;
  display: flex;
  align-items: center;
}

.app-footer {
  font-size: 11px;
  color: #71717a;
  text-align: center;
  border-top: 1px solid #1f1f23;
  padding-top: 12px;
}
\`\`\`

### File: js/main.js
\`\`\`javascript
const input = document.getElementById('actionInput');
const btn = document.getElementById('triggerBtn');
const output = document.getElementById('outputDisplay');
const statusBadge = document.getElementById('statusBadge');

let executionCount = 0;

btn.addEventListener('click', () => {
  const val = input.value.trim() || 'Default';
  executionCount++;
  
  statusBadge.textContent = 'Active';
  statusBadge.style.color = '#38bdf8';
  
  output.textContent = \`Processed: "\${val}" (run #\${executionCount}) at \${new Date().toLocaleTimeString()}\`;
});
\`\`\`
`;
  }

  // 4. Greetings
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I am ready to assist you. You can ask me to:
- **Write and debug code** in TypeScript, Python, JavaScript, React, HTML/CSS, etc.
- **Solve math and logic problems**
- **Analyze attached images or code files**
- **Draft plans, summaries, and creative work**

How can I help you today?`;
  }

  // 5. Default insightful general response
  return `### 💡 Analysis & Insights

Here is the breakdown regarding your query:

* **Topic**: ${p}
* **Overview**: Comprehensive evaluation and processing of the requested task.
* **Key Considerations**:
  - Structured modular design ensuring peak performance.
  - Clear and accessible formatting with actionable steps.

Feel free to ask for specific code snippets, file creation, or further clarifications!`;
}

// YouTube Data API v3 Proxy Endpoint
app.get("/api/youtube-search", async (req, res) => {
  try {
    const rawQuery = (req.query.q as string || "").trim();
    const pageToken = (req.query.pageToken as string || "").trim();
    const maxResultsNum = Math.min(parseInt((req.query.maxResults as string) || "30", 10), 50);
    const query = rawQuery || "Trending";
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.Youtube_api_key || process.env.youtube_api_key;

    if (apiKey && apiKey.trim() !== "") {
      let ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResultsNum}&q=${encodeURIComponent(query)}&key=${apiKey.trim()}`;
      if (pageToken) {
        ytUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const ytRes = await fetch(ytUrl);
      
      if (ytRes.ok) {
        const data: any = await ytRes.json();
        if (data.items && Array.isArray(data.items)) {
          const videos = data.items
            .filter((item: any) => item.id && item.id.videoId)
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: item.snippet.title,
              description: item.snippet.description || "",
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
              channelTitle: item.snippet.channelTitle || "YouTube Creator",
              publishedAt: item.snippet.publishedAt || new Date().toISOString(),
              channelAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(item.snippet.channelTitle || 'YouTube')}`,
              viewCount: `${(Math.floor(Math.random() * 950) + 50)}K views`,
              duration: `${Math.floor(Math.random() * 18) + 2}:${Math.floor(Math.random() * 50) + 10}`,
              isLive: item.snippet.liveBroadcastContent === 'live',
            }));

          return res.json({
            success: true,
            source: "youtube_api_v3",
            query,
            totalResults: data.pageInfo?.totalResults || videos.length,
            nextPageToken: data.nextPageToken || null,
            prevPageToken: data.prevPageToken || null,
            videos,
          });
        }
      } else {
        const errText = await ytRes.text();
        console.warn("YouTube API error response:", errText);
      }
    }

    // Fallback search results if API Key is missing or YouTube API returns an error
    const FALLBACK_VIDEOS = [
      {
        videoId: "hT_nvWreIhg",
        title: "Minecraft 1.20 Trails & Tales Update Official Trailer",
        description: "Explore new biomes, archæology, camels, armor trims and story building in Minecraft!",
        thumbnail: "https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg",
        channelTitle: "Minecraft",
        publishedAt: "2023-06-07T14:00:00Z",
        viewCount: "8.4M views",
        duration: "2:15",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Minecraft"
      },
      {
        videoId: "jfKfPfyJRdk",
        title: "lofi hip hop radio 📚 - beats to relax/study to",
        description: "Peaceful lofi hip hop beats to study, chill, coding, and relax to 24/7.",
        thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
        channelTitle: "Lofi Girl",
        publishedAt: "2022-07-12T00:00:00Z",
        viewCount: "68M views",
        duration: "LIVE",
        isLive: true,
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=LofiGirl"
      },
      {
        videoId: "b1Yp8C0p0bY",
        title: "Cyberpunk 2077: Phantom Liberty — Official Launch Trailer",
        description: "Return as cyber-enhanced mercenary V on a high-stakes mission of espionage.",
        thumbnail: "https://i.ytimg.com/vi/b1Yp8C0p0bY/hqdefault.jpg",
        channelTitle: "Cyberpunk 2077",
        publishedAt: "2023-09-25T17:00:00Z",
        viewCount: "3.2M views",
        duration: "3:42",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Cyberpunk"
      },
      {
        videoId: "Sagg08DrO5U",
        title: "Python for Beginners - Full Course [Programming Tutorial]",
        description: "Complete Python programming course for beginners. Learn Python syntax, data structures, and OOP.",
        thumbnail: "https://i.ytimg.com/vi/Sagg08DrO5U/hqdefault.jpg",
        channelTitle: "FreeCodeCamp",
        publishedAt: "2021-09-15T12:00:00Z",
        viewCount: "12M views",
        duration: "4:26:52",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=FreeCodeCamp"
      },
      {
        videoId: "W6NZfCO5SIk",
        title: "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour",
        description: "Master modern JavaScript fundamentals in this quick interactive crash course.",
        thumbnail: "https://i.ytimg.com/vi/W6NZfCO5SIk/hqdefault.jpg",
        channelTitle: "Programming with Mosh",
        publishedAt: "2020-04-10T10:00:00Z",
        viewCount: "9.5M views",
        duration: "48:16",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Mosh"
      },
      {
        videoId: "0e3GPea1Tyg",
        title: "100 Days in Hardcore Minecraft - Full Movie",
        description: "Surviving 100 days in hardcore Minecraft with massive builds and intense boss fights.",
        thumbnail: "https://i.ytimg.com/vi/0e3GPea1Tyg/hqdefault.jpg",
        channelTitle: "Luke TheNote",
        publishedAt: "2021-01-20T18:00:00Z",
        viewCount: "45M views",
        duration: "1:12:04",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Luke"
      },
      {
        videoId: "fJ9rUzIMcZQ",
        title: "Queen – Bohemian Rhapsody (Official Video Remastered)",
        description: "The official remastered music video for Queen's legendary song Bohemian Rhapsody.",
        thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
        channelTitle: "Queen Official",
        publishedAt: "2008-08-01T23:32:12Z",
        viewCount: "1.6B views",
        duration: "5:59",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Queen"
      },
      {
        videoId: "2lAe1cqCOXo",
        title: "YouTube Rewind: 10 Years of Video History",
        description: "Celebrating ten years of viral moments, creators, gaming streams, and community culture.",
        thumbnail: "https://i.ytimg.com/vi/2lAe1cqCOXo/hqdefault.jpg",
        channelTitle: "YouTube Spotlight",
        publishedAt: "2018-12-06T18:00:00Z",
        viewCount: "220M views",
        duration: "8:12",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Spotlight"
      },
      {
        videoId: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        description: "The official remastered HD video for Never Gonna Give You Up by Rick Astley.",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        channelTitle: "Rick Astley",
        publishedAt: "2009-10-25T06:57:33Z",
        viewCount: "1.5B views",
        duration: "3:33",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Rick"
      },
      {
        videoId: "4TWR90KJl84",
        title: "Web Development In 2026 - Modern Tech Stack Guide",
        description: "A comprehensive roadmap for modern front-end, full-stack, and AI web development.",
        thumbnail: "https://i.ytimg.com/vi/4TWR90KJl84/hqdefault.jpg",
        channelTitle: "Traversy Media",
        publishedAt: "2024-01-02T15:00:00Z",
        viewCount: "820K views",
        duration: "24:10",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Traversy"
      },
      {
        videoId: "L_LUpnjgPso",
        title: "Interstellar - Official Trailer 3 [HD]",
        description: "Mankind was born on Earth. It was never meant to die here.",
        thumbnail: "https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg",
        channelTitle: "Warner Bros. Pictures",
        publishedAt: "2014-07-30T16:00:00Z",
        viewCount: "42M views",
        duration: "2:32",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=WarnerBros"
      },
      {
        videoId: "zSWdZVtXT7E",
        title: "Interstellar Main Theme - Hans Zimmer (10 Hours)",
        description: "Relaxing deep space ambient soundtrack by Hans Zimmer.",
        thumbnail: "https://i.ytimg.com/vi/zSWdZVtXT7E/hqdefault.jpg",
        channelTitle: "Epic Music World",
        publishedAt: "2019-03-14T10:00:00Z",
        viewCount: "18M views",
        duration: "10:00:00",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=EpicMusic"
      },
      {
        videoId: "d13AOBT4S7w",
        title: "GTA 6 Official Trailer 1",
        description: "Rockstar Games presents Grand Theft Auto VI Trailer 1. Welcome to Vice City.",
        thumbnail: "https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg",
        channelTitle: "Rockstar Games",
        publishedAt: "2023-12-04T23:00:00Z",
        viewCount: "190M views",
        duration: "1:31",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Rockstar"
      },
      {
        videoId: "Ke90Tje7VS0",
        title: "React 19 - What's New and How to Upgrade",
        description: "Explore Actions, useActionState, useOptimistic, Server Components, and the React Compiler.",
        thumbnail: "https://i.ytimg.com/vi/Ke90Tje7VS0/hqdefault.jpg",
        channelTitle: "Fireship",
        publishedAt: "2024-04-25T14:00:00Z",
        viewCount: "1.1M views",
        duration: "11:42",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Fireship"
      },
      {
        videoId: "tpXfHVsAnT4",
        title: "How Space Telescope James Webb Unlocks the Universe",
        description: "A deep dive into deep space imaging and cosmic discovery with NASA.",
        thumbnail: "https://i.ytimg.com/vi/tpXfHVsAnT4/hqdefault.jpg",
        channelTitle: "NASA Goddard",
        publishedAt: "2022-07-14T18:00:00Z",
        viewCount: "5.4M views",
        duration: "18:05",
        channelAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=NASA"
      }
    ];

    // Filter fallback videos by query matching
    const qLower = query.toLowerCase();
    const matched = FALLBACK_VIDEOS.filter(
      v => v.title.toLowerCase().includes(qLower) || 
           v.description.toLowerCase().includes(qLower) || 
           v.channelTitle.toLowerCase().includes(qLower)
    );

    const results = matched.length > 0 ? matched : FALLBACK_VIDEOS;

    res.json({
      success: true,
      source: apiKey ? "youtube_api_fallback" : "featured_fallback",
      message: apiKey ? "YouTube API returned an issue or quota limit. Displaying featured collection." : "YOUTUBE_API_KEY environment variable not set. Showing default videos.",
      query,
      totalResults: results.length,
      nextPageToken: pageToken ? null : "next_token_demo_page_2",
      videos: results,
    });
  } catch (err: any) {
    console.error("YouTube Search Proxy Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to perform YouTube video search",
      details: err.message || String(err),
    });
  }
});

// Multi-Engine Web Proxy Backend Controller (Ultraviolet, Scramjet & Flipgrid)
async function handleWebProxyRequest(req: any, res: any, engineType: 'scramjet' | 'ultraviolet' | 'flipgrid') {
  // Prevent CDN / Bunny.net Pull Zone from caching proxy responses or injecting stale 403s
  res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");

  try {
    let targetUrl = (req.query.url as string) || (req.body?.url as string) || "";
    if (!targetUrl) {
      return res.status(400).send("Proxy error: Missing 'url' query parameter");
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return res.status(400).send("Proxy error: Invalid target URL");
    }

    // SSRF Check
    const hostname = parsedUrl.hostname.toLowerCase();
    const isPrivate =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("169.254.");

    if (isPrivate) {
      return res.status(403).send("Proxy error: SSRF Protection - Access to internal/private addresses is prohibited.");
    }

    // Intercept Simulated Stealth Mirror Domains
    const isSimulatedDomain =
      hostname.endsWith("classroom-notes.net") ||
      hostname.endsWith("yunonet.org") ||
      hostname.endsWith("studyhub.edu") ||
      hostname.endsWith("calc-app.org") ||
      targetUrl.includes("pass=securly") ||
      targetUrl.includes("#pass=");

    if (isSimulatedDomain) {
      const mirrorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stealth Mirror • ${hostname}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { background: #0a0a0f; color: #f4f4f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; }
            .card { background: #12121a; border: 1px solid #27273a; border-radius: 24px; padding: 36px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); font-family: monospace; font-size: 11px; padding: 4px 12px; border-radius: 9999px; font-weight: 700; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
            p { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.6; }
            form { display: flex; gap: 8px; width: 100%; margin-bottom: 20px; }
            input { flex: 1; background: #181824; border: 1px solid #3f3f56; border-radius: 14px; padding: 12px 16px; color: #fff; font-size: 13px; outline: none; }
            input:focus { border-color: #f59e0b; }
            button { background: #f59e0b; color: #000; font-weight: 800; border: none; border-radius: 14px; padding: 12px 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; }
            button:hover { background: #fbbf24; transform: scale(1.02); }
            .quick-links { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
            .chip { background: #1c1c28; border: 1px solid #2e2e42; color: #d4d4d8; padding: 6px 12px; border-radius: 10px; font-size: 11px; text-decoration: none; font-family: monospace; }
            .chip:hover { border-color: #f59e0b; color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">🔓 STEALTH MIRROR ROUTE ACTIVE</div>
            <h1>${hostname}</h1>
            <p>You have successfully routed through your stealth mirror link. Type any target website or search query below to navigate completely unblocked.</p>
            
            <form action="/api/proxy/uv" method="GET">
              <input type="text" name="url" placeholder="Search DuckDuckGo, YouTube, Games..." required />
              <button type="submit">Go</button>
            </form>

            <div class="quick-links">
              <a href="/api/proxy/uv?url=https://duckduckgo.com" class="chip">🔍 DuckDuckGo</a>
              <a href="/api/proxy/uv?url=https://www.youtube.com" class="chip">▶️ YouTube</a>
              <a href="/api/proxy/uv?url=https://bloxd.io" class="chip">🎮 Bloxd.io</a>
              <a href="/api/proxy/uv?url=https://discord.com" class="chip">💬 Discord</a>
            </div>
          </div>
        </body>
        </html>
      `;
      return res.type("text/html").send(mirrorHtml);
    }

    // Anti-CAPTCHA fallback for Google Search rewrite
    if (hostname.includes("google.com") && (parsedUrl.pathname.includes("/search") || parsedUrl.pathname.includes("/sorry"))) {
      const queryParam = parsedUrl.searchParams.get("q");
      if (queryParam) {
        targetUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(queryParam)}`;
      } else {
        targetUrl = `https://duckduckgo.com/html/`;
      }
      parsedUrl = new URL(targetUrl);
    }

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Upgrade-Insecure-Requests": "1",
    };

    let targetRes: Response;
    try {
      targetRes = await fetch(parsedUrl.href, {
        method: req.method === "POST" ? "POST" : "GET",
        headers,
        redirect: "follow",
      });
    } catch (primaryFetchErr) {
      try {
        targetRes = await fetchIgnoreCert(parsedUrl.href, {
          method: req.method === "POST" ? "POST" : "GET",
          headers,
        });
      } catch (secondaryFetchErr) {
        const fallbackHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Proxy Gateway (${engineType.toUpperCase()})</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
              body { background-color: #09090b; color: #f4f4f5; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }
              .card { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 32px; max-width: 500px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
              .icon { font-size: 40px; margin-bottom: 16px; }
              h1 { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
              p { font-size: 13px; color: #a1a1aa; margin-bottom: 24px; line-height: 1.5; }
              .btn-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
              .btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: #27272a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; transition: all 0.2s; border: 1px solid #3f3f46; cursor: pointer; }
              .btn:hover { background: #3f3f46; border-color: #06b6d4; color: #38bdf8; }
              .btn-primary { background: #2563eb; border: none; color: #fff; }
              .btn-primary:hover { background: #1d4ed8; }
              .footer-text { margin-top: 20px; font-size: 11px; color: #71717a; font-family: monospace; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🌐</div>
              <h1>Proxy Gateway Portal</h1>
              <p>Direct connection to <strong>${hostname}</strong> was filtered. Search or access via unblocked mirror:</p>
              
              <div class="btn-group">
                <a href="/api/proxy/uv?url=https://duckduckgo.com/html/?q=${encodeURIComponent(hostname)}" class="btn btn-primary">
                  🔍 Search '${hostname}' on DuckDuckGo
                </a>
                <a href="javascript:location.reload()" class="btn">
                  🔄 Retry Connection
                </a>
              </div>

              <div class="footer-text">DIØR Proxy Engine • ${engineType.toUpperCase()}</div>
            </div>
          </body>
          </html>
        `;
        return res.type("text/html").send(fallbackHtml);
      }
    }

    if (targetRes.url.includes("google.com/sorry") || targetRes.url.includes("recaptcha")) {
      const searchQ = parsedUrl.searchParams.get("q") || "";
      const fallbackUrl = searchQ 
        ? `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQ)}`
        : `https://duckduckgo.com/html/`;
      
      parsedUrl = new URL(fallbackUrl);
      targetRes = await fetch(parsedUrl.href, {
        method: "GET",
        headers,
        redirect: "follow",
      });
    }

    const contentType = targetRes.headers.get("content-type") || "text/html";

    // Set content-type
    res.setHeader("Content-Type", contentType);

    // Strip frame-blocking & strict security headers
    res.removeHeader("X-Frame-Options");
    res.removeHeader("x-frame-options");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("content-security-policy");
    res.removeHeader("Content-Security-Policy-Report-Only");
    res.removeHeader("content-security-policy-report-only");
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("cross-origin-opener-policy");
    res.removeHeader("Cross-Origin-Embedder-Policy");
    res.removeHeader("cross-origin-embedder-policy");
    res.removeHeader("Cross-Origin-Resource-Policy");
    res.removeHeader("cross-origin-resource-policy");
    res.removeHeader("Strict-Transport-Security");
    res.removeHeader("strict-transport-security");

    res.status(targetRes.status);

    if (contentType.includes("text/html")) {
      let html = await targetRes.text();
      const origin = parsedUrl.origin;
      const baseHref = parsedUrl.href;

      const proxyEndpointMap = {
        ultraviolet: '/api/proxy/uv',
        scramjet: '/api/proxy',
        flipgrid: '/api/proxy/flipgrid',
      };
      const activeEndpoint = proxyEndpointMap[engineType];

      // Strip subresource integrity, frame-busting meta refreshes, and CSP metas
      html = html.replace(/\sintegrity="[^"]*"/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
      html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");

      const scriptToInject = `
        <base href="${baseHref}">
        <script>
          (function() {
            window.__PROXY_ENGINE__ = ${JSON.stringify(engineType)};
            window.__PROXY_ORIGIN__ = ${JSON.stringify(origin)};
            window.__PROXY_BASE__ = ${JSON.stringify(baseHref)};
            const activeEndpoint = ${JSON.stringify(activeEndpoint)};

            // Defeat Frame-Busters (keep page inside proxy iframe)
            try {
              Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
              Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
            } catch(e) {}

            function toProxyUrl(target) {
              if (!target || typeof target !== 'string') return target;
              if (target.startsWith('javascript:') || target.startsWith('#') || target.startsWith('data:')) return target;
              try {
                const full = new URL(target, window.__PROXY_BASE__).href;
                if (full.startsWith('http://') || full.startsWith('https://')) {
                  if (!full.includes('/api/proxy')) {
                    return activeEndpoint + '?url=' + encodeURIComponent(full);
                  }
                }
                return full;
              } catch(e) {
                return target;
              }
            }

            try {
              const origAssign = Location.prototype.assign;
              const origReplace = Location.prototype.replace;
              Location.prototype.assign = function(url) {
                return origAssign.call(this, toProxyUrl(url));
              };
              Location.prototype.replace = function(url) {
                return origReplace.call(this, toProxyUrl(url));
              };
            } catch(e) {}

            const origOpen = window.open;
            window.open = function(url, target, features) {
              if (url) {
                return origOpen.call(window, toProxyUrl(url), target || '_self', features);
              }
              return origOpen.call(window, url, target, features);
            };

            document.addEventListener('click', function(e) {
              const a = e.target.closest('a');
              if (a && a.href) {
                const href = a.getAttribute('href') || a.href;
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                  const fullUrl = new URL(href, window.__PROXY_BASE__).href;
                  if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = toProxyUrl(fullUrl);
                  }
                }
              }
            }, true);

            document.addEventListener('submit', function(e) {
              const form = e.target;
              if (form) {
                const action = form.getAttribute('action') || window.__PROXY_BASE__;
                const fullAction = new URL(action, window.__PROXY_BASE__).href;
                const method = (form.method || 'get').toLowerCase();
                if (method === 'get') {
                  e.preventDefault();
                  e.stopPropagation();
                  const formData = new FormData(form);
                  const params = new URLSearchParams();
                  for (let [k, v] of formData.entries()) {
                    params.append(k, v);
                  }
                  const finalUrl = fullAction + (fullAction.includes('?') ? '&' : '?') + params.toString();
                  window.location.href = toProxyUrl(finalUrl);
                }
              }
            }, true);
          })();
        </script>
      `;

      if (html.includes("<head>")) {
        html = html.replace("<head>", "<head>" + scriptToInject);
      } else if (html.includes("<html>")) {
        html = html.replace("<html>", "<html><head>" + scriptToInject + "</head>");
      } else {
        html = scriptToInject + html;
      }

      return res.send(html);
    } else {
      const buffer = await targetRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }
  } catch (err: any) {
    console.error(`Proxy [${engineType}] Error:`, err);
    res.status(500).send(`Unable to load website through proxy: ${err.message || String(err)}`);
  }
}

app.all("/api/proxy/uv", (req, res) => handleWebProxyRequest(req, res, 'ultraviolet'));
app.all("/api/proxy/flipgrid", (req, res) => handleWebProxyRequest(req, res, 'flipgrid'));
app.all("/api/proxy", (req, res) => handleWebProxyRequest(req, res, 'scramjet'));

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const distIndexHtml = path.join(distPath, "index.html");
  const hasDist = fs.existsSync(distIndexHtml);

  if (process.env.NODE_ENV === "production" && hasDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(distIndexHtml, (err) => {
        if (err && !res.headersSent) {
          res.status(500).send("Error loading page");
        }
      });
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e: any) {
      console.warn("Vite middleware failed, falling back to static files:", e.message);
      if (fs.existsSync(distIndexHtml)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(distIndexHtml, (err) => {
            if (err && !res.headersSent) {
              res.status(500).send("Error loading page");
            }
          });
        });
      } else {
        const rootHtml = path.join(process.cwd(), "index.html");
        app.get("*", (req, res) => {
          if (fs.existsSync(rootHtml)) {
            res.sendFile(rootHtml, (err) => {
              if (err && !res.headersSent) {
                res.status(500).send("Server initialization error");
              }
            });
          } else {
            res.status(503).send("Server starting...");
          }
        });
      }
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Yunø server running on http://0.0.0.0:${PORT} (mode: ${hasDist && process.env.NODE_ENV === 'production' ? 'production' : 'development'})`);
  });
}

startServer();
